import AbandonedCartCoupon from "../models/abandonedcartcoupon.model.js";
import Cart from "../models/cart.model.js";
import logger from "../utils/logger.js";
import { config } from "../config/config.js";

const COUPON_TTL_HOURS = 24;

const effectivePrice = (item) =>
  Number(item.discountPrice) > 0 ? Number(item.discountPrice) : Number(item.price) || 0;

const calculateCartTotal = (items = []) =>
  items.reduce((sum, item) => sum + effectivePrice(item) * (Number(item.quantity) || 1), 0);

const resolveCouponCode = () =>
  (config?.abandonedCart?.couponCode || "SAVE10").toUpperCase().trim();

export const issueAbandonedCartCoupon = async ({
  cartId,
  userId,
  cycleId,
  discountPercent,
  items = [],
  code: overrideCode = null,
}) => {
  const existing = await AbandonedCartCoupon.findOne({ cartId, cycleId });
  if (existing) {
    if (existing.isUsable()) return existing;

    existing.status = "cancelled";
    await existing.save();
  }

  const code = (overrideCode || resolveCouponCode()).toUpperCase().trim();
  const snapshotTotal = calculateCartTotal(items);
  const currentDiscount = parseFloat(
    ((discountPercent / 100) * snapshotTotal).toFixed(2),
  );
  const expiresAt = new Date(Date.now() + COUPON_TTL_HOURS * 60 * 60 * 1000);

  const coupon = await AbandonedCartCoupon.create({
    code,
    userId,
    cartId,
    cycleId,
    discountPercent,
    snapshotTotal,
    currentDiscount,
    status: "issued",
    expiresAt,
  });

  logger.info(
    { couponId: coupon._id.toString(), cartId, cycleId, currentDiscount },
    "[AbandonedCartCoupon] Coupon issued",
  );

  return coupon;
};

export const getValidAbandonedCartCouponForUser = async ({
  userId,
  cartId = null,
}) => {
  if (!userId) return null;

  const query = {
    userId,
    status: { $in: ["issued", "applied"] },
    expiresAt: { $gt: new Date() },
  };

  if (cartId) {
    query.cartId = cartId;
  }

  const couponRecord = await AbandonedCartCoupon.findOne(query).sort({
    issuedAt: -1,
  });

  if (!couponRecord || !couponRecord.isUsable()) {
    return null;
  }

  return {
    couponRecordId: couponRecord._id.toString(),
    code: couponRecord.code,
    discountPercent: couponRecord.discountPercent,
    currentDiscount: couponRecord.currentDiscount,
    expiresAt: couponRecord.expiresAt,
    cartId: couponRecord.cartId?.toString?.() || null,
    cycleId: couponRecord.cycleId,
    status: couponRecord.status,
  };
};

export const validateAndApplyAbandonedCartCoupon = async ({
  code,
  userId,
  cartId = null,
}) => {
  const normalizedCode = String(code || "").toUpperCase().trim();
  if (!normalizedCode) {
    return { success: false, message: "Coupon code is required" };
  }

  const couponRecord = await AbandonedCartCoupon.findOne({
    code: normalizedCode,
    userId,
    status: { $in: ["issued", "applied"] },
    expiresAt: { $gt: new Date() },
  }).sort({ issuedAt: -1 });

  if (!couponRecord) {
    return {
      success: false,
      message: "This coupon is not valid for your account",
    };
  }

  const filter = cartId ? { _id: cartId } : { user: userId };
  const cart = await Cart.findOne(filter);

  if (!cart) {
    return { success: false, message: "Cart not found" };
  }

  if (cart.abandonmentStatus === "completed") {
    return { success: false, message: "Your cart has already been checked out" };
  }

  if (couponRecord.cartId.toString() !== cart._id.toString()) {
    return {
      success: false,
      message: "This coupon is not valid for your current cart",
    };
  }

  if (cart.abandonmentCycleId && couponRecord.cycleId !== cart.abandonmentCycleId) {
    return {
      success: false,
      message: "This coupon has expired - your cart was updated",
    };
  }

  if (!cart.items || cart.items.length === 0) {
    return { success: false, message: "Your cart is empty" };
  }

  const currentCartTotal = calculateCartTotal(cart.items);
  const currentDiscount = couponRecord.computeDiscount(currentCartTotal);

  couponRecord.status = "applied";
  couponRecord.appliedAt = new Date();
  couponRecord.currentDiscount = currentDiscount;
  await couponRecord.save();

  cart.appliedAbandonedCoupon = {
    couponRecordId: couponRecord._id,
    code: couponRecord.code,
    discountPercent: couponRecord.discountPercent,
    currentDiscount,
    appliedAt: couponRecord.appliedAt,
  };
  await cart.save();

  logger.info(
    {
      couponId: couponRecord._id.toString(),
      userId,
      cartId: cart._id.toString(),
      currentDiscount,
    },
    "[AbandonedCartCoupon] Coupon applied",
  );

  return {
    success: true,
    discount: currentDiscount,
    message: `Coupon applied - ₹${currentDiscount.toFixed(2)} off`,
  };
};

export const recalculateAbandonedCartDiscount = async (cart) => {
  if (!cart?.appliedAbandonedCoupon?.couponRecordId) return null;

  const couponRecord = await AbandonedCartCoupon.findById(
    cart.appliedAbandonedCoupon.couponRecordId,
  );

  if (!couponRecord || !couponRecord.isUsable()) {
    cart.appliedAbandonedCoupon = null;
    await cart.save();
    return null;
  }

  const currentCartTotal = calculateCartTotal(cart.items || []);
  const newDiscount = couponRecord.computeDiscount(currentCartTotal);

  couponRecord.currentDiscount = newDiscount;
  await couponRecord.save();

  cart.appliedAbandonedCoupon.currentDiscount = newDiscount;
  await cart.save();

  logger.info(
    {
      couponId: couponRecord._id.toString(),
      cartId: cart._id.toString(),
      newDiscount,
    },
    "[AbandonedCartCoupon] Discount recalculated",
  );

  return newDiscount;
};

export const redeemAbandonedCartCoupon = async ({ couponRecordId, orderId }) => {
  if (!couponRecordId) return;

  const couponRecord = await AbandonedCartCoupon.findById(couponRecordId);
  if (!couponRecord) return;

  couponRecord.status = "redeemed";
  couponRecord.redeemedAt = new Date();
  couponRecord.redeemedOrderId = orderId;
  await couponRecord.save();

  logger.info(
    {
      couponId: couponRecord._id.toString(),
      orderId: orderId?.toString?.(),
    },
    "[AbandonedCartCoupon] Coupon redeemed",
  );
};

export const cancelAbandonedCartCoupons = async (cartDoc) => {
  if (!cartDoc) return;

  await AbandonedCartCoupon.updateMany(
    {
      cartId: cartDoc._id,
      status: { $in: ["issued", "applied"] },
    },
    { $set: { status: "cancelled" } },
  );

  if (cartDoc.appliedAbandonedCoupon) {
    cartDoc.appliedAbandonedCoupon = null;
    await cartDoc.save();
  }
};
