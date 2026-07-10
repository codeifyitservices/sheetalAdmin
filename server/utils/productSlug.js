import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Page from "../models/page.model.js";

const LEGACY_PAGE_SLUGS = [
  "about-us",
  "contact-us",
  "faq",
  "terms-and-conditions",
  "terms-conditions",
  "privacy-policy",
  "shipping-policy",
  "return-exchange-policy",
  "returne-policy",
  "blog",
  "wishlist",
  "cart",
  "checkout",
  "login",
  "otp",
  "my-account",
  "product-list",
];

export const sanitizeProductSlug = (value) => {
  const base = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9\s\-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "slug";
};

export const isSlugUniqueAcrossModels = async (slug, excludeId = null) => {
  if (LEGACY_PAGE_SLUGS.includes(slug)) return false;

  // Check Product model
  const productConflictQuery = {
    $or: [{ slug }, { previousSlugs: slug }]
  };
  if (excludeId) {
    productConflictQuery._id = { $ne: excludeId };
  }
  const productExists = await Product.exists(productConflictQuery);
  if (productExists) return false;

  // Check Category model
  const categoryConflictQuery = { slug };
  if (excludeId) {
    categoryConflictQuery._id = { $ne: excludeId };
  }
  const categoryExists = await Category.exists(categoryConflictQuery);
  if (categoryExists) return false;

  // Check Page model
  const pageConflictQuery = { slug };
  if (excludeId) {
    pageConflictQuery._id = { $ne: excludeId };
  }
  const pageExists = await Page.exists(pageConflictQuery);
  if (pageExists) return false;

  return true;
};

export const generateUniqueGlobalSlug = async (rawValue, excludeId = null, options = {}) => {
  const { reservedSlugs = new Set() } = options;
  const baseSlug = sanitizeProductSlug(rawValue);
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    if (!reservedSlugs.has(candidate)) {
      const isUnique = await isSlugUniqueAcrossModels(candidate, excludeId);
      if (isUnique) {
        reservedSlugs.add(candidate);
        return candidate;
      }
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

export const buildSlugConflictQuery = (slug, excludeProductId = null) => {
  const query = {
    $or: [{ slug }, { previousSlugs: slug }],
  };

  if (excludeProductId) {
    query._id = { $ne: excludeProductId };
  }

  return query;
};

export const generateUniqueProductSlug = async (
  ProductModel,
  rawValue,
  options = {},
) => {
  return generateUniqueGlobalSlug(rawValue, options.excludeProductId || options.excludeId, options);
};
