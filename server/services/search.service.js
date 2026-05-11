import { searchNgram } from "./ngram.search.service.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

const SINGLE_CHAR_SEARCH_LIMIT = 100;

/**
 * Searches products and categories using the custom n-gram index.
 *
 * Pipeline:
 *  1. searchNgram          — fuzzy + phonetic scored hits from in-memory index
 *  2. hydrateSearchHits    — enrich raw hits with full Mongo docs
 *  3. Multi-word filter    — ALL query words must match (prevents false positives)
 *  4. Exact name fast path — return immediately if query == product name
 *  5. DB attribute scan    — for single-word queries, scan MongoDB directly across
 *                            all attribute fields (tags, occasion, style, …).
 *                            If ≥1 attribute match found, return those results and
 *                            SKIP category resolution entirely. This is the key fix:
 *                            "Festive" must return the 11 tagged products, not a
 *                            category page that swallows the results.
 *  6. Category resolution  — only fires when the attribute scan finds nothing,
 *                            meaning the query really is a category name (e.g. "Sarees")
 *  7. Primary intent       — name / slug / subCategory text match from ngram hits
 *  8. Fallback             — fuzzy word-matched products only
 *
 * FIXES APPLIED:
 *  - FIX A: productHasFuzzyWordMatch includes style/tags/fabric/work/occasion
 *  - FIX B: Category resolution skipped for multi-word attribute queries
 *  - FIX C: productMatchesStructuredFields uses every() for multi-word queries
 *  - FIX D: Exact product name match bypass
 *  - FIX E: shortDescription added to structured text fields
 *  - FIX F: DB attribute scan always runs for single-word queries BEFORE category
 *           resolution — fixes "Festive" returning only 1 of 11 products
 *  - FIX G: searchNgram called with MAX_HITS limit for single-word queries
 *  - FIX H: Category resolution includes subCategory field match
 */

// Attribute/color fields that warrant a DB fallback scan when ngram hits are thin
const ATTRIBUTE_FIELDS = [
  "tags",
  "occasion",
  "wearType",
  "style",
  "work",
  "fabric",
  "productType",
  "byPrice",
];

export const searchService = async ({ query, limit, page }) => {
  const normalisedQuery = normalise(query);
  const isSingleCharacterQuery = normalisedQuery.length === 1;
  const maxProducts =
    Number.isFinite(Number(limit)) && Number(limit) > 0
      ? Number(limit)
      : Infinity;

  // FIX G: For attribute-like single-word queries, always fetch the max hits
  // from the ngram index so pagination doesn't silently hide products that
  // scored just above the threshold but ended up on page 2+.
  const ngramLimit = isSingleCharacterQuery
    ? SINGLE_CHAR_SEARCH_LIMIT
    : normalisedQuery.split(" ").length === 1
      ? 100
      : limit;
  const ngramPage = isSingleCharacterQuery ? 1 : normalisedQuery.split(" ").length === 1 ? 1 : page;

  const result = await searchNgram(query, {
    limit: ngramLimit,
    page: ngramPage,
  });
  const hits = await hydrateSearchHits(result.hits);

  const shortPartialQuery = isShortPartialQuery(normalisedQuery);
  const shortQueryCategoryHits = shortPartialQuery
    ? hits.filter(
        (hit) =>
          hit.type === "category" &&
          hitMatchesPrimaryIntent(hit, normalisedQuery),
      )
    : [];

  // FIX D: For multi-word queries, ALL words in the query must be present in
  // the product. This prevents "Test Product Name" matching "Test Product New
  // Excel Three" just because they share "test" and "product" n-grams.
  const isMultiWordQuery =
    normalisedQuery.split(" ").filter((w) => w.length >= 2).length >= 2;

  if (isMultiWordQuery) {
    const allWordsMatchedHits = hits.filter((hit) => {
      if (hit.type !== "product") return false;
      return productAllQueryWordsMatch(hit.data, normalisedQuery);
    });

    if (allWordsMatchedHits.length > 0) {
      allWordsMatchedHits.sort((a, b) => {
        const aExact = normalise(a.data.name) === normalisedQuery ? 1 : 0;
        const bExact = normalise(b.data.name) === normalisedQuery ? 1 : 0;
        return bExact - aExact;
      });
      return limitProductResults(allWordsMatchedHits, maxProducts);
    }
  }

  // For single-word queries: exact name match fast path
  const exactNameMatch = hits.find(
    (hit) =>
      hit.type === "product" && normalise(hit.data.name) === normalisedQuery,
  );
  if (exactNameMatch) {
    const otherMatches = hits.filter(
      (hit) =>
        hit.type === "product" &&
        hit.data._id.toString() !== exactNameMatch.data._id.toString() &&
        productMatchesSearchIntent(hit.data, normalisedQuery),
    );
    return limitProductResults([exactNameMatch, ...otherMatches], maxProducts);
  }

  // FIX B: Don't trigger category resolution for multi-word attribute queries
  const queryWords = normalisedQuery.split(" ").filter((w) => w.length >= 2);
  const isLikelyAttributeQuery =
    queryWords.length > 1 &&
    !["kurta sets", "sarees", "lehenga", "suits", "kaftan", "dresses"].some(
      (catName) => normalisedQuery.includes(catName),
    );

  // --- Step 1: DB attribute scan (single-word queries, runs BEFORE category resolution) ---
  //
  // FIX F — root cause of "Festive" returning 1/11:
  //   Old order: category resolution → attribute scan
  //   If "Festive" matched a category, it returned immediately with only that
  //   category's products. The 11 products tagged "festive" were never reached.
  //
  //   New order: attribute scan → category resolution
  //   If the DB scan finds products that have the query word in their attribute
  //   fields (tags/occasion/style/…), return those products and skip category
  //   resolution entirely. Category resolution only fires when the attribute
  //   scan finds nothing — meaning the query really is a category name.
  if (!isMultiWordQuery && normalisedQuery.length >= 3) {
    const dbAttributeProducts = await dbAttributeScan(normalisedQuery);

    // Check whether any DB results have the query word in an attribute field
    // (not just in their name/subCategory). This distinguishes "Festive" (attribute
    // search → skip category) from a pure name query that happens to also match
    // some products via the DB scan.
    const hasAttributeTagHits = dbAttributeProducts.some((p) =>
      productHasAttributeMatch(p, normalisedQuery),
    );

    if (hasAttributeTagHits) {
      // Merge ngram intent-matched products (already ranked by ngram score)
      // with any additional products found only by the DB scan, deduped.
      const intentMatched = hits.filter((hit) => {
        if (hit.type !== "product") return false;
        return productMatchesSearchIntent(hit.data, normalisedQuery);
      });

      const seenIds = new Set(intentMatched.map((h) => h.data._id.toString()));
      const additionalHits = dbAttributeProducts
        .filter((p) => !seenIds.has(p._id.toString()))
        .map((p) => ({ type: "product", data: p }));

      const merged = [...intentMatched, ...additionalHits];

      return limitProductResults(
        shortQueryCategoryHits.length > 0
          ? [...shortQueryCategoryHits, ...merged]
          : merged,
        maxProducts,
      );
    }
  }

  // --- Step 2: Category resolution (only when attribute scan found nothing) ---
  if (!isLikelyAttributeQuery) {
    const targetedCategory = await findTargetedCategoryHit(
      hits,
      normalisedQuery,
    );
    if (targetedCategory) {
      return limitProductResults(
        await buildCategoryWithProductsResults(targetedCategory.data),
      );
    }
  }

  // --- Step 3: Structured / attribute queries OR Primary intent (from ngram hits) ---
  const intentOrFieldMatchedProducts = hits.filter((hit) => {
    if (hit.type !== "product") return false;
    return productMatchesSearchIntent(hit.data, normalisedQuery);
  });

  if (intentOrFieldMatchedProducts.length > 0) {
    return limitProductResults(
      shortQueryCategoryHits.length > 0
        ? [...shortQueryCategoryHits, ...intentOrFieldMatchedProducts]
        : intentOrFieldMatchedProducts,
      maxProducts,
    );
  }

  // --- Step 4: Fallback — word-level fuzzy filter ---
  const productHits = hits.filter((hit) => hit.type === "product");
  const fuzzyMatchedProducts = productHits.filter((hit) =>
    shortPartialQuery
      ? productMatchesSearchIntent(hit.data, normalisedQuery)
      : productHasFuzzyWordMatch(hit.data, normalisedQuery),
  );

  return limitProductResults(
    shortQueryCategoryHits.length > 0
      ? [...shortQueryCategoryHits, ...fuzzyMatchedProducts]
      : fuzzyMatchedProducts,
    maxProducts,
  );
};

// ---------------------------------------------------------------------------
// FIX F: Direct MongoDB attribute scan
// ---------------------------------------------------------------------------

/**
 * Scans MongoDB directly for products matching the query against all structured
 * attribute fields plus name/subCategory. Used as a fallback/supplement when
 * the ngram index misses products due to score thresholds.
 *
 * Only runs for single-word queries of 3+ characters. The regex approach is safe
 * here because we normalise the query first (lowercase alphanum only).
 */
const dbAttributeScan = async (normalisedQuery) => {
  if (!normalisedQuery || normalisedQuery.length < 3) return [];

  // Build a case-insensitive regex for the normalised query
  // normalisedQuery only contains [a-z0-9 ] after normalise(), so no escaping needed
  const queryRegex = new RegExp(normalisedQuery, "i");

  // Generate fuzzy variants: original + de-pluralised + pluralised
  const variants = new Set([normalisedQuery]);
  if (normalisedQuery.endsWith("s") && normalisedQuery.length > 3) {
    variants.add(normalisedQuery.slice(0, -1));
  }
  if (normalisedQuery.endsWith("es") && normalisedQuery.length > 4) {
    variants.add(normalisedQuery.slice(0, -2));
  }
  variants.add(normalisedQuery + "s");

  const variantRegexes = [...variants].map((v) => new RegExp(v, "i"));

  // Build OR conditions for array fields (any element matches any variant)
  const arrayFieldConditions = ATTRIBUTE_FIELDS.flatMap((field) =>
    variantRegexes.map((rx) => ({ [field]: rx })),
  );

  // Also check name, subCategory, shortDescription, description
  const textFieldConditions = [
    ...variantRegexes.map((rx) => ({ name: rx })),
    ...variantRegexes.map((rx) => ({ subCategory: rx })),
    ...variantRegexes.map((rx) => ({ shortDescription: rx })),
    ...variantRegexes.map((rx) => ({ description: rx })),
  ];

  // Variant color match via variants.color.name (requires $elemMatch on variants array)
  const colorConditions = variantRegexes.map((rx) => ({
    variants: { $elemMatch: { "color.name": rx } },
  }));

  const query = {
    status: "Active",
    $or: [...arrayFieldConditions, ...textFieldConditions, ...colorConditions],
  };

  return Product.find(query).populate("category", "name slug").lean();
};

/**
 * Returns true if the product has the query word in any structured attribute
 * field (tags, occasion, style, wearType, work, fabric, productType, byPrice,
 * or color name). Used to distinguish attribute searches ("Festive") from
 * category searches ("Sarees") — if any attribute field matches, we skip
 * category resolution and return the products directly.
 */
const productHasAttributeMatch = (product, normalisedQuery) => {
  const queryVariants = new Set([normalisedQuery]);
  if (normalisedQuery.endsWith("s") && normalisedQuery.length > 3)
    queryVariants.add(normalisedQuery.slice(0, -1));
  if (normalisedQuery.endsWith("es") && normalisedQuery.length > 4)
    queryVariants.add(normalisedQuery.slice(0, -2));
  queryVariants.add(normalisedQuery + "s");

  const matchesVariant = (value) => {
    const normVal = normalise(value);
    for (const v of queryVariants) {
      if (normVal === v || normVal.includes(v) || v.includes(normVal))
        return true;
    }
    return false;
  };

  for (const field of ATTRIBUTE_FIELDS) {
    const values = Array.isArray(product[field]) ? product[field] : [];
    if (values.some(matchesVariant)) return true;
  }

  // Also check variant color names
  if (Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      if (variant?.color?.name && matchesVariant(variant.color.name))
        return true;
    }
  }

  return false;
};

// ---------------------------------------------------------------------------
// Rest of helpers (unchanged from original except where noted)
// ---------------------------------------------------------------------------

const limitProductResults = (results, maxProducts = Infinity) => {
  const limitedResults = [];
  let productCount = 0;
  const seenProductIds = new Set();
  const seenCategoryIds = new Set();

  for (const result of results) {
    if (result.type !== "product") {
      const categoryId = result?.data?._id?.toString?.() || result?.data?.id;
      if (categoryId) {
        if (seenCategoryIds.has(categoryId)) continue;
        seenCategoryIds.add(categoryId);
      }
      limitedResults.push(result);
      continue;
    }

    const productId = result?.data?._id?.toString?.() || result?.data?.id;
    if (productId) {
      if (seenProductIds.has(productId)) continue;
      seenProductIds.add(productId);
    }

    if (productCount >= maxProducts) continue;

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

const consonantKey = (word) =>
  word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/[aeiou]/g, "")
    .replace(/[cqx]/g, "k");

const wordVariants = (word) => {
  const variants = new Set([word]);
  if (word.endsWith("es") && word.length > 4) variants.add(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 3) variants.add(word.slice(0, -1));
  if (!word.endsWith("s")) variants.add(word + "s");
  return [...variants];
};

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
  if (minLen <= 4) {
    return distance <= 1 || leftWord.slice(0, 2) === rightWord.slice(0, 2);
  }
  return (
    leftWord[0] === rightWord[0] &&
    Math.abs(leftWord.length - rightWord.length) <= 2
  );
};

/**
 * FIX A: Expanded primary fields to include structured attributes.
 */
const productHasFuzzyWordMatch = (product, normalisedQuery) => {
  const queryWords = getQueryWords(normalisedQuery);
  if (queryWords.length === 0) return false;

  const productWords = getSearchableWords([
    product.name,
    product.subCategory,
    getProductCategoryName(product),
    ...getProductColorValues(product),
    ...(Array.isArray(product.style) ? product.style : []),
    ...(Array.isArray(product.tags) ? product.tags : []),
    ...(Array.isArray(product.fabric) ? product.fabric : []),
    ...(Array.isArray(product.work) ? product.work : []),
    ...(Array.isArray(product.occasion) ? product.occasion : []),
    ...(Array.isArray(product.wearType) ? product.wearType : []),
    product.shortDescription || "",
  ]);

  return queryWords.every((qWord) =>
    productWords.some((pWord) => wordsMatch(qWord, pWord)),
  );
};

/**
 * Stricter version for multi-word queries.
 */
const productAllQueryWordsMatch = (product, normalisedQuery) => {
  const queryWords = getQueryWords(normalisedQuery);
  if (queryWords.length === 0) return false;

  const productWords = getSearchableWords([
    product.name,
    product.subCategory,
    getProductCategoryName(product),
    product.shortDescription || "",
    product.description || "",
    ...getProductColorValues(product),
    ...(Array.isArray(product.style) ? product.style : []),
    ...(Array.isArray(product.tags) ? product.tags : []),
    ...(Array.isArray(product.fabric) ? product.fabric : []),
    ...(Array.isArray(product.work) ? product.work : []),
    ...(Array.isArray(product.occasion) ? product.occasion : []),
    ...(Array.isArray(product.wearType) ? product.wearType : []),
    ...(Array.isArray(product.productType) ? product.productType : []),
  ]);

  return queryWords.every((qWord) =>
    productWords.some((pWord) => wordsMatch(qWord, pWord)),
  );
};

// ---------------------------------------------------------------------------
// Category targeting
// ---------------------------------------------------------------------------

const isCategoryFuzzyMatch = (normalisedQuery, normalisedCategoryName) => {
  if (!normalisedQuery || !normalisedCategoryName) return false;
  if (normalisedCategoryName === normalisedQuery) return true;
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

const hasPrefixTypoMatch = (queryWord, categoryWord) => {
  if (!queryWord || !categoryWord) return false;
  if (queryWord.length < 3 || categoryWord.length < 3) return false;
  const comparableCategoryPrefix = categoryWord.slice(0, queryWord.length);
  const comparableQueryPrefix = queryWord.slice(0, categoryWord.length);
  return (
    levenshteinDistance(queryWord, comparableCategoryPrefix) <= 1 ||
    levenshteinDistance(comparableQueryPrefix, categoryWord) <= 1
  );
};

const categoryMatchesQuery = (category, normalisedQuery, queryWords) => {
  const normalisedCategoryName = normalise(category?.name);
  if (!normalisedCategoryName) return false;

  if (
    (queryWords.length <= 1 ||
      valueMatchesAllQueryWords(normalisedCategoryName, queryWords)) &&
    isCategoryFuzzyMatch(normalisedQuery, normalisedCategoryName)
  ) {
    return true;
  }

  const categoryWords = normalisedCategoryName
    .split(" ")
    .filter((word) => word.length >= 3);

  return queryWords.some((qWord) =>
    categoryWords.some((categoryWord) =>
      hasPrefixTypoMatch(qWord, categoryWord),
    ),
  );
};

const findTargetedCategoryHit = async (hits, normalisedQuery) => {
  const queryWords = getQueryWords(normalisedQuery, 3);

  const hitMatch = hits.find(
    (hit) =>
      hit.type === "category" &&
      categoryMatchesQuery(hit.data, normalisedQuery, queryWords),
  );

  if (hitMatch) return hitMatch;
  if (queryWords.length === 0) return null;

  const activeCategories = await Category.find({ status: "Active" })
    .select("_id name slug description status")
    .lean();
  const fallbackCategory = activeCategories.find((category) =>
    categoryMatchesQuery(category, normalisedQuery, queryWords),
  );

  return fallbackCategory
    ? { type: "category", data: fallbackCategory }
    : null;
};

/**
 * FIX H: Include subCategory-matched products in addition to category._id products.
 * Some products link to a category via subCategory string rather than the category
 * ObjectId reference, so querying only by category._id misses them.
 */
const buildCategoryWithProductsResults = async (category) => {
  const [byRef, bySubCategory] = await Promise.all([
    Product.find({ category: category._id, status: "Active" })
      .populate("category", "name slug")
      .lean(),
    Product.find({
      subCategory: new RegExp(`^${normalise(category.name)}$`, "i"),
      status: "Active",
    })
      .populate("category", "name slug")
      .lean(),
  ]);

  // Merge and deduplicate
  const seen = new Set();
  const products = [];
  for (const p of [...byRef, ...bySubCategory]) {
    const id = p._id.toString();
    if (!seen.has(id)) {
      seen.add(id);
      products.push(p);
    }
  }

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

const TEXT_SEARCH_FIELDS = ["shortDescription", "description"];

const productMatchesSearchIntent = (product, normalisedQuery) => {
  const queryWords = getQueryWords(normalisedQuery);

  if (queryWords.length <= 1) {
    return (
      productMatchesStructuredFields(product, normalisedQuery) ||
      productMatchesTextFields(product, normalisedQuery) ||
      primaryTextMatchesProduct(product, normalisedQuery) ||
      (normalisedQuery.length >= 3 &&
        productHasFuzzyWordMatch(product, normalisedQuery))
    );
  }

  if (productMatchesStructuredFields(product, normalisedQuery)) {
    return true;
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

      if (queryWords.length > 1) {
        return queryWords.every((qWord) =>
          tagWords.some((tWord) => wordsMatch(qWord, tWord)),
        );
      }

      return queryWords.some((qWord) =>
        tagWords.some((tWord) => wordsMatch(qWord, tWord)),
      );
    });
  });
};

const productMatchesTextFields = (product, normalisedQuery) => {
  if (!normalisedQuery) return false;

  return TEXT_SEARCH_FIELDS.some((field) => {
    const value = product?.[field];
    if (!value) return false;
    const normalisedValue = normalise(value);
    if (!normalisedValue) return false;

    if (
      normalisedValue === normalisedQuery ||
      normalisedValue.includes(normalisedQuery) ||
      normalisedQuery.includes(normalisedValue)
    ) {
      return true;
    }

    const queryWords = getQueryWords(normalisedQuery);
    const valueWords = getSearchableWords([normalisedValue]);
    return queryWords.every((qWord) =>
      valueWords.some((valueWord) => wordsMatch(qWord, valueWord)),
    );
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
    product.shortDescription,
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