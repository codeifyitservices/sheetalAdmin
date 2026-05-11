/**
 * @fileoverview N-Gram Search Service
 *
 * A self-contained, in-process search engine that replaces Algolia.
 * Uses a prefix-oriented inverted index plus word-level infix expansion for
 * fast prefix, substring, and initial matching without any external dependency.
 *
 * Architecture:
 *  - In-memory index: Map<ngram, Set<docId>>
 *  - Word index:      Map<word,  Set<docId>>  — separate word-only index for O(W) fuzzy expansion
 *  - Document store:  Map<docId, { doc, grams, words }> — cached sets avoid recomputation on removal
 *  - Scoring:        TF-style — ranked by how many unique prefix grams of the
 *                    query match a document (intersection count / query prefix grams).
 *  - Hydration:      On first search or explicit rebuild, loads all active
 *                    products & categories from MongoDB.
 *                    Stages into temporary maps — a failed rebuild never wipes
 *                    the last good index. hydrationPromise is always cleared in
 *                    finally so a transient DB error doesn't permanently brick search.
 *  - Fuzzy matching: Levenshtein distance for typo tolerance ("suts" → "suits")
 *                    Expansion now runs against the word index only (O(Q×W)),
 *                    NOT the full n-gram index (O(Q×I)), preventing event-loop blocks.
 *  - Phonetic matching: Soundex for sound-alike words ("saris" → "sarees", "lahenga" → "lehenga")
 *  - Category boost: Categories always ranked above products — applied via sort
 *                    comparator only (removed the redundant ×50 score multiply).
 *
 * FIXES:
 *  - FIX #1: Fuzzy expansion uses wordIndex only — O(Q×W) not O(Q×I)
 *  - FIX #2: Don't mutate scores map during forEach
 *  - FIX #3: Removed ×50 category score multiply (sort comparator is enough)
 *  - FIX #4: lastHydratedAt set optimistically to block re-entrancy
 *  - FIX #5: buildProductDoc handles populated + unpopulated category
 *  - FIX #6: documentStore caches gram/word sets to avoid recomputation on removal
 *  - FIX #7: fuzzy-boosted docs exempted from minBaseScore pruning
 *  - FIX #8: Consonant-only queries (no vowels) get a stricter name-only match
 *            to prevent generic products outranking the correct typo target.
 *            "shrt" should find "shirt" not "Test Product Name".
 *  - FIX #9: Attribute boost capped when query is a consonant skeleton / abbreviation
 *            — prevents broad tag matches from defeating the intended name match.
 *
 * Public API:
 *  - syncToIndex(item, type)        — upsert a document into the index
 *  - deleteFromIndex(objectId)      — remove a document from the index
 *  - searchNgram(query, options)    — search and return ranked hits
 *  - rebuildIndex()                 — full rebuild from MongoDB (admin use)
 */

import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

const MAX_HITS = 100; // hard cap on returned hits before pagination
const INDEX_TTL_MS = 15 * 60 * 1000; // 15 minutes — auto-rebuild stale index

// ---------------------------------------------------------------------------
// In-Memory Index State
// ---------------------------------------------------------------------------

/** @type {Map<string, Set<string>>} ngram -> Set of document IDs */
const invertedIndex = new Map();

/**
 * Primary-field word index used for stricter infix matching.
 * Only name / slug / subCategory / category are included here.
 * @type {Map<string, Set<string>>} word -> Set of document IDs
 */
const primaryWordIndex = new Map();

/**
 * FIX #1: Separate word-level index for O(Q×W) fuzzy expansion.
 * @type {Map<string, Set<string>>} word -> Set of document IDs
 */
const wordIndex = new Map();

/**
 * FIX #6: Cached gram sets alongside each document to avoid recomputation on removal.
 * @type {Map<string, { doc: Object, grams: Set<string>, words: Set<string>, primaryWords: Set<string> }>}
 */
const documentStore = new Map();

let isHydrated = false;
let lastHydratedAt = 0;
let hydrationPromise = null;

// ---------------------------------------------------------------------------
// N-Gram Helpers
// ---------------------------------------------------------------------------

const normalise = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const generateNgrams = (text) => {
  const normalised = normalise(text);
  const grams = new Set();
  const words = new Set();
  if (!normalised) return { grams, words };

  const tokens = normalised.split(" ").filter(Boolean);

  tokens.forEach((w) => {
    if (w.length > 0) {
      grams.add(w);
      words.add(w);

      for (let i = 1; i <= w.length; i++) {
        grams.add(w.slice(0, i));
      }
    }
  });

  return { grams, words };
};

const documentNgrams = (doc) => {
  const fields = [
    doc.name,
    doc.sku,
    doc.subCategory,
    doc.description,
    doc.shortDescription,
    doc.materialCare,
    doc.brandInfo,
    doc.returnPolicy,
    doc.metaTitle,
    doc.metaDescription,
    doc.metaKeywords,
    doc.category,
    ...(doc.tags || []),
    ...(doc.productType || []),
    ...(doc.fabric || []),
    ...(doc.style || []),
    ...(doc.work || []),
    ...(doc.occasion || []),
    ...(doc.wearType || []),
    ...(doc.byPrice || []),
    ...(doc.displayCollections || []),
    ...(doc.eventTags || []),
    ...(doc.keyBenefits || []),
    ...(doc.specifications || []),
    ...(doc.sizes || []),
    ...(doc.colors || []),
  ]
    .filter(Boolean)
    .join(" ");

  return generateNgrams(fields);
};

const documentPrimaryNgrams = (doc) => {
  const fields = [doc.name, doc.slug, doc.subCategory, doc.category]
    .filter(Boolean)
    .join(" ");

  return generateNgrams(fields);
};

// ---------------------------------------------------------------------------
// Fuzzy + Phonetic Matching
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

const getFuzzyBonus = (normalisedQuery, normalisedName) => {
  const queryWords = normalisedQuery.split(" ");
  const nameWords = normalisedName.split(" ");

  let maxBonus = 0;

  queryWords.forEach((qWord) => {
    if (qWord.length < 3) return;
    nameWords.forEach((nWord) => {
      if (nWord.length < 3) return;

      const distance = levenshteinDistance(qWord, nWord);
      const lenDiff = Math.abs(qWord.length - nWord.length);

      if (distance === 1 && lenDiff <= 2) {
        maxBonus = Math.max(maxBonus, 200);
      } else if (distance === 2 && lenDiff <= 2) {
        maxBonus = Math.max(maxBonus, 100);
      }
    });
  });

  return maxBonus;
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
    if (curr && curr !== prev) {
      code += curr;
    }
    prev = curr || 0;
  }

  return code.padEnd(4, "0");
};

const getPhoneticBonus = (normalisedQuery, normalisedName) => {
  const queryWords = normalisedQuery.split(" ").filter((w) => w.length >= 3);
  const nameWords = normalisedName.split(" ").filter((w) => w.length >= 3);

  let maxBonus = 0;

  queryWords.forEach((qWord) => {
    const qCode = soundex(qWord);
    nameWords.forEach((nWord) => {
      if (soundex(nWord) === qCode) {
        maxBonus = Math.max(maxBonus, 120);
      }
    });
  });

  return maxBonus;
};

const consonantKey = (word) =>
  word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/[aeiou]/g, "")
    .replace(/[cqx]/g, "k");

/**
 * FIX #8: Detect consonant-skeleton queries (queries with no vowels or very few
 * vowels relative to length). These are abbreviations or typos where the user
 * typed consonants only (e.g. "shrt" for "shirt", "str" for "straight").
 * For such queries, name/primary-field matches must dominate — attribute tag
 * matches should not be able to outrank a good name match.
 */
const isConsonantSkeletonQuery = (normalisedQuery) => {
  const words = normalisedQuery.split(" ").filter((w) => w.length >= 3);
  if (words.length === 0) return false;
  // A query word is a consonant skeleton if it has no vowels at all, or if
  // vowels make up less than 20% of its characters and it's 3-5 chars long
  return words.every((w) => {
    const vowelCount = (w.match(/[aeiou]/g) || []).length;
    return vowelCount === 0 || (w.length <= 5 && vowelCount / w.length < 0.2);
  });
};

const getConsonantBonus = (normalisedQuery, normalisedName) => {
  const queryWords = normalisedQuery.split(" ").filter((w) => w.length >= 3);
  const nameWords = normalisedName.split(" ").filter((w) => w.length >= 3);

  let maxBonus = 0;

  queryWords.forEach((qWord) => {
    const qKey = consonantKey(qWord);
    if (qKey.length < 3) return;

    nameWords.forEach((nWord) => {
      const nKey = consonantKey(nWord);
      if (nKey.length < 3) return;

      if (nKey === qKey) {
        maxBonus = Math.max(maxBonus, 180);
      } else if (nKey.startsWith(qKey) || qKey.startsWith(nKey)) {
        maxBonus = Math.max(maxBonus, 140);
      }
    });
  });

  return maxBonus;
};

const getPrefixPositionBonus = (normalisedQuery, normalisedName) => {
  if (!normalisedQuery || !normalisedName) return 0;

  const nameWords = normalisedName.split(" ").filter(Boolean);
  const queryLen = normalisedQuery.length;
  let maxBonus = 0;

  nameWords.forEach((word, index) => {
    if (word === normalisedQuery) {
      maxBonus = Math.max(
        maxBonus,
        (queryLen === 1 ? 900 : 800) - index * (queryLen === 1 ? 200 : 50),
      );
    } else if (word.startsWith(normalisedQuery)) {
      const nextCharTieBreak =
        queryLen === 1 && word.length > 1 ? word.charCodeAt(1) / 1000 : 0;
      maxBonus = Math.max(
        maxBonus,
        (queryLen === 1 ? 700 : 500) - index * 100 + nextCharTieBreak,
      );
    }
  });

  return maxBonus;
};

const getInfixPositionBonus = (normalisedQuery, normalisedName) => {
  if (!normalisedQuery || !normalisedName || normalisedQuery.length < 3) {
    return 0;
  }

  const nameWords = normalisedName.split(" ").filter(Boolean);
  const queryLen = normalisedQuery.length;
  let maxBonus = 0;

  nameWords.forEach((word, index) => {
    const matchIndex = word.indexOf(normalisedQuery);
    if (matchIndex > 0) {
      const baseBonus = queryLen >= 5 ? 240 : 180;
      const positionalPenalty = Math.min(matchIndex, 6) * 10;
      maxBonus = Math.max(maxBonus, baseBonus - index * 40 - positionalPenalty);
    }
  });

  return maxBonus;
};

// ---------------------------------------------------------------------------
// Index Mutation Helpers
// ---------------------------------------------------------------------------

const upsertDocumentIntoIndex = (doc) => {
  if (documentStore.has(doc.id)) {
    removeDocumentFromIndex(doc.id);
  }

  const { grams, words } = documentNgrams(doc);
  const { words: primaryWords } = documentPrimaryNgrams(doc);

  grams.forEach((gram) => {
    if (!invertedIndex.has(gram)) invertedIndex.set(gram, new Set());
    invertedIndex.get(gram).add(doc.id);
  });

  words.forEach((word) => {
    if (!wordIndex.has(word)) wordIndex.set(word, new Set());
    wordIndex.get(word).add(doc.id);
  });

  primaryWords.forEach((word) => {
    if (!primaryWordIndex.has(word)) primaryWordIndex.set(word, new Set());
    primaryWordIndex.get(word).add(doc.id);
  });

  documentStore.set(doc.id, { doc, grams, words, primaryWords });
};

const removeDocumentFromIndex = (docId) => {
  const entry = documentStore.get(docId);
  if (!entry) return;

  const { grams, words } = entry;

  grams.forEach((gram) => {
    const bucket = invertedIndex.get(gram);
    if (bucket) {
      bucket.delete(docId);
      if (bucket.size === 0) invertedIndex.delete(gram);
    }
  });

  words.forEach((word) => {
    const bucket = wordIndex.get(word);
    if (bucket) {
      bucket.delete(docId);
      if (bucket.size === 0) wordIndex.delete(word);
    }
  });

  entry.primaryWords.forEach((word) => {
    const bucket = primaryWordIndex.get(word);
    if (bucket) {
      bucket.delete(docId);
      if (bucket.size === 0) primaryWordIndex.delete(word);
    }
  });

  documentStore.delete(docId);
};

// ---------------------------------------------------------------------------
// Document Builders
// ---------------------------------------------------------------------------

const buildProductDoc = (product) => {
  const doc = {
    id: product._id.toString(),
    type: "product",
    name: product.name || "",
    slug: product.slug || "",
    sku: product.sku || "",
    subCategory: product.subCategory || "",
    description: product.description || "",
    shortDescription: product.shortDescription || "",
    materialCare: product.materialCare || "",
    brandInfo: product.brandInfo || "",
    returnPolicy: product.returnPolicy || "",
    metaTitle: product.metaTitle || "",
    metaDescription: product.metaDescription || "",
    metaKeywords: product.metaKeywords || "",
    mainImage: product.mainImage || null,
    category:
      product.category?.name ||
      (typeof product.category === "string" ? product.category : "") ||
      (product.category && typeof product.category.toString === "function"
        ? ""
        : ""),
    tags: product.tags || [],
    productType: product.productType || [],
    fabric: product.fabric || [],
    style: product.style || [],
    work: product.work || [],
    occasion: product.occasion || [],
    wearType: product.wearType || [],
    byPrice: product.byPrice || [],
    displayCollections: product.displayCollections || [],
    eventTags: product.eventTags || [],
    keyBenefits: product.keyBenefits || [],
    specifications: Array.isArray(product.specifications)
      ? product.specifications.flatMap((spec) =>
          [spec?.key, spec?.value].filter(Boolean),
        )
      : [],
    stock: product.stock,
    status: product.status,
    sizes: product.variants
      ? [
          ...new Set(
            product.variants.flatMap((v) =>
              (v.sizes || []).map((size) => size?.name).filter(Boolean),
            ),
          ),
        ]
      : [],
    colors: product.variants
      ? [...new Set(product.variants.map((v) => v.color?.name).filter(Boolean))]
      : [],
  };

  if (product.variants && product.variants.length > 0) {
    let minPrice = Infinity;
    let relatedMrp = 0;

    product.variants.forEach((v) => {
      v.sizes?.forEach((s) => {
        const effective =
          s.discountPrice && s.discountPrice > 0 ? s.discountPrice : s.price;
        if (effective < minPrice) {
          minPrice = effective;
          relatedMrp = s.price;
        }
      });
    });

    if (minPrice !== Infinity) {
      doc.minPrice = minPrice;
      doc.mrp = relatedMrp;
      if (relatedMrp > minPrice) {
        doc.discount = Math.round(((relatedMrp - minPrice) / relatedMrp) * 100);
      }
    }
  }

  return doc;
};

const buildCategoryDoc = (category) => ({
  id: category._id.toString(),
  type: "category",
  name: category.name || "",
  slug: category.slug || "",
  description: category.description || "",
  image: category.mainImage || null,
  status: category.status,
});

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

const hydrateIndex = async () => {
  if (hydrationPromise) {
    return hydrationPromise;
  }

  hydrationPromise = (async () => {
    const stagingIndex = new Map();
    const stagingWordIndex = new Map();
    const stagingPrimaryWordIndex = new Map();
    const stagingStore = new Map();

    const stageDoc = (doc) => {
      const { grams, words } = documentNgrams(doc);
      const { words: primaryWords } = documentPrimaryNgrams(doc);

      grams.forEach((gram) => {
        if (!stagingIndex.has(gram)) stagingIndex.set(gram, new Set());
        stagingIndex.get(gram).add(doc.id);
      });

      words.forEach((word) => {
        if (!stagingWordIndex.has(word)) stagingWordIndex.set(word, new Set());
        stagingWordIndex.get(word).add(doc.id);
      });

      primaryWords.forEach((word) => {
        if (!stagingPrimaryWordIndex.has(word))
          stagingPrimaryWordIndex.set(word, new Set());
        stagingPrimaryWordIndex.get(word).add(doc.id);
      });

      stagingStore.set(doc.id, { doc, grams, words, primaryWords });
    };

    const products = await Product.find({ status: "Active" })
      .populate("category", "name")
      .lean();
    products.forEach((p) => stageDoc(buildProductDoc(p)));

    const categories = await Category.find({ status: "Active" }).lean();
    categories.forEach((c) => stageDoc(buildCategoryDoc(c)));

    invertedIndex.clear();
    stagingIndex.forEach((v, k) => invertedIndex.set(k, v));

    wordIndex.clear();
    stagingWordIndex.forEach((v, k) => wordIndex.set(k, v));

    primaryWordIndex.clear();
    stagingPrimaryWordIndex.forEach((v, k) => primaryWordIndex.set(k, v));

    documentStore.clear();
    stagingStore.forEach((v, k) => documentStore.set(k, v));

    isHydrated = true;
    lastHydratedAt = Date.now();
  })();

  hydrationPromise = hydrationPromise.finally(() => {
    hydrationPromise = null;
  });

  return hydrationPromise;
};

const ensureHydrated = async () => {
  const isStale = Date.now() - lastHydratedAt > INDEX_TTL_MS;
  if (!isHydrated || isStale) {
    lastHydratedAt = Date.now();
    await hydrateIndex();
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const syncToIndex = async (item, type) => {
  try {
    let doc;
    if (type === "product") {
      doc = buildProductDoc(item);
    } else if (type === "category") {
      doc = buildCategoryDoc(item);
    } else {
      return;
    }
    upsertDocumentIntoIndex(doc);
  } catch (error) {
    console.error("[NGramSearch] Error syncing to index:", error);
  }
};

export const deleteFromIndex = async (objectId) => {
  try {
    removeDocumentFromIndex(objectId.toString());
  } catch (error) {
    console.error("[NGramSearch] Error deleting from index:", error);
  }
};

/**
 * Searches the n-gram index and returns ranked results.
 *
 * Scoring strategy:
 *  1. Base score      — number of query prefix grams that match a document
 *  2. Fuzzy expand    — typo'd query words matched against primaryWordIndex
 *                       (+1.5 / +0.75 / +1.2 per hit), O(Q×W)
 *  3. Name bonuses    — exact (+1000), startsWith (+500), prefix position, infix
 *  4. Fuzzy bonus     — Levenshtein distance 1 (+200), distance 2 (+100)
 *  5. Phonetic bonus  — Soundex match (+120)
 *  6. Consonant bonus — consonant skeleton match (+180 / +140)
 *  7. Attribute boost — +800 for exact tag/style/occasion match
 *                       FIX #9: capped at +300 when query is a consonant skeleton,
 *                       preventing "Test Product Name" from outranking "shirt"
 *                       products for the query "shrt"
 *  8. Category sort   — categories always ranked above products via sort comparator
 */
export const searchNgram = async (query, options = {}) => {
  await ensureHydrated();

  const parsedLimit = Number(options.limit);
  const parsedPage = Number(options.page);
  const limit = Number.isInteger(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_HITS)
    : 10;
  const page = Number.isInteger(parsedPage) ? Math.max(parsedPage, 1) : 1;

  if (!query || query.trim().length === 0) {
    return { hits: [], total: 0, page, totalPages: 0 };
  }

  const { grams: queryGrams } = generateNgrams(query);
  const normalisedQuery = normalise(query);
  const baseQueryGrams =
    normalisedQuery.includes(" ") || normalisedQuery.length !== 3
      ? queryGrams
      : new Set([normalisedQuery]);

  // FIX #8: Detect consonant-skeleton queries early so scoring can be adjusted.
  const isConsonantQuery = isConsonantSkeletonQuery(normalisedQuery);

  // --- Step 1: Base scoring via inverted index ---
  const scores = new Map();

  baseQueryGrams.forEach((gram) => {
    const bucket = invertedIndex.get(gram);
    if (!bucket) return;
    bucket.forEach((docId) => {
      scores.set(docId, (scores.get(docId) || 0) + 1);
    });
  });

  // --- Step 2: Fuzzy + consonant query expansion ---
  const expandedDocs = new Set();

  const queryWords = normalisedQuery.split(" ").filter((w) => w.length >= 1);
  queryWords.forEach((qWord) => {
    const qConsonantKey = consonantKey(qWord);

    // Infix match in primary fields (e.g. "ram" inside "madhuram")
    primaryWordIndex.forEach((bucket, word) => {
      if (
        qWord.length >= 3 &&
        word.length > qWord.length &&
        word.includes(qWord) &&
        !word.startsWith(qWord)
      ) {
        const bonus = qWord.length >= 5 ? 1 : 0.85;
        bucket.forEach((docId) => {
          scores.set(docId, (scores.get(docId) || 0) + bonus);
          expandedDocs.add(docId);
        });
      }
    });

    if (qWord.length < 3) return;

    primaryWordIndex.forEach((bucket, word) => {
      const wordConsonantKey = consonantKey(word);
      const consonantMatch =
        qConsonantKey.length >= 3 &&
        wordConsonantKey.length >= 3 &&
        (wordConsonantKey === qConsonantKey ||
          wordConsonantKey.startsWith(qConsonantKey) ||
          qConsonantKey.startsWith(wordConsonantKey));

      if (Math.abs(word.length - qWord.length) > 2 && !consonantMatch) return;

      const distance = levenshteinDistance(qWord, word);
      let bonus = 0;

      if (distance === 1) {
        bonus = 1.5;
      } else if (distance === 2 && (qWord.length >= 4 || word.length >= 4)) {
        bonus = 0.75;
      } else if (consonantMatch) {
        bonus = wordConsonantKey === qConsonantKey ? 1.2 : 0.6;
      }

      if (bonus > 0) {
        bucket.forEach((docId) => {
          scores.set(docId, (scores.get(docId) || 0) + bonus);
          expandedDocs.add(docId);
        });
      }
    });
  });

  // FIX #2: Collect pruned IDs first, then delete — avoid mutating during iteration
  const minBaseScore = Math.max(1, baseQueryGrams.size * 0.1);
  const toPrune = [];
  for (const [docId, score] of scores) {
    if (score < minBaseScore && !expandedDocs.has(docId)) {
      toPrune.push(docId);
    }
  }
  toPrune.forEach((id) => scores.delete(id));

  if (scores.size === 0) {
    return { hits: [], total: 0, page, totalPages: 0 };
  }

  // --- Step 3: Apply boosts and sort ---
  const ranked = [...scores.entries()]
    .map(([docId, score]) => {
      const entry = documentStore.get(docId);
      if (!entry) return [docId, score];

      const { doc } = entry;
      let boostedScore = score;
      const normalisedName = normalise(doc.name);
      const partialNameBonus = getPrefixPositionBonus(
        normalisedQuery,
        normalisedName,
      );
      const infixNameBonus = getInfixPositionBonus(
        normalisedQuery,
        normalisedName,
      );

      // Name proximity boosts
      if (normalisedName === normalisedQuery) {
        boostedScore += 1000;
      } else if (normalisedName.startsWith(normalisedQuery)) {
        boostedScore += 500;
      } else {
        const fuzzyBonus = getFuzzyBonus(normalisedQuery, normalisedName);
        const phoneticBonus = getPhoneticBonus(normalisedQuery, normalisedName);
        const consonantBonus = getConsonantBonus(
          normalisedQuery,
          normalisedName,
        );
        boostedScore += Math.max(fuzzyBonus, phoneticBonus, consonantBonus);
      }

      boostedScore += partialNameBonus;
      boostedScore += infixNameBonus;

      // Attribute / Tags boost
      // FIX #9: When the query is a consonant skeleton (e.g. "shrt", "str"),
      // the attribute boost is capped at 300 (vs 800 normally). This prevents
      // a product with a coincidentally matching tag (e.g. "Test Product Name"
      // with tag "straight") from outranking the intended name-match product
      // (e.g. "Blue Printed Straight Shirt" which matches "shrt" via consonant key).
      const maxAttributeBoost = isConsonantQuery ? 300 : 800;
      const fuzzyAttributeBoost = isConsonantQuery ? 50 : 100;

      const structuredFields = [
        "tags",
        "productType",
        "fabric",
        "style",
        "work",
        "occasion",
        "wearType",
        "byPrice",
      ];
      let hasAttributeMatch = false;
      let tagFuzzyBonus = 0;
      let tagPhoneticBonus = 0;

      for (const field of structuredFields) {
        const values = Array.isArray(doc[field]) ? doc[field] : [];
        for (const v of values) {
          if (!v) continue;
          const normV = normalise(v);
          if (!normV) continue;

          if (
            normV === normalisedQuery ||
            normV.startsWith(normalisedQuery) ||
            normalisedQuery.startsWith(normV)
          ) {
            hasAttributeMatch = true;
            break;
          } else {
            tagFuzzyBonus = Math.max(
              tagFuzzyBonus,
              getFuzzyBonus(normalisedQuery, normV),
            );
            tagPhoneticBonus = Math.max(
              tagPhoneticBonus,
              getPhoneticBonus(normalisedQuery, normV),
            );
          }
        }
        if (hasAttributeMatch) break;
      }

      if (hasAttributeMatch) {
        boostedScore += maxAttributeBoost;
      } else {
        const fuzzyTagScore = Math.max(tagFuzzyBonus, tagPhoneticBonus);
        if (fuzzyTagScore > 0) {
          boostedScore += fuzzyTagScore + fuzzyAttributeBoost;
        }
      }

      return [docId, boostedScore];
    })
    .sort((a, b) => {
      const docA = documentStore.get(a[0])?.doc;
      const docB = documentStore.get(b[0])?.doc;
      const aIsCategory = docA?.type === "category" ? 1 : 0;
      const bIsCategory = docB?.type === "category" ? 1 : 0;
      if (bIsCategory !== aIsCategory) return bIsCategory - aIsCategory;
      return b[1] - a[1];
    })
    .slice(0, MAX_HITS);

  const total = ranked.length;
  const totalPages = Math.ceil(total / limit);

  const skip = (page - 1) * limit;

  const hits = ranked
    .slice(skip, skip + limit)
    .map(([docId]) => documentStore.get(docId)?.doc)
    .filter(Boolean);

  return { hits, total, page, totalPages };
};

export const rebuildIndex = async () => {
  const start = Date.now();
  await hydrateIndex();
  return {
    success: true,
    documents: documentStore.size,
    ngrams: invertedIndex.size,
    words: wordIndex.size,
    durationMs: Date.now() - start,
  };
};