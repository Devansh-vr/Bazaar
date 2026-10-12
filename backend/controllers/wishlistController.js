import mongoose from "mongoose";
import Wishlist from "../models/wishlistModel.js";
import Product from "../models/productModel.js";
import asyncHandler from "../utils/asyncHandler.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
};

// Drops any product refs that have since been deleted, so the response
// never contains null entries.
const formatWishlistResponse = (wishlist) => ({
  _id: wishlist._id,
  products: wishlist.products.filter(Boolean),
});

// GET /api/v1/wishlist
export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user.id);
  await wishlist.populate("products");
  res.status(200).json({ success: true, data: formatWishlistResponse(wishlist) });
});

// POST /api/v1/wishlist
// body: { productId }
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body || {};

  if (!productId || !isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: "A valid productId is required" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const wishlist = await getOrCreateWishlist(req.user.id);

  const alreadyPresent = wishlist.products.some(
    (id) => String(id) === String(productId)
  );
  if (!alreadyPresent) {
    wishlist.products.push(productId);
    await wishlist.save();
  }

  await wishlist.populate("products");
  res.status(200).json({ success: true, data: formatWishlistResponse(wishlist) });
});

// DELETE /api/v1/wishlist/:productId
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product id" });
  }

  const wishlist = await getOrCreateWishlist(req.user.id);
  const originalLength = wishlist.products.length;
  wishlist.products = wishlist.products.filter(
    (id) => String(id) !== String(productId)
  );

  if (wishlist.products.length === originalLength) {
    return res.status(404).json({ success: false, message: "Item not found in wishlist" });
  }

  await wishlist.save();
  await wishlist.populate("products");
  res.status(200).json({ success: true, data: formatWishlistResponse(wishlist) });
});

// GET /api/v1/wishlist/:productId/check
export const checkWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: "Invalid product id" });
  }

  const wishlist = await Wishlist.findOne({ user: req.user.id });
  const inWishlist = Boolean(
    wishlist && wishlist.products.some((id) => String(id) === String(productId))
  );

  res.status(200).json({ success: true, inWishlist });
});
