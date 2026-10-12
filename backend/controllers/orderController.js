import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import asyncHandler from "../utils/asyncHandler.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ORDER_STATUSES = ["Pending", "Processing", "Completed", "Cancelled"];

// POST /api/v1/orders
// Checkout: builds a Pending order from the caller's current cart.
// Payment (Razorpay order creation + verification) happens afterwards
// via /api/v1/payments — this step only reserves nothing and charges
// nothing; it snapshots the cart and validates stock/totals so the
// payment step has a trustworthy, server-computed amount to charge.
export const createOrder = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: "Your cart is empty" });
  }

  // Drop any items whose product has since been deleted, same as the
  // cart response does, so checkout never operates on a null product.
  const cartItems = cart.items.filter((item) => item.product);
  if (cartItems.length === 0) {
    return res.status(400).json({ success: false, message: "Your cart is empty" });
  }

  // Re-validate stock at checkout time (it may have changed since the
  // item was added to the cart) before creating the order.
  const insufficientStock = cartItems.filter((item) => item.quantity > item.product.stock);
  if (insufficientStock.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Some items in your cart no longer have enough stock",
      errors: insufficientStock.map((item) => ({
        productId: item.product._id,
        title: item.product.title,
        available: item.product.stock,
        requested: item.quantity,
      })),
    });
  }

  // Snapshot product details and compute the total entirely server-side
  // — the frontend never supplies price/total for an order.
  const items = cartItems.map((item) => ({
    product: item.product._id,
    title: item.product.title,
    price: item.product.price,
    quantity: item.quantity,
    image: item.product.images?.[0] || "",
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const order = await Order.create({
    user: req.user.id,
    items,
    totalAmount,
    paymentStatus: "Pending",
    orderStatus: "Pending",
  });

  res.status(201).json({ success: true, data: order });
});

// GET /api/v1/orders/my-orders
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: orders });
});

// GET /api/v1/orders
// Admin only. Lists every order in the system (for the admin
// dashboard), newest first, with basic pagination.
export const getAllOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const [orders, totalItems] = await Promise.all([
    Order.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "firstName lastName email"),
    Order.countDocuments({}),
  ]);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
  });
});

// GET /api/v1/orders/:id
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid order id" });
  }

  const order = await Order.findById(id);

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  // Owners can view their own order; admins can view any order.
  if (String(order.user) !== String(req.user.id) && req.user.role !== "Admin") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  res.status(200).json({ success: true, data: order });
});

// PUT /api/v1/orders/:id/status
// Admin only.
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body || {};

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid order id" });
  }

  if (!orderStatus || !ORDER_STATUSES.includes(orderStatus)) {
    return res.status(400).json({
      success: false,
      message: `orderStatus must be one of: ${ORDER_STATUSES.join(", ")}`,
    });
  }

  const order = await Order.findByIdAndUpdate(
    id,
    { orderStatus },
    { new: true, runValidators: true }
  );

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  res.status(200).json({ success: true, data: order });
});
