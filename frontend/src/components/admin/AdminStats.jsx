import { useState, useEffect } from "react";
import { fetchDashboardStats } from "../../services/adminService.js";
import Loading from "../Loading.jsx";

const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchDashboardStats();
      setStats(res.data.data);
    } catch {
      setError("Couldn't load dashboard stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="catalog-state">
        <p>{error}</p>
        <button type="button" className="btn-primary" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Total Revenue", value: `₹${stats.totalRevenue}` },
    { label: "Total Orders", value: stats.totalOrders },
    { label: "Total Products", value: stats.totalProducts },
    { label: "Total Users", value: stats.totalUsers },
    { label: "Low Stock (≤5)", value: stats.lowStockCount },
  ];

  return (
    <div>
      <div className="admin-stats-grid">
        {cards.map((card) => (
          <div key={card.label} className="admin-stat-card">
            <p className="admin-stat-value">{card.value}</p>
            <p className="muted">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="admin-stat-card admin-status-breakdown">
        <p className="muted" style={{ marginBottom: 12 }}>Orders by Status</p>
        <div className="order-row-status">
          {Object.entries(stats.ordersByStatus).map(([status, count]) => (
            <span key={status} className="badge">{status}: {count}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
