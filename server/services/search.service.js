/**
 * @fileoverview Search Service — Priority-Ordered Pipeline
 *
 * Delegates scoring to ngram.search.service (which now owns all tier logic).
 * This layer only handles:
 *   1. Hydrating raw ngram hits → full Mongo documents
 *   2. Deduplication + result count limiting
 *   3. A direct DB attribute scan as a safety net for single-word queries
 *      (ensures products tagged "festive" are never missed even if ngram
 *      scoring places them just below the threshold)
 *
 * Result order is ENTIRELY determined by ngram.search.service tiers:
 *   Tier 1 — Products whose name STARTS WITH the query   (top)
 *   Tier 2 — Products whose name CONTAINS the query
 *   Tier 3 — Categories whose name matches the query
 *   Tier 4 — Products whose subCategory / category matches
 *   Tier 5 — Products matched by tags / attributes        (bottom)
 *
 * No re-sorting, re-filtering, or fuzzy expansion happens here.
 * The ngram service has already guaranteed relevance before returning hits.
 */

import { searchNgram } from "./ngram.search.service.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_QUERY_LENGTH = 1;        // minimum query length to attempt a search
const ATTRIBUTE_FIELDS = [
  "tags",
  "occasion",
  "wearType",
  "productType",
  "fabric",
  "style",
  "work",
  "displayCollections",
  "eventTags",
];

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export const searchService = async ({ query, limit, page }) => {
  const normQ = normalise(query);
  if (!normQ || normQ.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const maxProducts =
    Number.isFinite(Number(limit)) && Number(limit) > 0
      ? Number(limit)
      : Infinity;

  const parsedPage = Number.isFinite(Number(page)) && Number(page) > 0
    ? Number(page)
    : 1;

  // ── Step 1: Get ranked hits from the n-gram index ────────────────────────
  const isSingleWord = !normQ.includes(" ");
  const ngramResult = await searchNgram(query, {
    limit: isSingleWord ? 200 : (Number.isFinite(Number(limit)) ? Number(limit) : 20),
    page: isSingleWord ? 1 : parsedPage,
  });

  // ── Step 2: Hydrate hits → full Mongo documents ──────────────────────────
  const hydrated = await hydrateSearchHits(ngramResult.hits);

  // ── Step 3: Category resolution — if query exactly matches a category name,
  // return ONLY that category + its products. Skip attribute scan entirely.
  // This prevents "Sarees" from leaking in products tagged "saree" that
  // belong to other categories.
  if (normQ.length >= 2) {
    const matchedCategory = await findExactCategory(normQ);
    if (matchedCategory) {
      const categoryProducts = await getCategoryProducts(matchedCategory._id);
      hydrated.unshift(
        { type: "category", data: matchedCategory },
        ...categoryProducts.map((p) => ({ type: "product", data: p })),
      );
    }
  }

  // ── Step 4: Attribute safety-net scan (single-word, 3+ chars only) ───────
  // Only runs when the query did NOT resolve to a category.
  // Appends products tagged with the query word that the ngram index may have
  // missed, deduplicated and placed after ngram-ranked results.
  if (isSingleWord && normQ.length >= 3) {
    const dbHits = await dbAttributeScan(normQ);
    if (dbHits.length > 0) {
      const seenIds = new Set(hydrated.map((h) => h.data._id.toString()));
      const additional = dbHits
        .filter((p) => !seenIds.has(p._id.toString()))
        .map((p) => ({ type: "product", data: p }));
      hydrated.push(...additional);
    }
  }

  // ── Step 5: Deduplicate and limit ────────────────────────────────────────
  return limitResults(hydrated, maxProducts);
};

// ---------------------------------------------------------------------------
// Category exact-match resolution
// ---------------------------------------------------------------------------

/**
 * Returns a category document if the query is an exact (fuzzy-tolerant) match
 * for a category name. Checks:
 *   1. Exact normalised name match        "sarees" === "sarees"
 *   2. Plural/singular variant match      "sarees" ↔ "saree"
 *   3. Levenshtein distance 1 match       "kaftan" ↔ "kaftaan" (typos)
 *
 * Does NOT match partial names ("sa" should not resolve to "Sarees").
 * Min query length for fuzzy: 4 characters.
 */
const findExactCategory = async (normQ) => {
  const categories = await Category.find({ status: "Active" })
    .select("_id name slug status")
    .lean();

  const variants = buildWordVariants(normQ);

  for (const cat of categories) {
    const normCat = normalise(cat.name);

    // Exact or variant match
    if (variants.some((v) => v === normCat)) return cat;

    // Single-word fuzzy (distance 1) for longer queries
    if (normQ.length >= 4 && !normQ.includes(" ")) {
      if (Math.abs(normCat.length - normQ.length) <= 2 &&
          levenshteinDistance(normQ, normCat) <= 1) {
        return cat;
      }
    }
  }

  return null;
};

/**
 * Fetches all Active products belonging to a category.
 * Joins both by category ObjectId reference AND by subCategory string
 * to catch products linked either way.
 */
const getCategoryProducts = async (categoryId) => {
  // First get the category name for subCategory matching
  const cat = await Category.findById(categoryId).select("name").lean();
  const catName = cat?.name || "";

  const [byRef, bySubCat] = await Promise.all([
    Product.find({ category: categoryId, status: "Active" })
      .populate("category", "name slug")
      .lean(),
    catName
      ? Product.find({
          subCategory: new RegExp(`^${escapeRegex(normalise(catName))}$`, "i"),
          status: "Active",
        })
          .populate("category", "name slug")
          .lean()
      : [],
  ]);

  // Merge and deduplicate
  const seen = new Set();
  const merged = [];
  for (const p of [...byRef, ...bySubCat]) {
    const id = p._id.toString();
    if (!seen.has(id)) { seen.add(id); merged.push(p); }
  }
  return merged;
};

// Levenshtein needed here too (can't import from ngram service)
const levenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  matrix[0] = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i-1] === a[j-1]
        ? matrix[i-1][j-1]
        : Math.min(matrix[i-1][j-1]+1, matrix[i][j-1]+1, matrix[i-1][j]+1);
    }
  }
  return matrix[b.length][a.length];
};

// ---------------------------------------------------------------------------
// Direct MongoDB attribute scan
// ---------------------------------------------------------------------------

/**
 * Scans MongoDB for products whose structured attribute fields contain the query.
 * Only used as a safety net for single-word queries — it does NOT replace the
 * ngram ranking (those results come first).
 *
 * Includes plural/singular variants to handle "sarees" ↔ "saree" etc.
 */
const dbAttributeScan = async (normQ) => {
  if (!normQ || normQ.length < 3) return [];

  const variants = buildWordVariants(normQ);
  const regexes = variants.map((v) => new RegExp(`^${escapeRegex(v)}$`, "i"));

  // Build $or conditions: exact match against each attribute array field
  const arrayConditions = ATTRIBUTE_FIELDS.flatMap((field) =>
    regexes.map((rx) => ({ [field]: rx }))
  );

  // Also match name / subCategory exactly
  const textConditions = regexes.flatMap((rx) => [
    { name: rx },
    { subCategory: rx },
  ]);

  // Variant color match
  const colorConditions = regexes.map((rx) => ({
    variants: { $elemMatch: { "color.name": rx } },
  }));

  return Product.find({
    status: "Active",
    $or: [...arrayConditions, ...textConditions, ...colorConditions],
  })
    .populate("category", "name slug")
    .lean();
};

// ---------------------------------------------------------------------------
// Hit hydration
// ---------------------------------------------------------------------------

const hydrateSearchHits = async (rawHits) => {
  if (!rawHits?.length) return [];

  const productIds  = rawHits.filter((h) => h.type === "product").map((h) => h.id);
  const categoryIds = rawHits.filter((h) => h.type === "category").map((h) => h.id);

  const [products, categories] = await Promise.all([
    productIds.length
      ? Product.find({ _id: { $in: productIds } }).populate("category", "name slug").lean()
      : [],
    categoryIds.length
      ? Category.find({ _id: { $in: categoryIds } }).lean()
      : [],
  ]);

  const productMap  = new Map(products.map((p) => [p._id.toString(), p]));
  const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

  // Preserve the order returned by the ngram service (already tier-ranked)
  return rawHits
    .map((hit) => {
      if (hit.type === "product") {
        const p = productMap.get(hit.id);
        return p ? { type: "product", data: p } : null;
      }
      if (hit.type === "category") {
        const c = categoryMap.get(hit.id);
        return c ? { type: "category", data: c } : null;
      }
      return null;
    })
    .filter(Boolean);
};

// ---------------------------------------------------------------------------
// Result limiting + deduplication
// ---------------------------------------------------------------------------

const limitResults = (results, maxProducts = Infinity) => {
  const out = [];
  let productCount = 0;
  const seenProductIds  = new Set();
  const seenCategoryIds = new Set();

  for (const result of results) {
    if (result.type === "category") {
      const id = result.data?._id?.toString() || result.data?.id;
      if (id) {
        if (seenCategoryIds.has(id)) continue;
        seenCategoryIds.add(id);
      }
      out.push(result);
      continue;
    }

    if (result.type === "product") {
      const id = result.data?._id?.toString() || result.data?.id;
      if (id) {
        if (seenProductIds.has(id)) continue;
        seenProductIds.add(id);
      }
      if (productCount >= maxProducts) continue;
      out.push(result);
      productCount++;
    }
  }

  return out;
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const normalise = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildWordVariants = (word) => {
  const variants = new Set([word]);
  if (word.endsWith("es") && word.length > 4) variants.add(word.slice(0, -2));
  if (word.endsWith("s")  && word.length > 3) variants.add(word.slice(0, -1));
  if (!word.endsWith("s")) variants.add(word + "s");
  return [...variants];
};
