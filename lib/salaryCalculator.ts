export interface SalaryBreakdown {
  baseSalary: number
  totalWorkingDays: number
  presentDays: number
  halfDays: number
  paidLeaveDays: number
  unpaidLeaveDays: number
  absentDays: number
  effectivePresentDays: number
  deductionAmount: number
  netSalary: number
}

export function calculateSalary(
  baseSalary: number,
  attendance: { status: string; date: Date }[],
  month: number,
  year: number
): SalaryBreakdown {
  // Count total working days (exclude Sundays)
  const daysInMonth = new Date(year, month, 0).getDate()
  let totalWorkingDays = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay()
    if (day !== 0) totalWorkingDays++
  }

  let presentDays = 0
  let halfDays = 0
  let paidLeaveDays = 0
  let unpaidLeaveDays = 0
  let absentDays = 0

  for (const record of attendance) {
    switch (record.status) {
      case "PRESENT":
        presentDays++
        break
      case "HALF_DAY":
        halfDays++
        break
      case "PAID_LEAVE":
        paidLeaveDays++
        break
      case "UNPAID_LEAVE":
        unpaidLeaveDays++
        break
      case "ABSENT":
        absentDays++
        break
    }
  }

  const effectivePresentDays = presentDays + halfDays * 0.5 + paidLeaveDays
  const perDaySalary = baseSalary / totalWorkingDays
  const unpaidDays = unpaidLeaveDays + absentDays + halfDays * 0.5
  const deductionAmount = parseFloat((perDaySalary * unpaidDays).toFixed(2))
  const netSalary = parseFloat((baseSalary - deductionAmount).toFixed(2))

  return {
    baseSalary,
    totalWorkingDays,
    presentDays,
    halfDays,
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays,
    effectivePresentDays,
    deductionAmount,
    netSalary,
  }
}
