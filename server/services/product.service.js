import Review from "../models/review.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import slugify from "slugify";
import Category from "../models/category.model.js";
import { deleteFile, deleteS3File, uploadS3File } from "../utils/fileHelper.js";
import { config } from "../config/config.js";
import xlsx from "xlsx";
import mongoose from "mongoose";
import {
  syncToIndex,
  deleteFromIndex,
  rebuildIndex,
} from "./ngram.search.service.js";
import { searchService } from "./search.service.js";
import {
  sanitizeProductHtml,
  sanitizeProductRecord,
} from "../utils/productHtmlSanitizer.js";
import { spreadsheetCellToHtml } from "../utils/spreadsheetRichText.js";

const buildUploadedImage = (file, alt) => ({
  url: file.location || file.path,
  public_id: file.key || file.filename,
  alt,
});

const buildUploadedVideo = (file) => ({
  url: file.location || file.path,
  public_id: file.key || file.filename,
  mimeType: file.mimetype || "video/mp4",
  size: file.size,
});

const normaliseVariantGallery = (
  variant,
  uploadedVariantGalleryFiles,
  fallbackAlt,
) => {
  const rawGallery = Array.isArray(variant.gallery)
    ? variant.gallery.slice(0, 6)
    : [];

  return rawGallery
    .map((item, index) => {
      if (item?.__newFile) {
        const file = uploadedVariantGalleryFiles.shift();
        if (!file) return null;
        return buildUploadedImage(file, `${fallbackAlt} ${index + 1}`);
      }

      if (item?.url) {
        return {
          url: item.url,
          public_id: item.public_id || "",
          alt: item.alt || `${fallbackAlt} ${index + 1}`,
        };
      }

      if (typeof item === "string" && item.trim()) {
        return {
          url: item,
          public_id: "",
          alt: `${fallbackAlt} ${index + 1}`,
        };
      }

      return null;
    })
    .filter(Boolean);
};

const variantMediaKey = (media) => {
  if (!media) return null;
  if (media.public_id) return `id:${media.public_id}`;
  if (media.url) return `url:${media.url}`;
  return null;
};

const collectVariantMediaMap = (variants) => {
  const map = new Map();
  if (!Array.isArray(variants)) return map;

  variants.forEach((variant) => {
    if (!variant) return;
    if (variant.v_image) {
      const key = variantMediaKey(variant.v_image);
      if (key) map.set(key, variant.v_image);
    }
    if (variant.v_video) {
      const key = variantMediaKey(variant.v_video);
      if (key) map.set(key, variant.v_video);
    }
    if (Array.isArray(variant.gallery)) {
      variant.gallery.forEach((item) => {
        if (!item) return;
        const key = variantMediaKey(item);
        if (key && !map.has(key)) map.set(key, item);
      });
    }
  });

  return map;
};

const cleanupMediaItems = async (items) => {
  for (const item of items) {
    if (!item) continue;
    if (item.public_id) await deleteS3File(item.public_id);
    else if (item.url && !item.url.startsWith("http"))
      await deleteFile(item.url);
  }
};

export const getAllProductsService = async (queryStr) => {
  const {
    page = 1,
    limit = 10,
    search,
    sort,
    category,
    subCategory,
    status,
    color,
    brand,
    wearType,
    occasion,
    tags,
    style,
    work,
    fabric,
    productType,
    byPrice,
    minPrice,
    maxPrice,
  } = queryStr;

  const skip = (Number(page) - 1) * Number(limit);

  let filter = {};

  if (search) {
    const searchResults = await searchService({
      query: search,
      limit: 1000,
      page: 1,
    });
    const productIds = searchResults
      .filter((hit) => hit.type === "product" && hit.data && hit.data._id)
      .map((hit) => new mongoose.Types.ObjectId(hit.data._id));

    if (productIds.length === 0) {
      return {
        success: true,
        products: [],
        totalProducts: 0,
        currentPage: Number(page),
        totalPages: 0,
        resultsPerPage: Number(limit),
      };
    }

    filter._id = { $in: productIds };
  }

  if (category && category !== "All") {
    // Convert string to ObjectId for proper MongoDB comparison
    filter.category = new mongoose.Types.ObjectId(category);
  }

  if (subCategory && subCategory !== "All") {
    filter.subCategory = subCategory;
  }

  if (brand && brand !== "All") {
    filter.brand = brand;
  }

  if (status && status !== "All") {
    filter.status = status;
  }

  if (color) {
    filter["variants.color.name"] = { $regex: color, $options: "i" };
  }

  if (wearType) {
    filter.wearType = { $in: Array.isArray(wearType) ? wearType : [wearType] };
  }

  if (occasion) {
    filter.occasion = { $in: Array.isArray(occasion) ? occasion : [occasion] };
  }

  if (tags) {
    filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
  }

  if (style) {
    filter.style = { $in: Array.isArray(style) ? style : [style] };
  }

  if (work) {
    filter.work = { $in: Array.isArray(work) ? work : [work] };
  }

  if (fabric) {
    // Case-insensitive fabric match — handles "silk", "Silk", "SILK" etc.
    const fabricList = Array.isArray(fabric) ? fabric : [fabric];
    filter.fabric = {
      $in: fabricList.map((f) => new RegExp(`^${f.trim()}$`, "i")),
    };
  }

  if (minPrice != null || maxPrice != null) {
    const sizeCondition = {};
    if (minPrice != null) sizeCondition.$gte = Number(minPrice);
    if (maxPrice != null) sizeCondition.$lte = Number(maxPrice);

    filter.variants = {
      $elemMatch: {
        sizes: {
          $elemMatch: {
            $or: [
              // Has a discount price — filter on that
              {
                discountPrice: { $gt: 0, ...sizeCondition },
              },
              // No discount price — fall back to regular price
              {
                discountPrice: 0,
                price: sizeCondition,
              },
            ],
          },
        },
      },
    };
  }

  if (productType) {
    filter.productType = {
      $in: Array.isArray(productType) ? productType : [productType],
    };
  }

  if (byPrice) {
    filter.byPrice = {
      $in: Array.isArray(byPrice) ? byPrice : [byPrice],
    };
  }

  const pipeline = [
    { $match: filter },
    {
      $addFields: {
        // Use the product's own threshold, falling back to 5 if not set
        _threshold: { $ifNull: ["$lowStockThreshold", 5] },
      },
    },
    {
      $addFields: {
        lowStockVariantCount: {
          $size: {
            $filter: {
              input: "$variants",
              as: "variant",
              cond: {
                $anyElementTrue: {
                  $map: {
                    input: "$$variant.sizes",
                    as: "size",
                    in: {
                      $and: [
                        { $lte: ["$$size.stock", "$_threshold"] },
                        { $gt: ["$$size.stock", 0] },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        isLowStock: {
          $gt: ["$lowStockVariantCount", 0],
        },
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: {
        path: "$category",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: (() => {
        if (!sort) return { createdAt: -1 };
        if (typeof sort === "object") return sort;
        if (sort === "newest") return { createdAt: -1 };
        if (sort === "price_asc") return { "variants.sizes.price": 1 };
        if (sort === "price_desc") return { "variants.sizes.price": -1 };
        if (sort === "popularity") return { averageRating: -1 };
        if (sort.startsWith("-")) return { [sort.substring(1)]: -1 };
        return { [sort]: 1 };
      })(),
    },
  ];

  const [result] = await Product.aggregate([
    {
      $facet: {
        products: [...pipeline, { $skip: skip }, { $limit: Number(limit) }],
        totalProducts: [{ $match: filter }, { $count: "count" }],
      },
    },
  ]);

  const products = result.products;
  const totalProducts = result.totalProducts[0]?.count || 0;

  return {
    success: true,
    products: products.map(sanitizeProductRecord),
    totalProducts,
    currentPage: Number(page),
    totalPages: Math.ceil(totalProducts / limit),
    resultsPerPage: Number(limit),
  };
};

export const getNewArrivalsService = async () => {
  const flagged = await Product.find({ isNewArrival: true, status: "Active" })
    .sort({ createdAt: -1 })
    .populate("category", "name slug")
    .lean();

  let products = flagged;

  if (flagged.length < 10) {
    const excludeIds = flagged.map((p) => p._id);
    const backfill = await Product.find({
      _id: { $nin: excludeIds },
      status: "Active",
    })
      .sort({ createdAt: -1 })
      .limit(10 - flagged.length)
      .populate("category", "name slug")
      .lean();

    products = [...flagged, ...backfill];
  }

  return { success: true, products: products.map(sanitizeProductRecord) };
};

export const getProductDetailsService = async (id) => {
  const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
  const product = await Product.findOne(query)
    .populate("category", "name slug")
    .populate("sizeChart")
    .lean();
  return product
    ? { success: true, product: sanitizeProductRecord(product) }
    : { success: false, statusCode: 404 };
};

export const createProductService = async (data, files, userId) => {
  const parsedData = {
    ...data,
    isTrending: data.isTrending === "true" || data.isTrending === true,
    isNewArrival: data.isNewArrival === "true" || data.isNewArrival === true,
    isCollection: data.isCollection === "true" || data.isCollection === true,
    variants:
      typeof data.variants === "string"
        ? JSON.parse(data.variants)
        : data.variants,
    specifications:
      typeof data.specifications === "string"
        ? JSON.parse(data.specifications)
        : data.specifications,
    keyBenefits:
      typeof data.keyBenefits === "string"
        ? JSON.parse(data.keyBenefits)
        : data.keyBenefits,
    eventTags:
      typeof data.eventTags === "string"
        ? JSON.parse(data.eventTags)
        : data.eventTags,
    displayCollections:
      typeof data.displayCollections === "string"
        ? JSON.parse(data.displayCollections)
        : data.displayCollections,
    wearType:
      typeof data.wearType === "string"
        ? JSON.parse(data.wearType)
        : data.wearType,
    occasion:
      typeof data.occasion === "string"
        ? JSON.parse(data.occasion)
        : data.occasion,
    tags: typeof data.tags === "string" ? JSON.parse(data.tags) : data.tags,
    style: typeof data.style === "string" ? JSON.parse(data.style) : data.style,
    work: typeof data.work === "string" ? JSON.parse(data.work) : data.work,
    fabric:
      typeof data.fabric === "string" ? JSON.parse(data.fabric) : data.fabric,
    productType:
      typeof data.productType === "string"
        ? JSON.parse(data.productType)
        : data.productType,
    byPrice:
      typeof data.byPrice === "string"
        ? JSON.parse(data.byPrice)
        : data.byPrice,
  };

  if (parsedData.sizeChart === "null" || !parsedData.sizeChart)
    parsedData.sizeChart = null;
  if (parsedData.category === "null" || !parsedData.category)
    parsedData.category = null;
  if (parsedData.subCategory === "null" || !parsedData.subCategory)
    parsedData.subCategory = null;
  if (parsedData.brand === "null" || !parsedData.brand) parsedData.brand = null;

  parsedData.description = sanitizeProductHtml(parsedData.description || "");
  parsedData.materialCare = sanitizeProductHtml(parsedData.materialCare || "");

  const mainImage = {
    url: files?.mainImage
      ? files.mainImage[0].location || files.mainImage[0].path
      : "",
    public_id: files?.mainImage
      ? files.mainImage[0].key || files.mainImage[0].filename
      : "",
    alt: data.mainImageAlt || `${parsedData.name} main image`,
  };

  const hoverImage = {
    url: files?.hoverImage
      ? files.hoverImage[0].location || files.hoverImage[0].path
      : "",
    public_id: files?.hoverImage
      ? files.hoverImage[0].key || files.hoverImage[0].filename
      : "",
    alt: data.hoverImageAlt || `${parsedData.name} hover image`,
  };

  const ogImage = files?.ogImage
    ? files.ogImage[0].location || files.ogImage[0].path
    : "";

  let galleryImages = [];
  if (files?.images) {
    galleryImages = files.images.map((file, index) => ({
      url: file.location || file.path,
      public_id: file.key || file.filename,
      alt: `${parsedData.name} gallery ${index + 1}`,
      isDefault: false,
    }));
  }

  let totalStock = 0;
  if (parsedData.variants && Array.isArray(parsedData.variants)) {
    let variantFileIndex = 0;
    const uploadedVariantFiles = files?.["variantImages"] || [];
  const uploadedVariantGalleryFiles = [
    ...(files?.["variantGalleryImages"] || []),
  ];
  const uploadedVariantVideoFiles = files?.["variantVideos"] || [];
  parsedData.variants = parsedData.variants.map((v) => {
      // Process sizes to ensure numerical types for stock, price, and discountPrice
      const processedSizes = v.sizes.map((s) => ({
        ...s,
        name: s.name, // Keep name as is
        stock: Number(s.stock || 0),
        price: Number(s.price || 0), // Explicitly convert to Number
        discountPrice: Number(s.discountPrice || 0), // Explicitly convert to Number
      }));

      // Calculate stock for each variant based on its processed sizes
      const variantStock = processedSizes.reduce(
        (sum, s) => sum + (s.stock || 0),
        0,
      );
      totalStock += variantStock; // Add to master stock

      const gallery = normaliseVariantGallery(
        v,
        uploadedVariantGalleryFiles,
        `${parsedData.name} ${v.color?.name || "variant"} gallery`,
      );

      if (v.hasNewImage === true && uploadedVariantFiles[variantFileIndex]) {
        const file = uploadedVariantFiles[variantFileIndex];
        const v_image = buildUploadedImage(file);
        variantFileIndex++;
        const { hasNewImage, hasNewVideo, ...rest } = v;
        return {
          ...rest,
          sizes: processedSizes,
          v_image,
          v_video:
            hasNewVideo === true && uploadedVariantVideoFiles.length > 0
              ? buildUploadedVideo(uploadedVariantVideoFiles.shift())
              : rest.v_video || null,
          gallery,
        };
      }

      const { hasNewImage, hasNewVideo, ...rest } = v;
      return {
        ...rest,
        sizes: processedSizes,
        v_video:
          hasNewVideo === true && uploadedVariantVideoFiles.length > 0
            ? buildUploadedVideo(uploadedVariantVideoFiles.shift())
            : rest.v_video || null,
        gallery,
      }; // Return variant with processed sizes
    });
  }

  const product = await Product.create({
    ...parsedData,
    slug: slugify(parsedData.name || "product", { lower: true, strict: true }),
    mainImage,
    hoverImage,
    ogImage,
    images: galleryImages,
    video: files?.video
      ? {
          url: files.video[0].location || files.video[0].path,
          public_id: files.video[0].key || files.video[0].filename,
        }
      : null,
    stock: totalStock, // Set master stock
    createdBy: userId,
  });

  // Sync to n-gram search index
  await syncToIndex(product, "product");

  return { success: true, product: sanitizeProductRecord(product) };
};

export const updateProductService = async (id, data, files) => {
  const product = await Product.findById(id);
  if (!product)
    return { success: false, statusCode: 404, message: "Product not found" };

  const parsedData = {
    ...data,
    isTrending: data.isTrending === "true" || data.isTrending === true,
    isNewArrival: data.isNewArrival === "true" || data.isNewArrival === true,
    isCollection: data.isCollection === "true" || data.isCollection === true,
    variants:
      typeof data.variants === "string"
        ? JSON.parse(data.variants)
        : data.variants,
    specifications:
      typeof data.specifications === "string"
        ? JSON.parse(data.specifications)
        : data.specifications,
    keyBenefits:
      typeof data.keyBenefits === "string"
        ? JSON.parse(data.keyBenefits)
        : data.keyBenefits,
    displayCollections:
      typeof data.displayCollections === "string"
        ? JSON.parse(data.displayCollections)
        : data.displayCollections,
    eventTags:
      typeof data.eventTags === "string"
        ? JSON.parse(data.eventTags)
        : data.eventTags,
    wearType:
      typeof data.wearType === "string"
        ? JSON.parse(data.wearType)
        : data.wearType,
    occasion:
      typeof data.occasion === "string"
        ? JSON.parse(data.occasion)
        : data.occasion,
    tags: typeof data.tags === "string" ? JSON.parse(data.tags) : data.tags,
    style: typeof data.style === "string" ? JSON.parse(data.style) : data.style,
    work: typeof data.work === "string" ? JSON.parse(data.work) : data.work,
    fabric:
      typeof data.fabric === "string" ? JSON.parse(data.fabric) : data.fabric,
    productType:
      typeof data.productType === "string"
        ? JSON.parse(data.productType)
        : data.productType,
    byPrice:
      typeof data.byPrice === "string"
        ? JSON.parse(data.byPrice)
        : data.byPrice,
  };

  if (parsedData.sizeChart === "null" || !parsedData.sizeChart)
    parsedData.sizeChart = null;
  if (parsedData.category === "null" || !parsedData.category)
    parsedData.category = null;
  if (parsedData.subCategory === "null" || !parsedData.subCategory)
    parsedData.subCategory = null;
  if (parsedData.brand === "null" || !parsedData.brand) parsedData.brand = null;

  parsedData.description = sanitizeProductHtml(parsedData.description || "");
  parsedData.materialCare = sanitizeProductHtml(parsedData.materialCare || "");

  if (parsedData.name) {
    parsedData.slug = slugify(parsedData.name, { lower: true, strict: true });
  }

  if (files && files["mainImage"]?.[0]) {
    // Delete old
    if (product.mainImage?.public_id)
      await deleteS3File(product.mainImage.public_id);
    else if (
      product.mainImage?.url &&
      !product.mainImage.url.startsWith("http")
    )
      await deleteFile(product.mainImage.url);

    parsedData.mainImage = {
      url: files["mainImage"][0].location || files["mainImage"][0].path,
      public_id: files["mainImage"][0].key || files["mainImage"][0].filename,
      alt: data.mainImageAlt || parsedData.name,
    };
  } else if (data.mainImageAlt) {
    parsedData.mainImage = { ...product.mainImage, alt: data.mainImageAlt };
  }

  if (files && files["hoverImage"]?.[0]) {
    // Delete old
    if (product.hoverImage?.public_id)
      await deleteS3File(product.hoverImage.public_id);
    else if (
      product.hoverImage?.url &&
      !product.hoverImage.url.startsWith("http")
    )
      await deleteFile(product.hoverImage.url);

    parsedData.hoverImage = {
      url: files["hoverImage"][0].location || files["hoverImage"][0].path,
      public_id: files["hoverImage"][0].key || files["hoverImage"][0].filename,
      alt: data.hoverImageAlt || parsedData.name,
    };
  } else if (data.hoverImageAlt) {
    parsedData.hoverImage = { ...product.hoverImage, alt: data.hoverImageAlt };
  }

  if (files && files["video"]?.[0]) {
    if (product.video?.public_id) await deleteS3File(product.video.public_id);
    else if (product.video?.url && !product.video.url.startsWith("http"))
      await deleteFile(product.video.url);

    parsedData.video = {
      url: files["video"][0].location || files["video"][0].path,
      public_id: files["video"][0].key || files["video"][0].filename,
    };
  } else if (data.existingVideo) {
    // Keep existing
  }

  if (files && files["ogImage"]?.[0]) {
    parsedData.ogImage =
      files["ogImage"][0].location || files["ogImage"][0].path;
  } else if (data.existingOgImage) {
    parsedData.ogImage = data.existingOgImage;
  }

  let totalStock = 0;
  if (parsedData.variants && Array.isArray(parsedData.variants)) {
    let variantFileIndex = 0;
    const uploadedVariantFiles = files?.["variantImages"] || [];
  const uploadedVariantGalleryFiles = [
    ...(files?.["variantGalleryImages"] || []),
  ];
  const uploadedVariantVideoFiles = files?.["variantVideos"] || [];

  parsedData.variants = parsedData.variants.map((v) => {
      // Process sizes to ensure numerical types for stock, price, and discountPrice
      const processedSizes = v.sizes.map((s) => ({
        ...s,
        name: s.name, // Keep name as is
        stock: Number(s.stock || 0),
        price: Number(s.price || 0), // Explicitly convert to Number
        discountPrice: Number(s.discountPrice || 0), // Explicitly convert to Number
      }));

      // Calculate stock for each variant based on its processed sizes
      const variantStock = processedSizes.reduce(
        (sum, s) => sum + (s.stock || 0),
        0,
      );
      totalStock += variantStock; // Add to master stock

      const gallery = normaliseVariantGallery(
        v,
        uploadedVariantGalleryFiles,
        `${parsedData.name || product.name} ${v.color?.name || "variant"} gallery`,
      );

      if (v.hasNewImage === true && uploadedVariantFiles[variantFileIndex]) {
        const file = uploadedVariantFiles[variantFileIndex];
        const v_image = buildUploadedImage(file);
        variantFileIndex++;
        const { hasNewImage, hasNewVideo, ...rest } = v;
        return {
          ...rest,
          sizes: processedSizes,
          v_image,
          v_video:
            hasNewVideo === true && uploadedVariantVideoFiles.length > 0
              ? buildUploadedVideo(uploadedVariantVideoFiles.shift())
              : rest.v_video || null,
          gallery,
        };
      }

      const { hasNewImage, hasNewVideo, ...rest } = v;
      return {
        ...rest,
        sizes: processedSizes,
        v_video:
          hasNewVideo === true && uploadedVariantVideoFiles.length > 0
            ? buildUploadedVideo(uploadedVariantVideoFiles.shift())
            : rest.v_video || null,
        gallery,
      }; // Return variant with processed sizes
    });
  }

  const existingVariantMediaMap = collectVariantMediaMap(product.variants);
  const newVariantMediaMap = collectVariantMediaMap(parsedData.variants);
  const removedVariantMedia = [];
  for (const [key, media] of existingVariantMediaMap.entries()) {
    if (!newVariantMediaMap.has(key)) {
      removedVariantMedia.push(media);
    }
  }
  await cleanupMediaItems(removedVariantMedia);

  const existingImages =
    typeof data.existingImages === "string"
      ? JSON.parse(data.existingImages)
      : Array.isArray(data.existingImages)
        ? data.existingImages
        : product.images || [];

  let newGalleryImages = [];
  if (files && files["images"]) {
    newGalleryImages = files["images"].map((file, index) => ({
      url: file.location || file.path,
      public_id: file.key || file.filename,
      alt: `${parsedData.name} gallery ${existingImages.length + index + 1}`,
      isDefault: false,
    }));
  }
  parsedData.images = [...existingImages, ...newGalleryImages];

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    { $set: { ...parsedData, stock: totalStock } },
    { new: true, runValidators: true },
  );

  // Sync to n-gram search index
  await syncToIndex(updatedProduct, "product");

  return { success: true, product: sanitizeProductRecord(updatedProduct) };
};

export const deleteProductService = async (id) => {
  const product = await Product.findById(id);
  if (!product) return { success: false, statusCode: 404 };

  if (product.mainImage?.public_id)
    await deleteS3File(product.mainImage.public_id);
  else if (product.mainImage?.url && !product.mainImage.url.startsWith("http"))
    await deleteFile(product.mainImage.url);

  if (product.hoverImage?.public_id)
    await deleteS3File(product.hoverImage.public_id);
  else if (
    product.hoverImage?.url &&
    !product.hoverImage.url.startsWith("http")
  )
    await deleteFile(product.hoverImage.url);

  if (product.images) {
    for (const img of product.images) {
      if (img.public_id) await deleteS3File(img.public_id);
      else if (img.url && !img.url.startsWith("http"))
        await deleteFile(img.url);
    }
  }

  if (product.video?.public_id) await deleteS3File(product.video.public_id);
  else if (product.video?.url && !product.video.url.startsWith("http"))
    await deleteFile(product.video.url);

  const variantMediaItems = Array.from(
    collectVariantMediaMap(product.variants).values(),
  );
  await cleanupMediaItems(variantMediaItems);

  await product.deleteOne();

  // Remove from n-gram search index
  await deleteFromIndex(id);

  return { success: true };
};

export const getLowStockProductsService = async () => {
  const lowStockProducts = await Product.aggregate([
    // Carry the product-level threshold through the pipeline
    {
      $addFields: {
        threshold: { $ifNull: ["$lowStockThreshold", 5] },
      },
    },
    { $unwind: "$variants" },
    { $unwind: "$variants.sizes" },
    {
      // Match sizes where stock is above 0 but at or below the product's own threshold
      $match: {
        $expr: {
          $and: [
            { $gt: ["$variants.sizes.stock", 0] },
            { $lte: ["$variants.sizes.stock", "$threshold"] },
          ],
        },
      },
    },
    {
      $group: {
        _id: {
          productId: "$_id",
          name: "$name",
          color: "$variants.color.name",
          v_sku: "$variants.v_sku",
          threshold: "$threshold",
        },
        mainImage: { $first: "$mainImage" },
        sizes: {
          $push: {
            name: "$variants.sizes.name",
            stock: "$variants.sizes.stock",
          },
        },
      },
    },
    {
      $group: {
        _id: "$_id.productId",
        name: { $first: "$_id.name" },
        mainImage: { $first: "$mainImage" },
        lowStockThreshold: { $first: "$_id.threshold" },
        lowStockVariants: {
          $push: {
            color: "$_id.color",
            v_sku: "$_id.v_sku",
            sizes: "$sizes",
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        mainImage: 1,
        lowStockThreshold: 1,
        lowStockVariants: 1,
      },
    },
  ]);

  return { success: true, data: lowStockProducts };
};

export const getProductReviewsService = async (productId) => {
  const reviews = await Review.find({ product: productId, isApproved: true })
    .sort("-createdAt")
    .populate("user", "name profileImage");

  return reviews
    ? { success: true, reviews }
    : { success: false, statusCode: 404 };
};

const bulkImportRowBasedService = async (files, userId) => {
  const excelFile = files.file ? files.file[0] : null;
  const imageFiles = files.images || [];

  if (!excelFile) {
    throw new Error("Excel file is required");
  }

  const workbook = xlsx.readFile(excelFile.path, {
    cellHTML: true,
    cellStyles: true,
    cellText: true,
  });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  const headers = (rawRows[0] || []).map((header) => String(header || "").trim());
  const headerIndex = new Map(
    headers.map((header, index) => [header.toLowerCase(), index]),
  );

  const getHeaderIndex = (...names) => {
    for (const name of names) {
      const index = headerIndex.get(String(name).toLowerCase());
      if (index !== undefined) return index;
    }
    return undefined;
  };

  const getCellByHeader = (rowNumber, ...headerNames) => {
    const index = getHeaderIndex(...headerNames);
    if (index === undefined) return null;
    const address = xlsx.utils.encode_cell({ r: rowNumber - 1, c: index });
    return worksheet[address] || null;
  };

  const getRowValue = (rowValues, ...headerNames) => {
    const index = getHeaderIndex(...headerNames);
    if (index === undefined) return "";
    return rowValues[index] ?? "";
  };

  const productsToInsert = [];
  const errors = [];

  const safeSplit = (val) => {
    if (val == null) return [];
    return val
      .toString()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const readCell = (row, keys) => {
    for (const key of keys) {
      if (!(key in row)) continue;
      const value = row[key];
      if (value === null || value === undefined) continue;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed !== "") return trimmed;
        continue;
      }
      return value;
    }
    return "";
  };

  const hasAnyField = (row, keys) =>
    keys.some((key) => {
      const value = row[key];
      return (
        value !== null && value !== undefined && value.toString().trim() !== ""
      );
    });

  const BASE_FIELD_KEYS = [
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
    "MetaTitle",
    "MetaDescription",
    "MetaKeywords",
  ];

  const DETAIL_FIELD_KEYS = ["DetailKey", "DetailValue"];

  const VARIANT_FIELD_KEYS = [
    "VariantSKU",
    "VSKU",
    "VariantSku",
    "Color",
    "ColorName",
    "ColorCode",
    "Size",
    "Price",
    "MRP",
    "DiscountPrice",
    "SellingPrice",
    "Stock",
    "VariantImage",
    "VariantImageName",
    "VariantVideo",
    "VariantVideoName",
  ];

  const imageMap = new Map();
  imageFiles.forEach((file) => {
    imageMap.set(file.originalname.trim().toLowerCase(), file);
  });

  const videoMap = new Map();
  const videoFiles = files?.variantVideos || [];
  videoFiles.forEach((file) => {
    videoMap.set(file.originalname.trim().toLowerCase(), file);
  });

  const allCategories = await Category.find({}).lean();
  const categoryMap = new Map();
  allCategories.forEach((c) => {
    categoryMap.set(c.name.toLowerCase().trim(), c._id);
  });

  const existingSlugs = new Set(
    (await Product.find({}, { slug: 1 }).lean()).map((p) => p.slug),
  );
  const existingSkus = new Set(
    (await Product.find({}, { sku: 1 }).lean()).map((p) => p.sku),
  );
  const batchSlugs = new Set();
  const batchSkus = new Set();

  const allUploadedMedia = [];
  let activeUploadTracker = null;
  const trackUpload = (media) => {
    if (!media || !activeUploadTracker) return;
    activeUploadTracker.push(media);
  };

  const uploadedImageCache = new Map();
  const uploadedVideoCache = new Map();

  const processImage = async (filename, folder = "products") => {
    if (!filename) return null;
    const normalized = filename.toString().trim().toLowerCase();
    const cached = uploadedImageCache.get(normalized);
    if (cached) return cached;

    const file = imageMap.get(normalized);
    if (!file) return null;
    const s3Result = await uploadS3File(file.path, folder);
    const uploaded = { url: s3Result.url, public_id: s3Result.public_id };
    uploadedImageCache.set(normalized, uploaded);
    trackUpload(uploaded);
    return uploaded;
  };

  const processVideo = async (filename, folder = "products") => {
    if (!filename) return null;
    const normalized = filename.toString().trim().toLowerCase();
    const cached = uploadedVideoCache.get(normalized);
    if (cached) return cached;

    const file = videoMap.get(normalized);
    if (!file) return null;
    const s3Result = await uploadS3File(file.path, folder);
    const uploaded = {
      url: s3Result.url,
      public_id: s3Result.public_id,
      mimeType: file.mimetype || "video/mp4",
      size: file.size,
    };
    uploadedVideoCache.set(normalized, uploaded);
    trackUpload(uploaded);
    if (file?.path) {
      try {
        await deleteFile(file.path);
      } catch (error) {
        console.warn(
          `[BulkImport] Failed to remove temp video file "${file.path}": ${error.message}`,
        );
      }
    }
    return uploaded;
  };

  const buildVariantRow = async (row, rowIndex, productName) => {
    const colorName = readCell(row, ["Color", "ColorName"]);
    const sizeName = readCell(row, ["Size"]);
    const priceValue = readCell(row, ["Price", "MRP"]);
    const discountValue = readCell(row, ["DiscountPrice", "SellingPrice"]);
    const stockValue = readCell(row, ["Stock"]);
    const variantImageNames = readCell(row, [
      "VariantImages",
      "VariantImage",
      "VariantImageName",
    ]);
    const variantVideoNames = readCell(row, [
      "VariantVideos",
      "VariantVideo",
      "VariantVideoName",
    ]);
    const variantSku = readCell(row, ["VariantSKU", "VSKU", "VariantSku"]);
    const colorCode = readCell(row, ["ColorCode", "HexCode"]);

    if (!colorName || !sizeName) {
      errors.push(
        `Row ${rowIndex} (${productName}): Color and Size are required for each variant row`,
      );
      return null;
    }

    const price = Number(priceValue || 0);
    const discountPrice = Number(discountValue || 0);
    const stock = Number(stockValue || 0);

    if (!price || Number.isNaN(price)) {
      errors.push(
        `Row ${rowIndex} (${productName}): Price is required for size "${sizeName}"`,
      );
      return null;
    }

    const gallery = [];
    const variantImageList = safeSplit(variantImageNames);
    for (const imageName of variantImageList) {
      const image = await processImage(imageName);
      if (image) {
        gallery.push({
          ...image,
          alt: `${productName} ${colorName} gallery`,
        });
      } else {
        errors.push(
          `Row ${rowIndex} (${productName}): Variant image "${imageName}" not found in uploaded images`,
        );
      }
    }

    const variantVideoList = safeSplit(variantVideoNames);
    if (variantVideoList.length > 1) {
      errors.push(
        `Row ${rowIndex} (${productName}): Only one variant video is supported; using "${variantVideoList[0]}"`,
      );
    }
    const v_video = variantVideoList[0]
      ? await processVideo(variantVideoList[0])
      : null;
    if (variantVideoList[0] && !v_video) {
      errors.push(
        `Row ${rowIndex} (${productName}): Variant video "${variantVideoList[0]}" not found in uploaded videos`,
      );
    }

    const v_image = gallery[0]
      ? {
          url: gallery[0].url,
          public_id: gallery[0].public_id,
        }
      : null;

    return {
      colorName: colorName.toString(),
      colorCode: colorCode ? colorCode.toString() : "#000000",
      v_sku: variantSku ? variantSku.toString().trim().toUpperCase() : "",
      v_image,
      v_video,
      gallery,
      size: {
        name: sizeName.toString(),
        stock,
        price,
        discountPrice: Number.isNaN(discountPrice) ? 0 : discountPrice,
      },
    };
  };

  const finalizeDraftProduct = async (draft) => {
    if (!draft) return;

    const { rowIndex, name, sku, item } = draft;
    const rowUploads = [];
    const previousTracker = activeUploadTracker;
    activeUploadTracker = rowUploads;
    let rowSucceeded = false;

    try {
      if (existingSkus.has(sku) || batchSkus.has(sku)) {
        errors.push(
          `Row ${rowIndex} (${name}): SKU "${sku}" already exists — row skipped`,
        );
        return;
      }

      if (!item.Description) {
        errors.push(
          `Row ${rowIndex} (${name}): Description is required — row skipped`,
        );
        return;
      }

      if (!item.MaterialCare) {
        errors.push(
          `Row ${rowIndex} (${name}): MaterialCare is required — row skipped`,
        );
        return;
      }

      const catName = item.Category?.trim().toLowerCase();
      const categoryId = catName ? categoryMap.get(catName) : null;
      if (!categoryId) {
        errors.push(
          `Row ${rowIndex} (${name}): Category "${item.Category || ""}" not found — row skipped`,
        );
        return;
      }

      const mainImage = await processImage(item.MainImage);
      if (!mainImage?.url) {
        errors.push(
          `Row ${rowIndex} (${name}): mainImage is required but "${item.MainImage || "no filename provided"}" was not found in uploaded images — row skipped`,
        );
        return;
      }

      const hoverImage = await processImage(item.HoverImage);

      const variants = [...draft.variantMap.values()];
      if (variants.length === 0) {
        errors.push(
          `Row ${rowIndex} (${name}): At least one variant row is required — row skipped`,
        );
        return;
      }

      let totalStock = 0;
      variants.forEach((variant) => {
        totalStock += variant.sizes.reduce(
          (sum, size) => sum + (Number(size.stock) || 0),
          0,
        );
      });

      let slug = slugify(name, { lower: true, strict: true });
      if (existingSlugs.has(slug) || batchSlugs.has(slug)) {
        const base = slug;
        let suffix = 1;
        while (
          existingSlugs.has(`${base}-${suffix}`) ||
          batchSlugs.has(`${base}-${suffix}`)
        ) {
          suffix++;
        }
        slug = `${base}-${suffix}`;
      }

      productsToInsert.push({
        name,
        sku,
        slug,
        description: item.Description,
        shortDescription: item.ShortDescription || "",
        materialCare: item.MaterialCare,
        category: categoryId,
        subCategory: item.SubCategory || null,
        stock: totalStock,
        status: item.Status || "Active",
        wearType: safeSplit(item.WearType),
        occasion: safeSplit(item.Occasion),
        tags: safeSplit(item.Tags),
        style: safeSplit(item.Style),
        work: safeSplit(item.Work),
        fabric: safeSplit(item.Fabric),
        productType: safeSplit(item.Type),
        byPrice: safeSplit(item.ByPrice),
        specifications: draft.specifications,
        metaTitle: item.MetaTitle || "",
        metaDescription: item.MetaDescription || "",
        metaKeywords: item.MetaKeywords || "",
        mainImage,
        ...(hoverImage && { hoverImage }),
        variants,
        createdBy: userId,
      });

      batchSlugs.add(slug);
      batchSkus.add(sku);
      rowSucceeded = true;
      allUploadedMedia.push(...rowUploads);
    } finally {
      activeUploadTracker = previousTracker;
      if (!rowSucceeded && rowUploads.length > 0) {
        await cleanupMediaItems(rowUploads);
      }
    }
  };

  try {
    let currentDraft = null;

    for (let i = 0; i < rawRows.length - 1; i++) {
      const rowValues = rawRows[i + 1] || [];
      const rowIndex = i + 2;
      const item = {
        Name: getRowValue(rowValues, "Name"),
        SKU: getRowValue(rowValues, "SKU"),
        Description: spreadsheetCellToHtml(
          getCellByHeader(
            rowIndex,
            "Description",
            "FullDescription",
            "Full Description",
          ),
        ),
        ShortDescription: getRowValue(
          rowValues,
          "ShortDescription",
          "Short Description",
        ),
        MaterialCare: spreadsheetCellToHtml(
          getCellByHeader(
            rowIndex,
            "MaterialCare",
            "Material Care",
            "Material & Care",
          ),
        ),
        Category: getRowValue(rowValues, "Category"),
        SubCategory: getRowValue(rowValues, "SubCategory", "Sub Category"),
        Status: getRowValue(rowValues, "Status"),
        Tags: getRowValue(rowValues, "Tags"),
        WearType: getRowValue(rowValues, "WearType", "Wear Type"),
        Occasion: getRowValue(rowValues, "Occasion"),
        Style: getRowValue(rowValues, "Style"),
        Work: getRowValue(rowValues, "Work"),
        Fabric: getRowValue(rowValues, "Fabric"),
        Type: getRowValue(rowValues, "Type"),
        ByPrice: getRowValue(rowValues, "ByPrice", "By Price"),
        MainImage: getRowValue(rowValues, "MainImage", "Main Image"),
        HoverImage: getRowValue(rowValues, "HoverImage", "Hover Image"),
        Variants: getRowValue(rowValues, "Variants"),
        DetailKey: getRowValue(rowValues, "DetailKey"),
        DetailValue: getRowValue(rowValues, "DetailValue"),
        VariantSKU: getRowValue(rowValues, "VariantSKU", "VSKU", "VariantSku"),
        Color: getRowValue(rowValues, "Color", "ColorName"),
        ColorName: getRowValue(rowValues, "ColorName"),
        ColorCode: getRowValue(rowValues, "ColorCode", "HexCode"),
        Size: getRowValue(rowValues, "Size"),
        Price: getRowValue(rowValues, "Price", "MRP"),
        MRP: getRowValue(rowValues, "MRP"),
        DiscountPrice: getRowValue(rowValues, "DiscountPrice", "SellingPrice"),
        SellingPrice: getRowValue(rowValues, "SellingPrice"),
        Stock: getRowValue(rowValues, "Stock"),
        VariantImages: getRowValue(
          rowValues,
          "VariantImages",
          "VariantImage",
          "VariantImageName",
        ),
        VariantImage: getRowValue(rowValues, "VariantImage"),
        VariantImageName: getRowValue(rowValues, "VariantImageName"),
        VariantVideos: getRowValue(
          rowValues,
          "VariantVideos",
          "VariantVideo",
          "VariantVideoName",
        ),
        VariantVideo: getRowValue(rowValues, "VariantVideo"),
        VariantVideoName: getRowValue(rowValues, "VariantVideoName"),
      };

      try {
        const hasAnyValue = Object.values(item).some(
          (v) => v !== null && v !== undefined && v.toString().trim() !== "",
        );
        if (!hasAnyValue) continue;

        const startsNewProduct = hasAnyField(item, BASE_FIELD_KEYS);
        const hasVariantData = hasAnyField(item, VARIANT_FIELD_KEYS);

        if (startsNewProduct) {
          await finalizeDraftProduct(currentDraft);

          const name = readCell(item, ["Name"]);
          const sku = readCell(item, ["SKU"]).toString().trim().toUpperCase();

          if (!name || !sku) {
            errors.push(
              `Row ${rowIndex}: Name and SKU are required for the first row of a product`,
            );
            currentDraft = null;
            continue;
          }

          currentDraft = {
            rowIndex,
            name: name.toString(),
            sku,
            item,
            variantMap: new Map(),
            specifications: [],
          };
        } else if (!currentDraft) {
          errors.push(
            `Row ${rowIndex}: Variant row found before any product base row`,
          );
          continue;
        }

        if (!hasVariantData && !startsNewProduct) {
          const hasDetailData = hasAnyField(item, DETAIL_FIELD_KEYS);
          if (!hasDetailData) {
            errors.push(
              `Row ${rowIndex}: No variant or detail data found for this row`,
            );
            continue;
          }
        }

        const detailKey = readCell(item, ["DetailKey"]);
        const detailValue = readCell(item, ["DetailValue"]);
        if (detailKey || detailValue) {
          if (!detailKey || !detailValue) {
            errors.push(
              `Row ${rowIndex} (${currentDraft.name}): DetailKey and DetailValue must both be filled`,
            );
          } else {
            currentDraft.specifications.push({
              key: detailKey.toString(),
              value: detailValue.toString(),
            });
          }
        }

        if (!hasVariantData) {
          continue;
        }

        const variantRow = await buildVariantRow(
          item,
          rowIndex,
          currentDraft.name,
        );
        if (!variantRow) continue;

        const variantKey = `${variantRow.colorName.toLowerCase()}|${variantRow.v_sku || ""}`;
        let variant = currentDraft.variantMap.get(variantKey);

        if (!variant) {
          variant = {
            v_sku: variantRow.v_sku,
            color: {
              name: variantRow.colorName,
              code: variantRow.colorCode || "#000000",
              swatchImage: "",
            },
            sizes: [],
            gallery: variantRow.gallery || [],
            ...(variantRow.v_image && { v_image: variantRow.v_image }),
          };
          currentDraft.variantMap.set(variantKey, variant);
        } else if (!variant.v_image && variantRow.v_image) {
          variant.v_image = variantRow.v_image;
        }

        if (variantRow.gallery?.length) {
          const existingUrls = new Set(
            (variant.gallery || []).map((img) => img.url),
          );
          variant.gallery = [
            ...(variant.gallery || []),
            ...variantRow.gallery.filter((img) => !existingUrls.has(img.url)),
          ];
        }

        if (variantRow.v_video && !variant.v_video) {
          variant.v_video = variantRow.v_video;
        }

        const duplicateSize = variant.sizes.some(
          (size) =>
            size.name.toLowerCase() === variantRow.size.name.toLowerCase(),
        );
        if (duplicateSize) {
          errors.push(
            `Row ${rowIndex} (${currentDraft.name}): Duplicate size "${variantRow.size.name}" for color "${variantRow.colorName}" skipped`,
          );
          continue;
        }

        variant.sizes.push(variantRow.size);
      } catch (err) {
        errors.push(`Row ${rowIndex}: Unexpected error — ${err.message}`);
      }
    }

    await finalizeDraftProduct(currentDraft);

    if (productsToInsert.length === 0) {
      throw new Error("No products found in Excel file");
    }

    let inserted = [];
    if (productsToInsert.length > 0) {
      try {
        inserted = await Product.insertMany(productsToInsert, {
          ordered: false,
        });
      } catch (err) {
        await cleanupMediaItems(allUploadedMedia);
        allUploadedMedia.length = 0;
        if (err.insertedDocs) {
          inserted = err.insertedDocs;
        }
        if (err.writeErrors?.length) {
          err.writeErrors.forEach((we) => {
            const failed = productsToInsert[we.index];
            errors.push(
              `DB insert failed for "${failed?.name || `index ${we.index}`}": ${we.errmsg || we.err?.errmsg || "unknown error"}`,
            );
          });
        } else {
          errors.push(`Database insert error: ${err.message}`);
        }
      }
    }

    if (inserted.length > 0) {
      rebuildIndex().catch((err) =>
        console.error(
          "[NGramSearch] Auto-rebuild failed after bulk import:",
          err,
        ),
      );
    }

    try {
      const allFiles = [excelFile, ...imageFiles, ...videoFiles];
      for (const f of allFiles) {
        if (f?.path) await deleteFile(f.path);
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }

    return {
      success: true,
      data: inserted,
      errors,
    };
  } catch (err) {
    await cleanupMediaItems(allUploadedMedia);
    throw err;
  }
};

export const bulkImportService = async (files, userId) => {
  return bulkImportRowBasedService(files, userId);

  const excelFile = files.file ? files.file[0] : null;
  const imageFiles = files.images || [];

  if (!excelFile) {
    throw new Error("Excel file is required");
  }

  const workbook = xlsx.readFile(excelFile.path);
  const rawData = xlsx.utils.sheet_to_json(
    workbook.Sheets[workbook.SheetNames[0]],
  );

  const productsToInsert = [];
  const errors = [];

  // Filename -> File Object
  const imageMap = new Map();
  imageFiles.forEach((file) => {
    imageMap.set(file.originalname.trim().toLowerCase(), file);
  });

  // Pre-fetch all categories to avoid N+1 queries
  const allCategories = await Category.find({}).lean();
  const categoryMap = new Map();
  allCategories.forEach((c) => {
    categoryMap.set(c.name.toLowerCase().trim(), c._id);
  });

  // Pre-fetch existing slugs and SKUs to handle uniqueness without DB round-trips per row
  const existingSlugs = new Set(
    (await Product.find({}, { slug: 1 }).lean()).map((p) => p.slug),
  );
  const existingSkus = new Set(
    (await Product.find({}, { sku: 1 }).lean()).map((p) => p.sku),
  );
  // Also track slugs/SKUs added in this batch to catch intra-batch duplicates
  const batchSlugs = new Set();
  const batchSkus = new Set();

  for (let i = 1; i < rawRows.length; i++) {
    const rowValues = rawRows[i] || [];
    const rowNumber = i + 1;
    const item = {
      Name: getRowValue(rowValues, "Name"),
      SKU: getRowValue(rowValues, "SKU"),
      Description: spreadsheetCellToHtml(
        getCellByHeader(rowNumber, "Description", "FullDescription", "Full Description"),
      ),
      ShortDescription: getRowValue(rowValues, "ShortDescription", "Short Description"),
      MaterialCare: spreadsheetCellToHtml(
        getCellByHeader(rowNumber, "MaterialCare", "Material Care", "Material & Care"),
      ),
      Category: getRowValue(rowValues, "Category"),
      SubCategory: getRowValue(rowValues, "SubCategory", "Sub Category"),
      Status: getRowValue(rowValues, "Status"),
      Tags: getRowValue(rowValues, "Tags"),
      WearType: getRowValue(rowValues, "WearType", "Wear Type"),
      Occasion: getRowValue(rowValues, "Occasion"),
      Style: getRowValue(rowValues, "Style"),
      Work: getRowValue(rowValues, "Work"),
      Fabric: getRowValue(rowValues, "Fabric"),
      Type: getRowValue(rowValues, "Type"),
      ByPrice: getRowValue(rowValues, "ByPrice", "By Price"),
      MainImage: getRowValue(rowValues, "MainImage", "Main Image"),
      HoverImage: getRowValue(rowValues, "HoverImage", "Hover Image"),
      Variants: getRowValue(rowValues, "Variants"),
    };
    const rowIndex = i + 1;

    try {
      // ── 0. Skip completely empty rows (xlsx trailing row artefacts) ─────────
      const hasAnyValue = Object.values(item).some(
        (v) => v !== null && v !== undefined && v.toString().trim() !== "",
      );
      if (!hasAnyValue) continue;
      // ── 1. Required field validation ──────────────────────────────────────
      const name = item.Name?.trim();
      const sku = item.SKU?.toString().trim().toUpperCase();

      if (!name || !sku) {
        errors.push(`Row ${rowIndex}: Name or SKU missing — row skipped`);
        continue;
      }

      if (!item.Description) {
        errors.push(
          `Row ${rowIndex} (${name}): Description is required — row skipped`,
        );
        continue;
      }

      if (!item.MaterialCare) {
        errors.push(
          `Row ${rowIndex} (${name}): MaterialCare is required — row skipped`,
        );
        continue;
      }

      // ── 2. SKU uniqueness ─────────────────────────────────────────────────
      if (existingSkus.has(sku) || batchSkus.has(sku)) {
        errors.push(
          `Row ${rowIndex} (${name}): SKU "${sku}" already exists — row skipped`,
        );
        continue;
      }

      // ── 3. Category lookup ────────────────────────────────────────────────
      let categoryId = null;
      if (item.Category) {
        const catName = item.Category.trim().toLowerCase();
        categoryId = categoryMap.get(catName);
        if (!categoryId) {
          errors.push(
            `Row ${rowIndex} (${name}): Category "${item.Category}" not found — row skipped`,
          );
          continue;
        }
      } else {
        errors.push(
          `Row ${rowIndex} (${name}): Category is required — row skipped`,
        );
        continue;
      }

      // ── 4. Image processing ───────────────────────────────────────────────
      const uploadedImageCache = new Map();

      const processImage = async (filename, folder = "products") => {
        if (!filename) return null;
        const normalized = filename.toString().trim().toLowerCase();
        const cached = uploadedImageCache.get(normalized);
        if (cached) return cached;

        const file = imageMap.get(normalized);
        if (!file) return null;
        const s3Result = await uploadS3File(file.path, folder);
        const uploaded = { url: s3Result.url, public_id: s3Result.public_id };
        uploadedImageCache.set(normalized, uploaded);
        return uploaded;
      };

      const mainImage = await processImage(item.MainImage);

      // ── 5. mainImage is required — skip row if missing ────────────────────
      if (!mainImage || !mainImage.url) {
        errors.push(
          `Row ${rowIndex} (${name}): mainImage is required but "${item.MainImage || "no filename provided"}" was not found in uploaded images — row skipped`,
        );
        continue;
      }

      const hoverImage = await processImage(item.HoverImage);

      // ── 6. Gallery images ─────────────────────────────────────────────────
      const safeSplit = (val) => {
        if (val == null) return [];
        return val
          .toString()
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      };

      // ── 7. Variants ───────────────────────────────────────────────────────
      const variants = [];
      if (item.Variants) {
        try {
          let vStr = item.Variants.toString().trim().replace(/[""]/g, '"');
          if (vStr.includes("'") && !vStr.includes('"')) {
            vStr = vStr.replace(/'/g, '"');
          }
          const parsedVariants = JSON.parse(vStr);
          for (const v of parsedVariants) {
            let v_image = null;
            if (v.imageFilename) {
              v_image = await processImage(v.imageFilename);
              delete v.imageFilename;
            }
            let v_video = null;
            if (v.videoFilename) {
              v_video = await processVideo(v.videoFilename);
              delete v.videoFilename;
            }
            variants.push({
              ...v,
              ...(v_image && { v_image }),
              ...(v_video && { v_video }),
            });
          }
        } catch (e) {
          errors.push(
            `Row ${rowIndex} (${name}): Invalid Variants JSON — ${e.message}`,
          );
          // Don't skip the row — import without variants
        }
      }

      // ── 8. Slug generation with uniqueness suffix ─────────────────────────
      let slug = slugify(name, { lower: true, strict: true });
      if (existingSlugs.has(slug) || batchSlugs.has(slug)) {
        const base = slug;
        let suffix = 1;
        while (
          existingSlugs.has(`${base}-${suffix}`) ||
          batchSlugs.has(`${base}-${suffix}`)
        ) {
          suffix++;
        }
        slug = `${base}-${suffix}`;
      }

      // ── 9. Build product object ───────────────────────────────────────────
      const product = {
        name,
        sku,
        slug,
        description: sanitizeProductHtml(item.Description || ""),
        shortDescription: item.ShortDescription || "",
        materialCare: sanitizeProductHtml(item.MaterialCare || ""),
        category: categoryId,
        subCategory: item.SubCategory || null,
        stock: Number(item.Stock) || 0,
        status: item.Status || "Active",
        wearType: safeSplit(item.WearType),
        occasion: safeSplit(item.Occasion),
        tags: safeSplit(item.Tags),
        style: safeSplit(item.Style),
        work: safeSplit(item.Work),
        fabric: safeSplit(item.Fabric),
        productType: safeSplit(item.Type),
        byPrice: safeSplit(item.ByPrice),
        mainImage,
        ...(hoverImage && { hoverImage }),
        variants,
        createdBy: userId,
      };

      productsToInsert.push(product);
      batchSlugs.add(slug);
      batchSkus.add(sku);
    } catch (err) {
      errors.push(`Row ${rowIndex}: Unexpected error — ${err.message}`);
    }
  }

  // ── Insert valid products ─────────────────────────────────────────────────
  let inserted = [];
  if (productsToInsert.length > 0) {
    try {
      inserted = await Product.insertMany(productsToInsert, { ordered: false });
    } catch (err) {
      if (err.insertedDocs) {
        inserted = err.insertedDocs;
      }
      // Extract per-document write errors and surface them
      if (err.writeErrors?.length) {
        err.writeErrors.forEach((we) => {
          const failed = productsToInsert[we.index];
          errors.push(
            `DB insert failed for "${failed?.name || `index ${we.index}`}": ${we.errmsg || we.err?.errmsg || "unknown error"}`,
          );
        });
      } else {
        errors.push(`Database insert error: ${err.message}`);
      }
    }
  }

  // Rebuild search index in background — insertMany bypasses syncToIndex
  if (inserted.length > 0) {
    rebuildIndex().catch((err) =>
      console.error(
        "[NGramSearch] Auto-rebuild failed after bulk import:",
        err,
      ),
    );
  }

  // ── Cleanup temp files ────────────────────────────────────────────────────
  try {
    const allFiles = [excelFile, ...imageFiles];
    for (const f of allFiles) {
      if (f?.path) await deleteFile(f.path);
    }
  } catch (e) {
    console.error("Cleanup error:", e);
  }

  return {
    success: true,
    data: inserted,
    errors,
  };
};

export const addReviewService = async (productId, user, rating, comment) => {
  console.log(
    `[addReviewService] User ${user._id} attempting review for Product ${productId}`,
  );
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return { success: false, statusCode: 400, message: "Invalid product ID" };
  }
  const prodId = new mongoose.Types.ObjectId(productId);

  const product = await Product.findById(prodId);
  if (!product) return { success: false, statusCode: 404 };

  // 1. MUST have purchased the product (Order Status: Delivered)
  const hasPurchased = await Order.findOne({
    user: user._id,
    "orderItems.product": prodId,
    orderStatus: "Delivered",
  });
  console.log(`[addReviewService] Purchase verification: ${!!hasPurchased}`);

  if (!hasPurchased) {
    return {
      success: false,
      statusCode: 403,
      message: "You can only review products that have been delivered to you.",
    };
  }

  const existingReview = await Review.findOne({
    user: user._id,
    product: prodId,
  });
  if (existingReview) {
    return {
      success: false,
      statusCode: 400,
      message: "You have already reviewed this product",
    };
  }

  const newReview = await Review.create({
    user: user._id,
    product: prodId,
    userName: user.name,
    rating: Number(rating),
    comment,
    isVerifiedPurchase: true,
  });

  return { success: true, review: newReview };
};

/**
 * Checks if a user is eligible to review a product.
 * Eligible only if they have a 'Delivered' order containing this product.
 */
export const canReviewService = async (productId, userId) => {
  console.log(
    `[canReviewService] Checking eligibility for User: ${userId}, Product: ${productId}`,
  );
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return { success: false, canReview: false, reason: "Invalid product ID" };
  }
  const prodId = new mongoose.Types.ObjectId(productId);

  const order = await Order.findOne({
    user: userId,
    "orderItems.product": prodId,
    orderStatus: "Delivered",
  });

  console.log(`[canReviewService] Order found: ${!!order}`);

  const alreadyReviewed = await Review.findOne({
    user: userId,
    product: prodId,
  });

  return {
    success: true,
    canReview: !!order && !alreadyReviewed,
    reason: !order
      ? "Purchase required"
      : alreadyReviewed
        ? "Already reviewed"
        : null,
  };
};

export const getAllReviewsService = async (
  page = 1,
  limit = 10,
  status = "all",
) => {
  const query = {};
  if (status === "approved") query.isApproved = true;
  if (status === "pending") query.isApproved = { $ne: true };

  const total = await Review.countDocuments(query);
  const skip = (page - 1) * limit;

  const [approvedCount, pendingCount, averageRatingResult] = await Promise.all([
    Review.countDocuments({ isApproved: true }),
    Review.countDocuments({ isApproved: { $ne: true } }),
    Review.aggregate([
      { $match: { isApproved: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
        },
      },
    ]),
  ]);

  const reviews = await Review.find(query)
    .populate("product", "name mainImage")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  return {
    success: true,
    reviews,
    total,
    page: Number(page),
    limit: Number(limit),
    approvedCount,
    pendingCount,
    averageRating: averageRatingResult[0]?.averageRating || 0,
  };
};

export const updateReviewStatusService = async (
  reviewId,
  isApproved,
  comment,
  rating,
  userName,
) => {
  const review = await Review.findById(reviewId);
  if (!review)
    return { success: false, statusCode: 404, message: "Review not found" };

  if (isApproved !== undefined) review.isApproved = isApproved;
  if (comment !== undefined) review.comment = comment;
  if (rating !== undefined) review.rating = rating;
  if (userName !== undefined) review.userName = userName;

  await review.save();

  // Recalculate product rating
  const product = await Product.findById(review.product);
  if (product) {
    const reviews = await Review.find({
      product: review.product,
      isApproved: true,
    });
    product.totalReviews = reviews.length;
    product.averageRating = reviews.length
      ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length
      : 0;
    await product.save();
  }

  return { success: true, review };
};

export const deleteReviewService = async (reviewId) => {
  const review = await Review.findById(reviewId);
  if (!review)
    return { success: false, statusCode: 404, message: "Review not found" };

  await review.deleteOne();

  // Recalculate product rating
  const product = await Product.findById(review.product);
  if (product) {
    const reviews = await Review.find({
      product: review.product,
      isApproved: true,
    });
    product.totalReviews = reviews.length;
    product.averageRating = reviews.length
      ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length
      : 0;
    await product.save();
  }

  return { success: true, message: "Review deleted" };
};

export const getProductStatsService = async () => {
  const stats = await Product.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ["$status", "Inactive"] }, 1, 0] } },
        lowStock: {
          $sum: {
            $cond: [
              { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 10] }] },
              1,
              0,
            ],
          },
        },
        outOfStock: { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
      },
    },
  ]);
  return {
    success: true,
    data: stats[0] || {
      total: 0,
      active: 0,
      inactive: 0,
      lowStock: 0,
      outOfStock: 0,
    },
  };
};

export const incrementViewCountService = async (id) => {
  if (!id || typeof id !== "string") {
    return { success: false, statusCode: 400, message: "Product id is required" };
  }

  const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

  const product = await Product.findOneAndUpdate(
    query,
    { $inc: { viewCount: 1 } },
    { new: true },
  );

  if (!product) {
    return { success: false, statusCode: 404 };
  }
  return { success: true };
};

export const getTrendingProductsService = async () => {
  const products = await Product.find({
    isTrending: true,
    status: "Active",
  })
    .sort({ createdAt: -1 })
    .populate("category", "name slug")
    .lean();

  return { success: true, products: products.map(sanitizeProductRecord) };
};

export const fetchCollectionProducts = async () => {
  const products = await Product.find(
    { isCollection: true, status: "Active" },
    {
      name: 1,
      slug: 1,
      mainImage: 1,
      hoverImage: 1,
      variants: 1,
      status: 1,
    },
  )
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return products.map((p) => {
    // Derive price/MRP/discount from the first available variant + size
    const firstVariant = p.variants?.[0];
    const firstSize = firstVariant?.sizes?.[0];

    const mrp = firstSize?.price ?? 0;
    const price = firstSize?.discountPrice ?? mrp;
    const discountPct =
      mrp > 0 && price < mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;

    // A product is sold-out when every size of every variant has stock === 0
    const soldOut =
      p.variants?.every((v) => v.sizes?.every((s) => (s.stock ?? 0) === 0)) ??
      false;

    return {
      _id: p._id,
      name: p.name,
      slug: p.slug,
      image: p.mainImage?.url || "",
      imageAlt: p.mainImage?.alt || p.name,
      hoverImage: p.hoverImage?.url || p.mainImage?.url || "",
      hoverImageAlt: p.hoverImage?.alt || p.name,
      price: price > 0 ? `₹ ${price.toFixed(2)}` : null,
      mrp: mrp > 0 ? `₹ ${mrp.toFixed(2)}` : null,
      discount: discountPct > 0 ? `${discountPct}% OFF` : null,
      soldOut,
    };
  });
};
