import api from "../api.js";

// params: { page, limit, search, category, brand, sort }
export const fetchProducts = (params = {}) => api.get("/products", { params });

export const fetchProductFilters = () => api.get("/products/filters");

export const fetchProductById = (id) => api.get(`/products/${id}`);

// Admin only — the backend enforces this; these just call the endpoints.
export const createProduct = (payload) => api.post("/products", payload);

export const updateProduct = (id, payload) => api.put(`/products/${id}`, payload);

export const deleteProduct = (id) => api.delete(`/products/${id}`);

// Reviews
export const fetchProductReviews = (id) => api.get(`/products/${id}/reviews`);

export const submitReview = (id, payload) => api.post(`/products/${id}/reviews`, payload);

export const deleteOwnReview = (id) => api.delete(`/products/${id}/reviews`);
