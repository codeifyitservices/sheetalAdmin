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

// --- CREATE NEW ORDER ---
export const createOrderService = async (data, userId) => {
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
  const user = await User.findById(userId).lean();
  const isBuyNow = Array.isArray(buyNowItems) && buyNowItems.length > 0;

  // 1. Stock check and update
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

    product.stock -= item.quantity;
    product.orderStats.totalOrders += item.quantity;
    product.orderStats.totalRevenue += item.quantity * item.price;

    await product.save({ validateBeforeSave: false });
  }

  // 2. Resolve the abandoned-cart coupon record id from the user's cart so we
  //    can redeem it after the order is persisted. We look this up before
  //    creating the order because completeAbandonedCartFlow() clears the cart.
  let abandonedCartCouponRecordId = null;
  if (!isBuyNow) {
    try {
      const cart = await Cart.findOne({ user: userId }).lean();
      abandonedCartCouponRecordId =
        cart?.appliedAbandonedCoupon?.couponRecordId ?? null;
    } catch {
      // Non-fatal — order creation proceeds even if we can't read the cart.
    }
  }

  // 3. Build order document
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
      id: paymentInfo?.id || `manual_${Date.now()}`,
      status: paymentInfo?.status || "Pending",
      method: paymentInfo?.method || "COD",
      displayMethod:
        paymentInfo?.displayMethod ||
        (paymentInfo?.method === "COD" ? "Cash on Delivery" : "Online"),
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
    orderStatus: "Processing",
    paidAt: paymentInfo?.method === "Online" ? Date.now() : null,
  };

  // 4. Persist
  const order = await Order.create(finalOrderData);

  // 5. Push order reference into user
  try {
    await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });
  } catch (userUpdateErr) {
    console.error(
      `[Order] Failed to push order ref to user ${userId}:`,
      userUpdateErr.message,
    );
  }

  // 6. COD post-creation flow
  if (order.paymentInfo?.method === "COD") {
    // 6a. Redeem abandoned-cart coupon (if one was applied).
    //     Must happen before confirmCouponUsageForOrder so both paths don't
    //     double-count the same discount.
    if (abandonedCartCouponRecordId) {
      try {
        await redeemAbandonedCartCoupon({
          couponRecordId: abandonedCartCouponRecordId,
          orderId: order._id,
        });
      } catch (couponErr) {
        console.error(
          `[AbandonedCartCoupon] Failed to redeem coupon for order ${order._id}:`,
          couponErr.message,
        );
      }
    } else {
      // 6b. Regular coupon usage confirmation.
      await confirmCouponUsageForOrder(order);
    }

    // 6c. Clear cart
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

    // 6d. Push to Shiprocket
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

    // 6e. Complete abandoned-cart flow (cancels any remaining reminders)
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
