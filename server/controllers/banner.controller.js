import {
  createBannerService,
  getAllBannersService,
  getAdminBannersService,
  getBannerStatsService,
  updateBannerService,
  deleteBannerService,
  reorderBannersService,
} from "../services/banner.service.js";
import successResponse from "../utils/successResponse.js";
import { deleteFile, deleteS3File } from "../utils/fileHelper.js";

const cleanupFiles = async (files) => {
  if (!files) return;
  const fileArray = Object.values(files).flat();
  for (const file of fileArray) {
    if (file.key) {
      await deleteS3File(file.key);
    } else if (file.path) {
      await deleteFile(file.path);
    }
  }
};

export const reorderBanners = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res
        .status(400)
        .json({ success: false, message: "orderedIds array is required." });
    }
    const result = await reorderBannersService(orderedIds);
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 200, null, "Banners reordered successfully");
  } catch (error) {
    next(error);
  }
};

export const createBanner = async (req, res, next) => {
  try {
    const result = await createBannerService(req.body, req.files);
    if (!result.success) {
      await cleanupFiles(req.files);
      return res.status(400).json(result);
    }
    return successResponse(
      res,
      201,
      result.data,
      "Banner created successfully",
    );
  } catch (error) {
    await cleanupFiles(req.files);
    next(error);
  }
};

export const getAllBanners = async (req, res, next) => {
  try {
    const result = await getAllBannersService();
    return successResponse(
      res,
      200,
      result.data,
      "Banners retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const getAdminBanners = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;
    const result = await getAdminBannersService({
      page: Number(page),
      limit: Number(limit),
      search,
    });
    return successResponse(
      res,
      200,
      result.data,
      "Admin banners retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const getBannerStats = async (req, res, next) => {
  try {
    const result = await getBannerStatsService();
    return successResponse(
      res,
      200,
      result.data,
      "Banner statistics retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const updateBanner = async (req, res, next) => {
  try {
    const result = await updateBannerService(
      req.params.id,
      req.body,
      req.files,
    );
    if (!result.success) {
      await cleanupFiles(req.files);
      return res.status(400).json(result);
    }
    return successResponse(
      res,
      200,
      result.data,
      "Banner updated successfully",
    );
  } catch (error) {
    await cleanupFiles(req.files);
    next(error);
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    const result = await deleteBannerService(req.params.id);
    if (!result.success) return res.status(400).json(result);
    return successResponse(res, 200, null, "Banner deleted successfully");
  } catch (error) {
    next(error);
  }
};
