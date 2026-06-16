/**
 * @fileoverview Razorpay Webhook Controller
 *
 * Handles incoming POST events from Razorpay and triggers Shiprocket
 * order creation on confirmed payment.
 *
 * Security: Each request is verified using HMAC-SHA256 signature with
 * your Razorpay webhook secret before any processing happens.
 *
 * Razorpay retries the webhook for up to 24h if your endpoint doesn't
 * return HTTP 200 — so idempotency handling is included.
 *
 * Events handled:
 *  - payment_link.paid → order confirmed, push to Shiprocket
 */

import crypto from "crypto";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import Cart from "../models/cart.model.js";
import { createShiprocketOrder } from "../services/shiprocket.service.js";
import { confirmCouponUsageForOrder } from "../services/coupon.service.js";
import { applyOrderInventoryAdjustments } from "../services/order.service.js";

// ---------------------------------------------------------------------------
// Signature Verification
// ---------------------------------------------------------------------------

/**
 * Verifies the Razorpay webhook signature using HMAC-SHA256.
 * Razorpay signs the raw request body with your webhook secret.
 *
 * @param {Buffer} rawBody   - Raw request body buffer (must NOT be JSON.parsed)
 * @param {string} signature - Value of x-razorpay-signature header
 * @returns {boolean}
 */
const verifyRazorpaySignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET not set in .env");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(signature, "hex"),
  );
};

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

/**
 * Handles the `payment_link.paid` event.
 * - Marks the order as paid in MongoDB
 * - Clears the customer's cart
 * - Pushes the order to Shiprocket
 *
 * Idempotent: if the order already has a shiprocketOrderId, we skip
 * the Shiprocket push (handles Razorpay's retry delivery).
 *
 * @param {Object} payload - Parsed Razorpay event payload
 */
const handlePaymentLinkPaid = async (payload) => {
  const paymentLink = payload?.payment_link;
  const payment = payload?.payment?.entity;

  if (!paymentLink || !payment) {
    console.warn("[Webhook] payment_link.paid: incomplete payload, skipping.");
    return;
  }

  // `reference_id` is what we set to order._id.toString() when creating the link
  const orderId = paymentLink.reference_id;
  const razorpayPaymentId = payment.id;

  if (!orderId) {
    console.warn("[Webhook] payment_link.paid: no reference_id found.");
    return;
  }

  // Fetch the order
  const order = await Order.findById(orderId);
  if (!order) {
    console.warn(`[Webhook] Order ${orderId} not found in DB.`);
    return;
  }

  // --- Update order payment status ---
  if (!order.inventoryAdjusted) {
    await applyOrderInventoryAdjustments(order.orderItems);
    order.inventoryAdjusted = true;
    order.orderItems.forEach((item) => {
      item.inventoryAdjusted = true;
    });
  }

  order.paymentInfo.id = razorpayPaymentId;
  order.paymentInfo.status = "Paid";
  order.paidAt = new Date();
  await order.save();

  await confirmCouponUsageForOrder(order);

  // --- Clear the customer's cart ---
  try {
    await Cart.findOneAndUpdate({ user: order.user }, { $set: { items: [] } });
  } catch (cartErr) {
    console.error(`[Webhook] Failed to clear cart:`, cartErr.message);
  }

  // --- Push order reference into user's orders array (online payment confirmed) ---
  try {
    await User.findByIdAndUpdate(order.user, { $push: { orders: order._id } });
  } catch (userUpdateErr) {
    console.error(
      `[Webhook] Failed to push order ref to user ${order.user}:`,
      userUpdateErr.message,
    );
  }

  // --- Push to Shiprocket (idempotent check) ---
  if (order.shiprocketOrderId) {
    return;
  }

  try {
    const user = await User.findById(order.user).lean();
    const { shiprocketOrderId, shipmentId } = await createShiprocketOrder(
      order,
      user,
    );

    await Order.findByIdAndUpdate(orderId, { shiprocketOrderId, shipmentId });
  } catch (srErr) {
    // Log but don't throw — payment is already confirmed, don't fail the webhook
    console.error(
      `[Webhook] Shiprocket push failed for order ${orderId}:`,
      srErr.message,
    );
  }
};

// ---------------------------------------------------------------------------
// Main Webhook Handler
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/webhooks/razorpay
 *
 * Entry point for all Razorpay webhook events.
 * Must return HTTP 200 quickly — all heavy work is async.
 *
 * IMPORTANT: This route needs the raw body buffer for signature verification.
 * It must be registered BEFORE express.json() middleware in main.js.
 */
export const razorpayWebhookHandler = async (req, res) => {
  // 1. Verify signature immediately
  const signature = req.headers["x-razorpay-signature"];

  if (!signature) {
    console.warn("[Webhook] Missing x-razorpay-signature header");
    return res
      .status(400)
      .json({ success: false, message: "Missing signature" });
  }

  const isValid = verifyRazorpaySignature(req.rawBody, signature);

  if (!isValid) {
    console.warn("[Webhook] Invalid Razorpay signature — request rejected");
    return res
      .status(400)
      .json({ success: false, message: "Invalid signature" });
  }

  // 2. Parse body (we stored raw buffer, parse it now)
  let event;
  try {
    event = JSON.parse(req.rawBody.toString("utf8"));
  } catch {
    return res
      .status(400)
      .json({ success: false, message: "Invalid JSON body" });
  }

  const eventName = event.event;

  // 3. Respond 200 immediately so Razorpay doesn't timeout and retry
  res.status(200).json({ success: true, received: true });

  // 4. Process events asynchronously after response is sent
  try {
    switch (eventName) {
      case "payment_link.paid":
        await handlePaymentLinkPaid(event.payload);
        break;

      default:
        // We only care about payment_link.paid for now
        break;
    }
  } catch (err) {
    // Don't let processing errors affect the 200 already sent
    console.error(
      `[Webhook] Error processing event ${eventName}:`,
      err.message,
    );
  }
};
