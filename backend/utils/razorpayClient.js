import Razorpay from "razorpay";

let client = null;

// Lazily instantiate so a missing/placeholder key doesn't crash the
// whole server at boot — it only errors when a payment route is
// actually hit without real keys configured.
export const getRazorpayClient = () => {
  if (client) return client;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId.startsWith("replace_with")) {
    const error = new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env"
    );
    error.statusCode = 503;
    throw error;
  }

  client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
};

// Test-only hook to inject a mock client instead of a real Razorpay SDK
// instance (there is no live network access to api.razorpay.com in
// automated verification).
export const setRazorpayClient = (mockClient) => {
  client = mockClient;
};
