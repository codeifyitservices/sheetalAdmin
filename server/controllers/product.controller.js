import * as productService from "../services/product.service.js";
import successResponse from "../utils/successResponse.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { deleteFile, deleteS3File } from "../utils/fileHelper.js";
import fs from "fs/promises";

const clearFiles = async (files) => {
  if (!files) return;

  try {
    const filesToClear = Array.isArray(files)
      ? files
      : Object.values(files).flat();

    await Promise.all(
      filesToClear.map(async (file) => {
        if (file.key) {
          await deleteS3File(file.key);
        } else if (file.path) {
          await deleteFile(file.path);
        }
      }),
    );
  } catch (error) {
    console.error("ClearFiles Error:", error);
  }
};

export const getAllProducts = async (req, res, next) => {
  try {
    const result = await productService.getAllProductsService(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getNewArrivals = async (req, res, next) => {
  try {
    const result = await productService.getNewArrivalsService();
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getProductDetails = async (req, res, next) => {
  try {
    const result = await productService.getProductDetailsService(req.params.id);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, result.product, "Fetched", {
      redirectSlug: result.redirectSlug || null,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductReviews = async (req, res, next) => {
  try {
    const result = await productService.getProductReviewsService(req.query.id);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, result.reviews, "Reviews fetched");
  } catch (error) {
    next(error);
  }
};

export const createProductReview = async (req, res, next) => {
  try {
    const { rating, comment, productId } = req.body;
    const result = await productService.addReviewService(
      productId,
      req.user,
      rating,
      comment,
    );
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, null, "Review added");
  } catch (error) {
    next(error);
  }
};

export const checkCanReview = async (req, res, next) => {
  try {
    const { productId } = req.query;
    const result = await productService.canReviewService(
      productId,
      req.user._id,
    );
    return successResponse(res, 200, result, "Eligibility check completed");
  } catch (error) {
    next(error);
  }
};

export const getProductStats = async (req, res, next) => {
  try {
    const result = await productService.getProductStatsService();
    return successResponse(res, 200, result.data, "Stats fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const bulkImportProducts = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file)
      return res
        .status(400)
        .json({ success: false, message: "Excel file is required" });

    const result = await productService.bulkImportService(
      req.files,
      req.user._id,
    );

    if (result.data.length === 0) {
      return res.status(200).json({
        success: false,
        message:
          "No products were imported. Please check your Excel file for errors.",
        data: { imported: 0, errors: result.errors },
      });
    }

    return successResponse(
      res,
      200,
      { imported: result.data.length, errors: result.errors },
      result.errors?.length > 0
        ? "Import completed with warnings"
        : "All products imported successfully",
    );
  } catch (error) {
    clearFiles(req.files);
    next(error);
  }
};

export const getSampleExcel = async (req, res, next) => {
  try {
    const updatedTemplatePath = new URL(
      "../sample_product_import.updated.xlsx",
      import.meta.url,
    );
    const fallbackTemplatePath = new URL(
      "../sample_product_import.xlsx",
      import.meta.url,
    );

    let buffer;
    try {
      buffer = await fs.readFile(updatedTemplatePath);
    } catch {
      buffer = await fs.readFile(fallbackTemplatePath);
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="product_import_template.xlsx"',
    );
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    if (req.files) {
      const allFiles = Object.values(req.files).flat();

      for (const file of allFiles) {
        const isVideo =
          file.fieldname === "video" || file.mimetype?.startsWith("video/");
        const limit = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;

        if (file.size > limit) {
          clearFiles(req.files);
          return next(
            ErrorResponse(
              `${file.fieldname} (${file.originalname}) size exceeds the ${isVideo ? "50MB" : "5MB"} limit.`,
              400,
            ),
          );
        }
      }
    }

    const result = await productService.createProductService(
      req.body,
      req.files,
      req.user._id,
    );
    if (!result.success) {
      clearFiles(req.files);
      return res.status(result.statusCode).json(result);
    }
    return successResponse(res, 201, result.product, "Product created");
  } catch (error) {
    clearFiles(req.files);
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const result = await productService.updateProductService(
      req.params.id,
      req.body,
      req.files,
    );
    if (!result.success) {
      clearFiles(req.files);
      return res.status(result.statusCode).json(result);
    }
    return successResponse(res, 200, result.product, "Product updated");
  } catch (error) {
    clearFiles(req.files);
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const result = await productService.deleteProductService(req.params.id);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, null, "Product deleted");
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const reviewId = req.query.id || req.params.id;
    const result = await productService.deleteReviewService(reviewId);

    if (!result.success) return res.status(result.statusCode).json(result);

    return successResponse(res, 200, null, "Review deleted");
  } catch (error) {
    next(error);
  }
};

export const getAllReviews = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const result = await productService.getAllReviewsService(
      page,
      limit,
      status,
    );
    return successResponse(
      res,
      200,
      result.reviews,
      "Reviews fetched successfully",
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          approvedCount: result.approvedCount,
          pendingCount: result.pendingCount,
          averageRating: result.averageRating,
        },
      },
    );
  } catch (error) {
    next(error);
  }
};

export const updateReviewStatus = async (req, res, next) => {
  try {
    const { isApproved, comment, rating, userName } = req.body;
    const reviewId = req.params.id || req.query.id;
    const result = await productService.updateReviewStatusService(
      reviewId,
      isApproved,
      comment,
      rating,
      userName,
    );
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, result.review, "Review status updated");
  } catch (error) {
    next(error);
  }
};

export const getLowStockProducts = async (req, res, next) => {
  try {
    const result = await productService.getLowStockProductsService();

    return successResponse(
      res,
      200,
      result.data,
      "Low stock products fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const getTrendingProducts = async (req, res, next) => {
  try {
    const result = await productService.getTrendingProductsService();
    return successResponse(
      res,
      200,
      result.products,
      "Trending products fetched",
    );
  } catch (error) {
    next(error);
  }
};

export const incrementViewCount = async (req, res, next) => {
  try {
    const productIdOrSlug = req.params.id || req.params.slug;
    const result =
      await productService.incrementViewCountService(productIdOrSlug);
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(res, 200, null, "View count incremented");
  } catch (error) {
    next(error);
  }
};

export const getCollectionProducts = async (req, res) => {
  try {
    const products = await productService.fetchCollectionProducts();
    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("getCollectionProducts error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch collection products" });
  }
};

export const getMostViewedProducts = async (req, res, next) => {
  try {
    const items = await productService.getMostViewedProductsService({
      limit: req.query.limit,
      period: req.query.period || "overall",
      refDate: req.query.refDate,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
};

// ── Updated: reads `starred` from req.body and passes it to the service ──
export const reorderProducts = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    const result = await productService.reorderProductsService(orderedIds);
    if (!result.success)
      return res.status(result.statusCode || 500).json(result);
    return successResponse(res, 200, null, result.message);
  } catch (error) {
    next(error);
  }
};

export const toggleStarProduct = async (req, res, next) => {
  try {
    // Accept an explicit desired state from body (used by bulk ops).
    // If not provided (undefined), the service will toggle instead.
    const { starred } = req.body;
    const result = await productService.toggleStarProductService(
      req.params.id,
      starred,
    );
    if (!result.success) return res.status(result.statusCode).json(result);
    return successResponse(
      res,
      200,
      { isStarred: result.isStarred },
      "Star updated",
    );
  } catch (error) {
    next(error);
  }
};
