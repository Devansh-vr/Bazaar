import axios from "axios";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  notifyAuthFailure,
} from "./services/tokenStore.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends the HttpOnly refresh-token cookie
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the current access token to every outgoing request.
api.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// A separate, interceptor-free client for the refresh call itself —
// using `api` here would risk the refresh request looping back into
// this same 401-handling logic.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let refreshInFlight = null;

const performRefresh = () => {
  // Coalesce concurrent 401s into a single refresh call instead of
  // firing one refresh request per failed request.
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post("/user/refresh")
      .then((res) => {
        const newToken = res.data.accessToken;
        setAccessToken(newToken);
        return newToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

// On a 401, try refreshing the access token once and retrying the
// original request. If the refresh itself fails, clear auth state and
// notify AuthContext so it can redirect to /login. Requests already
// marked `_retry` are not retried again, which prevents infinite loops.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthEndpoint =
      originalRequest?.url?.includes("/user/login") ||
      originalRequest?.url?.includes("/user/register") ||
      originalRequest?.url?.includes("/user/refresh");

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const newToken = await performRefresh();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        notifyAuthFailure();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
