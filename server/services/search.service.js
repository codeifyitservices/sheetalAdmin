import { searchNgram } from "./ngram.search.service.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

const SINGLE_CHAR_SEARCH_LIMIT = 100;
const MAX_MATCHING_PRODUCTS = 8;

/**
 * Searches products and categories using the custom n-gram index.
 *
 * Pipeline:
 *  1. searchNgram          — fuzzy + phonetic scored hits from in-memory index
 *  2. hydrateSearchHits    — enrich raw hits with full Mongo docs
 *  3. findTargetedCategory — fuzzy + phonetic + de-plural category resolution
 *     → if matched: [category + ALL its products from MongoDB only]
 *  4. structuredFields     — attribute queries (wearType, occasion, tags…)
 *  5. primaryIntent        — name / slug / subCategory text match
 *  6. Fallback             — fuzzy word-matched products only (FIX #8 + #11 + #12)
 */
export const searchService = async ({ query, limit, page }) => {
  const normalisedQuery = normalise(query);
  const isSingleCharacterQuery = normalisedQuery.length === 1;

  const result = await searchNgram(query, {
    limit: isSingleCharacterQuery ? SINGLE_CHAR_SEARCH_LIMIT : limit,
    page: isSingleCharacterQuery ? 1 : page,
  });
  const hits = await hydrateSearchHits(result.hits);

  if (hits.length === 0) return hits;

  const shortPartialQuery = isShortPartialQuery(normalisedQuery);
  const shortQueryCategoryHits = shortPartialQuery
    ? hits.filter(
        (hit) =>
          hit.type === "category" &&
          hitMatchesPrimaryIntent(hit, normalisedQuery),
      )
    : [];

  // --- Step 1: Category resolution ---
  const targetedCategory = findTargetedCategoryHit(hits, normalisedQuery);
  if (targetedCategory) {
    return limitProductResults(
      await buildCategoryWithProductsResults(targetedCategory.data),
    );
  }

  // --- Step 2 & 3: Structured / attribute queries OR Primary intent ---
  const intentOrFieldMatchedProducts = hits.filter((hit) => {
    if (hit.type !== "product") return false;

    // Tighten 1-2 char partials to product names only. This prevents false
    // positives from tags, descriptions, or other indexed fields.
    if (shortPartialQuery) {
      return productNameHasPartialMatch(hit.data, normalisedQuery);
    }

    return productMatchesSearchIntent(hit.data, normalisedQuery);
  });
  if (intentOrFieldMatchedProducts.length > 0) {
    return limitProductResults(
      shortQueryCategoryHits.length > 0
        ? [...shortQueryCategoryHits, ...intentOrFieldMatchedProducts]
        : intentOrFieldMatchedProducts,
    );
  }

  // --- Step 4: Fallback — word-level fuzzy filter (FIX #8 + #11 + #12) ---
  //
  // FIX #12: The n-gram engine returns products that share unigrams/bigrams
  // with the query (e.g., "shrt" shares s,r,t with sarees and suits) even when
  // NO word in the product name is close to the query. The result was sarees and
  // suit sets appearing for "shrt" because they passed minBaseScore via character
  // n-gram overlap alone.
  //
  // Solution: filter the fallback products through productHasFuzzyWordMatch —
  // only keep products where at least one word in the name/subCategory/category
  // is a fuzzy (Levenshtein ratio ≤ 0.35) or phonetic (Soundex) match of a
  // query word. This replicates the same standard used for category resolution
  // and discards pure n-gram noise.
  //
  // "shrt" → only "Blue Printed Straight Shirt" survives (shirt: dist 1/5=0.20)
  //        → "Blue Chanderi Suit Set" dropped (suit: dist 2/4=0.50, soundex S300≠S630)
  //        → "Onion Pink Saree" dropped (saree: soundex S600≠S630)
  //
  // FIX #11: Return products only — never return raw category hits in fallback.
  const productHits = hits.filter((hit) => hit.type === "product");
  const fuzzyMatchedProducts = shortPartialQuery
    ? productHits.filter((hit) =>
        productNameHasPartialMatch(hit.data, normalisedQuery),
      )
    : productHits.filter((hit) =>
        productHasFuzzyWordMatch(hit.data, normalisedQuery),
      );

  return limitProductResults(
    shortQueryCategoryHits.length > 0
      ? [...shortQueryCategoryHits, ...fuzzyMatchedProducts]
      : fuzzyMatchedProducts,
  );
};

const limitProductResults = (results) => {
  const limitedResults = [];
  let productCount = 0;

  for (const result of results) {
    if (result.type !== "product") {
      limitedResults.push(result);
      continue;
    }

    if (productCount >= MAX_MATCHING_PRODUCTS) continue;

    limitedResults.push(result);
    productCount += 1;
  }

  return limitedResults;
};

// ---------------------------------------------------------------------------
// Fuzzy + Phonetic helpers
// ---------------------------------------------------------------------------

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

const soundex = (word) => {
  if (!word || word.length === 0) return "";
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

const consonantKey = (word) =>
  word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/[aeiou]/g, "")
    .replace(/[cqx]/g, "k");

/**
 * Generates singular/plural morphological variants of a word.
 *   "suits"   → ["suits", "suit"]
 *   "dresses" → ["dresses", "dress"]
 *   "shirt"   → ["shirt", "shirts"]
 */
const wordVariants = (word) => {
  const variants = new Set([word]);
  if (word.endsWith("es") && word.length > 4) variants.add(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 3) variants.add(word.slice(0, -1));
  if (!word.endsWith("s")) variants.add(word + "s");
  return [...variants];
};

/**
 * Returns true if a single query word fuzzy/phonetically matches a single
 * product word. Used for both category matching and product fallback filtering.
 *
 * Match rules (any one sufficient):
 *   - Exact match or substring
 *   - Soundex same phonetic code
 *   - Levenshtein ratio ≤ 0.35  (≈ 1 edit per 3 chars of the longer word)
 *     Prevents false positives on short words:
 *       "shrt"(4) vs "set"(3):  2/4 = 0.50 → reject
 *       "shrt"(4) vs "shirt"(5): 1/5 = 0.20 → accept
 *
 * Both words and their morphological variants are tried.
 */
const wordsMatch = (qWord, pWord) => {
  if (qWord === pWord) return true;
  if (qWord.includes(pWord) || pWord.includes(qWord)) return true;

  const qKey = consonantKey(qWord);
  const pKey = consonantKey(pWord);
  if (
    qKey.length >= 3 &&
    pKey.length >= 3 &&
    (qKey === pKey || qKey.startsWith(pKey) || pKey.startsWith(qKey))
  ) {
    return true;
  }

  const qVariants = wordVariants(qWord);
  const pVariants = wordVariants(pWord);

  for (const qv of qVariants) {
    for (const pv of pVariants) {
      if (soundex(qv) === soundex(pv) && isSafePhoneticMatch(qv, pv))
        return true;
      const maxLen = Math.max(qv.length, pv.length);
      // Require stricter match: max 1 typo per 4 letters instead of 1 per 3
      if (maxLen > 0 && levenshteinDistance(qv, pv) / maxLen <= 0.25)
        return true;
    }
  }

  return false;
};

const isSafePhoneticMatch = (leftWord, rightWord) => {
  if (!leftWord || !rightWord) return false;

  const minLen = Math.min(leftWord.length, rightWord.length);
  const distance = levenshteinDistance(leftWord, rightWord);

  // Short Soundex matches are noisy: "suit" and "set" both collapse to S300.
  // Require either a tighter edit distance or the same leading bigram.
  if (minLen <= 4) {
    return distance <= 1 || leftWord.slice(0, 2) === rightWord.slice(0, 2);
  }

  return (
    leftWord[0] === rightWord[0] &&
    Math.abs(leftWord.length - rightWord.length) <= 2
  );
};

/**
 * Returns true if at least one word in the product's primary text fields
 * (name, subCategory, category name) fuzzy/phonetically matches at least one
 * query word.
 *
 * Only primary fields are checked — not description/tags — so that broad
 * keyword overlap (e.g. a saree description mentioning "shirt-style" does not
 * cause the saree to appear for query "shrt").
 */
const productHasFuzzyWordMatch = (product, normalisedQuery) => {
  const queryWords = getQueryWords(normalisedQuery);
  if (queryWords.length === 0) return false;

  const productWords = getSearchableWords([
    product.name,
    product.subCategory,
    getProductCategoryName(product),
    ...getProductColorValues(product),
  ]);

  return queryWords.every((qWord) =>
    productWords.some((pWord) => wordsMatch(qWord, pWord)),
  );
};

// ---------------------------------------------------------------------------
// Category targeting
// ---------------------------------------------------------------------------

/**
 * Returns true when the query is a fuzzy / phonetic match for a category name.
 * Uses the same wordsMatch logic as product filtering for consistency.
 *
 * Tier 1 — fast path: exact / contains
 * Tier 2 — word-level: soundex + Levenshtein ratio via wordsMatch()
 *
 *   "soot"  → wordVariants("suits") includes "suit"
 *             soundex("soot")=S300 = soundex("suit")=S300  ✓
 *   "shrt"  → wordVariants("shirts") includes "shirt"
 *             levenshtein("shrt","shirt")=1, ratio=1/5=0.20  ✓  (if Shirts existed)
 *   "shrt"  → "sarees": soundex S630≠S620, ratio 4/6>0.35   ✗ correctly rejected
 *   "shrt"  → "kurta sets" / "set": ratio 2/4=0.50           ✗ correctly rejected
 */
const isCategoryFuzzyMatch = (normalisedQuery, normalisedCategoryName) => {
  if (!normalisedQuery || !normalisedCategoryName) return false;

  if (normalisedCategoryName === normalisedQuery) return true;

  // Keep short partials broad. Queries like "s" or "le" should surface all
  // matching products, not collapse the result set into a single category.
  if (normalisedQuery.length < 3) return false;

  if (normalisedQuery.includes(normalisedCategoryName)) return true;

  const queryWords = normalisedQuery.split(" ").filter((w) => w.length >= 3);
  const catWords = normalisedCategoryName
    .split(" ")
    .filter((w) => w.length >= 3);

  for (const qWord of queryWords) {
    for (const cWord of catWords) {
      if (wordsMatch(qWord, cWord)) return true;
    }
  }

  return false;
};

const findTargetedCategoryHit = (hits, normalisedQuery) => {
  const queryWords = getQueryWords(normalisedQuery, 3);

  return hits.find(
    (hit) =>
      hit.type === "category" &&
      (queryWords.length <= 1 ||
        valueMatchesAllQueryWords(normalise(hit.data.name), queryWords)) &&
      isCategoryFuzzyMatch(normalisedQuery, normalise(hit.data.name)),
  );
};

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
  "colors",
  "wearType",
  "occasion",
  "tags",
  "style",
  "work",
  "fabric",
  "productType",
  "byPrice",
];

const productMatchesSearchIntent = (product, normalisedQuery) => {
  const queryWords = getQueryWords(normalisedQuery);
  if (queryWords.length <= 1) {
    return (
      productMatchesStructuredFields(product, normalisedQuery) ||
      primaryTextMatchesProduct(product, normalisedQuery)
    );
  }

  const searchableWords = getProductIntentWords(product);
  return queryWords.every((qWord) =>
    searchableWords.some((candidate) => wordsMatch(qWord, candidate)),
  );
};

const productMatchesStructuredFields = (product, normalisedQuery) => {
  if (!normalisedQuery) return false;
  const queryWords = getQueryWords(normalisedQuery);

  return STRUCTURED_SEARCH_FIELDS.some((field) => {
    const values =
      field === "colors"
        ? getProductColorValues(product)
        : Array.isArray(product[field])
          ? product[field]
          : [];
    return values.some((value) => {
      if (!value) return false;
      const normVal = normalise(value);
      if (!normVal) return false;

      if (
        normVal === normalisedQuery ||
        normVal.includes(normalisedQuery) ||
        normalisedQuery.includes(normVal)
      ) {
        return true;
      }

      const tagWords = normVal.split(" ").filter((w) => w.length >= 2);
      for (const qWord of queryWords) {
        for (const tWord of tagWords) {
          if (wordsMatch(qWord, tWord)) return true;
        }
      }

      return false;
    });
  });
};

const primaryTextMatchesProduct = (product, normalisedQuery) => {
  return (
    primaryTextMatches(product.name, normalisedQuery) ||
    primaryTextMatches(product.slug, normalisedQuery) ||
    primaryTextMatches(product.subCategory, normalisedQuery) ||
    primaryTextMatches(getProductCategoryName(product), normalisedQuery)
  );
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

const isShortPartialQuery = (normalisedQuery) =>
  normalisedQuery.length > 0 && normalisedQuery.length < 3;

const productNameHasPartialMatch = (product, normalisedQuery) => {
  const normalisedName = normalise(product?.name);
  if (!normalisedName || !normalisedQuery) return false;
  return normalisedName.includes(normalisedQuery);
};

const getQueryWords = (normalisedQuery, minLength = 2) =>
  normalisedQuery.split(" ").filter((w) => w.length >= minLength);

const getSearchableWords = (values, minLength = 2) =>
  values
    .flatMap((value) => normalise(value).split(" "))
    .filter((word) => word.length >= minLength);

const valueMatchesAllQueryWords = (value, queryWords) => {
  const valueWords = getSearchableWords([value], 3);
  if (valueWords.length === 0) return false;

  return queryWords.every((qWord) =>
    valueWords.some((valueWord) => wordsMatch(qWord, valueWord)),
  );
};

const getProductColorValues = (product) =>
  Array.isArray(product?.variants)
    ? [
        ...new Set(
          product.variants
            .map((variant) => variant.color?.name)
            .filter(Boolean),
        ),
      ]
    : [];

const getProductIntentWords = (product) =>
  getSearchableWords([
    product.name,
    product.slug,
    product.subCategory,
    getProductCategoryName(product),
    ...getProductColorValues(product),
    ...STRUCTURED_SEARCH_FIELDS.flatMap((field) =>
      field === "colors"
        ? []
        : Array.isArray(product[field])
          ? product[field]
          : [],
    ),
  ]);

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

  return rawHits
    .map((hit) => {
      if (hit.type === "product") {
        const product = productMap.get(hit.id);
        return product ? { type: "product", data: product } : null;
      }
      if (hit.type === "category") {
        const category = categoryMap.get(hit.id);
        return category ? { type: "category", data: category } : null;
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

const normalise = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
