import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import {
  fetchWishlist,
  addToWishlistApi,
  removeFromWishlistApi,
} from "../services/wishlistService.js";

const WishlistContext = createContext(undefined);

/**
 * Wishlist state backed by MongoDB (see
 * backend/controllers/wishlistController.js). Requires authentication —
 * loads the wishlist when the person logs in and clears local state
 * (without calling the API) when they log out.
 */
export const WishlistProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [wishlist, setWishlist] = useState([]); // [product, ...]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWishlist();
      setWishlist(res.data.data.products);
    } catch {
      setError("Couldn't load your wishlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      loadWishlist();
    } else {
      setWishlist([]);
    }
  }, [isAuthenticated, authLoading, loadWishlist]);

  const addToWishlist = async (productId) => {
    setError("");
    try {
      const res = await addToWishlistApi(productId);
      setWishlist(res.data.data.products);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't add to wishlist.";
      setError(message);
      return { success: false, message };
    }
  };

  const removeFromWishlist = async (productId) => {
    setError("");
    try {
      const res = await removeFromWishlistApi(productId);
      setWishlist(res.data.data.products);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't remove from wishlist.";
      setError(message);
      return { success: false, message };
    }
  };

  const isInWishlist = (productId) =>
    wishlist.some((item) => item._id === productId);

  const toggleWishlist = (productId) =>
    isInWishlist(productId) ? removeFromWishlist(productId) : addToWishlist(productId);

  const value = {
    wishlist,
    loading,
    error,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    refreshWishlist: loadWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};
