import Coupon from "../models/coupon.model.js";

export const createCouponService = async (data) => {
  try {
    data.isAutomatic = data.couponType === "FestiveSale";
    const code = data.code?.toUpperCase();

    if (code) {
      const existing = await Coupon.findOne({ code });
      if (existing)
        return {
          success: false,
          statusCode: 400,
          message: "Coupon code already exists",
        };
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

// ---------------------------------------------------------------------------
// Helper: distribute `totalDiscount` across `items` proportionally using each
// item's effective line total, with floor-truncation per item and the leftover
// remainder assigned to the last item so the sum always equals `totalDiscount`.
// ---------------------------------------------------------------------------
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

  // Add any rounding remainder to the last item so totals reconcile exactly
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
    coupon.usedBy.push({
      userId,
      count: 1,
      lastUsed: new Date(),
    });
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
  if (!coupon) {
    return order;
  }

  await recordCouponUsage(coupon._id, order.user);

  order.couponId = order.couponId || coupon._id;
  order.couponCode = order.couponCode || coupon.code;
  order.couponUsageConfirmed = true;
  await order.save();

  return order;
};

export const applyCouponService = async (
  code,
  cartTotal,
  userId,
  cartItems = [],
) => {
  try {
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });
    if (!coupon)
      return {
        success: false,
        statusCode: 404,
        message: "Invalid or inactive coupon",
      };

    const validation = coupon.isValid(userId, cartTotal, cartItems);
    if (!validation.valid)
      return { success: false, statusCode: 400, message: validation.message };

    let discount = 0;
    let applicableItems = cartItems;
    let applicableTotal = cartTotal;
    let itemWiseDiscount = {};

    if (coupon.scope === "Category") {
      applicableItems = cartItems.filter(
        (item) =>
          item.product &&
          item.product.category &&
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
            if (!product || !product.category) return false;
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
          // Build per-item raw (unrounded) shares then apply floor + remainder
          const discountRatio = finalBogoDiscount / bogoDiscount;
          remainingFreeUnits = coupon.getQuantity;

          // Collect BOGO line items with their unrounded share
          const bogoLines = [];
          for (const item of sortedItems) {
            if (remainingFreeUnits <= 0) break;
            const itemPrice = item.discountPrice ?? item.price;
            const unitsToDiscount = Math.min(item.quantity, remainingFreeUnits);
            const rawShare = unitsToDiscount * itemPrice * discountRatio;
            bogoLines.push({ id: item._id, rawShare });
            remainingFreeUnits -= unitsToDiscount;
          }

          // Floor each share, assign remainder to last line
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
      },
    };
  } catch (error) {
    return { success: false, statusCode: 500, message: error.message };
  }
};

// Admin: returns ALL coupons regardless of isActive/expiry so the table
// shows the full picture. Public /api/v1/coupons/ still filters by active+valid.
export const getAllCouponsService = async ({ page, limit, search, isAdmin = false }) => {
  try {
    const baseQuery = isAdmin
      ? {}
      : { isActive: true, endDate: { $gte: new Date() } };

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
                { $and: [{ $eq: ["$isActive", true] }, { $gte: ["$endDate", now] }] },
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
