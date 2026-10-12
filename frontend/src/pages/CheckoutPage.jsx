import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { createOrder } from "../services/orderService.js";
import { createRazorpayOrder, verifyPayment } from "../services/paymentService.js";
import { loadRazorpayScript } from "../services/razorpayLoader.js";
import Loading from "../components/Loading.jsx";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, itemCount, loading: cartLoading, refreshCart } = useCart();

  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState(""); // "" | "creating-order" | "awaiting-payment" | "verifying"
  const [error, setError] = useState("");

  const handlePay = async () => {
    setError("");
    setProcessing(true);

    try {
      // 1. Create a Pending order snapshotted from the current cart
      //    (server validates stock and computes the total — never trusts
      //    anything the frontend might send).
      setStage("creating-order");
      const orderRes = await createOrder();
      const order = orderRes.data.data;

      // 2. Create the matching Razorpay order and get the public key id.
      const rzpRes = await createRazorpayOrder(order._id);
      const { razorpayOrderId, amount, currency, keyId } = rzpRes.data.data;

      // 3. Load the Razorpay checkout script and open the payment widget.
      await loadRazorpayScript();
      setStage("awaiting-payment");

      const options = {
        key: keyId,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: "Bazaar",
        description: `Order #${order._id.slice(-8)}`,
        prefill: {
          name: user ? `${user.firstName} ${user.lastName}` : undefined,
          email: user?.email,
        },
        theme: { color: "#0ea5e9" },
        handler: async (response) => {
          // 4. Send the payment response back to the backend for
          //    signature verification — this is what actually finalizes
          //    the order (decrements stock, clears the cart).
          setStage("verifying");
          try {
            await verifyPayment({
              orderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refreshCart();
            navigate(`/orders/${order._id}`, { state: { justPaid: true }, replace: true });
          } catch (err) {
            setError(err.response?.data?.message || "Payment verification failed. Please contact support if you were charged.");
            setProcessing(false);
            setStage("");
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setStage("");
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", () => {
        setError("Payment failed. Please try again.");
        setProcessing(false);
        setStage("");
      });
      razorpay.open();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't start checkout. Please try again.");
      setProcessing(false);
      setStage("");
    }
  };

  if (cartLoading) return <Loading />;

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="glass-card catalog-state">
          <h1>Checkout</h1>
          <p className="muted">Your cart is empty — nothing to check out.</p>
          <Link to="/" className="btn-primary">Browse Products</Link>
        </div>
      </div>
    );
  }

  const stageLabel = {
    "creating-order": "Creating your order...",
    "awaiting-payment": "Waiting for payment...",
    verifying: "Verifying payment...",
  }[stage];

  return (
    <div className="page">
      <div className="glass-card">
        <h1>Checkout</h1>

        <ul className="cart-list">
          {items.map((item) => (
            <li key={item.product._id} className="cart-row">
              <div className="cart-row-image">
                {item.product.images?.[0] ? (
                  <img src={item.product.images[0]} alt={item.product.title} />
                ) : (
                  <div className="product-card-image-placeholder">No image</div>
                )}
              </div>
              <div className="cart-row-info">
                <span className="cart-row-title">{item.product.title}</span>
                <p className="muted">₹{item.product.price} × {item.quantity}</p>
              </div>
              <p className="cart-row-total">₹{item.product.price * item.quantity}</p>
            </li>
          ))}
        </ul>

        <div className="cart-summary">
          <span className="muted">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
          <span className="cart-subtotal">Total: ₹{subtotal}</span>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button type="button" className="btn-primary checkout-pay-btn" onClick={handlePay} disabled={processing}>
          {processing ? (stageLabel || "Processing...") : `Pay ₹${subtotal}`}
        </button>

        <p className="muted">Payments are processed securely by Razorpay.</p>
      </div>
    </div>
  );
};

export default CheckoutPage;
