const RAZORPAY_PAYOUT_BASE = "https://api.razorpay.com/v1"

function getAuthHeader(): string {
  const key = process.env.RAZORPAY_PAYOUT_KEY_ID
  const secret = process.env.RAZORPAY_PAYOUT_KEY_SECRET

  if (!key || !secret) {
    throw new Error(
      "Razorpay Payout keys missing. Add RAZORPAY_PAYOUT_KEY_ID " +
      "and RAZORPAY_PAYOUT_KEY_SECRET to your .env.local file. " +
      "Get these from Razorpay X Dashboard → Settings → API Keys."
    )
  }

  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64")
}

async function razorpayPayoutRequest(
  endpoint: string,
  method: string,
  body?: object
) {
  const response = await fetch(`${RAZORPAY_PAYOUT_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.error?.description ||
      `Razorpay Payout API error: ${response.status}`
    )
  }

  return data
}

// Step 1: Create a contact for the teacher in Razorpay
export async function createRazorpayContact(teacher: {
  name: string
  email: string
  phone: string
  employeeId: string
}) {
  return razorpayPayoutRequest("/contacts", "POST", {
    name: teacher.name,
    email: teacher.email,
    contact: teacher.phone,
    type: "employee",
    reference_id: teacher.employeeId,
  })
}

// Step 2: Link teacher's bank account to their contact
export async function createFundAccount(data: {
  contactId: string
  accountHolderName: string
  accountNumber: string
  ifscCode: string
}) {
  return razorpayPayoutRequest("/fund_accounts", "POST", {
    contact_id: data.contactId,
    account_type: "bank_account",
    bank_account: {
      name: data.accountHolderName,
      ifsc: data.ifscCode,
      account_number: data.accountNumber,
    },
  })
}

// Step 3: Initiate actual salary payout
export async function createSalaryPayout(data: {
  fundAccountId: string
  amountInPaise: number
  teacherName: string
  month: string
  year: number
  paymentId: string
}) {
  const accountNumber = process.env.RAZORPAY_X_ACCOUNT_NUMBER
  if (!accountNumber) {
    throw new Error(
      "RAZORPAY_X_ACCOUNT_NUMBER missing from .env.local. " +
      "Find your account number in Razorpay X → Account Details."
    )
  }

  return razorpayPayoutRequest("/payouts", "POST", {
    account_number: accountNumber,
    fund_account_id: data.fundAccountId,
    amount: data.amountInPaise,
    currency: "INR",
    mode: "NEFT",
    purpose: "salary",
    queue_if_low_balance: false,
    reference_id: data.paymentId,
    narration: `Salary ${data.month} ${data.year} - ${data.teacherName}`,
  })
}

// Fetch payout status from Razorpay
export async function getPayoutStatus(payoutId: string) {
  return razorpayPayoutRequest(`/payouts/${payoutId}`, "GET")
}
