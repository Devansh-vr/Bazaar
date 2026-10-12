import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import connectDB from "./database/db.js";
import { notFound, errorHandler } from "./utils/errorHandler.js";

import userRoute from "./routes/userRoute.js";
import productRoute from "./routes/productRoute.js";
import cartRoute from "./routes/cartRoute.js";
import wishlistRoute from "./routes/wishlistRoute.js";
import orderRoute from "./routes/orderRoute.js";
import paymentRoute from "./routes/paymentRoute.js";
import adminRoute from "./routes/adminRoute.js";

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Security & core middleware
app.use(helmet());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true, // allows the HttpOnly refresh-token cookie to be sent
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API v1 routes
const API_PREFIX = "/api/v1";

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bazaar API is running",
  });
});

app.use(`${API_PREFIX}/user`, userRoute);
app.use(`${API_PREFIX}/products`, productRoute);
app.use(`${API_PREFIX}/cart`, cartRoute);
app.use(`${API_PREFIX}/wishlist`, wishlistRoute);
app.use(`${API_PREFIX}/orders`, orderRoute);
app.use(`${API_PREFIX}/payments`, paymentRoute);
app.use(`${API_PREFIX}/admin`, adminRoute);

// Error handling (must be last)
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Bazaar API server running on port ${PORT}`);
  });
};

startServer();
