import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { fetchOrderById } from "../services/orderService.js";
import Loading from "../components/Loading.jsx";

const OrderDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const justPaid = location.state?.justPaid;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setNotFound(false);
      try {
        const res = await fetchOrderById(id);
        if (!cancelled) setOrder(res.data.data);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 404 || err.response?.status === 400 || err.response?.status === 403) {
          setNotFound(true);
        } else {
          setError("Couldn't load this order right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <Loading />;

  if (notFound) {
    return (
      <div className="page">
        <div className="glass-card catalog-state">
          <h1>Order Not Found</h1>
          <p className="muted">This order doesn&apos;t exist or doesn&apos;t belong to you.</p>
          <Link to="/orders" className="btn-primary">Back to Orders</Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="glass-card catalog-state">
          <p>{error}</p>
          <Link to="/orders" className="btn-primary">Back to Orders</Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="page">
      {justPaid && (
        <div className="glass-card checkout-success-banner">
          <p>🎉 Payment successful — your order is confirmed!</p>
        </div>
      )}

      <div className="glass-card">
        <div className="cart-header">
          <h1>Order #{order._id.slice(-8)}</h1>
          <span className="muted">{new Date(order.createdAt).toLocaleString()}</span>
        </div>

        <div className="product-details-meta">
          <span className={`badge ${order.orderStatus === "Completed" ? "badge-success" : order.orderStatus === "Cancelled" ? "badge-danger" : ""}`}>
            Order: {order.orderStatus}
          </span>
          <span className={`badge ${order.paymentStatus === "Paid" ? "badge-success" : order.paymentStatus === "Failed" ? "badge-danger" : ""}`}>
            Payment: {order.paymentStatus}
          </span>
        </div>

        <ul className="cart-list">
          {order.items.map((item) => (
            <li key={item.product} className="cart-row">
              <div className="cart-row-image">
                {item.image ? (
                  <img src={item.image} alt={item.title} />
                ) : (
                  <div className="product-card-image-placeholder">No image</div>
                )}
              </div>
              <div className="cart-row-info">
                <span className="cart-row-title">{item.title}</span>
                <p className="muted">₹{item.price} × {item.quantity}</p>
              </div>
              <p className="cart-row-total">₹{item.price * item.quantity}</p>
            </li>
          ))}
        </ul>

        <div className="cart-summary">
          <span className="muted">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
          <span className="cart-subtotal">Total: ₹{order.totalAmount}</span>
        </div>

        {order.razorpayPaymentId && (
          <p className="muted">Payment ID: {order.razorpayPaymentId}</p>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;
