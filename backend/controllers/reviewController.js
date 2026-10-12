import mongoose from "mongoose";
import Review from "../models/reviewModel.js";
import Product from "../models/productModel.js";
import asyncHandler from "../utils/asyncHandler.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Recomputes and persists a product's averageRating/totalRatings from
// its current set of reviews. Called after any review create/update/delete.
const recomputeProductRating = async (productId) => {
  const reviews = await Review.find({ product: productId });
  const totalRatings = reviews.length;
  const averageRating =
    totalRatings === 0
      ? 0
      : Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings) * 10) / 10;

  await Product.findByIdAndUpdate(productId, { averageRating, totalRatings });
};

// GET /api/v1/products/:id/reviews
export const getProductReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid product id" });
  }

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const reviews = await Review.find({ product: id })
    .sort({ createdAt: -1 })
    .populate("user", "firstName lastName");

  res.status(200).json({ success: true, data: reviews });
});

// POST /api/v1/products/:id/reviews
// body: { rating, comment }. Creates the caller's review for this
// product, or updates it if they've already reviewed it (one review
// per user per product).
export const upsertReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body || {};

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid product id" });
  }

  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ success: false, message: "Rating must be a whole number between 1 and 5" });
  }

  if (comment && String(comment).length > 1000) {
    return res.status(400).json({ success: false, message: "Comment cannot exceed 1000 characters" });
  }

  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const review = await Review.findOneAndUpdate(
    { product: id, user: req.user.id },
    { rating: numericRating, comment: comment ? String(comment).trim() : "" },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate("user", "firstName lastName");

  await recomputeProductRating(id);

  res.status(200).json({ success: true, data: review });
});

// DELETE /api/v1/products/:id/reviews
// Removes the caller's own review for this product.
export const deleteOwnReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid product id" });
  }

  const review = await Review.findOneAndDelete({ product: id, user: req.user.id });

  if (!review) {
    return res.status(404).json({ success: false, message: "You haven't reviewed this product" });
  }

  await recomputeProductRating(id);

  res.status(200).json({ success: true, message: "Review deleted" });
});
