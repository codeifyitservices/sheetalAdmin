import * as categoryService from "../services/category.service.js";
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

export const createCategory = async (req, res, next) => {
  try {
    const result = await categoryService.createCategoryService(
      req.body,
      req.files,
    );

    if (!result.success) {
      cleanupFiles(req.files);
      return res.status(400).json(result);
    }

    return successResponse(
      res,
      201,
      result.data,
      "Category created successfully",
    );
  } catch (error) {
    cleanupFiles(req.files);
    next(error);
  }
};

export const getAllCategories = async (req, res, next) => {
  try {
    const result = await categoryService.getAllCategoriesService();
    return successResponse(
      res,
      200,
      result.data,
      "Categories retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (req, res, next) => {
  try {
    const result = await categoryService.getCategoryBySlugService(
      req.params.slug,
    );
    if (!result.success) {
      return res.status(404).json(result);
    }
    return successResponse(
      res,
      200,
      result.data,
      "Category retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const getAdminCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;
    const result = await categoryService.getAdminCategoriesService({
      page: Number(page),
      limit: Number(limit),
      search,
    });
    return successResponse(
      res,
      200,
      result.data,
      "Admin categories retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const getCategoryStats = async (req, res, next) => {
  try {
    const result = await categoryService.getCategoryStatsService();
    return successResponse(
      res,
      200,
      result.data,
      "Category statistics retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const result = await categoryService.updateCategoryService(
      req.params.id,
      req.body,
      req.files,
    );

    if (!result.success) {
      cleanupFiles(req.files);
      return res.status(400).json(result);
    }

    return successResponse(
      res,
      200,
      result.data,
      "Category updated successfully",
    );
  } catch (error) {
    cleanupFiles(req.files);
    next(error);
  }
};

export const reorderCategories = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res
        .status(400)
        .json({ success: false, message: "orderedIds array is required." });
    }
    const result = await categoryService.reorderCategoriesService(orderedIds);
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 200, null, "Categories reordered successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const result = await categoryService.deleteCategoryService(req.params.id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return successResponse(res, 200, null, "Category deleted successfully");
  } catch (error) {
    next(error);
  }
};
