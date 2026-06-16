import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import SizeChart from "../models/sizechart.model.js";
import slugify from "slugify";
import { deleteFile, deleteS3File } from "../utils/fileHelper.js";
import { config } from "../config/config.js";
import { syncToIndex, deleteFromIndex } from "./ngram.search.service.js";
import { getGlobalTax } from "./settings.service.js";

const resolveCategorySizing = async ({ sizeMode, sizeChart }) => {
  const normalizedMode = String(sizeMode || "")
    .trim()
    .toLowerCase();
  const normalizedChart = String(sizeChart || "").trim();

  if (normalizedMode === "free" || normalizedChart === "free") {
    return { success: true, sizeMode: "free", sizeChart: null };
  }

  if (
    !normalizedChart ||
    normalizedChart === "" ||
    normalizedChart === "null" ||
    normalizedChart === "undefined"
  ) {
    return { success: true, sizeMode: "none", sizeChart: null };
  }

  const sizeChartExists =
    await SizeChart.findById(normalizedChart).select("_id");
  if (!sizeChartExists) {
    return { success: false, message: "Selected size chart not found" };
  }

  return { success: true, sizeMode: "chart", sizeChart: sizeChartExists._id };
};

export const createCategoryService = async (data, files) => {
  const {
    name,
    description,
    parentCategory,
    isFeatured,
    metaTitle,
    metaDescription,
    metaKeywords,
    canonicalUrl,
    status,
    categoryBanner,
    subCategories,
    style,
    work,
    fabric,
    productType,
    wearType,
    occasion,
    byPrice,
    gstPercent,
    hsnCode,
    sizeMode,
    sizeChart,
  } = data;

  if (!name) return { success: false, message: "Category name is required" };

  const exists = await Category.findOne({ name });
  if (exists) return { success: false, message: "Category already exists" };

  const slug = slugify(name, { lower: true });

  let parsedSubCategories = [];
  if (subCategories) {
    if (Array.isArray(subCategories)) {
      parsedSubCategories = subCategories;
    } else if (typeof subCategories === "string") {
      try {
        const parsed = JSON.parse(subCategories);
        parsedSubCategories = Array.isArray(parsed) ? parsed : [subCategories];
      } catch (e) {
        parsedSubCategories = [subCategories];
      }
    }
  }

  const parseArrayField = (fieldData) => {
    if (!fieldData) return [];
    if (Array.isArray(fieldData)) return fieldData;
    if (typeof fieldData === "string") {
      try {
        const parsed = JSON.parse(fieldData);
        return Array.isArray(parsed) ? parsed : [fieldData];
      } catch (e) {
        return [fieldData];
      }
    }
    return [];
  };

  const parsedStyle = parseArrayField(style);
  const parsedWork = parseArrayField(work);
  const parsedFabric = parseArrayField(fabric);
  const parsedProductType = parseArrayField(productType);
  const parsedWearType = parseArrayField(wearType);
  const parsedOccasion = parseArrayField(occasion);
  const parsedByPrice = parseArrayField(byPrice);
  const parsedSizing = await resolveCategorySizing({ sizeMode, sizeChart });
  if (!parsedSizing.success) {
    return parsedSizing;
  }

  const newCategoryData = {
    name,
    slug,
    description,
    parentCategory: parentCategory || null,
    isFeatured: isFeatured === "true" || isFeatured === true,
    status: status || "Active",
    isActive: status === "Active",
    metaTitle,
    metaDescription,
    metaKeywords,
    canonicalUrl,
    categoryBanner,
    subCategories: parsedSubCategories,
    style: parsedStyle,
    work: parsedWork,
    fabric: parsedFabric,
    productType: parsedProductType,
    wearType: parsedWearType,
    occasion: parsedOccasion,
    byPrice: parsedByPrice,
    gstPercent:
      Number(gstPercent) > 0 ? Number(gstPercent) : await getGlobalTax(),
    hsnCode: hsnCode || "",
    sizeMode: parsedSizing.sizeMode,
    sizeChart: parsedSizing.sizeChart,
  };

  if (files && files.mainImage) {
    newCategoryData.mainImage = {
      url: files.mainImage[0].location || files.mainImage[0].path,
      public_id: files.mainImage[0].key || files.mainImage[0].filename,
    };
  }
  if (files && files.bannerImage) {
    newCategoryData.bannerImage = {
      url: files.bannerImage[0].location || files.bannerImage[0].path,
      public_id: files.bannerImage[0].key || files.bannerImage[0].filename,
    };
    if (files && files.ogImage) {
      newCategoryData.ogImage =
        files.ogImage[0].location || files.ogImage[0].path;
    }
  }

  const newCategory = await Category.create(newCategoryData);

  // Sync to n-gram search index
  await syncToIndex(newCategory, "category");

  return {
    success: true,
    data: newCategory,
    message: "Category created successfully",
  };
};

export const getAllCategoriesService = async () => {
  const categories = await Category.find({ isActive: true })
    .select(
      "name slug mainImage bannerImage parentCategory subCategories style work fabric productType wearType occasion byPrice sizeMode sizeChart gstPercent hsnCode",
    )
    .populate("parentCategory", "name")
    .populate("sizeChart", "name table howToMeasureImage")
    .sort({ order: 1 });

  const categoriesWithFullUrls = categories.map((category) => {
    const data = category.toObject();
    if (
      data.mainImage &&
      data.mainImage.url &&
      !data.mainImage.url.startsWith("http")
    ) {
      data.mainImage.url = `${config.baseUrl}/${data.mainImage.url.replace(/\\/g, "/")}`;
    }
    if (
      data.bannerImage &&
      data.bannerImage.url &&
      !data.bannerImage.url.startsWith("http")
    ) {
      data.bannerImage.url = `${config.baseUrl}/${data.bannerImage.url.replace(/\\/g, "/")}`;
    }
    return data;
  });

  return { success: true, data: categoriesWithFullUrls };
};

export const reorderCategoriesService = async (orderedIds) => {
  try {
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    }));

    if (bulkOps.length === 0) {
      return { success: true, message: "No categories to reorder." };
    }

    await Category.bulkWrite(bulkOps);
    return { success: true, message: "Categories reordered successfully." };
  } catch (error) {
    console.error("Error reordering categories:", error);
    return {
      success: false,
      statusCode: 500,
      message: "An error occurred while reordering categories.",
    };
  }
};

export const getCategoryBySlugService = async (slug) => {
  const category = await Category.findOne({ slug, isActive: true })
    .populate("parentCategory", "name")
    .populate("sizeChart", "name table howToMeasureImage");

  if (!category) return { success: false, message: "Category not found" };

  return { success: true, data: category };
};

export const getAdminCategoriesService = async ({ page, limit, search }) => {
  const query = search ? { name: { $regex: search, $options: "i" } } : {};

  const total = await Category.countDocuments(query);
  const categories = await Category.find(query)
    .populate("parentCategory", "name")
    .populate("sizeChart", "name table howToMeasureImage")
    .sort({ order: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    success: true,
    data: {
      categories,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    },
  };
};

export const getCategoryStatsService = async () => {
  const total = await Category.countDocuments();
  const active = await Category.countDocuments({ status: "Active" });
  const inactive = await Category.countDocuments({ status: "Inactive" });

  const linkedProducts = await Product.countDocuments({
    category: { $exists: true, $ne: null },
  });

  return {
    success: true,
    data: { total, active, inactive, products: linkedProducts },
  };
};

export const updateCategoryService = async (id, data, files) => {
  const category = await Category.findById(id);
  if (!category) return { success: false, message: "Category not found" };

  let parentId = data.parentCategory;
  if (
    !parentId ||
    parentId === "" ||
    parentId === "null" ||
    parentId === "undefined"
  ) {
    parentId = null;
  }

  if (parentId && parentId.toString() === id.toString()) {
    return { success: false, message: "Category cannot be its own parent" };
  }

  const updateData = {
    name: data.name,
    description: data.description,
    parentCategory: parentId,
    status: data.status,
    isActive: data.status === "Active",
    categoryBanner: data.categoryBanner,
    gstPercent:
      Number(data.gstPercent) > 0
        ? Number(data.gstPercent)
        : await getGlobalTax(),
    hsnCode: data.hsnCode || "",
    metaTitle: data.metaTitle,
    metaDescription: data.metaDescription,
    metaKeywords: data.metaKeywords,
    canonicalUrl: data.canonicalUrl,
  };

  const parseArrayField = (fieldData) => {
    // If undefined, don't update (handled by caller logic usually, but here if we want to update only if present)
    // Actually simpler to just parse if present.
    if (fieldData === undefined) return undefined;

    if (Array.isArray(fieldData)) return fieldData;
    if (typeof fieldData === "string") {
      try {
        const parsed = JSON.parse(fieldData);
        return Array.isArray(parsed) ? parsed : [fieldData];
      } catch (e) {
        return [fieldData];
      }
    }
    return [];
  };

  if (data.style !== undefined) updateData.style = parseArrayField(data.style);
  if (data.work !== undefined) updateData.work = parseArrayField(data.work);
  if (data.fabric !== undefined)
    updateData.fabric = parseArrayField(data.fabric);
  if (data.productType !== undefined)
    updateData.productType = parseArrayField(data.productType);
  if (data.wearType !== undefined)
    updateData.wearType = parseArrayField(data.wearType);
  if (data.occasion !== undefined)
    updateData.occasion = parseArrayField(data.occasion);
  if (data.byPrice !== undefined)
    updateData.byPrice = parseArrayField(data.byPrice);
  if (data.sizeChart !== undefined || data.sizeMode !== undefined) {
    const parsedSizing = await resolveCategorySizing({
      sizeMode: data.sizeMode,
      sizeChart: data.sizeChart,
    });
    if (!parsedSizing.success) {
      return parsedSizing;
    }
    updateData.sizeMode = parsedSizing.sizeMode;
    updateData.sizeChart = parsedSizing.sizeChart;
  }

  if (data.subCategories !== undefined) {
    let parsedSubCategories = [];
    if (Array.isArray(data.subCategories)) {
      parsedSubCategories = data.subCategories;
    } else if (typeof data.subCategories === "string") {
      try {
        const parsed = JSON.parse(data.subCategories);
        parsedSubCategories = Array.isArray(parsed)
          ? parsed
          : [data.subCategories];
      } catch (e) {
        parsedSubCategories = [data.subCategories];
      }
    }
    updateData.subCategories = parsedSubCategories;
  }

  if (data.name) {
    updateData.slug = slugify(data.name, { lower: true });
  }

  if (data.isFeatured !== undefined) {
    updateData.isFeatured =
      data.isFeatured === "true" || data.isFeatured === true;
  }

  if (files && files.mainImage) {
    if (
      category.mainImage?.public_id &&
      !category.mainImage.url.startsWith("http")
    ) {
      // Old local file
      await deleteFile(category.mainImage.url);
    } else if (category.mainImage?.public_id) {
      // S3 file
      await deleteS3File(category.mainImage.public_id);
    }

    updateData.mainImage = {
      url: files.mainImage[0].location || files.mainImage[0].path,
      public_id: files.mainImage[0].key || files.mainImage[0].filename,
    };
  }

  if (files && files.bannerImage) {
    if (
      category.bannerImage?.public_id &&
      !category.bannerImage.url.startsWith("http")
    ) {
      await deleteFile(category.bannerImage.url);
    } else if (category.bannerImage?.public_id) {
      await deleteS3File(category.bannerImage.public_id);
    }

    updateData.bannerImage = {
      url: files.bannerImage[0].location || files.bannerImage[0].path,
      public_id: files.bannerImage[0].key || files.bannerImage[0].filename,
    };
  }

  const updated = await Category.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true },
  );

  await Product.updateMany(
    { category: id },
    { $set: { gstPercent: updated.gstPercent || 0 } },
  );

  // Sync to n-gram search index
  await syncToIndex(updated, "category");

  return {
    success: true,
    data: updated,
    message: "Category updated successfully",
  };
};

export const deleteCategoryService = async (id) => {
  const category = await Category.findById(id);
  if (!category) return { success: false, message: "Category not found" };

  const hasSubCategories = await Category.findOne({ parentCategory: id });
  if (hasSubCategories) {
    return {
      success: false,
      message: "Cannot delete category with existing sub-categories",
    };
  }

  const productsCount = await Product.countDocuments({ category: id });
  if (productsCount > 0) {
    return {
      success: false,
      message: "Cannot delete category linked to active products",
    };
  }

  // Delete main image if it exists
  if (category.mainImage?.public_id) {
    if (category.mainImage.url.startsWith("http")) {
      await deleteS3File(category.mainImage.public_id);
    } else {
      await deleteFile(category.mainImage.url);
    }
  }

  // Delete banner image if it exists
  if (category.bannerImage?.public_id) {
    if (category.bannerImage.url.startsWith("http")) {
      await deleteS3File(category.bannerImage.public_id);
    } else {
      await deleteFile(category.bannerImage.url);
    }
  }

  await category.deleteOne();

  // Remove from n-gram search index
  await deleteFromIndex(id);

  return { success: true, message: "Category deleted successfully" };
};
