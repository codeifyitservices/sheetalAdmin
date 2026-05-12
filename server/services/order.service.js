import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Cart from "../models/cart.model.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { createShiprocketOrder } from "./shiprocket.service.js";
import { sendOrderConfirmationEmail } from "./order.email.service.js";
import { completeAbandonedCartFlow } from "./abandonedCart.service.js";
import { confirmCouponUsageForOrder } from "./coupon.service.js";
import { redeemAbandonedCartCoupon } from "./abandonedcartcoupon.service.js";

const normalizeOrderStats = (orderStats = {}) => {
  if (!orderStats || typeof orderStats !== "object" || Array.isArray(orderStats)) {
    return { totalOrders: 0, totalRevenue: 0 };
  }

  return {
    totalOrders: Number(orderStats.totalOrders) || 0,
    totalRevenue: Number(orderStats.totalRevenue) || 0,
  };
};

const normalizeAddress = (address = {}) => ({
  fullName: String(address?.fullName || "").trim(),
  phoneNumber: String(address?.phoneNumber || "").trim(),
  addressLine1: String(address?.addressLine1 || "").trim(),
  city: String(address?.city || "").trim(),
  state: String(address?.state || "").trim(),
  postalCode: String(address?.postalCode || "").trim(),
  country: String(address?.country || "India").trim() || "India",
});

const ensureAddress = (address, label) => {
  const normalized = normalizeAddress(address);
  const requiredFields = [
    "fullName",
    "phoneNumber",
    "addressLine1",
    "city",
    "state",
    "postalCode",
  ];

  for (const field of requiredFields) {
    if (!normalized[field]) {
      throw new ErrorResponse(`${label}.${field} is required`, 400);
    }
  }

  return normalized;
};

export const applyOrderInventoryAdjustments = async (orderItems = []) => {
  await Promise.all(orderItems.map(async (item) => {
    const product = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.quantity } },
      [
        {
          $set: {
            stock: { $subtract: ["$stock", item.quantity] },
            orderStats: {
              totalOrders: {
                $add: [
                  {
                    $cond: [
                      { $eq: [{ $type: "$orderStats" }, "object"] },
                      { $ifNull: ["$orderStats.totalOrders", 0] },
                      0,
                    ],
                  },
                  item.quantity,
                ],
              },
              totalRevenue: {
                $add: [
                  {
                    $cond: [
                      { $eq: [{ $type: "$orderStats" }, "object"] },
                      { $ifNull: ["$orderStats.totalRevenue", 0] },
                      0,
                    ],
                  },
                  item.quantity * item.price,
                ],
              },
            },
          },
        },
      ],
      { new: true, validateBeforeSave: false },
    );

    if (!product) {
      const checkProduct = await Product.findById(item.product).lean();
      if (!checkProduct) {
        throw new ErrorResponse(`Product not found: ${item.product}`, 404);
      }

      throw new ErrorResponse(
        `${checkProduct.name} ka stock khatam hai! (Available: ${checkProduct.stock})`,
        400,
      );
    }
  }));
};

export const revertOrderInventoryAdjustments = async (orderItems = []) => {
  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    const orderStats = normalizeOrderStats(product.orderStats);
    product.stock += item.quantity;
    product.orderStats = {
      totalOrders: Math.max(0, orderStats.totalOrders - item.quantity),
      totalRevenue: Math.max(
        0,
        orderStats.totalRevenue - item.quantity * item.price,
      ),
    };
    await product.save();
  }
};

const resolveOrderUser = async (data, requester) => {
  if (!requester?._id) {
    throw new ErrorResponse("User not found", 404);
  }

  const isAdminOrder = data?.isCreatedByAdmin && requester.role === "admin";
  if (!isAdminOrder) {
    return requester._id;
  }

  if (data?.customerId) {
    const customer = await User.findById(data.customerId).select("_id");
    if (!customer) {
      throw new ErrorResponse("Customer not found for manual order", 404);
    }
    return customer._id;
  }

  const normalizedEmail =
    typeof data.userEmail === "string" ? data.userEmail.trim().toLowerCase() : "";
  const normalizedPhone =
    typeof data?.shippingAddress?.phoneNumber === "string"
      ? data.shippingAddress.phoneNumber.trim()
      : "";

  const lookup = normalizedEmail
    ? { email: normalizedEmail }
    : normalizedPhone
      ? { phoneNumber: normalizedPhone }
      : null;

  if (!lookup) {
    throw new ErrorResponse("Existing customer email or phone number is required", 400);
  }

  const customer = await User.findOne(lookup).select("_id");
  if (!customer) {
    throw new ErrorResponse("Customer not found for manual order", 404);
  }

  return customer._id;
};

// --- CREATE NEW ORDER ---
export const createOrderService = async (data, requester) => {
  const {
    orderItems,
    shippingAddress,
    billingAddress,
    paymentInfo,
    buyNowItems = [],
    cartItems = [],
    recoverySource = null,
    recoveryStage = null,
    recoveryCartId = null,
    recoveryCycleId = null,
  } = data;
  const userId = await resolveOrderUser(data, requester);

  const isBuyNow = Array.isArray(buyNowItems) && buyNowItems.length > 0;

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    throw new ErrorResponse("At least one order item is required", 400);
  }

  const normalizedShippingAddress = ensureAddress(
    shippingAddress,
    "shippingAddress",
  );
  const normalizedBillingAddress = billingAddress
    ? ensureAddress(billingAddress, "billingAddress")
    : { ...normalizedShippingAddress };

  // 1. Parallel pre-checks and data fetching
  const [user, abandonedCartCouponRecordId] = await Promise.all([
    User.findById(userId).lean(),
    !isBuyNow
      ? Cart.findOne({ user: userId }).lean().then(cart => cart?.appliedAbandonedCoupon?.couponRecordId ?? null)
      : Promise.resolve(null)
  ]);

  if (!user) throw new ErrorResponse("User not found", 404);

  // 2. Atomic Stock check and update in parallel
  await applyOrderInventoryAdjustments(orderItems);

  // 3. Build order document
  const finalOrderData = {
    user: userId,
    orderItems,
    shippingAddress: normalizedShippingAddress,
    billingAddress: normalizedBillingAddress,
    paymentInfo: {
      id: paymentInfo?.id || `manual_${Date.now()}`,
      status: paymentInfo?.status || "Pending",
      method: paymentInfo?.method || "COD",
      displayMethod: paymentInfo?.displayMethod || (paymentInfo?.method === "COD" ? "Cash on Delivery" : "Online"),
    },
    couponId: data.couponId || null,
    couponCode: data.couponCode || "",
    discountPrice: Number(data.discountPrice) || 0,
    itemsPrice: data.itemsPrice || 0,
    taxPrice: data.taxPrice || 0,
    shippingPrice: data.shippingPrice || 0,
    totalPrice: data.totalPrice || 0,
    recoverySource,
    recoveryStage: recoveryStage ? Number(recoveryStage) : null,
    recoveryCartId: recoveryCartId || null,
    recoveryCycleId: recoveryCycleId || null,
    recoveredAt: recoverySource ? new Date() : null,
    purchaseSource: isBuyNow ? "buyNow" : "cart",
    inventoryAdjusted: true,
    orderStatus: "Processing",
    paidAt: paymentInfo?.method === "Online" ? Date.now() : null,
  };

  // 4. Persist Order
  const order = await Order.create(finalOrderData);

  // 5. Background / Non-blocking tasks
  setImmediate(async () => {
    try {
      // 5a. Push order reference into user
      await User.findByIdAndUpdate(userId, { $push: { orders: order._id } }).catch(err => console.error("[Background] User Update Error:", err.message));

      // 5b. Handle Coupon & Cart
      if (order.paymentInfo?.method === "COD") {
        if (abandonedCartCouponRecordId) {
          await redeemAbandonedCartCoupon({ couponRecordId: abandonedCartCouponRecordId, orderId: order._id }).catch(err => console.error("[Background] Coupon Redeem Error:", err.message));
        } else if (order.couponCode) {
          await confirmCouponUsageForOrder(order).catch(err => console.error("[Background] Coupon Confirm Error:", err.message));
        }

        if (!isBuyNow) {
          await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } }).catch(err => console.error("[Background] Cart Clear Error:", err.message));
        }
      }

      // 5c. Shiprocket Integration
      if (order.paymentInfo?.method === "COD" || order.paymentInfo?.status === "Paid") {
        try {
          const { shiprocketOrderId, shipmentId } = await createShiprocketOrder(order, user);
          await Order.findByIdAndUpdate(order._id, { shiprocketOrderId, shipmentId });
        } catch (srError) {
          console.error(`[Background] Shiprocket Error for order ${order._id}:`, srError.message);
        }
      }

      // 5d. Abandoned Cart Flow Completion
      await completeAbandonedCartFlow({ userId }).catch(err => console.error("[Background] Abandoned Cart Flow Error:", err.message));

      // 5e. Order Confirmation Email
      await sendOrderConfirmationEmail({ order, user }).catch(err => console.error("[Background] Email Error:", err.message));

    } catch (bgError) {
      console.error("[Order Background Task Critical Failure]:", bgError);
    }
  });

  return order;
};

// --- UPDATE ORDER STATUS (Admin Only) ---
export const updateOrderStatusService = async (
  orderId,
  status,
  trackingData = {},
) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ErrorResponse("Order nahi mila", 404);

  if (order.orderStatus === "Delivered") {
    throw new ErrorResponse("Ye order pehle hi deliver ho chuka hai", 400);
  }

  if (status === "Cancelled" || status === "Returned") {
    if (order.inventoryAdjusted) {
      await revertOrderInventoryAdjustments(order.orderItems);
      order.inventoryAdjusted = false;
    }
    try {
      await User.findByIdAndUpdate(order.user, {
        $pull: { orders: order._id },
      });
    } catch (userUpdateErr) {
      console.error(
        `[Order] Failed to pull order ref from user ${order.user}:`,
        userUpdateErr.message,
      );
    }
  }

  order.orderStatus = status;
  if (status === "Delivered") order.deliveredAt = Date.now();
  if (trackingData.trackingId) order.trackingId = trackingData.trackingId;
  if (trackingData.courierPartner)
    order.courierPartner = trackingData.courierPartner;

  await order.save();
  return order;
};

// --- GET MY ORDERS (User) ---
export const getMyOrdersService = async (userId) => {
  return await Order.find({ user: userId }).sort("-createdAt");
};

// --- GET SINGLE ORDER ---
export const getSingleOrderService = async (orderId, userId) => {
  const order = await Order.findById(orderId).populate(
    "orderItems.product",
    "name mainImage slug",
  );
  if (!order) throw new ErrorResponse("Order not found", 404);
  if (order.user.toString() !== userId.toString()) {
    throw new ErrorResponse("You are not authorised to view this order", 403);
  }
  return order;
};

export const getSingleOrderAdminService = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate("orderItems.product", "name mainImage slug")
    .populate("user", "name email");

  if (!order) {
    throw new ErrorResponse("Order not found", 404);
  }

  return order;
};

// --- GET ALL ORDERS ---
export const getAllOrdersService = async (queryStr, userId = null) => {
  const page = parseInt(queryStr.page) || 1;
  const limit = parseInt(queryStr.limit) || 10;
  const skip = (page - 1) * limit;

  let filter = {};
  if (userId) filter.user = userId;
  if (queryStr.status) filter.orderStatus = queryStr.status;

  if (queryStr.startDate || queryStr.endDate) {
    filter.createdAt = {};
    if (queryStr.startDate) {
      const start = new Date(queryStr.startDate);
      start.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = start;
    }
    if (queryStr.endDate) {
      const end = new Date(queryStr.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const orders = await Order.find(filter)
    .populate("user", "name email")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit)
    .lean();

  const totalOrders = await Order.countDocuments(filter);

  return {
    orders,
    totalOrders,
    currentPage: page,
    totalPages: Math.ceil(totalOrders / limit),
    hasNextPage: page * limit < totalOrders,
    hasPrevPage: page > 1,
  };
};
