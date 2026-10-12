import api from "../api.js";

export const fetchWishlist = () => api.get("/wishlist");

export const addToWishlistApi = (productId) =>
  api.post("/wishlist", { productId });

export const removeFromWishlistApi = (productId) =>
  api.delete(`/wishlist/${productId}`);

export const checkWishlistApi = (productId) =>
  api.get(`/wishlist/${productId}/check`);
