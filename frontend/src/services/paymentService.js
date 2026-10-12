import api from "../api.js";

// Creates a Razorpay order for an existing (Pending) Bazaar order.
// Returns { razorpayOrderId, amount, currency, keyId, orderId }.
// The Razorpay secret never touches the frontend — only the public
// keyId is returned, generated server-side.
export const createRazorpayOrder = (orderId) =>
  api.post("/payments/create-order", { orderId });

// Sends the Razorpay checkout response back to the backend for
// signature verification. Only a verified signature finalizes the
// order (decrements stock, clears the cart).
export const verifyPayment = (payload) => api.post("/payments/verify", payload);
