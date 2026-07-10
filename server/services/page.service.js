import Page from "../models/page.model.js";
import { generateUniqueGlobalSlug } from "../utils/productSlug.js";

export const LEGACY_PAGE_SLUGS = [
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

export const normalizePageSlug = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/[^a-z0-9\/\s\-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "");

const buildSlugFromPayload = ({ slug, title }) => {
  const normalized = normalizePageSlug(slug || title);
  if (!normalized) {
    const error = new Error("Page slug is required");
    error.statusCode = 400;
    throw error;
  }
  return normalized;
};

const ensureUniqueSlug = async (slug, excludeId) => {
  if (LEGACY_PAGE_SLUGS.includes(slug)) {
    const error = new Error("This slug is reserved for an existing static page");
    error.statusCode = 400;
    throw error;
  }

  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await Page.findOne(query).select("_id");
  if (existing) {
    const error = new Error("A page with this slug already exists");
    error.statusCode = 409;
    throw error;
  }
};

export const listPages = async ({ search = "" } = {}) => {
  const query = { slug: { $nin: LEGACY_PAGE_SLUGS } };
  const term = String(search || "").trim();
  if (term) {
    query.$or = [
      { title: { $regex: term, $options: "i" } },
      { slug: { $regex: term, $options: "i" } },
    ];
  }
  return Page.find(query).sort({ updatedAt: -1 });
};

export const getPageById = (id) => Page.findById(id);

export const getPublishedPageBySlug = (slug) =>
  Page.findOne({ slug: normalizePageSlug(slug), status: "Published" });

export const getFooterPages = () =>
  Page.find({
    slug: { $nin: LEGACY_PAGE_SLUGS },
    status: "Published",
    footerPlacement: {
      $in: ["footer_column_1", "footer_column_2", "footer_column_3"],
    },
  })
    .select("title slug footerPlacement")
    .sort({ title: 1 });

export const createPage = async (payload, userId) => {
  const rawSlug = buildSlugFromPayload(payload);
  const slug = await generateUniqueGlobalSlug(rawSlug);
 
  return Page.create({
    ...payload,
    slug,
    updatedBy: userId,
  });
};

export const updatePage = async (id, payload, userId) => {
  const page = await Page.findById(id);
  if (!page) return null;

  const nextSlugRaw =
    payload.slug !== undefined || payload.title !== undefined
      ? buildSlugFromPayload({
          slug: payload.slug ?? page.slug,
          title: payload.title ?? page.title,
        })
      : page.slug;
 
  if (nextSlugRaw !== page.slug) {
    const slug = await generateUniqueGlobalSlug(nextSlugRaw, id);
    page.slug = slug;
  }

  [
    "title",
    "content",
    "metaTitle",
    "metaDescription",
    "metaKeywords",
    "canonicalUrl",
    "ogTitle",
    "ogDescription",
    "ogImage",
    "seoSchema",
    "status",
    "footerPlacement",
  ].forEach((field) => {
    if (payload[field] !== undefined) page[field] = payload[field];
  });

  if (userId) page.updatedBy = userId;
  await page.save();
  return page;
};

export const deletePage = (id) => Page.findByIdAndDelete(id);
