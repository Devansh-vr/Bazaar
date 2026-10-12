const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let loadPromise = null;

// Loads the Razorpay Checkout script once and caches the promise so
// repeat calls (e.g. retrying a payment) don't inject it twice.
export const loadRazorpayScript = () => {
  if (window.Razorpay) return Promise.resolve(true);

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT_SRC;
      script.onload = () => resolve(true);
      script.onerror = () => {
        loadPromise = null; // allow a retry on next call
        reject(new Error("Failed to load the Razorpay checkout script"));
      };
      document.body.appendChild(script);
    });
  }

  return loadPromise;
};
