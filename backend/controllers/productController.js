import mongoose from "mongoose";
import Product from "../models/productModel.js";
import asyncHandler from "../utils/asyncHandler.js";
import { validateProductInput } from "../utils/validators.js";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;

const SORT_OPTIONS = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { averageRating: -1 },
  newest: { createdAt: -1 },
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/v1/products
// Public. Supports pagination, title search, category/brand filters,
// and sorting.
export const getProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT)
  );

  const filter = {};

  if (req.query.search && req.query.search.trim()) {
    // Case-insensitive partial match on title (not the full-text index,
    // so it behaves like a normal "search as you type" title search).
    filter.title = { $regex: req.query.search.trim(), $options: "i" };
  }

  if (req.query.category && req.query.category.trim()) {
    filter.category = req.query.category.trim();
  }

  if (req.query.brand && req.query.brand.trim()) {
    filter.brand = req.query.brand.trim();
  }

  const sortKey = SORT_OPTIONS[req.query.sort] ? req.query.sort : "newest";
  const sort = SORT_OPTIONS[sortKey];

  const [products, totalItems] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    },
  });
});

// GET /api/v1/products/filters
// Public. Returns the distinct categories/brands currently in the
// catalog, so the frontend can populate filter dropdowns.
export const getProductFilters = asyncHandler(async (req, res) => {
  const [categories, brands] = await Promise.all([
    Product.distinct("category"),
    Product.distinct("brand"),
  ]);

  res.status(200).json({
    success: true,
    categories: categories.filter(Boolean).sort(),
    brands: brands.filter(Boolean).sort(),
  });
});

// GET /api/v1/products/:id
// Public.
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid product id" });
  }

  const product = await Product.findById(id);

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  res.status(200).json({ success: true, data: product });
});

// POST /api/v1/products
// Admin only.
export const createProduct = asyncHandler(async (req, res) => {
  const { title, description, price, category, brand, stock, images } = req.body || {};

  const errors = validateProductInput({ title, description, price, category, stock });
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  const product = await Product.create({
    title: title.trim(),
    description: description.trim(),
    price: Number(price),
    category: category.trim(),
    brand: brand ? String(brand).trim() : undefined,
    stock: stock !== undefined && stock !== null && stock !== "" ? Number(stock) : 0,
    images: Array.isArray(images) ? images : [],
  });

  res.status(201).json({ success: true, data: product });
});

// PUT /api/v1/products/:id
// Admin only. Partial update — only provided fields are validated/changed.
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid product id" });
  }

  const { title, description, price, category, brand, stock, images } = req.body || {};

  const errors = validateProductInput(
    { title, description, price, category, stock },
    { partial: true }
  );
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  const updates = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (description !== undefined) updates.description = String(description).trim();
  if (price !== undefined) updates.price = Number(price);
  if (category !== undefined) updates.category = String(category).trim();
  if (brand !== undefined) updates.brand = String(brand).trim();
  if (stock !== undefined) updates.stock = Number(stock);
  if (images !== undefined) updates.images = Array.isArray(images) ? images : [];

  const product = await Product.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  res.status(200).json({ success: true, data: product });
});

// DELETE /api/v1/products/:id
// Admin only.
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid product id" });
  }

  const product = await Product.findByIdAndDelete(id);

  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  res.status(200).json({ success: true, message: "Product deleted successfully" });
});
