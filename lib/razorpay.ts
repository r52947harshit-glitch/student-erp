import Razorpay from 'razorpay'

// Ensure we only initialize Razorpay if keys are available, to avoid crashing at build time
const isRazorpayConfigured = !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET

export const razorpay =  new Razorpay({
      key_id: "rzp_test_SdlHVeBzU3Jp0I",
      key_secret: "3umfMf725z5OOInWurShzmWh",
    }) 