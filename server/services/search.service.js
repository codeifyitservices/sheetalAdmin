import { searchNgram } from "./ngram.search.service.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

/**
 * Searches products and categories using the custom n-gram index.
 *
 * Behaviour:
 *  - Typo / phonetic queries like "soot", "shrt", "lehnga" first try to resolve
 *    to a matching CATEGORY via fuzzy + phonetic matching.
 *  - If a category is resolved, only products from that category are returned —
 *    not a global product dump.
 *  - Attribute-style queries like "party" return all field-matched products.
 *  - Final fallback trusts the n-gram ranker if all text filters yield nothing.
 *
 * Pipeline:
 *  1. searchNgram  — fuzzy + phonetic scored hits from the in-memory index
 *  2. hydrateSearchHits — enrich raw index hits with full Mongo docs
 *  3. findTargetedCategoryHit — fuzzy + phonetic category resolution (FIX #9)
 *     → if found: return [category, ...its products only]
 *  4. productMatchesStructuredFields — attribute queries (wearType, occasion…)
 *  5. hitMatchesPrimaryIntent — name / slug / subCategory text match
 *  6. Fallback — trust the ranker (FIX #8)
 *
 * @param {{ query: string, limit: number, page: number }} params
 * @returns {Promise<Array<{ type: string, data: Object }>>}
 */
export const searchService = async ({ query, limit, page }) => {
  const result = await searchNgram(query, { limit, page });
  const hits = await hydrateSearchHits(result.hits);

  if (hits.length === 0) return hits;

  const normalisedQuery = normalise(query);

  // --- Step 1: Fuzzy + phonetic category resolution (FIX #9) ---
  // Previously isCategoryTargeted used strict equality only.
  // "soot" !== "suits" so the category path was always skipped for typos,
  // causing a random product dump instead of Suits-only results.
  // Now we resolve the category with the same fuzzy + phonetic logic the
  // n-gram engine uses for scoring, so "soot" → Suits, "shrt" → Shirts, etc.
  const targetedCategory = findTargetedCategoryHit(hits, normalisedQuery);

  if (targetedCategory) {
    return await buildCategoryWithProductsResults(targetedCategory.data);
  }

  // --- Step 2: Attribute / structured-field queries ---
  const fieldMatchedProducts = hits.filter(
    (hit) =>
      hit.type === "product" &&
      productMatchesStructuredFields(hit.data, normalisedQuery),
  );

  if (fieldMatchedProducts.length > 0) {
    return fieldMatchedProducts;
  }

  // --- Step 3: Primary intent — name / slug / subCategory text match ---
  const directMatchedHits = hits.filter((hit) =>
    hitMatchesPrimaryIntent(hit, normalisedQuery),
  );

  // --- Step 4: Fallback — trust the n-gram ranker (FIX #8) ---
  // Handles heavy typos ("saaarees") where no field literally contains the
  // misspelled string but the scoring pipeline already found the right docs.
  return directMatchedHits.length > 0 ? directMatchedHits : hits;
};

// ---------------------------------------------------------------------------
// Fuzzy + Phonetic helpers (mirrored from ngram.search.service.js)
// Kept here so search.service.js has no import dependency on the ngram module
// internals and can be tested / replaced independently.
// ---------------------------------------------------------------------------

/**
 * Standard Levenshtein distance between two strings.
 */
const levenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

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

/**
 * Soundex phonetic code for a word.
 * "saree" and "sari" both → S600; "lehenga" and "lahenga" → L520.
 */
const soundex = (word) => {
  if (!word || word.length === 0) return "";

  const map = {
    b: 1, f: 1, p: 1, v: 1,
    c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
    d: 3, t: 3,
    l: 4,
    m: 5, n: 5,
    r: 6,
  };

  const w = word.toLowerCase();
  let code = w[0].toUpperCase();
  let prev = map[w[0]] || 0;

  for (let i = 1; i < w.length && code.length < 4; i++) {
    const curr = map[w[i]];
    if (curr && curr !== prev) code += curr;
    prev = curr || 0;
  }

  return code.padEnd(4, "0");
};

/**
 * Returns true if the query is a fuzzy or phonetic match for the category name.
 *
 * Match tiers (any one is sufficient):
 *   1. Exact           — "suits" === "suits"
 *   2. Contains        — "suit" ⊂ "suits" or "suits" ⊃ "suit"
 *   3. Levenshtein ≤ 2 — "soot" → "suit" (dist=2), "shrt" → "shirt" (dist=1)
 *   4. Soundex         — "saris" → "sarees" (both S620)
 *
 * Matching is word-level so "party wear" resolves if user typed "perty"
 * (matches "party") even though the full string doesn't match.
 */
const isCategoryFuzzyMatch = (normalisedQuery, normalisedCategoryName) => {
  if (!normalisedQuery || !normalisedCategoryName) return false;

  // Tier 1 & 2 — exact / contains (fast path, no distance needed)
  if (normalisedCategoryName === normalisedQuery) return true;
  if (normalisedCategoryName.includes(normalisedQuery)) return true;
  if (normalisedQuery.includes(normalisedCategoryName)) return true;

  // Tier 3 & 4 — word-level fuzzy + phonetic
  const queryWords = normalisedQuery.split(" ").filter((w) => w.length >= 3);
  const catWords = normalisedCategoryName.split(" ").filter((w) => w.length >= 3);

  for (const qWord of queryWords) {
    for (const cWord of catWords) {
      // Soundex — same phonetic code means same-sounding word
      if (soundex(qWord) === soundex(cWord)) return true;

      // Levenshtein — allow distance ≤ 2, length diff ≤ 3
      // Slightly more generous than product scoring to catch category-level typos
      const lenDiff = Math.abs(qWord.length - cWord.length);
      if (lenDiff <= 3 && levenshteinDistance(qWord, cWord) <= 2) return true;
    }
  }

  return false;
};

// ---------------------------------------------------------------------------
// Category targeting
// ---------------------------------------------------------------------------

/**
 * Finds the first category hit whose name fuzzy/phonetically matches the query.
 * Categories are already ranked at the top of hits by the n-gram engine's sort
 * comparator, so the first matching one is also the most relevant.
 *
 * FIX #9: Replaced strict equality with isCategoryFuzzyMatch so typo and
 * phonetic queries ("soot", "shrt", "lehnga") correctly resolve to their
 * category and trigger category-scoped product fetching instead of falling
 * through to an unscoped product dump.
 */
const findTargetedCategoryHit = (hits, normalisedQuery) => {
  return hits.find(
    (hit) =>
      hit.type === "category" &&
      isCategoryFuzzyMatch(normalisedQuery, normalise(hit.data.name)),
  );
};

/**
 * Returns [category, ...all products in that category].
 * Products are fetched directly from MongoDB so we get the full set,
 * not just the subset that happened to score in the n-gram pass.
 */
const buildCategoryWithProductsResults = async (category) => {
  const products = await Product.find({
    category: category._id,
    status: "Active",
  })
    .populate("category", "name slug")
    .lean();

  return [
    { type: "category", data: category },
    ...products.map((product) => ({ type: "product", data: product })),
  ];
};

// ---------------------------------------------------------------------------
// Structured-field + intent matching
// ---------------------------------------------------------------------------

const STRUCTURED_SEARCH_FIELDS = [
  "wearType",
  "occasion",
  "tags",
  "style",
  "work",
  "fabric",
  "productType",
  "byPrice",
];

const productMatchesStructuredFields = (product, normalisedQuery) => {
  if (!normalisedQuery) return false;
  return STRUCTURED_SEARCH_FIELDS.some((field) => {
    const values = Array.isArray(product[field]) ? product[field] : [];
    return values.some((value) => normalise(value) === normalisedQuery);
  });
};

const hitMatchesPrimaryIntent = (hit, normalisedQuery) => {
  if (hit.type === "category") {
    return (
      primaryTextMatches(hit.data.name, normalisedQuery) ||
      primaryTextMatches(hit.data.slug, normalisedQuery)
    );
  }

  if (hit.type === "product") {
    return (
      primaryTextMatches(hit.data.name, normalisedQuery) ||
      primaryTextMatches(hit.data.slug, normalisedQuery) ||
      primaryTextMatches(hit.data.subCategory, normalisedQuery) ||
      primaryTextMatches(getProductCategoryName(hit.data), normalisedQuery)
    );
  }

  return false;
};

const primaryTextMatches = (value, normalisedExpandedQuery) => {
  const normalisedValue = normalise(value);
  if (!normalisedValue) return false;
  return (
    normalisedValue === normalisedExpandedQuery ||
    normalisedValue.includes(normalisedExpandedQuery) ||
    normalisedExpandedQuery.includes(normalisedValue)
  );
};

// ---------------------------------------------------------------------------
// Hit hydration (raw index docs → full Mongo docs)
// ---------------------------------------------------------------------------

const hydrateSearchHits = async (rawHits) => {
  if (!rawHits?.length) return [];

  const productIds = rawHits
    .filter((hit) => hit.type === "product")
    .map((hit) => hit.id);
  const categoryIds = rawHits
    .filter((hit) => hit.type === "category")
    .map((hit) => hit.id);

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

  return rawHits
    .map((hit) => {
      if (hit.type === "product") {
        const product = productMap.get(hit.id);
        if (!product) return null;
        return { type: "product", data: product };
      }
      if (hit.type === "category") {
        const category = categoryMap.get(hit.id);
        if (!category) return null;
        return { type: "category", data: category };
      }
      return null;
    })
    .filter(Boolean);
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const getProductCategoryName = (product) => {
  if (!product?.category) return "";
  if (typeof product.category === "string") return product.category;
  return product.category.name || "";
};

/**
 * Lowercases, strips punctuation, collapses whitespace.
 * Mirrors normalise() in ngram.search.service.js exactly.
 */
const normalise = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};