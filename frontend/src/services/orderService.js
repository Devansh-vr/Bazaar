import api from "../api.js";

// Checkout: creates a Pending order snapshotted from the caller's
// current cart. No body needed — the backend reads the cart and
// computes the total server-side.
export const createOrder = () => api.post("/orders");

export const fetchMyOrders = () => api.get("/orders/my-orders");

export const fetchOrderById = (id) => api.get(`/orders/${id}`);

// Admin only — the backend enforces this.
export const fetchAllOrders = (params = {}) => api.get("/orders", { params });

export const updateOrderStatus = (id, orderStatus) =>
  api.put(`/orders/${id}/status`, { orderStatus });
