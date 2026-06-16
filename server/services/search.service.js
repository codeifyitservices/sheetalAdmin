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

const MIN_QUERY_LENGTH = 1; // minimum query length to attempt a search
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

const CATEGORY_TERM_ALIASES = new Map();

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export const searchService = async ({ query, limit, page }) => {
  const normQ = normaliseSearchText(query);
  if (!normQ || normQ.length < MIN_QUERY_LENGTH) {
    return [];
  }
  const resolvedCategoryProductIds = new Set();

  const maxProducts =
    Number.isFinite(Number(limit)) && Number(limit) > 0
      ? Number(limit)
      : Infinity;

  const parsedPage =
    Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;

  // ── Step 1: Get ranked hits from the n-gram index ────────────────────────
  const isSingleWord = !normQ.includes(" ");
  const ngramResult = await searchNgram(query, {
    limit: isSingleWord
      ? 200
      : Number.isFinite(Number(limit))
        ? Number(limit)
        : 20,
    page: isSingleWord ? 1 : parsedPage,
  });

  // ── Step 2: Hydrate hits → full Mongo documents ──────────────────────────
  const hydrated = await hydrateSearchHits(ngramResult.hits);

  // ── Step 3: Category resolution — if query exactly matches a category name,
  // return ONLY that category + its products. Skip attribute scan entirely.
  // This prevents "Sarees" from leaking in products tagged "saree" that
  // belong to other categories.
  let matchedCategoryBlocks = [];
  if (normQ.length >= 2) {
    const matchedCategories = await findMatchingCategories(normQ);
    if (matchedCategories.length > 0) {
      for (const matchedCategory of matchedCategories) {
        const categoryProducts = await getCategoryProducts(matchedCategory._id);
        categoryProducts.forEach((product) =>
          resolvedCategoryProductIds.add(product._id.toString()),
        );
        matchedCategoryBlocks.push(
          { type: "category", data: matchedCategory },
          ...categoryProducts.map((p) => ({ type: "product", data: p })),
        );
      }
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
  const hasResolvedCategory = matchedCategoryBlocks.length > 0;
  const vettedResults = hydrated.filter((hit) => {
    if (hit.type === "category") return true;
    if (
      hit.data?._id &&
      resolvedCategoryProductIds.has(hit.data._id.toString())
    ) {
      return true;
    }
    if (hasResolvedCategory) {
      return nameMatchesQuery(normaliseSearchText(hit.data?.name || ""), normQ);
    }
    return isStrictProductSearchMatch(hit.data, normQ);
  });

  return limitResults(
    mergeCategoryBlocksAfterNameMatches(
      vettedResults,
      matchedCategoryBlocks,
      normQ,
    ),
    maxProducts,
  );
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
const findMatchingCategories = async (normQ) => {
  const categories = await Category.find({ status: "Active" })
    .select("_id name slug status")
    .lean();

  const queryTokens = normQ.split(" ").filter(Boolean);
  const searchTerms = queryTokens.length > 1 ? queryTokens : [normQ];
  const matches = [];
  const seenCategoryIds = new Set();

  for (const term of searchTerms) {
    const variants = buildWordVariants(term);

    for (const cat of categories) {
      const normCat = normaliseSearchText(cat.name);
      const categoryWords = normCat.split(" ").filter(Boolean);

      // Exact or variant match
      if (variants.some((v) => v === normCat)) {
        if (!seenCategoryIds.has(cat._id.toString())) {
          seenCategoryIds.add(cat._id.toString());
          matches.push(cat);
        }
        continue;
      }

      // Also allow matching against words inside multi-word categories such as
      // "kurta sets", so short or broken forms like "ku" / "krta" can still
      // resolve the category through the main garment word.
      if (
        categoryWords.some((word) => isCategoryTermMatch(term, word, variants))
      ) {
        if (!seenCategoryIds.has(cat._id.toString())) {
          seenCategoryIds.add(cat._id.toString());
          matches.push(cat);
        }
        continue;
      }

      // Single-word typo tolerance for longer queries, kept strict enough to
      // catch garment misspellings like "lenga" -> "lehenga" without making
      // short generic queries too loose.
      if (term.length >= 4 && isCategoryTypoMatch(term, normCat)) {
        if (!seenCategoryIds.has(cat._id.toString())) {
          seenCategoryIds.add(cat._id.toString());
          matches.push(cat);
        }
      }
    }
  }

  return matches;
};

const isCategoryTermMatch = (term, categoryWord, variants) => {
  if (!term || !categoryWord) return false;

  const termVariants = new Set([...variants]);
  const candidateWords = new Set([
    categoryWord,
    ...buildWordVariants(categoryWord),
  ]);

  const maxSubsequenceSkips =
    term.length >= 5 &&
    term[0] === categoryWord[0] &&
    term.at(-1) === categoryWord.at(-1)
      ? 2
      : 1;

  for (const candidate of candidateWords) {
    if (termVariants.has(candidate)) return true;
    if (term.length >= 2 && candidate.startsWith(term)) return true;
    if (isOrderedSubsequenceMatch(term, candidate, maxSubsequenceSkips))
      return true;
    if (term.length >= 4 && isCategoryTypoMatch(term, candidate)) return true;
    if (isStrongCategoryNearMiss(term, candidate)) return true;
  }

  // Final logic-based fallback: Consonant prefix match (handles len -> lehenga, kurti -> kurta)
  const queryKey = consonantKey(term);
  const targetKey = consonantKey(categoryWord);
  if (queryKey.length >= 2 && targetKey.startsWith(queryKey)) {
    // Stricter length check to prevent "kt" (kuta) matching "ktgry" (category)
    const maxKeyDiff = queryKey.length <= 2 ? 1 : 2;
    if (targetKey.length <= queryKey.length + maxKeyDiff) {
      return true;
    }
  }

  return false;
};

const isStrongCategoryNearMiss = (term, candidate) => {
  if (!term || !candidate) return false;
  if (term.includes(" ") || candidate.includes(" ")) return false;
  if (term.length < 6 || candidate.length < 6) return false;
  if (Math.abs(term.length - candidate.length) > 2) return false;
  if (term[0] !== candidate[0]) return false;

  const sharedPrefixLength = commonPrefixLength(term, candidate);
  if (sharedPrefixLength < 4) return false;

  return damerauLevenshteinDistance(term, candidate) <= 2;
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
          subCategory: new RegExp(
            `^${escapeRegex(normaliseSearchText(catName))}$`,
            "i",
          ),
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
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(p);
    }
  }
  return merged;
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
    regexes.map((rx) => ({ [field]: rx })),
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

const levenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  matrix[0] = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1,
            );
    }
  }
  return matrix[b.length][a.length];
};

const damerauLevenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[a.length][b.length];
};

const commonPrefixLength = (left, right) => {
  let index = 0;
  const maxLength = Math.min(left.length, right.length);

  while (index < maxLength && left[index] === right[index]) {
    index++;
  }

  return index;
};

const softCategoryNormalise = (word) =>
  String(word || "")
    .toLowerCase()
    .replace(/[hy]/g, "");

const isOrderedSubsequenceMatch = (left, right, maxSkips = 2) => {
  if (!left || !right) return false;

  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  const lengthDiff = longer.length - shorter.length;

  if (lengthDiff < 1 || lengthDiff > maxSkips) return false;
  if (shorter[0] !== longer[0] || shorter.at(-1) !== longer.at(-1))
    return false;

  let shortIndex = 0;
  let longIndex = 0;

  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex++;
    }
    longIndex++;
  }

  return shortIndex === shorter.length;
};

const isStrictProductSearchMatch = (product, normQ) => {
  if (!product || !normQ) return false;

  if (nameMatchesQuery(normaliseSearchText(product.name || ""), normQ))
    return true;
  if (
    fieldMatchesQuery(normaliseSearchText(product.category?.name || ""), normQ)
  ) {
    return true;
  }
  if (
    fieldMatchesQuery(normaliseSearchText(product.subCategory || ""), normQ)
  ) {
    return true;
  }

  for (const field of ATTRIBUTE_FIELDS) {
    const values = Array.isArray(product[field]) ? product[field] : [];
    if (
      values.some((value) =>
        fieldMatchesQuery(normaliseSearchText(value), normQ),
      )
    ) {
      return true;
    }
  }

  const colors = Array.isArray(product.variants)
    ? product.variants.map((variant) =>
        normaliseSearchText(variant?.color?.name || ""),
      )
    : [];
  return colors.some((value) => fieldMatchesQuery(value, normQ));
};

const fieldMatchesQuery = (value, query) => {
  if (!value || !query) return false;
  if (value === query) return true;
  return value
    .split(" ")
    .filter(Boolean)
    .some((word) => word === query);
};

const isCategoryTypoMatch = (query, category) => {
  if (!query || !category) return false;
  if (query === category) return true;
  if (query.includes(" ") || category.includes(" ")) return false;

  const lengthDiff = Math.abs(query.length - category.length);
  if (lengthDiff > 2) return false;

  const lastCharMatches = query.at(-1) === category.at(-1);
  if (
    !lastCharMatches &&
    (query.length < 6 ||
      damerauLevenshteinDistance(query.slice(0, -1), category.slice(0, -1)) > 1)
  ) {
    return false;
  }

  const firstCharMatches = query[0] === category[0];
  if (
    !firstCharMatches &&
    (query.length < 5 ||
      damerauLevenshteinDistance(query.slice(1), category.slice(1)) > 1)
  ) {
    return false;
  }

  const distance = levenshteinDistance(query, category);
  if (distance <= 1) return true;
  if (query.length < 6 || distance > 2) return false;

  if (damerauLevenshteinDistance(query, category) <= 1) {
    return true;
  }

  if (isOrderedSubsequenceMatch(query, category)) {
    return true;
  }

  const softQuery = softCategoryNormalise(query);
  const softCategory = softCategoryNormalise(category);
  if (
    softQuery.length >= 5 &&
    softCategory.length >= 5 &&
    softQuery[0] === softCategory[0] &&
    softQuery.at(-1) === softCategory.at(-1) &&
    damerauLevenshteinDistance(softQuery, softCategory) <= 1
  ) {
    return true;
  }

  const queryKey = consonantKey(query);
  const categoryKey = consonantKey(category);
  if (
    queryKey.length >= 3 &&
    categoryKey.length >= 3 &&
    queryKey === categoryKey
  ) {
    return true;
  }

  return false;
};

const nameMatchesQuery = (name, query) => {
  if (!name || !query) return false;
  if (name === query || name.includes(query)) return true;

  const queryWords = query.split(" ").filter(Boolean);
  const nameWords = name.split(" ").filter(Boolean);

  return queryWords.every((queryWord) =>
    nameWords.some((nameWord) => fuzzyWordsMatch(queryWord, nameWord)),
  );
};

const soundex = (word) => {
  if (!word) return "";
  const map = {
    b: 1,
    f: 1,
    p: 1,
    v: 1,
    c: 2,
    g: 2,
    j: 2,
    k: 2,
    q: 2,
    s: 2,
    x: 2,
    z: 2,
    d: 3,
    t: 3,
    l: 4,
    m: 5,
    n: 5,
    r: 6,
  };
  const lower = word.toLowerCase();
  let code = lower[0].toUpperCase();
  let previous = map[lower[0]] || 0;

  for (let i = 1; i < lower.length && code.length < 4; i++) {
    const current = map[lower[i]];
    if (current && current !== previous) code += current;
    previous = current || 0;
  }

  return code.padEnd(4, "0");
};

const consonantKey = (word) =>
  word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/[aeiouh]/g, "") // 'h' is often interchangeable in garments (Lehenga/Lenga, Kurta/Kurtha)
    .replace(/[cqx]/g, "k");

const fuzzyWordsMatch = (queryWord, productWord) => {
  if (queryWord === productWord) return true;
  if (queryWord.length < 3 || productWord.length < 3) return false;
  if (productWord.startsWith(queryWord) || queryWord.startsWith(productWord)) {
    return true;
  }

  if (isOrderedSubsequenceMatch(queryWord, productWord)) {
    return true;
  }

  const queryKey = consonantKey(queryWord);
  const productKey = consonantKey(productWord);
  if (
    queryKey.length >= 3 &&
    productKey.length >= 3 &&
    queryKey === productKey
  ) {
    return true;
  }

  const maxDistance = queryWord.length <= 5 ? 1 : 2;
  if (Math.abs(queryWord.length - productWord.length) <= maxDistance) {
    if (levenshteinDistance(queryWord, productWord) <= maxDistance) {
      return true;
    }
  }

  return false;
};

// ---------------------------------------------------------------------------
// Hit hydration
// ---------------------------------------------------------------------------

const hydrateSearchHits = async (rawHits) => {
  if (!rawHits?.length) return [];

  const productIds = rawHits
    .filter((h) => h.type === "product")
    .map((h) => h.id);
  const categoryIds = rawHits
    .filter((h) => h.type === "category")
    .map((h) => h.id);

  const [products, categories] = await Promise.all([
    productIds.length
      ? Product.find({ _id: { $in: productIds } })
          .populate("category", "name slug")
          .lean()
      : [],
    categoryIds.length
      ? Category.find({ _id: { $in: categoryIds } }).lean()
      : [],
  ]);

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
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
  const seenProductIds = new Set();
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

const mergeCategoryBlocksAfterNameMatches = (
  vettedResults,
  matchedCategoryBlocks,
  normQ,
) => {
  if (!matchedCategoryBlocks.length) {
    return vettedResults;
  }

  const leadingNameMatchedProducts = [];
  const trailingResults = [];

  for (const result of vettedResults) {
    if (
      result.type === "product" &&
      nameMatchesQuery(normaliseSearchText(result.data?.name || ""), normQ)
    ) {
      leadingNameMatchedProducts.push(result);
      continue;
    }

    trailingResults.push(result);
  }

  return [
    ...leadingNameMatchedProducts,
    ...matchedCategoryBlocks,
    ...trailingResults,
  ];
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

const normaliseSearchText = (text) => normalise(text);

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildWordVariants = (word) => {
  const variants = new Set([word]);
  if (word.endsWith("es") && word.length > 4) variants.add(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 3) variants.add(word.slice(0, -1));
  if (!word.endsWith("s")) variants.add(word + "s");
  return [...variants];
};
