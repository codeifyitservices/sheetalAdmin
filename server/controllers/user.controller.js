import * as userService from "../services/user.service.js";
import successResponse from "../utils/successResponse.js";

export const getWishlist = async (req, res, next) => {
  try {
    const result = await userService.getWishlistService(req.user._id);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(
      res,
      200,
      result.data,
      "Wishlist retrieved successfully",
    );
  } catch (err) {
    next(err);
  }
};

export const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const result = await userService.toggleWishlistService(
      req.user._id,
      productId,
    );
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, result.data, result.message);
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const result = await userService.getMeService(req.user._id);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(
      res,
      200,
      result.data,
      "User profile retrieved successfully",
    );
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const result = await userService.updateProfileService(
      req.user._id,
      req.body,
      req.file,
    ); // Pass req.file
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(
      res,
      200,
      result.data,
      "Profile updated successfully",
    );
  } catch (err) {
    next(err);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      startDate = "",
      endDate = "",
    } = req.query;
    const result = await userService.getAllUsersService({
      page: Number(page),
      limit: Number(limit),
      search,
      startDate,
      endDate,
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const result = await userService.updateUserService(req.params.id, req.body);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(
      res,
      200,
      result.data,
      "User details updated successfully",
    );
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const result = await userService.createUserService(req.body);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 201, result.data, "User created successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const result = await userService.deleteUserService(req.params.id);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, null, "User deleted successfully");
  } catch (err) {
    next(err);
  }
};

export const getUserStats = async (req, res, next) => {
  try {
    const result = await userService.getUserStatsService({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    return successResponse(
      res,
      200,
      result.data,
      "User statistics retrieved successfully",
    );
  } catch (err) {
    next(err);
  }
};

export const guestLogin = async (req, res, next) => {
  try {
    const user = await userService.createGuestUser();
    return successResponse(
      res,
      200,
      { user },
      "Guest session initiated successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const getSingleUserDetails = async (req, res, next) => {
  try {
    const result = await userService.getSingleUserDetailsService(req.params.id);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(
      res,
      200,
      result.data,
      "User full details retrieved successfully",
    );
  } catch (err) {
    next(err);
  }
};

// Address Controllers
export const addAddress = async (req, res, next) => {
  try {
    const result = await userService.addAddressService(req.user._id, req.body);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 201, result.data, result.message);
  } catch (err) {
    next(err);
  }
};

export const updateAddress = async (req, res, next) => {
  try {
    const result = await userService.updateAddressService(
      req.user._id,
      req.params.addressId,
      req.body,
    );
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, result.data, result.message);
  } catch (err) {
    next(err);
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    const result = await userService.deleteAddressService(
      req.user._id,
      req.params.addressId,
    );
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, result.data, result.message);
  } catch (err) {
    next(err);
  }
};

export const setDefaultAddress = async (req, res, next) => {
  try {
    const result = await userService.setDefaultAddressService(
      req.user._id,
      req.params.addressId,
    );
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, result.data, result.message);
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Get paginated orders for a specific customer.
 * @route GET /api/v1/users/admin/:id/orders
 * @access Admin
 */
export const getUserOrders = async (req, res, next) => {
  try {
    const result = await userService.getUserOrdersService(
      req.params.id,
      req.query,
    );
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(
      res,
      200,
      result.data,
      "Customer orders retrieved successfully",
    );
  } catch (err) {
    next(err);
  }
};
