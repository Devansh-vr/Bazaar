import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchMyOrders } from "../services/orderService.js";
import Loading from "../components/Loading.jsx";

const STATUS_BADGE_CLASS = {
  Pending: "",
  Processing: "",
  Completed: "badge-success",
  Cancelled: "badge-danger",
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchMyOrders();
      setOrders(res.data.data);
    } catch {
      setError("Couldn't load your orders right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="page">
        <div className="glass-card catalog-state">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={loadOrders}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="page">
        <div className="glass-card catalog-state">
          <h1>My Orders</h1>
          <p className="muted">You haven&apos;t placed any orders yet.</p>
          <Link to="/" className="btn-primary">Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="glass-card">
        <h1>My Orders</h1>

        <ul className="order-list">
          {orders.map((order) => (
            <li key={order._id}>
              <Link to={`/orders/${order._id}`} className="order-row">
                <div className="order-row-info">
                  <span className="cart-row-title">Order #{order._id.slice(-8)}</span>
                  <p className="muted">{new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="order-row-status">
                  <span className={`badge ${STATUS_BADGE_CLASS[order.orderStatus] || ""}`}>{order.orderStatus}</span>
                  <span className={`badge ${order.paymentStatus === "Paid" ? "badge-success" : order.paymentStatus === "Failed" ? "badge-danger" : ""}`}>
                    {order.paymentStatus}
                  </span>
                </div>
                <p className="cart-row-total">₹{order.totalAmount}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default OrdersPage;
