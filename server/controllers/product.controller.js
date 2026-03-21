import * as productService from "../services/product.service.js";
import successResponse from "../utils/successResponse.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { deleteFile, deleteS3File } from "../utils/fileHelper.js";
import Product from "../models/product.model.js";
import fs from "fs";
import xlsx from "xlsx";

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
    return successResponse(res, 200, result.product, "Fetched");
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
    const result = await productService.canReviewService(productId, req.user._id);
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

    return successResponse(
      res,
      200,
      { imported: result.data.length, errors: result.errors },
      result.errors?.length > 0 ? "Import completed with warnings" : "All products imported successfully",
    );
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

export const getSampleExcel = async (req, res, next) => {
  try {
    const headers = [
      "Name",
      "SKU",
      "Description",
      "ShortDescription",
      "MaterialCare",
      "Category",
      "SubCategory",
      "Status",
      "Tags",
      "WearType",
      "Occasion",
      "Style",
      "Work",
      "Fabric",
      "Type",
      "ByPrice",
      "MainImage",
      "HoverImage",
      "Images",
      "DetailKey",
      "DetailValue",
      "VariantSKU",
      "Color",
      "ColorCode",
      "Size",
      "Price",
      "DiscountPrice",
      "Stock",
      "VariantImage",
      "VariantImageName",
      "MetaTitle",
      "MetaDescription",
      "MetaKeywords",
    ];

    const rows = [
      {
        Name: "Example Product",
        SKU: "EXAMPLE-001",
        Description: "Add a full description for the product.",
        ShortDescription: "Short summary shown in cards.",
        MaterialCare: "Hand wash only.",
        Category: "Sarees",
        SubCategory: "Festive",
        Status: "Active",
        Tags: "festive, silk",
        WearType: "Casual,Party",
        Occasion: "Wedding,Festival",
        Style: "Traditional",
        Work: "Embroidery",
        Fabric: "Silk",
        Type: "Regular",
        ByPrice: "5000-10000",
        MainImage: "example-main.jpg",
        HoverImage: "example-hover.jpg",
        Images: "example-1.jpg,example-2.jpg",
        DetailKey: "Wash Care",
        DetailValue: "Dry clean only",
        VariantSKU: "EXAMPLE-001-RED-M",
        Color: "Red",
        ColorCode: "#B91C1C",
        Size: "M",
        Price: 4999,
        DiscountPrice: 3999,
        Stock: 10,
        VariantImage: "example-variant.jpg",
        VariantImageName: "example-variant.jpg",
        MetaTitle: "Example Product",
        MetaDescription: "Example meta description.",
        MetaKeywords: "example,product",
      },
      {
        Name: "",
        SKU: "",
        Description: "",
        ShortDescription: "",
        MaterialCare: "",
        Category: "",
        SubCategory: "",
        Status: "",
        Tags: "",
        WearType: "",
        Occasion: "",
        Style: "",
        Work: "",
        Fabric: "",
        Type: "",
        ByPrice: "",
        MainImage: "",
        HoverImage: "",
        Images: "",
        DetailKey: "",
        DetailValue: "",
        VariantSKU: "EXAMPLE-001-BLK-L",
        Color: "Black",
        ColorCode: "#111827",
        Size: "L",
        Price: 4999,
        DiscountPrice: 0,
        Stock: 7,
        VariantImage: "example-variant-2.jpg",
        VariantImageName: "example-variant-2.jpg",
        MetaTitle: "",
        MetaDescription: "",
        MetaKeywords: "",
      },
    ];

    const worksheet = xlsx.utils.json_to_sheet(rows, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Template");

    const buffer = xlsx.write(workbook, { bookType: "xlsx", type: "buffer" });

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
          file.fieldname === "video" || file.mimetype.startsWith("video/");
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
    const result = await productService.getAllReviewsService(page, limit, status);
    return successResponse(
      res,
      200,
      result.reviews,
      "Reviews fetched successfully",
      { total: result.total, page: result.page, limit: result.limit }
    );
  } catch (error) {
    next(error);
  }
};

export const updateReviewStatus = async (req, res, next) => {
  try {
    console.log("UPDATE REVIEW BODY:", req.body);
    const { isApproved, comment, rating, userName } = req.body;
    const reviewId = req.params.id || req.query.id;
    const result = await productService.updateReviewStatusService(reviewId, isApproved, comment, rating, userName);
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
    return successResponse(res, 200, result.products, "Trending products fetched");
  } catch (error) {
    next(error);
  }
};

export const incrementViewCount = async (req, res, next) => {
  try {
    const result = await productService.incrementViewCountService(req.params.id);
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
    return res.status(500).json({ success: false, message: "Failed to fetch collection products" });
  }
};

// GET most viewed products (admin dashboard)
export const getMostViewedProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.find({ isActive: true })
      .sort({ viewCount: -1 })
      .limit(limit)
      .select("name viewCount category slug mainImage")
      .populate("category", "name");

    const items = products.map((p, i) => ({
      rank: i + 1,
      name: p.name,
      slug: p.slug,
      category: p.category?.name || "Uncategorized",
      views: p.viewCount,
      image: p.mainImage?.url || null,
    }));

    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
};
