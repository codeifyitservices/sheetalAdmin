import {
  createSharedCartService,
  getSharedCartByTokenService,
} from "../services/sharedCart.service.js";
import successResponse from "../utils/successResponse.js";

export const createSharedCart = async (req, res, next) => {
  try {
    const { items, expiresInDays } = req.body || {};
    const result = await createSharedCartService({
      items,
      expiresInDays,
      createdByUserId: req.user?._id || null,
    });

    if (!result.success) {
      return res.status(result.statusCode || 500).json(result);
    }

    return successResponse(res, 201, result.data, "Shared cart created successfully");
  } catch (error) {
    next(error);
  }
};

export const getSharedCart = async (req, res, next) => {
  try {
    const result = await getSharedCartByTokenService(req.params.token);
    if (!result.success) {
      return res.status(result.statusCode || 500).json(result);
    }

    return successResponse(res, 200, result.data, "Shared cart retrieved successfully");
  } catch (error) {
    next(error);
  }
};
