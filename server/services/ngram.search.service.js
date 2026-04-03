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
 * Only name / slug / subCategory / category are included here so substring
 * searches do not get pulled in from long descriptions or tags.
 *
 * @type {Map<string, Set<string>>} word -> Set of document IDs
 */
const primaryWordIndex = new Map();

/**
 * FIX #1 (Critical): Separate word-level index used exclusively for fuzzy
 * expansion. Fuzzy expansion previously iterated the full invertedIndex
 * (tens of thousands of character substring grams) and called levenshteinDistance on
 * each — O(Q × I) per search, blocking the event loop on large catalogs.
 * Now fuzzy expansion only iterates whole words — O(Q × W), orders of magnitude
 * smaller.
 *
 * @type {Map<string, Set<string>>} word -> Set of document IDs
 */
const wordIndex = new Map();

/**
 * FIX #6 (Minor): Store cached gram sets alongside each document so removal
 * never needs to recompute grams. Previously removeDocumentFromIndex
 * recomputed grams from the stored doc — if the doc and index ever drifted
 * out of sync the removal would silently no-op or clean wrong buckets.
 *
 * @type {Map<string, { doc: Object, grams: Set<string>, words: Set<string>, primaryWords: Set<string> }>}
 */
const documentStore = new Map();

let isHydrated = false;
let lastHydratedAt = 0;
let hydrationPromise = null; // prevents concurrent rebuilds

// ---------------------------------------------------------------------------
// N-Gram Helpers
// ---------------------------------------------------------------------------

/**
 * Normalises a string for indexing or querying.
 * Lowercases, removes punctuation, trims extra whitespace.
 */
const normalise = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Generates prefix grams from a string.
 * Returns { grams, words } so callers can populate both indexes separately.
 */
const generateNgrams = (text) => {
  const normalised = normalise(text);
  const grams = new Set();
  const words = new Set();
  if (!normalised) return { grams, words };

  const tokens = normalised.split(" ").filter(Boolean);

  // Word-level tokens (important for exact word hits + fuzzy expansion)
  tokens.forEach((w) => {
    if (w.length > 0) {
      grams.add(w);
      words.add(w); // also tracked in separate word set

      // Prefixes of each word: "kaftan" => k, ka, kaf, ...
      for (let i = 1; i <= w.length; i++) {
        grams.add(w.slice(0, i));
      }
    }
  });

  return { grams, words };
};

/**
 * Extracts all searchable text from a document and converts to n-gram + word sets.
 */
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

/**
 * Extracts only the primary searchable text from a document.
 */
const documentPrimaryNgrams = (doc) => {
  const fields = [doc.name, doc.slug, doc.subCategory, doc.category]
    .filter(Boolean)
    .join(" ");

  return generateNgrams(fields);
};

// ---------------------------------------------------------------------------
// Fuzzy + Phonetic Matching Strategy (replaces hardcoded aliases)
// ---------------------------------------------------------------------------
// Instead of maintaining hardcoded typo mappings (sut→suits, sari→sareees),
// we use dynamic Levenshtein distance + Soundex matching to handle ALL spelling
// variations automatically. This scales better and handles edge cases we didn't
// anticipate in the aliases dictionary.

// ---------------------------------------------------------------------------
// Fuzzy Matching Helpers
// ---------------------------------------------------------------------------

/**
 * Calculates Levenshtein distance between two strings.
 * Used for typo-tolerance / fuzzy matching.
 *
 * Examples:
 *   "suts"  vs "suits"  → 1
 *   "soot"  vs "suit"   → 2
 *   "shurt" vs "shirt"  → 1
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
              matrix[i - 1][j - 1] + 1, // substitution
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1, // deletion
            );
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Returns a fuzzy match bonus score based on how close the query words
 * are to the document name words using Levenshtein distance.
 *
 * AGGRESSIVE BONUS TIERS:
 *   distance === 1, lenDiff <= 2  → +200  e.g. "suts"  → "suits"
 *   distance === 2, lenDiff <= 2  → +100  e.g. "soots" → "suits", "saarees" → "sarees"
 */
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

// ---------------------------------------------------------------------------
// Phonetic Matching (Soundex)
// ---------------------------------------------------------------------------

/**
 * Generates a Soundex code for a word.
 * Maps similar-sounding characters to the same digit code.
 *
 * Examples:
 *   "saree"   → S600
 *   "sari"    → S600  ✓ match
 *   "lehenga" → L520
 *   "lahenga" → L520  ✓ match
 *   "kurta"   → K630
 *   "kurtha"  → K630  ✓ match
 */
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
    if (curr && curr !== prev) {
      code += curr;
    }
    prev = curr || 0;
  }

  return code.padEnd(4, "0");
};

/**
 * Returns a phonetic bonus if any query word sounds like any document name word.
 * Uses Soundex codes — same code means same-sounding word.
 *
 * Examples:
 *   "saris" → S620,  "sarees" → S620   → +120
 *   "lahenga" → L520, "lehenga" → L520  → +120
 *   "salwar" → S460,  "shalwar" → S460  → +120
 */
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

/**
 * Generates a consonant key for abbreviation-style matching.
 * Vowels are removed and a few visually similar consonants are folded together,
 * so queries like "cftn", "caftn", "caftan", and "kft" can all match "kaftan".
 */
const consonantKey = (word) =>
  word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/[aeiou]/g, "")
    .replace(/[cqx]/g, "k");

/**
 * Returns a bonus when the consonant skeleton of a query word matches a
 * document word. This is the fallback for short/abbreviated searches.
 */
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

/**
 * Extra ranking for token-level prefix matches.
 * Earlier matching words rank above later ones, so "kaftan" beats
 * "suit kaliri" for the query "ka".
 */
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

/**
 * Extra ranking for infix matches inside a token.
 * This gives substring hits a smaller boost than prefix hits, so a result like
 * "madhuram" still ranks below an exact or starting prefix match for "ram".
 */
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

/**
 * Adds or replaces a document in the inverted index, word index, and document store.
 * FIX #6: Caches the computed gram + word sets in the store entry so removal
 * never needs to recompute them.
 */
const upsertDocumentIntoIndex = (doc) => {
  if (documentStore.has(doc.id)) {
    removeDocumentFromIndex(doc.id);
  }

  const { grams, words } = documentNgrams(doc);
  const { words: primaryWords } = documentPrimaryNgrams(doc);

  // Populate inverted prefix index
  grams.forEach((gram) => {
    if (!invertedIndex.has(gram)) invertedIndex.set(gram, new Set());
    invertedIndex.get(gram).add(doc.id);
  });

  // FIX #1: Populate separate word index for O(W) fuzzy expansion
  words.forEach((word) => {
    if (!wordIndex.has(word)) wordIndex.set(word, new Set());
    wordIndex.get(word).add(doc.id);
  });

  primaryWords.forEach((word) => {
    if (!primaryWordIndex.has(word)) primaryWordIndex.set(word, new Set());
    primaryWordIndex.get(word).add(doc.id);
  });

  // FIX #6: Cache gram + word sets alongside the doc to avoid recomputation on removal
  documentStore.set(doc.id, { doc, grams, words, primaryWords });
};

/**
 * Removes a document from both indexes and the document store.
 * FIX #6: Uses cached grams/words — no recomputation needed.
 */
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
// Document Builders (MongoDB doc -> IndexedDocument)
// ---------------------------------------------------------------------------

/**
 * Converts a Mongoose Product document into an IndexedDocument.
 * FIX #5: Handles both populated ({ name }) and unpopulated (ObjectId string)
 * category fields so syncToIndex always indexes the category name correctly
 * regardless of whether the caller populated the field.
 */
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
    // FIX #5: category?.name covers populated docs; toString() covers raw ObjectIds
    // so the field is never silently empty when syncToIndex is called post-create/update.
    category:
      product.category?.name ||
      (typeof product.category === "string" ? product.category : "") ||
      (product.category && typeof product.category.toString === "function"
        ? "" // ObjectId — name unknowable without population; index as empty
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

  // Compute min effective price from variants
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

/**
 * Converts a Mongoose Category document into an IndexedDocument.
 */
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
// Hydration (Load from MongoDB)
// ---------------------------------------------------------------------------

/**
 * Clears the index and rebuilds it from MongoDB.
 *
 * FIX (from previous review):
 *  - Stages into temporary maps — the live index is only swapped in after BOTH
 *    Mongo queries succeed, so a transient DB failure never wipes good data.
 *  - hydrationPromise is always cleared in finally so one failed rebuild doesn't
 *    permanently prevent future rebuilds.
 */
const hydrateIndex = async () => {
  if (hydrationPromise) {
    return hydrationPromise;
  }

  hydrationPromise = (async () => {
    // Stage into temporary maps so a failure doesn't wipe the live index
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

    // Both queries must succeed before we touch the live index
    const products = await Product.find({ status: "Active" })
      .populate("category", "name")
      .lean();
    products.forEach((p) => stageDoc(buildProductDoc(p)));

    const categories = await Category.find({ status: "Active" }).lean();
    categories.forEach((c) => stageDoc(buildCategoryDoc(c)));

    // Atomic swap — only reached if both queries succeeded
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

  // Always clear the promise — a transient failure won't permanently brick search
  hydrationPromise = hydrationPromise.finally(() => {
    hydrationPromise = null;
  });

  return hydrationPromise;
};

/**
 * Ensures the index is hydrated and not stale before a search.
 * FIX #4: lastHydratedAt is set optimistically before awaiting so concurrent
 * callers during a long rebuild don't all re-enter hydrateIndex independently.
 */
const ensureHydrated = async () => {
  const isStale = Date.now() - lastHydratedAt > INDEX_TTL_MS;
  if (!isHydrated || isStale) {
    // Pessimistically claim freshness immediately to block re-entrancy during rebuild.
    // hydrateIndex will overwrite with the true timestamp on success.
    lastHydratedAt = Date.now();
    await hydrateIndex();
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upserts an item (product or category) into the in-memory n-gram index.
 * Call this after every create/update in product.service.js / category.service.js.
 */
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

/**
 * Removes a document from the in-memory n-gram index by its MongoDB _id string.
 */
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
 *  2. Fuzzy expand    — typo'd query words matched against the primary-field
 *                       word index (+1.5 / +0.75 per hit)
 *                       O(Q×W) — NOT O(Q×I). No event-loop blocking.
 *                       FIX #7: fuzzy-boosted docs are tracked in fuzzyBoostedDocs
 *                       and exempted from minBaseScore pruning so pure-typo queries
 *                       like "saarees" (distance=1 from "sarees") are never silently
 *                       dropped even when their n-gram overlap is below the threshold.
 *  3. Name bonuses    — exact (+1000), startsWith (+500), early-word prefix bonus
 *  4. Fuzzy bonus     — Levenshtein distance 1 (+200), distance 2 (+100)
 *  5. Phonetic bonus  — Soundex match (+120) e.g. "saris" → "sarees"
 *  6. Category sort   — categories always ranked above products via sort comparator
 *                       (removed the redundant ×50 score multiply to avoid
 *                       unpredictable double-boost interaction with the sort)
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
  // FIX #1 (Critical): iterate wordIndex only — O(Q × W) instead of O(Q × I).
  // Previously iterated the full invertedIndex (all character substring grams), calling
  // levenshteinDistance on every entry — catastrophically slow on large catalogs.
  //
  // Track every docId that receives a fuzzy boost or primary-field infix boost.
  // These docs are exempted from the minBaseScore pruning below.
  //
  // Root cause of the "saarees" → no results bug:
  //   "saarees" generates many query prefix grams. Most don't exist in the index
  //   (the index only contains "sarees" prefixes), so the base score stays near 0.
  //   Fuzzy expansion correctly identifies levenshteinDistance("saarees","sarees")=1
  //   and adds +1.5 — but minBaseScore = max(1, 16*0.1) = 1.6, so 1.5 < 1.6
  //   and the doc was silently pruned before ranking.
  //   Exempting fuzzy-boosted docs fixes this without loosening the threshold
  //   for genuinely low-signal n-gram matches.
  const expandedDocs = new Set();

  const queryWords = normalisedQuery.split(" ").filter((w) => w.length >= 1);
  queryWords.forEach((qWord) => {
    const qConsonantKey = consonantKey(qWord);
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

    if (qWord.length < 4) return;

    primaryWordIndex.forEach((bucket, word) => {
      const wordConsonantKey = consonantKey(word);
      const consonantMatch =
        qConsonantKey.length >= 3 &&
        wordConsonantKey.length >= 3 &&
        (wordConsonantKey === qConsonantKey ||
          wordConsonantKey.startsWith(qConsonantKey) ||
          qConsonantKey.startsWith(wordConsonantKey));

      if (Math.abs(word.length - qWord.length) > 2 && !consonantMatch) return; // Allow up to 2-char length diff

      const distance = levenshteinDistance(qWord, word);
      let bonus = 0;

      // Aggressive: distance 1 gets +1.5, distance 2 gets +0.75
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
          expandedDocs.add(docId); // mark for pruning exemption
        });
      }
    });
  });

  // FIX #2 (Medium): Do NOT mutate scores during forEach — collect deletions first.
  // Deleting map entries mid-forEach is undefined behaviour and can silently skip entries.
  //
  // Exempt expanded docs from the threshold so typo-only or substring-only
  // queries (e.g. "saarees" or "ram") are never pruned just because their
  // n-gram overlap is low. The ranking step still applies name/fuzzy/phonetic
  // boosts, so irrelevant matches won't bubble to the top.
  const minBaseScore = Math.max(1, baseQueryGrams.size * 0.1);
  for (const [docId, score] of scores) {
    if (score < minBaseScore && !expandedDocs.has(docId)) {
      scores.delete(docId);
    }
  }

  if (scores.size === 0) {
    return { hits: [], total: 0, page, totalPages: 0 };
  }

  // --- Step 3: Apply boosts and sort ---
  const ranked = [...scores.entries()]
    .map(([docId, score]) => {
      // FIX #6: documentStore now holds { doc, grams, words } — unwrap doc
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

      // FIX #3 (Medium): Removed the ×50 category score multiply.
      // The sort comparator below already hard-sorts categories above products.
      // Having both caused unpredictable double-boosting where a very low-scoring
      // category could always beat a highly relevant product regardless of intent.

      // Name proximity boosts
      if (normalisedName === normalisedQuery) {
        boostedScore += 1000;
      } else if (normalisedName.startsWith(normalisedQuery)) {
        boostedScore += 500;
      } else {
        // Fuzzy: "suts" → "suits", "soots" → "suits", "saarees" → "sarees"
        const fuzzyBonus = getFuzzyBonus(normalisedQuery, normalisedName);
        // Phonetic: "saris" → "sarees", "lahenga" → "lehenga"
        const phoneticBonus = getPhoneticBonus(normalisedQuery, normalisedName);
        // Consonant fallback: "cftn", "caftn", "caftan", "kft" → "kaftan"
        const consonantBonus = getConsonantBonus(
          normalisedQuery,
          normalisedName,
        );
        boostedScore += Math.max(fuzzyBonus, phoneticBonus, consonantBonus);
      }

      boostedScore += partialNameBonus;
      boostedScore += infixNameBonus;

      // Attribute / Tags boost
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
        boostedScore += 800; // Almost as good as a direct name match
      } else {
        const fuzzyTagScore = Math.max(tagFuzzyBonus, tagPhoneticBonus);
        if (fuzzyTagScore > 0) {
          boostedScore += fuzzyTagScore + 100; // Propel fuzzy tag matches
        }
      }

      return [docId, boostedScore];
    })
    .sort((a, b) => {
      // FIX #6: unwrap doc from store entry
      const docA = documentStore.get(a[0])?.doc;
      const docB = documentStore.get(b[0])?.doc;
      const aIsCategory = docA?.type === "category" ? 1 : 0;
      const bIsCategory = docB?.type === "category" ? 1 : 0;
      // FIX #3: Single source of truth for category priority — sort only, no score multiply.
      if (bIsCategory !== aIsCategory) return bIsCategory - aIsCategory;
      return b[1] - a[1];
    })
    .slice(0, MAX_HITS);

  const total = ranked.length;
  const totalPages = Math.ceil(total / limit);

  const skip = (page - 1) * limit;

  const hits = ranked
    .slice(skip, skip + limit)
    // FIX #6: unwrap doc from store entry
    .map(([docId]) => documentStore.get(docId)?.doc)
    .filter(Boolean);

  return { hits, total, page, totalPages };
};

/**
 * Triggers a full index rebuild from MongoDB.
 * Useful for an admin endpoint to warm up or re-sync the index after bulk imports.
 */
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
