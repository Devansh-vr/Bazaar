import { useState } from "react";
import AdminStats from "../components/admin/AdminStats.jsx";
import AdminProducts from "../components/admin/AdminProducts.jsx";
import AdminOrders from "../components/admin/AdminOrders.jsx";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
];

const Admin = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="page">
      <div className="glass-card">
        <h1>Admin Dashboard</h1>

        <div className="admin-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`admin-tab ${activeTab === tab.key ? "admin-tab-active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="admin-tab-content">
          {activeTab === "overview" && <AdminStats />}
          {activeTab === "products" && <AdminProducts />}
          {activeTab === "orders" && <AdminOrders />}
        </div>
      </div>
    </div>
  );
};

export default Admin;
