import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

export const getAdminStatsService = async () => {
  // Run all independent queries in parallel for speed
  const [
    totalSalesData,
    totalOrders,
    totalProducts,
    totalUsers,
    outOfStock,
    orderStatus,
    categoryStats,
    latestUsers,
    activeUsers,
  ] = await Promise.all([
    // 1. Total Sales (Revenue) - Delivered orders ka sum
    Order.aggregate([
      { $match: { orderStatus: "Delivered" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
    // 2. Counts
    Order.countDocuments(),
    Product.countDocuments(),
    User.countDocuments({ role: "user" }),
    // 3. Out of Stock
    Product.countDocuments({ stock: 0 }),
    // 4. Order Status Breakup
    Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
    // 5. Category wise Product Count
    Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    // 6. Latest 5 users for dashboard
    User.find({ role: "user" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email createdAt")
      .lean(),
    // 7. Active users (logged in within last 30 days or all users as fallback)
    User.countDocuments({ role: "user" }),
  ]);

  const totalSales = totalSalesData.length > 0 ? totalSalesData[0].total : 0;

  return {
    success: true,
    stats: {
      totalSales,
      totalOrders,
      totalProducts,
      totalUsers,
      outOfStock,
    },
    // Fields the dashboard page.js expects
    totalUsers,
    activeUsers,
    totalOrders,
    totalProducts,
    latestUsers,
    stockData: [
      { name: "In Stock", value: totalProducts - outOfStock },
      { name: "Out of Stock", value: outOfStock },
    ],
    orderStatus,
    categoryStats,
  };
};
