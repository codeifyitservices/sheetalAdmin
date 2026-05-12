import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";

const ABANDONED_CART_STEPS = [
  {
    stage: "first",
    label: "Step 1",
    title: "1 min reminder",
    delayMinutes: 1,
  },
  {
    stage: "second",
    label: "Step 2",
    title: "6 hour reminder",
    delayMinutes: 6 * 60,
  },
  {
    stage: "third",
    label: "Step 3",
    title: "24 hour reminder",
    delayMinutes: 24 * 60,
  },
  {
    stage: "final",
    label: "Step 4",
    title: "48 hour final reminder",
    delayMinutes: 48 * 60,
  },
];

const formatRelativeAbandonedDate = (value) => {
  const diffDays = Math.floor((Date.now() - new Date(value)) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

const summarizeAttemptChannels = (attempt = {}) => {
  const channelEntries = Array.isArray(attempt?.metadata?.channels)
    ? attempt.metadata.channels
    : [];

  if (channelEntries.length > 0) {
    return channelEntries.map((entry) => ({
      channel: entry.channel,
      status: entry.failed ? "failed" : entry.skipped ? "skipped" : "sent",
      error: entry.error || entry.reason || null,
    }));
  }

  return (attempt.channels || []).map((channel) => ({
    channel,
    status:
      attempt.status === "success"
        ? "sent"
        : attempt.status === "failure"
          ? "failed"
          : "skipped",
    error: attempt.error || null,
  }));
};

const buildReminderCheckpoints = (cart) => {
  const attempts = Array.isArray(cart.abandonmentReminderAttempts)
    ? cart.abandonmentReminderAttempts
    : [];
  const abandonedAt = cart.abandonedAt || cart.updatedAt || new Date();

  return ABANDONED_CART_STEPS.map((step) => {
    const attempt = attempts.find((entry) => entry.stage === step.stage);
    const scheduledFor = new Date(
      new Date(abandonedAt).getTime() + step.delayMinutes * 60 * 1000,
    );

    return {
      ...step,
      status: attempt?.status || "pending",
      scheduledFor,
      attemptedAt: attempt?.attemptedAt || null,
      completedAt: attempt?.completedAt || null,
      channels: summarizeAttemptChannels(attempt),
      error: attempt?.error || null,
    };
  });
};

/**
 * Helper — builds a $match stage from query params.
 * Accepts:  ?period=weekly|monthly|yearly  OR  ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Falls back to last 7 days when nothing is supplied.
 */

/* ---------------- GROUPING ---------------- */

function buildGrouping(period) {
  switch (period) {
    case "yearly":
      return { format: "%Y-%m", label: "%b" };
    case "monthly":
    case "weekly":
    default:
      return { format: "%Y-%m-%d", label: "%d %b" };
  }
}

// FIX 1: Added missing `getGrouping` function used by `getChartData`
function getDateRange(period, refDateStr) {
  const refDate = refDateStr ? new Date(refDateStr) : new Date();
  let from = new Date(refDate);

  switch (period) {
    case "monthly":
      from.setDate(from.getDate() - 27); // 28 days
      break;

    case "yearly":
      from = new Date(from.getFullYear(), from.getMonth() - 11, 1);
      break;

    case "weekly":
    default:
      from.setDate(from.getDate() - 6);
      break;
  }

  from.setHours(0, 0, 0, 0);

  let to = new Date(refDate);
  // for yearly, extend to the end of the month
  if (period === "yearly") {
    to = new Date(to.getFullYear(), to.getMonth() + 1, 0);
  }
  to.setHours(23, 59, 59, 999);

  return { $gte: from, $lte: to };
}

function buildDateMatch(query = {}, period = "weekly") {
  const { startDate, endDate, refDate } = query;

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

  return { createdAt: getDateRange(period, refDate) };
}

function getReportDateMatch(query = {}, defaultPeriod = "overall") {
  const { startDate, endDate, period = defaultPeriod } = query;

  if (period === "overall" && !startDate && !endDate) {
    return {};
  }

  return buildDateMatch(query, period === "overall" ? "weekly" : period);
}

/* ---------------- GROUPING ---------------- */

function getGrouping(period) {
  switch (period) {
    case "yearly":
      return "%Y-%m"; // month
    case "monthly":
    case "weekly":
    default:
      return "%Y-%m-%d"; // day
  }
}

/* ---------------- WEEKLY FILL ---------------- */

function fillWeeklyData(results, refDateStr) {
  const days = [];
  const baseDate = refDateStr ? new Date(refDateStr) : new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);

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

function fillMonthlyData(results, refDateStr) {
  const data = [];
  const end = refDateStr ? new Date(refDateStr) : new Date();

  for (let i = 27; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);

    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
    });

    const found = results.find((r) => r.date === key);

    data.push(
      found || {
        date: key,
        name: label,
        sales: 0,
        revenue: 0,
        unitsSold: 0,
      },
    );
  }

  return data;
}

/* ---------------- YEARLY FILL ---------------- */

function fillYearlyData(results, refDateStr) {
  const months = [];
  const end = refDateStr ? new Date(refDateStr) : new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });

    const found = results.find((r) => r.date === key);

    months.push(
      found || {
        date: key,
        name: label,
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
      data = fillWeeklyData(results, req.query.refDate);
    }

    if (!hasCustomRange && period === "monthly") {
      data = fillMonthlyData(results, req.query.refDate);
    }

    if (!hasCustomRange && period === "yearly") {
      data = fillYearlyData(results, req.query.refDate);
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
    const period = req.query.period || "overall";
    const hasLimit = req.query.limit !== undefined;
    const requestedLimit = hasLimit ? parseInt(req.query.limit, 10) : null;
    const limit = hasLimit
      ? Math.min(Math.max(requestedLimit || 5, 1), 50)
      : null;
    const createdAtMatch = getReportDateMatch(req.query, "overall");

    const results = await Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["Cancelled", "Returned"] },
          ...createdAtMatch,
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
        },
      },
      {
        $sort: {
          unitsSold: -1,
          totalRevenue: -1,
        },
      },
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "product.status": "Active",
        },
      },
      ...(limit ? [{ $limit: limit }] : []),
      {
        $project: {
          _id: 0,
          productId: "$_id",
          name: "$product.name",
          image: "$product.mainImage.url",
          unitsSold: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
        },
      },
    ]);

    res
      .status(200)
      .json({ success: true, period, count: results.length, data: results });
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
// Returns carts not updated in 3+ days, with user + product details populated.
// Query: ?limit=20 (default 20, max 100)
// ─────────────────────────────────────────────────────────────────────────────
const ABANDONED_CART_RECOVERY_STEPS = {
  1: "1 min reminder",
  2: "6 hour reminder",
  3: "24 hour reminder",
  4: "48 hour final reminder",
};

const buildInclusiveDateRange = (startDate, endDate) => {
  const range = {};

  if (startDate) {
    range.$gte = new Date(startDate);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }

  return Object.keys(range).length > 0 ? range : null;
};

const buildCartDateMatch = (status, startDate, endDate) => {
  const range = buildInclusiveDateRange(startDate, endDate);
  if (!range) return null;

  return {
    [status === "completed" ? "completedAt" : "abandonedAt"]: range,
  };
};

const getRecoveryStageLabel = (stage) =>
  ABANDONED_CART_RECOVERY_STEPS[Number(stage)] || null;

export const getAbandonedCarts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 1000);
    const includeRecovered = req.query.includeRecovered === "true";
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const cartMatch = {
      "items.0": { $exists: true },
      abandonmentStatus: includeRecovered
        ? { $in: ["abandoned", "completed"] }
        : "abandoned",
    };

    if (includeRecovered) {
      const dateClauses = [];
      const abandonedDateMatch = buildCartDateMatch(
        "abandoned",
        startDate,
        endDate,
      );
      const recoveredDateMatch = buildCartDateMatch(
        "completed",
        startDate,
        endDate,
      );

      if (abandonedDateMatch) {
        dateClauses.push({
          abandonmentStatus: "abandoned",
          ...abandonedDateMatch,
        });
      }
      if (recoveredDateMatch) {
        dateClauses.push({
          abandonmentStatus: "completed",
          ...recoveredDateMatch,
        });
      }

      if (dateClauses.length > 0) {
        cartMatch.$or = dateClauses;
      }
    } else {
      const abandonedDateMatch = buildCartDateMatch(
        "abandoned",
        startDate,
        endDate,
      );
      if (abandonedDateMatch) {
        Object.assign(cartMatch, abandonedDateMatch);
      }
    }

    const recoveryDateRange = buildInclusiveDateRange(startDate, endDate);
    const recoveryMatch = {
      recoveredAt: { $ne: null },
      recoverySource: { $in: ["email", "whatsapp", "sms"] },
      recoveryStage: { $in: [1, 2, 3, 4] },
      orderStatus: { $nin: ["Cancelled", "Returned"] },
    };
    if (recoveryDateRange) {
      recoveryMatch.recoveredAt = recoveryDateRange;
    }

    const [carts, recoveryStats] = await Promise.all([
      Cart.find(cartMatch)
        .populate("user", "name email phoneNumber")
        .populate("items.product", "name images mainImage slug")
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),
      Order.aggregate([
        { $match: recoveryMatch },
        {
          $group: {
            _id: {
              source: "$recoverySource",
              stage: "$recoveryStage",
            },
            totalRecoveredAmount: { $sum: "$totalPrice" },
            recoveredOrders: { $sum: 1 },
          },
        },
        {
          $sort: {
            "_id.stage": 1,
            "_id.source": 1,
          },
        },
      ]),
    ]);

    const recoveryByCartId = new Map();
    if (includeRecovered) {
      const recoveryOrders = await Order.aggregate([
        { $match: recoveryMatch },
        { $sort: { recoveredAt: -1 } },
        {
          $group: {
            _id: "$recoveryCartId",
            totalRecoveredAmount: { $sum: "$totalPrice" },
            recoveredOrders: { $sum: 1 },
            recoverySource: { $first: "$recoverySource" },
            recoveryStage: { $first: "$recoveryStage" },
            recoveredAt: { $first: "$recoveredAt" },
          },
        },
      ]);

      recoveryOrders.forEach((row) => {
        if (row._id) {
          recoveryByCartId.set(String(row._id), row);
        }
      });
    }

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

        const items = cart.items.map((item) => {
          const activePrice =
            item.discountPrice > 0 ? item.discountPrice : item.price;

          return {
            productId: item.product?._id || item.product || null,
            name: item.product?.name || "Product",
            slug: item.product?.slug || null,
            image:
              item.variantImage ||
              item.product?.mainImage?.url ||
              item.product?.images?.[0] ||
              null,
            quantity: item.quantity,
            size: item.size || null,
            color: item.color || null,
            unitPrice: activePrice,
            lineTotal: Math.round(activePrice * item.quantity * 100) / 100,
          };
        });

        const checkpoints = buildReminderCheckpoints(cart);
        const recoveryRecord = recoveryByCartId.get(String(cart._id)) || null;
        const recoveredAtStage =
          recoveryRecord?.recoveryStage || cart.recoveredAtStage || null;
        const status =
          cart.abandonmentStatus === "completed" ? "recovered" : "abandoned";
        const eventDate =
          status === "recovered"
            ? recoveryRecord?.recoveredAt || cart.completedAt || cart.updatedAt
            : cart.abandonedAt || cart.updatedAt;

        return {
          cartId: cart.cartTrackingId || cart._id,
          mongoCartId: cart._id,
          userId: cart.user?._id,
          email: cart.email || cart.user?.email,
          phoneNumber: cart.phoneNumber || cart.user?.phoneNumber,
          name,
          initials,
          cartValue: Math.round(cartValue * 100) / 100,
          itemCount: cart.items.length,
          date: formatRelativeAbandonedDate(eventDate),
          lastActivityAt: cart.lastActivityAt || cart.updatedAt,
          abandonedAt: cart.abandonedAt || cart.updatedAt,
          recoveredAt: recoveryRecord?.recoveredAt || cart.completedAt || null,
          recoveredAtStage,
          recoveredAtStep: getRecoveryStageLabel(recoveredAtStage),
          recoveredRevenue:
            Math.round(
              Number(recoveryRecord?.totalRecoveredAmount || 0) * 100,
            ) / 100,
          status,
          abandonmentReason: cart.abandonmentReason || "inactivity",
          reminderAttemptsCount: cart.abandonmentReminderAttempts?.length || 0,
          checkpoints,
          items,
          previewImage: items[0]?.image || null,
        };
      })
      .filter(Boolean);

    const totalValue = data.reduce((sum, c) => sum + c.cartValue, 0);
    const abandonedCount = data.filter(
      (cart) => cart.status === "abandoned",
    ).length;
    const recoveredCount = data.filter(
      (cart) => cart.status === "recovered",
    ).length;
    const recoveredAmount = recoveryStats.reduce(
      (sum, entry) => sum + Number(entry.totalRecoveredAmount || 0),
      0,
    );
    const retentionRate =
      abandonedCount + recoveredCount > 0
        ? (recoveredCount / (abandonedCount + recoveredCount)) * 100
        : 0;

    res.status(200).json({
      success: true,
      count: data.length,
      abandonedCount,
      recoveredCount,
      totalAbandonedValue: Math.round(totalValue * 100) / 100,
      totalCartValue: Math.round(totalValue * 100) / 100,
      recoveredAmount: Math.round(recoveredAmount * 100) / 100,
      recoveredRevenue: Math.round(recoveredAmount * 100) / 100,
      retentionRate: Math.round(retentionRate * 100) / 100,
      recoveryStats,
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
