import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import AbandonedCartCycle from "../models/abandonedCartCycle.model.js";
import { sendAbandonedCartEmail } from "../services/abandonedCart.service.js";

/**
 * Helper — builds a $match stage from query params.
 * Accepts:  ?period=weekly|monthly|yearly  OR  ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Falls back to last 7 days when nothing is supplied.
 */

/* ---------------- GROUPING ---------------- */

function buildGrouping(period) {
  switch (period) {
    case "monthly":
      return {
        format: "%Y-%U", // week number
        label: "Week %U",
      };

    case "yearly":
      return {
        format: "%Y-%m", // month
        label: "%b",
      };

    default:
      return {
        format: "%Y-%m-%d", // day
        label: "%d %b",
      };
  }
}

// FIX 1: Added missing `getGrouping` function used by `getChartData`
function getDateRange(period) {
  const now = new Date();
  let from;

  switch (period) {
    case "monthly":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    case "yearly":
      from = new Date(now.getFullYear(), 0, 1);
      break;

    case "weekly":
    default:
      from = new Date();
      from.setDate(now.getDate() - 6);
      break;
  }

  from.setHours(0, 0, 0, 0);
  return { $gte: from };
}

function buildDateMatch(query = {}, period = "weekly") {
  const { startDate, endDate } = query;

  if (startDate || endDate) {
    const match = {};
    if (startDate) match.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match.$lte = end;
    }
    return { createdAt: match };
  }

  return { createdAt: getDateRange(period) };
}

/* ---------------- GROUPING ---------------- */

function getGrouping(period) {
  switch (period) {
    case "monthly":
      return "%Y-%U"; // week number

    case "yearly":
      return "%Y-%m"; // month

    default:
      return "%Y-%m-%d"; // day
  }
}

/* ---------------- WEEKLY FILL ---------------- */

function fillWeeklyData(results) {
  const days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);

    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
    });

    const found = results.find((r) => r.date === key);

    days.push(
      found || {
        date: key,
        name: label,
        sales: 0,
        revenue: 0,
        unitsSold: 0,
      },
    );
  }

  return days;
}

/* ---------------- MONTHLY FILL ---------------- */

function fillMonthlyData(results) {
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const data = [];

  weeks.forEach((week, i) => {
    const found = results[i];

    data.push(
      found || {
        name: week,
        sales: 0,
        revenue: 0,
        unitsSold: 0,
      },
    );
  });

  return data;
}

/* ---------------- YEARLY FILL ---------------- */

function fillYearlyData(results) {
  const months = [];
  const year = new Date().getFullYear();

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  for (let i = 0; i < 12; i++) {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;

    const found = results.find((r) => r.date === key);

    months.push(
      found || {
        date: key,
        name: monthNames[i],
        sales: 0,
        revenue: 0,
        unitsSold: 0,
      },
    );
  }

  return months;
}
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/sales-data
// Query: period=weekly|monthly|yearly  OR  startDate / endDate
// Returns: number of orders (count) grouped by date bucket
// ─────────────────────────────────────────────────────────────────────────────
export const getSalesData = async (req, res) => {
  try {
    const period = req.query.period || "weekly";
    const dateMatch = buildDateMatch(req.query);
    const { format, label } = buildGrouping(period);

    const results = await Order.aggregate([
      // 1. Filter by date range & exclude cancelled orders
      {
        $match: {
          ...dateMatch,
          orderStatus: { $nin: ["Cancelled"] },
        },
      },

      // 2. Group by date bucket — count orders + total items sold
      {
        $group: {
          _id: { $dateToString: { format, date: "$createdAt" } },
          label: {
            $first: { $dateToString: { format: label, date: "$createdAt" } },
          },
          orders: { $sum: 1 },
          unitsSold: { $sum: { $sum: "$orderItems.quantity" } },
        },
      },

      // 3. Sort chronologically
      { $sort: { _id: 1 } },

      // 4. Shape output
      {
        $project: {
          _id: 0,
          date: "$_id",
          name: "$label",
          sales: "$orders",
          unitsSold: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      period,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("[getSalesData]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales data.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/revenue-data
// Query: period=weekly|monthly|yearly  OR  startDate / endDate
// Returns: totalRevenue (itemsPrice) grouped by date bucket
// ─────────────────────────────────────────────────────────────────────────────
export const getRevenueData = async (req, res) => {
  try {
    const period = req.query.period || "weekly";
    const dateMatch = buildDateMatch(req.query);
    const { format, label } = buildGrouping(period);

    const results = await Order.aggregate([
      // 1. Filter by date range — only count revenue from delivered / processing orders
      {
        $match: {
          ...dateMatch,
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },

      // 2. Group by date bucket — sum revenue fields
      {
        $group: {
          _id: { $dateToString: { format, date: "$createdAt" } },
          label: {
            $first: { $dateToString: { format: label, date: "$createdAt" } },
          },
          revenue: { $sum: "$totalPrice" },
          itemsRevenue: { $sum: "$itemsPrice" },
          tax: { $sum: "$taxPrice" },
          shipping: { $sum: "$shippingPrice" },
          orders: { $sum: 1 },
        },
      },

      // 3. Sort chronologically
      { $sort: { _id: 1 } },

      // 4. Shape output
      {
        $project: {
          _id: 0,
          date: "$_id",
          name: "$label",
          revenue: { $round: ["$revenue", 2] },
          itemsRevenue: { $round: ["$itemsRevenue", 2] },
          tax: { $round: ["$tax", 2] },
          shipping: { $round: ["$shipping", 2] },
          orders: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      period,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("[getRevenueData]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue data.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/chart-data
// Combines sales + revenue into one payload so the chart needs one request
// ─────────────────────────────────────────────────────────────────────────────
export const getChartData = async (req, res) => {
  try {
    const period = req.query.period || "weekly";
    const hasCustomRange = Boolean(req.query.startDate || req.query.endDate);
    const dateMatch = buildDateMatch(req.query, period);

    const results = await Order.aggregate([
      {
        $match: {
          ...dateMatch,
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: getGrouping(period),
              date: "$createdAt",
            },
          },
          sales: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
          unitsSold: { $sum: { $sum: "$orderItems.quantity" } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          name: "$_id",
          sales: 1,
          revenue: { $round: ["$revenue", 2] },
          unitsSold: 1,
        },
      },
    ]);

    let data = results;

    if (!hasCustomRange && period === "weekly") {
      data = fillWeeklyData(results);
    }

    if (!hasCustomRange && period === "monthly") {
      data = fillMonthlyData(results);
    }

    if (!hasCustomRange && period === "yearly") {
      data = fillYearlyData(results);
    }

    const totals = data.reduce(
      (acc, d) => ({
        sales: acc.sales + d.sales,
        revenue: acc.revenue + d.revenue,
        unitsSold: acc.unitsSold + d.unitsSold,
      }),
      { sales: 0, revenue: 0, unitsSold: 0 },
    );

    res.status(200).json({
      success: true,
      period,
      totals,
      data,
    });
  } catch (error) {
    console.error("[getChartData]", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch chart data",
      error: error.message,
    });
  }
};

export const getBestSellingProducts = async (req, res) => {
  try {
    const hasLimit = req.query.limit !== undefined;
    const requestedLimit = hasLimit ? parseInt(req.query.limit, 10) : null;
    const limit = hasLimit
      ? Math.min(Math.max(requestedLimit || 5, 1), 50)
      : null;

    const results = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["Cancelled", "Returned"] },
        },
      },
      {
        $unwind: "$orderItems",
      },
      {
        $match: {
          "orderItems.product": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$orderItems.product",
          unitsSold: { $sum: "$orderItems.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: ["$orderItems.quantity", "$orderItems.price"],
            },
          },
          fallbackName: { $first: "$orderItems.name" },
          fallbackImage: { $first: "$orderItems.image" },
        },
      },
      {
        $sort: {
          totalRevenue: -1,
          unitsSold: -1,
        },
      },
      ...(limit ? [{ $limit: limit }] : []),
      {
        $lookup: {
          from: Product.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          name: { $ifNull: ["$product.name", "$fallbackName"] },
          image: { $ifNull: ["$product.mainImage.url", "$fallbackImage"] },
          unitsSold: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
        },
      },
    ]);

    res.status(200).json({ success: true, count: results.length, data: results });
  } catch (error) {
    console.error("[getBestSellingProducts]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch best-selling products.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sales/abandoned-carts
// Returns carts not updated in 7+ days, with user + product details populated.
// Query: ?limit=20 (default 20, max 100)
// ─────────────────────────────────────────────────────────────────────────────
export const getAbandonedCarts = async (req, res) => {
  try {
    const ABANDONED_DAYS = 7;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ABANDONED_DAYS);
    cutoff.setHours(0, 0, 0, 0);

    const carts = await Cart.find({ updatedAt: { $lt: cutoff } })
      .populate("user", "name email")
      .populate("items.product", "name images")
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    const data = carts
      .map((cart) => {
        const cartValue = cart.items.reduce((sum, item) => {
          const price =
            item.discountPrice > 0 ? item.discountPrice : item.price;
          return sum + price * item.quantity;
        }, 0);

        if (cartValue <= 0) return null; // ❗ skip empty carts

        const name = cart.user?.name || cart.user?.email || "Unknown";
        const initials = name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const diffDays = Math.floor(
          (Date.now() - new Date(cart.updatedAt)) / 86_400_000,
        );

        let date;
        if (diffDays === 0) date = "Today";
        else if (diffDays === 1) date = "Yesterday";
        else if (diffDays < 7) date = `${diffDays}d ago`;
        else if (diffDays < 30) date = `${Math.floor(diffDays / 7)}w ago`;
        else
          date = new Date(cart.updatedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          });

        return {
          cartId: cart._id,
          userId: cart.user?._id,
          email: cart.user?.email,
          name,
          initials,
          cartValue: Math.round(cartValue * 100) / 100,
          itemCount: cart.items.length,
          date,
          lastUpdated: cart.updatedAt,
          previewImage:
            cart.items[0]?.variantImage ||
            cart.items[0]?.product?.images?.[0] ||
            null,
        };
      })
      .filter(Boolean);

    const totalValue = data.reduce((sum, c) => sum + c.cartValue, 0);

    res.status(200).json({
      success: true,
      count: data.length,
      totalAbandonedValue: Math.round(totalValue * 100) / 100,
      data,
    });
  } catch (error) {
    console.error("[getAbandonedCarts]", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch abandoned carts.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/abandoned-carts/send-recovery
// Body: { email: string }
// Triggers a recovery email and stamps recoverySentAt on the cart.
// ─────────────────────────────────────────────────────────────────────────────
export const sendAbandonedCartRecovery = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required.",
      });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const liveCart = await Cart.findOne({ user: user._id }).populate(
      "items.product",
      "name images",
    );

    let items = liveCart?.items || [];
    let cartValue = items.reduce((sum, item) => {
      const price = item.discountPrice > 0 ? item.discountPrice : item.price;
      return sum + price * item.quantity;
    }, 0);

    if (!liveCart || !liveCart.items.length || cartValue <= 0) {
      const cycle = await AbandonedCartCycle.findOne({
        user: user._id,
        status: "abandoned",
        itemsSnapshot: { $exists: true, $ne: [] },
      })
        .sort({ abandonedAt: -1 })
        .lean();

      if (!cycle || !Array.isArray(cycle.itemsSnapshot) || cycle.itemsSnapshot.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No abandoned cart snapshot found.",
        });
      }

      items = cycle.itemsSnapshot;
      cartValue =
        Number(cycle.cartValue || 0) > 0
          ? Number(cycle.cartValue)
          : items.reduce((sum, item) => {
              const price =
                Number(item.discountPrice || 0) > 0
                  ? Number(item.discountPrice || 0)
                  : Number(item.price || 0);
              return sum + price * Number(item.quantity || 1);
            }, 0);

      if (cartValue <= 0) {
        return res.status(400).json({
          success: false,
          message: "Cart snapshot has no value.",
        });
      }
    }

    await sendAbandonedCartEmail({
      name: user.name || user.email,
      email: user.email,
      items,
      cartValue,
    });

    if (liveCart?._id) {
      await Cart.findByIdAndUpdate(liveCart._id, {
        recoverySentAt: new Date(),
      });
    }

    console.log(`[AbandonedCarts] Recovery email sent → ${email}`);

    res.status(200).json({
      success: true,
      message: `Recovery email sent to ${email}.`,
    });
  } catch (error) {
    console.error("[sendAbandonedCartRecovery]", error);

    res.status(500).json({
      success: false,
      message: "Failed to send recovery email.",
      error: error.message,
    });
  }
};
