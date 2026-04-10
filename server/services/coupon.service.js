import Coupon from "../models/coupon.model.js";
import { validateAndApplyAbandonedCartCoupon } from "./abandonedCartCoupon.service.js";
import { config } from "../config/config.js";

// ---------------------------------------------------------------------------
// Abandoned-cart coupon helper
// ---------------------------------------------------------------------------

/**
 * Returns the canonical abandoned-cart coupon code from config/settings.
 * Kept in sync with abandonedCartCoupon.service.js — both read from the
 * same config key so they always agree on which code is "the" recovery code.
 */
const getAbandonedCartCouponCode = () =>
  (config?.abandonedCart?.couponCode || "SAVE10").toUpperCase().trim();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Distribute `totalDiscount` across `items` proportionally using each item's
 * effective line total. Uses floor-truncation per item and assigns the
 * leftover remainder to the last item so the sum always equals `totalDiscount`.
 */
const distributeDiscount = (items, applicableTotal, totalDiscount) => {
  const itemWiseDiscount = {};
  if (!items.length || applicableTotal <= 0 || totalDiscount <= 0) {
    return itemWiseDiscount;
  }

  let assignedSum = 0;
  let lastItemId = null;

  for (const item of items) {
    const lineTotal = (item.discountPrice ?? item.price) * item.quantity;
    const share = Math.floor((lineTotal / applicableTotal) * totalDiscount);
    itemWiseDiscount[item._id] = share;
    assignedSum += share;
    lastItemId = item._id;
  }

  // Add any rounding remainder to the last item so totals reconcile exactly.
  if (lastItemId !== null) {
    itemWiseDiscount[lastItemId] += totalDiscount - assignedSum;
  }

  return itemWiseDiscount;
};

const recordCouponUsage = async (couponId, userId) => {
  if (!couponId || !userId) return;

  const coupon = await Coupon.findById(couponId);
  if (!coupon) return;

  const userObjectId = userId.toString();
  const userIndex = coupon.usedBy.findIndex(
    (entry) => entry.userId && entry.userId.toString() === userObjectId,
  );

  if (userIndex >= 0) {
    coupon.usedBy[userIndex].count = (coupon.usedBy[userIndex].count || 0) + 1;
    coupon.usedBy[userIndex].lastUsed = new Date();
  } else {
    coupon.usedBy.push({ userId, count: 1, lastUsed: new Date() });
  }

  coupon.usedCount = (coupon.usedCount || 0) + 1;
  await coupon.save();
};

const resolveCouponForOrder = async (order) => {
  if (order?.couponId) {
    return await Coupon.findById(order.couponId);
  }
  if (order?.couponCode) {
    return await Coupon.findOne({ code: order.couponCode.toUpperCase() });
  }
  return null;
};

// ---------------------------------------------------------------------------
// Apply coupon  (checkout / cart)
// ---------------------------------------------------------------------------

/**
 * Applies a coupon to a cart/order.
 *
 * Resolution order:
 *  1. If the code matches the abandoned-cart coupon code AND the user has
 *     an eligible AbandonedCartCoupon record, delegate entirely to the
 *     abandoned-cart coupon path — skip the generic Coupon collection.
 *  2. Otherwise fall through to the standard Coupon collection flow which
 *     supports Percentage, FixedAmount, BOGO, and FreeShipping offer types.
 *
 * @param {object} params
 * @param {string}   params.code         Coupon code entered at checkout.
 * @param {string}   params.userId       Authenticated user's ObjectId string.
 * @param {number}   params.orderAmount  Current cart/order total (pre-discount).
 * @param {object[]} params.cartItems    Populated cart items (with product refs).
 * @param {string}   [params.cartId]     Optional — used for abandoned-cart validation.
 * @returns {Promise<{
 *   success: boolean,
 *   statusCode?: number,
 *   message?: string,
 *   data?: object
 * }>}
 */
export const applyCouponService = async ({
  code,
  userId,
  orderAmount,
  cartItems = [],
  cartId = null,
}) => {
  try {
    const normalizedCode = String(code || "").toUpperCase().trim();
    if (!normalizedCode) {
      return { success: false, statusCode: 400, message: "Coupon code is required" };
    }

    // ── 1. Abandoned-cart coupon intercept ──────────────────────────────────
    // If the code is the recovery code, attempt the abandoned-cart path first.
    // We only fall through to the generic flow when there is no eligible record
    // for this user — this lets the admin keep the code as a generic coupon too,
    // which will work normally for users not in an abandoned-cart cycle.
    if (normalizedCode === getAbandonedCartCouponCode()) {
      const result = await validateAndApplyAbandonedCartCoupon({
        code: normalizedCode,
        userId,
        cartId,
      });

      if (result.success) {
        return {
          success: true,
          data: {
            discount: result.discount,
            couponCode: normalizedCode,
            isAbandonedCartCoupon: true,
            message: result.message,
          },
        };
      }
      return {
        success: false,
        statusCode: 400,
        message: "This coupon is not valid for your account",
      };
    }

    // ── 2. Generic coupon flow ──────────────────────────────────────────────
    const coupon = await Coupon.findOne({
      code: normalizedCode,
      isActive: true,
    });

    if (!coupon) {
      return { success: false, statusCode: 404, message: "Invalid or inactive coupon" };
    }

    const validation = coupon.isValid(userId, orderAmount, cartItems);
    if (!validation.valid) {
      return { success: false, statusCode: 400, message: validation.message };
    }

    if (coupon.canUserUse && !coupon.canUserUse(userId)) {
      return {
        success: false,
        statusCode: 400,
        message: "You have already used this coupon the maximum number of times",
      };
    }

    let discount = 0;
    let applicableItems = cartItems;
    let applicableTotal = orderAmount;
    let itemWiseDiscount = {};

    // Narrow applicable items/total for scoped coupons.
    if (coupon.scope === "Category") {
      applicableItems = cartItems.filter(
        (item) =>
          item.product?.category &&
          coupon.applicableIds.some(
            (id) => id.toString() === item.product.category._id.toString(),
          ),
      );
      applicableTotal = applicableItems.reduce(
        (sum, item) => sum + (item.discountPrice ?? item.price) * item.quantity,
        0,
      );
    } else if (coupon.scope === "Specific_Product") {
      applicableItems = cartItems.filter(
        (item) =>
          item.product &&
          coupon.applicableIds.some(
            (id) =>
              id.toString() === (item.product._id || item.product).toString(),
          ),
      );
      applicableTotal = applicableItems.reduce(
        (sum, item) => sum + (item.discountPrice ?? item.price) * item.quantity,
        0,
      );
    }

    switch (coupon.offerType) {
      case "Percentage": {
        let rawDiscount = (applicableTotal * coupon.offerValue) / 100;
        if (coupon.maxDiscountAmount) {
          rawDiscount = Math.min(rawDiscount, coupon.maxDiscountAmount);
        }
        discount = Math.round(rawDiscount);
        itemWiseDiscount = distributeDiscount(
          applicableItems,
          applicableTotal,
          discount,
        );
        break;
      }

      case "FixedAmount": {
        discount = Math.round(Math.min(coupon.offerValue, applicableTotal));
        itemWiseDiscount = distributeDiscount(
          applicableItems,
          applicableTotal,
          discount,
        );
        break;
      }

      case "BOGO": {
        const isCategoryScope = coupon.scope === "Category";
        const isProductScope = coupon.scope === "Specific_Product";

        let bogoApplicableItems = cartItems;

        if (isCategoryScope) {
          bogoApplicableItems = cartItems.filter((item) => {
            const product = item.product;
            if (!product?.category) return false;
            const categoryId = product.category._id || product.category;
            return coupon.applicableIds.some(
              (id) => id.toString() === categoryId.toString(),
            );
          });
        } else if (isProductScope) {
          bogoApplicableItems = cartItems.filter((item) => {
            const product = item.product;
            if (!product) return false;
            const productId = product._id || product;
            return coupon.applicableIds.some(
              (id) => id.toString() === productId.toString(),
            );
          });
        }

        const totalApplicableQuantity = bogoApplicableItems.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );

        if (totalApplicableQuantity < coupon.buyQuantity + coupon.getQuantity) {
          return {
            success: false,
            statusCode: 400,
            message: `BOGO requires at least ${
              coupon.buyQuantity + coupon.getQuantity
            } qualifying items in cart`,
          };
        }

        // Give the cheapest unit(s) free.
        const sortedItems = [...bogoApplicableItems].sort(
          (a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price),
        );

        let bogoDiscount = 0;
        let remainingFreeUnits = coupon.getQuantity;

        for (const item of sortedItems) {
          if (remainingFreeUnits <= 0) break;
          const itemPrice = item.discountPrice ?? item.price;
          const unitsToDiscount = Math.min(item.quantity, remainingFreeUnits);
          bogoDiscount += unitsToDiscount * itemPrice;
          remainingFreeUnits -= unitsToDiscount;
        }

        let finalBogoDiscount = bogoDiscount;
        if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
          finalBogoDiscount = Math.min(bogoDiscount, coupon.maxDiscountAmount);
        }
        discount = Math.round(finalBogoDiscount);

        if (bogoDiscount > 0) {
          const discountRatio = finalBogoDiscount / bogoDiscount;
          remainingFreeUnits = coupon.getQuantity;

          const bogoLines = [];
          for (const item of sortedItems) {
            if (remainingFreeUnits <= 0) break;
            const itemPrice = item.discountPrice ?? item.price;
            const unitsToDiscount = Math.min(item.quantity, remainingFreeUnits);
            const rawShare = unitsToDiscount * itemPrice * discountRatio;
            bogoLines.push({ id: item._id, rawShare });
            remainingFreeUnits -= unitsToDiscount;
          }

          let assignedSum = 0;
          for (const line of bogoLines) {
            itemWiseDiscount[line.id] = Math.floor(line.rawShare);
            assignedSum += itemWiseDiscount[line.id];
          }
          if (bogoLines.length > 0) {
            const lastId = bogoLines[bogoLines.length - 1].id;
            itemWiseDiscount[lastId] += discount - assignedSum;
          }
        }
        break;
      }

      case "FreeShipping":
        // Handled by the order layer — return 0 discount but mark valid.
        discount = 0;
        break;

      default:
        discount = 0;
    }

    return {
      success: true,
      data: {
        couponId: coupon._id,
        discount,
        couponCode: coupon.code,
        couponType: coupon.couponType,
        isAutomatic: coupon.isAutomatic,
        description: coupon.description,
        offerType: coupon.offerType,
        isMaxApplied: coupon.maxDiscountAmount
          ? discount >= coupon.maxDiscountAmount
          : false,
        applicableIds: coupon.applicableIds,
        scope: coupon.scope,
        itemWiseDiscount,
        isAbandonedCartCoupon: false,
      },
    };
  } catch (error) {
    return { success: false, statusCode: 500, message: error.message };
  }
};

// ---------------------------------------------------------------------------
// Confirm coupon usage after order is placed
// ---------------------------------------------------------------------------

/**
 * Records coupon usage in the generic Coupon collection after an order is
 * confirmed. Idempotent — skips orders already marked `couponUsageConfirmed`.
 *
 * For abandoned-cart coupons call redeemAbandonedCartCoupon() instead; this
 * function handles only coupons tracked in the Coupon collection.
 *
 * @param {object} order  Mongoose Order document.
 * @returns {Promise<object>} The (possibly updated) order document.
 */
export const confirmCouponUsageForOrder = async (order) => {
  if (
    !order ||
    order.couponUsageConfirmed ||
    (!order.couponId && !order.couponCode) ||
    !order.user
  ) {
    return order;
  }

  const coupon = await resolveCouponForOrder(order);
  if (!coupon) return order;

  await recordCouponUsage(coupon._id, order.user);

  order.couponId = order.couponId || coupon._id;
  order.couponCode = order.couponCode || coupon.code;
  order.couponUsageConfirmed = true;
  await order.save();

  return order;
};

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

export const createCouponService = async (data) => {
  try {
    data.isAutomatic = data.couponType === "FestiveSale";
    const code = data.code?.toUpperCase();

    if (code) {
      const existing = await Coupon.findOne({ code });
      if (existing) {
        return { success: false, statusCode: 400, message: "Coupon code already exists" };
      }
    }

    if (data.showOnHomepage === true) {
      await Coupon.updateMany({}, { $set: { showOnHomepage: false } });
    }

    if (data.showOnLoginPage === true) {
      await Coupon.updateMany({}, { $set: { showOnLoginPage: false } });
    }

    if (data.applicableIds && data.applicableIds.length > 0) {
      if (data.scope === "Specific_Product") {
        data.modelRef = "Product";
      } else {
        data.scope = "Category";
        data.modelRef = "Category";
      }
    } else {
      data.modelRef = "None";
    }

    const coupon = await Coupon.create({ ...data, code });
    return { success: true, data: coupon };
  } catch (error) {
    return { success: false, statusCode: 500, message: error.message };
  }
};

export const updateCouponService = async (id, updateData) => {
  try {
    if (updateData.couponType) {
      updateData.isAutomatic = updateData.couponType === "FestiveSale";
    }

    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    if (updateData.showOnHomepage === true) {
      await Coupon.updateMany(
        { _id: { $ne: id } },
        { $set: { showOnHomepage: false } },
      );
    }

    if (updateData.showOnLoginPage === true) {
      await Coupon.updateMany(
        { _id: { $ne: id } },
        { $set: { showOnLoginPage: false } },
      );
    }

    if (updateData.applicableIds && updateData.applicableIds.length > 0) {
      if (updateData.scope === "Specific_Product") {
        updateData.modelRef = "Product";
      } else {
        updateData.scope = "Category";
        updateData.modelRef = "Category";
      }
    } else if (updateData.scope === "All") {
      updateData.modelRef = "None";
      updateData.applicableIds = [];
    }

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!coupon) {
      return { success: false, statusCode: 404, message: "Coupon not found" };
    }

    return { success: true, data: coupon };
  } catch (error) {
    return { success: false, statusCode: 500, message: error.message };
  }
};

export const deleteCouponService = async (id) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(id);
    return coupon
      ? { success: true }
      : { success: false, statusCode: 404, message: "Not found" };
  } catch (error) {
    return { success: false, statusCode: 500, message: error.message };
  }
};

// ---------------------------------------------------------------------------
// Read / query
// ---------------------------------------------------------------------------

/**
 * Admin: returns ALL coupons regardless of isActive/expiry so the table
 * shows the full picture. Public /api/v1/coupons/ still filters by active+valid.
 */
export const getAllCouponsService = async ({
  page,
  limit,
  search,
  isAdmin = false,
}) => {
  try {
    const baseQuery = isAdmin
      ? {}
      : {
          isActive: true,
          endDate: { $gte: new Date() },
          isAbandonedCartCoupon: false,
        };

    if (search) {
      baseQuery.$or = [
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Coupon.find(baseQuery)
        .populate({ path: "applicableIds", select: "name" })
        .sort("-createdAt")
        .skip(skip)
        .limit(limit),
      Coupon.countDocuments(baseQuery),
    ]);

    return { success: true, data, pagination: { total, page, limit } };
  } catch (error) {
    return { success: false, statusCode: 500, message: error.message };
  }
};

export const getCouponStatsService = async () => {
  try {
    const now = new Date();

    const stats = await Coupon.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isActive", true] },
                    { $gte: ["$endDate", now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expired: {
            $sum: { $cond: [{ $lt: ["$endDate", now] }, 1, 0] },
          },
          totalUsed: { $sum: { $ifNull: ["$usedCount", 0] } },
          totalSavings: { $sum: { $ifNull: ["$totalDiscountGenerated", 0] } },
          festiveSales: {
            $sum: { $cond: [{ $eq: ["$couponType", "FestiveSale"] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      total: 0,
      active: 0,
      expired: 0,
      totalUsed: 0,
      totalSavings: 0,
      festiveSales: 0,
    };
    return { success: true, data: result };
  } catch (error) {
    return { success: false, statusCode: 500, message: error.message };
  }
};

export const getHomepageCouponService = async () => {
  try {
    const coupon = await Coupon.findOne({ showOnHomepage: true })
      .populate({ path: "applicableIds", select: "name slug" })
      .lean();
    return { success: true, data: coupon ?? null };
  } catch (error) {
    return { success: false, statusCode: 500, message: error.message };
  }
};

export const getLoginCouponService = async () => {
  try {
    const coupon = await Coupon.findOne({ showOnLoginPage: true }).lean();
    return { success: true, data: coupon ?? null };
  } catch (error) {
    return { success: false, statusCode: 500, message: error.message };
  }
};
