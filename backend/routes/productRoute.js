import express from "express";
import {
  getProducts,
  getProductFilters,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import {
  getProductReviews,
  upsertReview,
  deleteOwnReview,
} from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/filters", getProductFilters); // must precede /:id
router.get("/:id", getProductById);
router.post("/", protect, authorizeRoles("Admin"), createProduct);
router.put("/:id", protect, authorizeRoles("Admin"), updateProduct);
router.delete("/:id", protect, authorizeRoles("Admin"), deleteProduct);

router.get("/:id/reviews", getProductReviews);
router.post("/:id/reviews", protect, upsertReview);
router.delete("/:id/reviews", protect, deleteOwnReview);

export default router;
