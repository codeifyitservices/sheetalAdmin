import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Cart from "../models/cart.model.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { createShiprocketOrder } from "./shiprocket.service.js";
import { sendOrderConfirmationEmail } from "./order.email.service.js";
import { completeAbandonedCartFlow } from "./abandonedCart.service.js";
import { confirmCouponUsageForOrder } from "./coupon.service.js";

// --- CREATE NEW ORDER ---
export const createOrderService = async (data, userId) => {
  const {
    orderItems,
    shippingAddress,
    billingAddress,
    paymentInfo,
    buyNowItems = [],
    cartItems = [],
  } = data;
  const user = await User.findById(userId).lean();
  const isBuyNow = Array.isArray(buyNowItems) && buyNowItems.length > 0;

  // 1. Stock Check aur Update Logic
  // Hum har item par loop chalayenge taaki inventory update ho sake
  for (const item of orderItems) {
    const product = await Product.findById(item.product);

    if (!product) {
      throw new ErrorResponse(
        `Product not found with ID: ${item.product}`,
        404,
      );
    }

    if (product.stock < item.quantity) {
      throw new ErrorResponse(
        `${product.name} ka stock khatam hai! (Available: ${product.stock})`,
        400,
      );
    }

    // Product stock kam karein
    product.stock -= item.quantity;

    product.orderStats.totalOrders += item.quantity;
    product.orderStats.totalRevenue += item.quantity * item.price;

    await product.save({ validateBeforeSave: false });
  }

  // 2. Data Formatting (Schema ke hisaab se)
  const finalOrderData = {
    user: userId,
    orderItems,
    shippingAddress: {
      fullName: shippingAddress.fullName,
      phoneNumber: shippingAddress.phoneNumber,
      addressLine1: shippingAddress.addressLine1,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country || "India",
    },
    billingAddress: {
      fullName: billingAddress?.fullName || shippingAddress.fullName,
      phoneNumber: billingAddress?.phoneNumber || shippingAddress.phoneNumber,
      addressLine1:
        billingAddress?.addressLine1 || shippingAddress.addressLine1,
      city: billingAddress?.city || shippingAddress.city,
      state: billingAddress?.state || shippingAddress.state,
      postalCode: billingAddress?.postalCode || shippingAddress.postalCode,
      country: billingAddress?.country || shippingAddress.country || "India",
    },
    paymentInfo: {
      id: paymentInfo?.id || `manual_${Date.now()}`, // Admin order ke liye manual ID
      status: paymentInfo?.status || "Pending",
      method: paymentInfo?.method || "COD",
    },
    couponId: data.couponId || null,
    couponCode: data.couponCode || "",
    discountPrice: Number(data.discountPrice) || 0,
    itemsPrice: data.itemsPrice || 0,
    taxPrice: data.taxPrice || 0,
    shippingPrice: data.shippingPrice || 0,
    totalPrice: data.totalPrice || 0,
    purchaseSource: isBuyNow ? "buyNow" : "cart",
    orderStatus: "Processing", // Default status as per your schema
    paidAt: paymentInfo?.method === "Online" ? Date.now() : null,
  };

  // 3. Database mein save karein
  const order = await Order.create(finalOrderData);

  // 4. Push order reference into the user's orders array
  try {
    await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });
  } catch (userUpdateErr) {
    console.error(
      `[Order] Failed to push order ref to user ${userId}:`,
      userUpdateErr.message,
    );
  }

  // 5. COD: Push to Shiprocket immediately + clear cart
  //    Online orders are pushed via the Razorpay webhook AFTER payment is confirmed.
  if (order.paymentInfo?.method === "COD") {
    await confirmCouponUsageForOrder(order);

    // Clear cart
    if (!isBuyNow) {
      try {
        await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
      } catch (cartErr) {
        console.error(
          `[COD] Failed to clear cart for user ${userId}:`,
          cartErr.message,
        );
      }
    }

    // Push to Shiprocket
    try {
      const { shiprocketOrderId, shipmentId } = await createShiprocketOrder(
        order,
        user,
      );
      await Order.findByIdAndUpdate(order._id, {
        shiprocketOrderId,
        shipmentId,
      });
      order.shiprocketOrderId = shiprocketOrderId;
      order.shipmentId = shipmentId;
    } catch (srError) {
      console.error(
        `[Shiprocket] Failed to push COD order ${order._id}:`,
        srError.message,
      );
    }

    try {
      await completeAbandonedCartFlow({ userId });
    } catch (abandonErr) {
      console.error(
        `[AbandonedCart] Failed to complete flow for user ${userId}:`,
        abandonErr.message,
      );
    }
  }

  try {
    await sendOrderConfirmationEmail({ order, user });
  } catch (emailErr) {
    console.error(
      `[OrderEmail] Failed to send confirmation email for order ${order._id}:`,
      emailErr.message,
    );
  }

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

  // Agar Cancelled ya Returned ho raha hai, toh stock wapas add karo
  if (status === "Cancelled" || status === "Returned") {
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        product.orderStats.totalOrders = Math.max(
          0,
          product.orderStats.totalOrders - item.quantity,
        );
        product.orderStats.totalRevenue = Math.max(
          0,
          product.orderStats.totalRevenue - item.quantity * item.price,
        );
        await product.save();
      }
    }
    // Remove order reference from user's orders array
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

// --- GET SINGLE ORDER (User — must own the order) ---
/**
 * Fetches a single order by ID. Throws 404 if not found and 403 if the
 * requesting user does not own the order.
 * @param {string} orderId - MongoDB ObjectId of the order
 * @param {string} userId  - ObjectId of the authenticated user
 */
export const getSingleOrderService = async (orderId, userId) => {
  const order = await Order.findById(orderId).populate(
    "orderItems.product",
    "name mainImage slug",
  );
  if (!order) throw new ErrorResponse("Order not found", 404);
  // Make sure this order belongs to the requesting user
  if (order.user.toString() !== userId.toString()) {
    throw new ErrorResponse("You are not authorised to view this order", 403);
  }
  return order;
};

// --- GET ALL ORDERS (Admin / User with Pagination) ---
export const getAllOrdersService = async (queryStr, userId = null) => {
  // 1. Pagination Params
  const page = parseInt(queryStr.page) || 1;
  const limit = parseInt(queryStr.limit) || 10;
  const skip = (page - 1) * limit;

  // 2. Filter Logic
  let filter = {};

  // Agar userId hai toh sirf us user ke orders (Profile page ke liye)
  // Agar userId null hai toh saare orders (Admin Dashboard ke liye)
  if (userId) filter.user = userId;

  // Status filter (e.g., status=Processing)
  if (queryStr.status) filter.orderStatus = queryStr.status;

  // 3. Query Execute
  const orders = await Order.find(filter)
    .populate("user", "name email")
    .sort("-createdAt") // Newest orders first
    .skip(skip)
    .limit(limit);

  // 4. Total Count for frontend logic
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
