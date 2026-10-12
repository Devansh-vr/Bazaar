import api from "../api.js";

export const registerUser = (payload) => api.post("/user/register", payload);

export const loginUser = (payload) => api.post("/user/login", payload);

export const logoutUser = () => api.post("/user/logout");

export const fetchProfile = () => api.get("/user/me");

// Uses api's baseURL/credentials but is called directly (not through
// the response interceptor) when AuthContext silently restores a
// session on app load.
export const refreshAccessToken = () => api.post("/user/refresh");
