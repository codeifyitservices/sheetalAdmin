import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import ErrorResponse from "../utils/ErrorResponse.js";
import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import User from "../models/user.model.js";
import Settings from "../models/settings.model.js";
import { createShiprocketOrder } from "./shiprocket.service.js";
import { sendOrderConfirmationEmail } from "./order.email.service.js";
import { completeAbandonedCartFlow } from "./abandonedCart.service.js";
import { confirmCouponUsageForOrder } from "./coupon.service.js";
import { applyOrderInventoryAdjustments } from "./order.service.js";

const normalizePaymentDisplayMethod = (method) => {
  const normalizedMethod = String(method || "").trim().toLowerCase();

  switch (normalizedMethod) {
    case "card":
      return "Card";
    case "upi":
      return "UPI";
    case "netbanking":
      return "Net Banking";
    case "wallet":
      return "Wallet";
    case "emi":
      return "EMI";
    case "paylater":
      return "Pay Later";
    case "cod":
      return "Cash on Delivery";
    default:
      return normalizedMethod
        ? normalizedMethod
            .split(/[_\s-]+/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ")
        : "Online";
  }
};

const normalizeCheckoutAddress = (address = {}) => ({
  fullName: String(
    address?.fullName ||
      [address?.firstName, address?.lastName].filter(Boolean).join(" "),
  ).trim(),
  phoneNumber: String(address?.phoneNumber || address?.phone || "").trim(),
  addressLine1: String(address?.addressLine1 || "").trim(),
  city: String(address?.city || "").trim(),
  state: String(address?.state || "").trim(),
  postalCode: String(address?.postalCode || "").trim(),
  country: String(address?.country || "India").trim() || "India",
});

const validateCheckoutAddress = (address, label) => {
  const normalized = normalizeCheckoutAddress(address);
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
      throw ErrorResponse(`${label}.${field} is required`, 400);
    }
  }

  return normalized;
};

export const createPaymentLinkService = async (
  userId,
  shippingAddress,
  billingAddress,
  frontendCallbackUrl,
  buyNowItems = [],
  cartItems = [],
  couponData = {},
  recoveryData = {},
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw ErrorResponse("User not found", 404);
  }

  const isBuyNow = Array.isArray(buyNowItems) && buyNowItems.length > 0;
  const cart = isBuyNow
    ? null
    : await Cart.findOne({ user: userId }).populate("items.product");
  const sourceItems = isBuyNow
    ? buyNowItems
    : Array.isArray(cartItems) && cartItems.length > 0
      ? cartItems
      : cart?.items || [];

  if (!sourceItems || sourceItems.length === 0) {
    throw ErrorResponse(isBuyNow ? "No buy now item found" : "Cart is empty", 400);
  }

  const validatedShippingAddress = validateCheckoutAddress(
    shippingAddress,
    "shippingAddress",
  );
  const validatedBillingAddress = billingAddress
    ? validateCheckoutAddress(billingAddress, "billingAddress")
    : { ...validatedShippingAddress };

  // 2. Calculate Total Amount
  let totalPrice = 0;
  const orderItems = [];

  for (const item of sourceItems) {
    const product = item.product || item;
    if (!product?._id) {
      throw ErrorResponse("Invalid product data in checkout items", 400);
    }

    let productPrice = 0;

    if (item.discountPrice && item.discountPrice > 0) {
      productPrice = item.discountPrice;
    } else if (item.price && item.price > 0) {
      productPrice = item.price;
    } else if (product.discountPrice && product.discountPrice > 0) {
      productPrice = product.discountPrice;
    } else if (product.price && product.price > 0) {
      productPrice = product.price;
    } else {
      productPrice = 0;
    }

    // Ensure price is a number
    productPrice = Number(productPrice);
    if (isNaN(productPrice)) {
      productPrice = 0;
    }

    const quantity = Number(item.quantity) || 0;
    if (quantity <= 0) {
      throw ErrorResponse("Invalid quantity in checkout items", 400);
    }

    if (productPrice <= 0) {
      throw ErrorResponse(`Invalid price for product ${product.name || product._id}`, 400);
    }

    totalPrice += productPrice * quantity;

    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.mainImage?.url || item.variantImage || "",
      price: productPrice,
      quantity,
      gstPercent: product.gstPercent || 0,
      itemStatus: "Processing",
      inventoryAdjusted: false,
      variant: {
        size: item.size,
        color: item.color,
        v_sku: item.variantSku || item.variant?.v_sku || item.v_sku || "",
      },
    });
  }

  // --- Calculate Fees ---
  let shippingPrice = 0;
  let platformFee = 0;

  const settings = await Settings.findOne(); // Fetch global settings
  if (settings) {
    platformFee = settings.platformFee || 0;

    // Shipping Logic check
    const freeShippingThreshold = settings.freeShippingThreshold || 0;
    const baseShippingFee = settings.shippingFee || 0;

    if (totalPrice > freeShippingThreshold && freeShippingThreshold > 0) {
      shippingPrice = 0;
    } else {
      shippingPrice = baseShippingFee;
    }
  }

  const couponDiscount = Number(couponData.discountPrice) || 0;
  const finalAmount = Math.max(0, totalPrice - couponDiscount) + shippingPrice + platformFee;

  // 3. Create Order in Database (Pending Payment)
  const order = await Order.create({
    user: userId,
    orderItems,
    shippingAddress: validatedShippingAddress,
    billingAddress: validatedBillingAddress,
    paymentInfo: {
      id: `pay_${Date.now()}`,
      status: "Pending",
      method: "Online",
      displayMethod: "Online",
    },
    couponId: couponData.couponId || null,
    couponCode: couponData.couponCode || "",
    discountPrice: Number(couponData.discountPrice) || 0,
    itemsPrice: totalPrice,
    shippingPrice: shippingPrice,
    taxPrice: platformFee, // Using taxPrice field for platformFee if no specific field exists, or add to schema
    totalPrice: finalAmount,
    recoverySource: recoveryData.recoverySource || null,
    recoveryStage: recoveryData.recoveryStage
      ? Number(recoveryData.recoveryStage)
      : null,
    recoveryCartId: recoveryData.recoveryCartId || null,
    recoveryCycleId: recoveryData.recoveryCycleId || null,
    recoveredAt: null,
    orderStatus: "Processing",
    purchaseSource: isBuyNow ? "buyNow" : "cart",
    inventoryAdjusted: false,
  });

  // Ensure minimum amount for Razorpay (100 paise = 1 INR)
  if (finalAmount < 1) {
    throw ErrorResponse("Total amount must be at least ₹1", 400);
  }

  // Validate Customer Details
  const customerName = user.name || "Customer";
  const customerEmail = user.email || "void@razorpay.com";

  // Prioritize shipping address phone, then user phone.
  let rawContact =
    shippingAddress.phoneNumber ||
    shippingAddress.phone ||
    user.phoneNumber ||
    "";

  // Sanitize contact (keep only digits)
  let customerContact = String(rawContact).replace(/\D/g, "");

  // Razorpay requires contact to be between 8 and 15 digits roughly for INR
  if (!customerContact || customerContact.length < 10) {
    throw ErrorResponse(
      "Valid 10-digit phone number is required for payment",
      400,
    );
  }

  // Auto-append +91 if user provided only 10 digits (common for India context)
  // This helps avoid "international" detection in some cases
  if (customerContact.length === 10) {
    customerContact = `+91${customerContact}`;
  } else {
    // If it already has country code, ensure it starts with + if it's missing (usually handled by replace, but here we want to ensure format)
    // Actually, Razorpay API is flexible, but E.164 prefers +, let's stick to sanitized digits if > 10 assuming user added code
    // Or if it's 12 digits (9198...), handle that too.
    if (customerContact.length === 12 && customerContact.startsWith("91")) {
      customerContact = `+${customerContact}`;
    }
  }

  // 4. Create Razorpay Payment Link
  const paymentLinkOptions = {
    amount: Math.round(finalAmount * 100), // Amount in paise
    currency: "INR",
    accept_partial: false,
    reference_id: order._id.toString(),
    description: `Payment for Order #${order._id}`,
    customer: {
      name: customerName,
      email: customerEmail,
      contact: customerContact,
    },
    notify: {
      sms: true,
      email: true,
    },
    reminder_enable: true,
    callback_url: `${frontendCallbackUrl}?order_id=${order._id}`,
    callback_method: "get",
  };

  try {
    const paymentLink = await razorpay.paymentLink.create(paymentLinkOptions);

    // Update order with payment link ID just in case
  order.paymentInfo.id = paymentLink.id;
  await order.save();

    return paymentLink;
  } catch (error) {
    // If payment link creation fails, maybe delete the order or update status
    await Order.findByIdAndDelete(order._id);
    throw ErrorResponse(error.error?.description || error.message, 500);
  }
};

/**
 * Verifies an Online (Razorpay payment link) payment after redirect.
 *
 * Razorpay appends these query params to callback_url on successful payment:
 *   razorpay_payment_link_id        — payment link ID
 *   razorpay_payment_link_reference_id — our order._id (set as reference_id)
 *   razorpay_payment_link_status    — "paid"
 *   razorpay_payment_id             — individual payment ID
 *   razorpay_signature              — HMAC-SHA256 for verification
 *
 * Signature formula (Razorpay docs):
 *   HMAC-SHA256(
 *     payment_link_id + "|" + payment_link_reference_id + "|" + payment_link_status,
 *     RAZORPAY_KEY_SECRET
 *   )
 *
 * @param {Object} params - Query params forwarded from the frontend
 * @returns {Promise<Object>} Updated order
 */
export const verifyOnlinePaymentService = async (params) => {
  const {
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_payment_id,
    razorpay_signature,
  } = params;

  // 1. Validate all required params are present
  if (
    !razorpay_payment_link_id ||
    !razorpay_payment_link_reference_id ||
    !razorpay_payment_link_status ||
    !razorpay_payment_id
  ) {
    throw ErrorResponse("Missing payment verification parameters", 400);
  }

  // 2. Only process if status is paid
  if (razorpay_payment_link_status !== "paid") {
    throw ErrorResponse(
      `Payment not completed. Status: ${razorpay_payment_link_status}`,
      400,
    );
  }

  // 3. Verify with Razorpay API directly — fetch the payment link and confirm it is paid
  //    This is more reliable than HMAC verification for payment links since Razorpay's
  //    exact signature formula can vary between test and live modes.
  let paymentLink;
  try {
    paymentLink = await razorpay.paymentLink.fetch(razorpay_payment_link_id);
  } catch (err) {
    throw ErrorResponse(
      `Failed to verify payment with Razorpay: ${err.message}`,
      500,
    );
  }

  if (!paymentLink || paymentLink.status !== "paid") {
    throw ErrorResponse(
      `Payment not confirmed by Razorpay. Status: ${paymentLink?.status}`,
      400,
    );
  }

  // 4. Confirm the reference_id matches (security: prevents one order's link from paying another)
  const orderId = paymentLink.reference_id;
  if (!orderId) {
    throw ErrorResponse("Cannot determine order from payment link", 400);
  }

  // 5. Find the order
  const order = await Order.findById(orderId);
  if (!order) {
    throw ErrorResponse(`Order ${orderId} not found`, 404);
  }

  // 6. Idempotency — if already paid, skip re-processing (handles double calls)
  if (order.paymentInfo?.status === "Paid") {
    return order;
  }

  if (!order.inventoryAdjusted) {
    await applyOrderInventoryAdjustments(order.orderItems);
    order.inventoryAdjusted = true;
    order.orderItems.forEach((item) => {
      item.inventoryAdjusted = true;
    });
  }

  // 7. Mark order as Paid
  let paymentDetails = null;
  try {
    paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
  } catch (paymentFetchError) {
    console.error(
      "[PaymentVerify] Failed to fetch payment details:",
      paymentFetchError.message,
    );
  }

  order.paymentInfo.id = razorpay_payment_id;
  order.paymentInfo.status = "Paid";
  order.paymentInfo.displayMethod = normalizePaymentDisplayMethod(
    paymentDetails?.method,
  );
  order.paidAt = new Date();
  if (order.recoverySource && !order.recoveredAt) {
    order.recoveredAt = new Date();
  }
  await order.save();

  await confirmCouponUsageForOrder(order);

  // 8. Clear the cart only for cart-based orders.
  if (order.purchaseSource !== "buyNow") {
    try {
      await Cart.findOneAndUpdate({ user: order.user }, { $set: { items: [] } });
    } catch (cartErr) {
      console.error("[PaymentVerify] Cart clear failed:", cartErr.message);
    }
  }

  try {
    await completeAbandonedCartFlow({ userId: order.user });
  } catch (abandonErr) {
    console.error(
      "[PaymentVerify] Failed to complete abandoned-cart flow:",
      abandonErr.message,
    );
  }

  const user = await User.findById(order.user).select("name email").lean();

  try {
    await sendOrderConfirmationEmail({ order, user });
  } catch (emailErr) {
    console.error(
      `[PaymentVerify] Confirmation email failed for order ${order._id}:`,
      emailErr.message,
    );
  }

  // 9. Push to Shiprocket (skip if already synced)
  if (!order.shiprocketOrderId) {
    try {
      const { shiprocketOrderId, shipmentId } = await createShiprocketOrder(
        order,
        user,
      );
      await Order.findByIdAndUpdate(orderId, { shiprocketOrderId, shipmentId });
      order.shiprocketOrderId = shiprocketOrderId;
      order.shipmentId = shipmentId;
    } catch (srErr) {
      console.error("[PaymentVerify] Shiprocket push failed:", srErr.message);
    }
  }

  return order;
};
