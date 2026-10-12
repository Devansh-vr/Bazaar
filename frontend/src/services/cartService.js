import api from "../api.js";

// Persistent, MongoDB-backed cart (requires authentication).
export const fetchCart = () => api.get("/cart");

export const addToCartApi = (productId, quantity = 1) =>
  api.post("/cart", { productId, quantity });

export const updateCartItemApi = (productId, quantity) =>
  api.put(`/cart/${productId}`, { quantity });

export const removeCartItemApi = (productId) =>
  api.delete(`/cart/${productId}`);

export const clearCartApi = () => api.delete("/cart");
