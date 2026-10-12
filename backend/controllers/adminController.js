import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";
import asyncHandler from "../utils/asyncHandler.js";

// GET /api/v1/admin/stats
// Admin only. Aggregate counts for the dashboard overview.
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalProducts, totalOrders, paidOrders, statusCounts, lowStockCount] =
    await Promise.all([
      User.countDocuments({}),
      Product.countDocuments({}),
      Order.countDocuments({}),
      Order.find({ paymentStatus: "Paid" }).select("totalAmount"),
      Order.aggregate([
        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      ]),
      Product.countDocuments({ stock: { $lte: 5 } }),
    ]);

  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const ordersByStatus = { Pending: 0, Processing: 0, Completed: 0, Cancelled: 0 };
  statusCounts.forEach((entry) => {
    if (entry._id in ordersByStatus) ordersByStatus[entry._id] = entry.count;
  });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      ordersByStatus,
      lowStockCount,
    },
  });
});
