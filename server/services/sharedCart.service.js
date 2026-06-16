import { randomUUID } from "crypto";
import SharedCart from "../models/sharedCart.model.js";

const DEFAULT_SHARE_TTL_DAYS = 7;

const normalizeItems = (items = []) =>
  items.filter(Boolean).map((item) => ({
    ...item,
    _id: item._id || item.id || randomUUID(),
  }));

export const createSharedCartService = async ({
  items = [],
  createdByUserId = null,
  expiresInDays = DEFAULT_SHARE_TTL_DAYS,
} = {}) => {
  try {
    const normalizedItems = normalizeItems(items);
    if (normalizedItems.length === 0) {
      return {
        success: false,
        statusCode: 400,
        message: "Cart must contain at least one item to share",
      };
    }

    const token = randomUUID().replace(/-/g, "");
    const expiresAt = new Date(
      Date.now() +
        Math.max(1, Number(expiresInDays) || DEFAULT_SHARE_TTL_DAYS) *
          24 *
          60 *
          60 *
          1000,
    );

    const sharedCart = await SharedCart.create({
      token,
      items: normalizedItems,
      createdByUserId,
      expiresAt,
    });

    return {
      success: true,
      data: {
        token: sharedCart.token,
        items: sharedCart.items,
        expiresAt: sharedCart.expiresAt,
      },
    };
  } catch (error) {
    return { success: false, statusCode: 500, message: error.message };
  }
};

export const getSharedCartByTokenService = async (token) => {
  try {
    const normalizedToken = String(token || "").trim();
    if (!normalizedToken) {
      return {
        success: false,
        statusCode: 400,
        message: "Shared cart token is required",
      };
    }

    const sharedCart = await SharedCart.findOne({
      token: normalizedToken,
      expiresAt: { $gte: new Date() },
    }).lean();

    if (!sharedCart) {
      return {
        success: false,
        statusCode: 404,
        message: "Shared cart not found or expired",
      };
    }

    return {
      success: true,
      data: sharedCart,
    };
  } catch (error) {
    return { success: false, statusCode: 500, message: error.message };
  }
};
