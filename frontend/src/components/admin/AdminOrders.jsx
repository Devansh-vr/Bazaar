import { useState, useEffect, useCallback } from "react";
import { fetchAllOrders, updateOrderStatus } from "../../services/orderService.js";
import Loading from "../Loading.jsx";

const ORDER_STATUSES = ["Pending", "Processing", "Completed", "Cancelled"];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAllOrders({ limit: 50 });
      setOrders(res.data.data);
    } catch {
      setError("Couldn't load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, orderStatus: res.data.data.orderStatus } : o))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="catalog-state">
        <p>{error}</p>
        <button type="button" className="btn-primary" onClick={load}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-section-header">
        <h2>Orders</h2>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td>#{order._id.slice(-8)}</td>
                <td>{order.user ? `${order.user.firstName} ${order.user.lastName}` : "—"}</td>
                <td>₹{order.totalAmount}</td>
                <td>
                  <span className={`badge ${order.paymentStatus === "Paid" ? "badge-success" : order.paymentStatus === "Failed" ? "badge-danger" : ""}`}>
                    {order.paymentStatus}
                  </span>
                </td>
                <td>
                  <select
                    value={order.orderStatus}
                    disabled={updatingId === order._id}
                    onChange={(e) => handleStatusChange(order._id, e.target.value)}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="muted">No orders yet.</p>}
      </div>
    </div>
  );
};

export default AdminOrders;
