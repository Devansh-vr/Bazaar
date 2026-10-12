import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  registerUser as registerUserApi,
  loginUser as loginUserApi,
  logoutUser as logoutUserApi,
  fetchProfile,
  refreshAccessToken,
} from "../services/authService.js";
import {
  setAccessToken,
  clearAccessToken,
  setOnAuthFailure,
} from "../services/tokenStore.js";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session on load
  const [error, setError] = useState(null);

  const logout = useCallback(async () => {
    try {
      await logoutUserApi();
    } catch {
      // Even if the network call fails, still clear local state below.
    }
    clearAccessToken();
    setUser(null);
  }, []);

  // Silently attempt to restore a session on first load using the
  // HttpOnly refresh cookie (if any). No error is shown if this fails
  // — it just means the person isn't logged in.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const refreshRes = await refreshAccessToken();
        if (cancelled) return;
        setAccessToken(refreshRes.data.accessToken);
        const profileRes = await fetchProfile();
        if (cancelled) return;
        setUser(profileRes.data.user);
      } catch {
        if (cancelled) return;
        clearAccessToken();
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();

    // If the Axios interceptor ever fails to refresh mid-session
    // (refresh token expired/revoked), fall back to a clean logged-out
    // state so ProtectedRoute sends the person to /login.
    setOnAuthFailure(() => {
      if (cancelled) return;
      clearAccessToken();
      setUser(null);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const register = async (formData) => {
    setError(null);
    const res = await registerUserApi(formData);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const login = async (formData) => {
    setError(null);
    const res = await loginUserApi(formData);
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const value = {
    user,
    loading,
    error,
    setError,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "Admin",
    register,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
