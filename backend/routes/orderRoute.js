import express from "express";
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, createOrder);
router.get("/", protect, authorizeRoles("Admin"), getAllOrders); // admin-only, must precede /:id
router.get("/my-orders", protect, getMyOrders); // must precede /:id
router.get("/:id", protect, getOrderById);
router.put("/:id/status", protect, authorizeRoles("Admin"), updateOrderStatus);

export default router;
