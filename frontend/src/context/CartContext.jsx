import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import {
  fetchCart,
  addToCartApi,
  updateCartItemApi,
  removeCartItemApi,
  clearCartApi,
} from "../services/cartService.js";

const CartContext = createContext(undefined);

/**
 * Cart state backed by MongoDB (see backend/controllers/cartController.js).
 * Requires authentication — loads the cart when the person logs in and
 * clears local state (without calling the API) when they log out.
 */
export const CartProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [items, setItems] = useState([]); // [{ product, quantity }]
  const [subtotal, setSubtotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const applyCartData = (data) => {
    setItems(data.items);
    setSubtotal(data.subtotal);
    setItemCount(data.itemCount);
  };

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchCart();
      applyCartData(res.data.data);
    } catch {
      setError("Couldn't load your cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return; // wait for the silent session-restore to settle
    if (isAuthenticated) {
      loadCart();
    } else {
      setItems([]);
      setSubtotal(0);
      setItemCount(0);
    }
  }, [isAuthenticated, authLoading, loadCart]);

  const addToCart = async (productId, quantity = 1) => {
    setError("");
    try {
      const res = await addToCartApi(productId, quantity);
      applyCartData(res.data.data);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't add item to cart.";
      setError(message);
      return { success: false, message };
    }
  };

  const updateQuantity = async (productId, quantity) => {
    setError("");
    try {
      const res = await updateCartItemApi(productId, quantity);
      applyCartData(res.data.data);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't update quantity.";
      setError(message);
      return { success: false, message };
    }
  };

  const removeFromCart = async (productId) => {
    setError("");
    try {
      const res = await removeCartItemApi(productId);
      applyCartData(res.data.data);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't remove item.";
      setError(message);
      return { success: false, message };
    }
  };

  const increaseQuantity = (productId) => {
    const item = items.find((i) => i.product._id === productId);
    if (!item) return Promise.resolve({ success: false });
    return updateQuantity(productId, item.quantity + 1);
  };

  const decreaseQuantity = (productId) => {
    const item = items.find((i) => i.product._id === productId);
    if (!item) return Promise.resolve({ success: false });
    if (item.quantity <= 1) return removeFromCart(productId);
    return updateQuantity(productId, item.quantity - 1);
  };

  const clearCart = async () => {
    setError("");
    try {
      const res = await clearCartApi();
      applyCartData(res.data.data);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't clear cart.";
      setError(message);
      return { success: false, message };
    }
  };

  const value = {
    items,
    subtotal,
    itemCount,
    loading,
    error,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    refreshCart: loadCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
