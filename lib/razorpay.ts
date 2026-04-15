import Razorpay from 'razorpay'

// Initialize Razorpay with test keys (replace with production keys in production)
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SdlHVeBzU3Jp0I",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "3umfMf725z5OOInWurShzmWh",
}) 