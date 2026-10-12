import mongoose from "mongoose";
import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import asyncHandler from "../utils/asyncHandler.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Finds the user's cart, creating an empty one if it doesn't exist yet.
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// Shapes a cart document (with items.product populated) into the
// response the frontend consumes: populated items, subtotal, itemCount.
// Items whose product has since been deleted are dropped defensively
// rather than breaking the response.
const formatCartResponse = (cart) => {
  const items = cart.items.filter((item) => item.product);

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    _id: cart._id,
    items: items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
    })),
    subtotal,
    itemCount,
  };
};

// GET /api/v1/cart
export const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  await cart.populate("items.product");
  res.status(200).json({ success: true, data: formatCartResponse(cart) });
});

// POST /api/v1/cart
// body: { productId, quantity }
export const addItemToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body || {};

  if (!productId || !isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: "A valid productId is required" });
  }

  const requestedQty = quantity === undefined ? 1 : Number(quantity);
  if (!Number.isInteger(requestedQty) || requestedQty < 1) {
    return res.status(400).json({ success: false, message: "Quantity must be a positive whole number" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const cart = await getOrCreateCart(req.user.id);
  const existingItem = cart.items.find((item) => String(item.product) === String(productId));
  const desiredTotalQty = (existingItem?.quantity || 0) + requestedQty;

  if (desiredTotalQty > product.stock) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock} unit(s) of "${product.title}" available`,
    });
  }

  if (existingItem) {
    existingItem.quantity = desiredTotalQty;
  } else {
    cart.items.push({ product: productId, quantity: requestedQty });
  }

  await cart.save();
  await cart.populate("items.product");

  res.status(200).json({ success: true, data: formatCartResponse(cart) });
});

// PUT /api/v1/cart/:productId
// body: { quantity }
export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body || {};

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product id" });
  }

  const newQty = Number(quantity);
  if (!Number.isInteger(newQty) || newQty < 1) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be a positive whole number (use the remove endpoint to delete an item)",
    });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  if (newQty > product.stock) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock} unit(s) of "${product.title}" available`,
    });
  }

  const cart = await getOrCreateCart(req.user.id);
  const item = cart.items.find((i) => String(i.product) === String(productId));

  if (!item) {
    return res.status(404).json({ success: false, message: "Item not found in cart" });
  }

  item.quantity = newQty;
  await cart.save();
  await cart.populate("items.product");

  res.status(200).json({ success: true, data: formatCartResponse(cart) });
});

// DELETE /api/v1/cart/:productId
export const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product id" });
  }

  const cart = await getOrCreateCart(req.user.id);
  const originalLength = cart.items.length;
  cart.items = cart.items.filter((item) => String(item.product) !== String(productId));

  if (cart.items.length === originalLength) {
    return res.status(404).json({ success: false, message: "Item not found in cart" });
  }

  await cart.save();
  await cart.populate("items.product");

  res.status(200).json({ success: true, data: formatCartResponse(cart) });
});

// DELETE /api/v1/cart
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  cart.items = [];
  await cart.save();

  res.status(200).json({ success: true, data: formatCartResponse(cart) });
});
