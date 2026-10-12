import express from "express";
import { getDashboardStats } from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/stats", protect, authorizeRoles("Admin"), getDashboardStats);

export default router;
