import crypto from "crypto";
import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import Cart from "../models/cartModel.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getRazorpayClient } from "../utils/razorpayClient.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/v1/payments/create-order
// body: { orderId } — the Mongo order id from POST /api/v1/orders.
// Creates the corresponding Razorpay order using the server-computed
// totalAmount (never a client-supplied amount) and returns the public
// key id + Razorpay order id the frontend needs to open the checkout
// widget. The Razorpay key secret never leaves the server.
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body || {};

  if (!orderId || !isValidObjectId(orderId)) {
    return res.status(400).json({ success: false, message: "A valid orderId is required" });
  }

  const order = await Order.findById(orderId);
  if (!order || String(order.user) !== String(req.user.id)) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  if (order.paymentStatus !== "Pending") {
    return res.status(400).json({
      success: false,
      message: `This order is already ${order.paymentStatus.toLowerCase()}`,
    });
  }

  const razorpay = getRazorpayClient();

  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(order.totalAmount * 100), // paise
    currency: "INR",
    receipt: order._id.toString(),
  });

  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  res.status(200).json({
    success: true,
    data: {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order._id,
    },
  });
});

// POST /api/v1/payments/verify
// body: { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Verifies the payment signature server-side. Only on a verified match
// does this decrement stock and clear the cart — a failed/forged
// signature never finalizes an order.
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

  if (!orderId || !isValidObjectId(orderId) || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Missing required payment verification fields" });
  }

  const order = await Order.findById(orderId);
  if (!order || String(order.user) !== String(req.user.id)) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  if (order.paymentStatus === "Paid") {
    return res.status(200).json({ success: true, data: order }); // already verified — idempotent
  }

  if (order.razorpayOrderId !== razorpay_order_id) {
    return res.status(400).json({ success: false, message: "Order/payment mismatch" });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || keySecret.startsWith("replace_with")) {
    const error = new Error("Razorpay is not configured. Set RAZORPAY_KEY_SECRET in backend/.env");
    error.statusCode = 503;
    throw error;
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(String(razorpay_signature), "hex");

  const isValidSignature =
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

  if (!isValidSignature) {
    order.paymentStatus = "Failed";
    await order.save();
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  }

  // Atomically claim this order for processing before touching stock.
  // Without this, two concurrent verify calls for the same order (a
  // double-click, or a client callback racing a webhook) could both
  // pass the earlier "not yet Paid" check and both decrement stock —
  // this single conditional update ensures only one request ever wins
  // the race; the loser just returns the already-finalized order.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: "Paid" } },
    { $set: { paymentStatus: "Paid", orderStatus: "Processing", razorpayPaymentId: razorpay_payment_id } },
    { new: true }
  );

  if (!claimed) {
    // Another request already finalized this order — return its
    // current state rather than re-decrementing stock.
    const current = await Order.findById(order._id);
    return res.status(200).json({ success: true, data: current });
  }

  // Signature verified and this request won the claim — now safely
  // decrement stock. Each decrement is atomic and guarded so we never
  // oversell even under concurrent checkouts; if any item has run out
  // since the order was created, we roll back the ones we already
  // decremented rather than leave stock inconsistent.
  const decremented = [];
  let stockError = null;

  for (const item of claimed.items) {
    // eslint-disable-next-line no-await-in-loop
    const result = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
    if (result.modifiedCount === 0) {
      stockError = item;
      break;
    }
    decremented.push(item);
  }

  if (stockError) {
    // Roll back whatever we already decremented.
    await Promise.all(
      decremented.map((item) =>
        Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
      )
    );

    claimed.orderStatus = "Cancelled";
    await claimed.save();

    return res.status(409).json({
      success: false,
      message: `Payment succeeded but "${stockError.title}" is no longer in stock. Your order has been cancelled — please contact support for a refund.`,
      data: claimed,
    });
  }

  // Clear the cart only now that payment is confirmed, stock is
  // decremented, and the order is final.
  const cart = await Cart.findOne({ user: req.user.id });
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  res.status(200).json({ success: true, data: claimed });
});
