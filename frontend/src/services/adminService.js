import api from "../api.js";

// Admin only — the backend enforces this.
export const fetchDashboardStats = () => api.get("/admin/stats");
