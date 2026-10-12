import express from "express";
import {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  getProfile,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshToken);
router.post("/logout", logoutUser);
router.get("/me", protect, getProfile);

export default router;
