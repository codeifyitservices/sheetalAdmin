/**
 * @fileoverview N-Gram Search Service — Priority-Ordered Edition
 *
 * Search priority (Myntra-style):
 *   Tier 1 — Products whose NAME starts with the query
 *   Tier 2 — Products whose NAME contains the query (not at start)
 *   Tier 3 — Categories whose NAME starts with / contains the query
 *   Tier 4 — Products whose SUBCATEGORY matches the query
 *   Tier 5 — Products whose TAGS / ATTRIBUTES match the query
 *
 * Fuzzy matching (Levenshtein / consonant skeleton / phonetic):
 *   DISABLED for queries shorter than MIN_FUZZY_LENGTH (3 chars).
 *   This prevents single-char or two-char queries from pulling in
 *   unrelated products via fuzzy expansion.
 *
 * Short query protection (< MIN_FUZZY_LENGTH):
 *   SubCategory, Category, and Attribute/Tag scoring are ALL disabled.
 *   Only name-level matches are considered. This prevents products like
 *   "Test Product Name" (with fabric "lace") from appearing when the
 *   user types "la" — only products whose NAME starts with / contains
 *   "la" will appear.
 *
 * Architecture:
 *   - invertedIndex   Map<gram,  Set<docId>>  — prefix gram → doc ids
 *   - wordIndex       Map<word,  Set<docId>>  — full words  → doc ids (fuzzy expansion)
 *   - primaryWordIndex Map<word, Set<docId>>  — name/slug/subCat only (tighter fuzzy)
 *   - documentStore   Map<docId, {doc, grams, words, primaryWords}>
 *
 * Hydration:
 *   Loads all Active products + categories from MongoDB on first search or
 *   when the index is stale (INDEX_TTL_MS). Staged into temp maps so a failed
 *   rebuild never wipes the last good index.
 */

import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HITS = 200; // hard cap before pagination
const INDEX_TTL_MS = 15 * 60 * 1000; // 15 min stale threshold
const MIN_FUZZY_LENGTH = 3; // fuzzy only for queries >= this length
// ---------------------------------------------------------------------------
// In-Memory Index State
// ---------------------------------------------------------------------------

/** @type {Map<string, Set<string>>} */
const invertedIndex = new Map();

/** @type {Map<string, Set<string>>} — word-level, all fields */
const wordIndex = new Map();

/** @type {Map<string, Set<string>>} — word-level, name/slug/subCategory/category only */
const primaryWordIndex = new Map();

/**
 * @type {Map<string, { doc: Object, grams: Set<string>, words: Set<string>, primaryWords: Set<string> }>}
 */
const documentStore = new Map();

let isHydrated = false;
let lastHydratedAt = 0;
let hydrationPromise = null;

// ---------------------------------------------------------------------------
// Text helpers
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

/**
 * Generate prefix grams + full words for an arbitrary text blob.
 * e.g. "blue shirt" → grams: {b,bl,blu,blue,s,sh,shi,shir,shirt}
 *                      words: {blue, shirt}
 */
const generateNgrams = (text) => {
  const norm = normaliseSearchText(text);
  const grams = new Set();
  const words = new Set();
  if (!norm) return { grams, words };

  norm
    .split(" ")
    .filter(Boolean)
    .forEach((w) => {
      words.add(w);
      // Generate prefixes
      for (let i = 1; i <= w.length; i++) {
        grams.add(w.slice(0, i));
      }
      // Generate exact infixes (length >= 1)
      for (let start = 1; start < w.length; start++) {
        for (let len = 1; start + len <= w.length; len++) {
          grams.add(w.substr(start, len));
        }
      }
    });

  return { grams, words };
};

// Fields used for the broad invertedIndex (everything searchable)
const documentNgrams = (doc) => {
  if (doc.type === "product") {
    const blob = [
      doc.name,
      doc.category,
      doc.subCategory,
      ...(doc.tags || []),
      ...(doc.colors || []),
      ...(doc.occasion || []),
      ...(doc.wearType || []),
      ...(doc.productType || []),
      ...(doc.fabric || []),
      ...(doc.style || []),
      ...(doc.work || []),
      ...(doc.displayCollections || []),
      ...(doc.eventTags || []),
    ]
      .filter(Boolean)
      .join(" ");

    return generateNgrams(blob);
  }

  // Category type
  const blob = [doc.name, doc.slug, doc.description].filter(Boolean).join(" ");

  return generateNgrams(blob);
};

// Fields used for the tighter primaryWordIndex (name / slug / subCategory / category)
const documentPrimaryNgrams = (doc) => {
  if (doc.type === "product") {
    const blob = [
      doc.name,
      doc.slug,
      doc.subCategory,
      doc.category,
      ...(doc.tags || []),
      ...(doc.colors || []),
      ...(doc.occasion || []),
      ...(doc.wearType || []),
      ...(doc.productType || []),
      ...(doc.fabric || []),
      ...(doc.style || []),
      ...(doc.work || []),
      ...(doc.displayCollections || []),
      ...(doc.eventTags || []),
    ]
      .filter(Boolean)
      .join(" ");
    return generateNgrams(blob);
  }

  const blob = [doc.name, doc.slug, doc.category].filter(Boolean).join(" ");
  return generateNgrams(blob);
};

// ---------------------------------------------------------------------------
// Fuzzy / Phonetic utilities
// ---------------------------------------------------------------------------

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
  const w = word.toLowerCase();
  let code = w[0].toUpperCase(),
    prev = map[w[0]] || 0;
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
    .replace(/[aeiouh]/g, "")
    .replace(/[cqx]/g, "k");

/**
 * Returns true if qWord and pWord are "close enough" to be considered a match.
 * Only called when query.length >= MIN_FUZZY_LENGTH.
 */
const fuzzyWordsMatch = (qWord, pWord) => {
  if (qWord === pWord) return true;
  if (qWord.length < MIN_FUZZY_LENGTH || pWord.length < MIN_FUZZY_LENGTH)
    return false;

  // Prefix containment
  if (pWord.startsWith(qWord) || qWord.startsWith(pWord)) return true;

  // Allows omitted-letter searches like "lehga" -> "lehenga" without relying
  // on hardcoded token maps.
  if (isOrderedSubsequenceMatch(qWord, pWord)) return true;

  // Consonant skeleton
  const qk = consonantKey(qWord);
  const pk = consonantKey(pWord);
  if (qk.length >= 3 && pk.length >= 3 && qk === pk) return true;

  // Levenshtein — allow 1 edit for short words, 2 for longer
  const maxDist = qWord.length <= 5 ? 1 : 2;
  if (Math.abs(qWord.length - pWord.length) <= maxDist) {
    if (levenshteinDistance(qWord, pWord) <= maxDist) return true;
  }

  return false;
};

// ---------------------------------------------------------------------------
// Index mutation helpers
// ---------------------------------------------------------------------------

const upsertDocumentIntoIndex = (doc) => {
  if (documentStore.has(doc.id)) removeDocumentFromIndex(doc.id);

  const { grams, words } = documentNgrams(doc);
  const { words: primaryWords } = documentPrimaryNgrams(doc);

  grams.forEach((g) => {
    if (!invertedIndex.has(g)) invertedIndex.set(g, new Set());
    invertedIndex.get(g).add(doc.id);
  });
  words.forEach((w) => {
    if (!wordIndex.has(w)) wordIndex.set(w, new Set());
    wordIndex.get(w).add(doc.id);
  });
  primaryWords.forEach((w) => {
    if (!primaryWordIndex.has(w)) primaryWordIndex.set(w, new Set());
    primaryWordIndex.get(w).add(doc.id);
  });

  documentStore.set(doc.id, { doc, grams, words, primaryWords });
};

const removeDocumentFromIndex = (docId) => {
  const entry = documentStore.get(docId);
  if (!entry) return;
  const { grams, words, primaryWords } = entry;

  grams.forEach((g) => {
    const b = invertedIndex.get(g);
    if (b) {
      b.delete(docId);
      if (!b.size) invertedIndex.delete(g);
    }
  });
  words.forEach((w) => {
    const b = wordIndex.get(w);
    if (b) {
      b.delete(docId);
      if (!b.size) wordIndex.delete(w);
    }
  });
  primaryWords.forEach((w) => {
    const b = primaryWordIndex.get(w);
    if (b) {
      b.delete(docId);
      if (!b.size) primaryWordIndex.delete(w);
    }
  });

  documentStore.delete(docId);
};

// ---------------------------------------------------------------------------
// Document builders
// ---------------------------------------------------------------------------

const buildProductDoc = (product) => {
  const doc = {
    id: product._id.toString(),
    type: "product",
    name: product.name || "",
    isStarred: Boolean(product.isStarred),
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
      "",
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
      ? product.specifications.flatMap((s) =>
          [s?.key, s?.value].filter(Boolean),
        )
      : [],
    stock: product.stock,
    status: product.status,
    sizes: product.variants
      ? [
          ...new Set(
            product.variants.flatMap((v) =>
              (v.sizes || []).map((s) => s?.name).filter(Boolean),
            ),
          ),
        ]
      : [],
    colors: product.variants
      ? [...new Set(product.variants.map((v) => v.color?.name).filter(Boolean))]
      : [],
  };

  if (product.variants?.length) {
    let minPrice = Infinity,
      relatedMrp = 0;
    product.variants.forEach((v) => {
      v.sizes?.forEach((s) => {
        const eff =
          s.discountPrice && s.discountPrice > 0 ? s.discountPrice : s.price;
        if (eff < minPrice) {
          minPrice = eff;
          relatedMrp = s.price;
        }
      });
    });
    if (minPrice !== Infinity) {
      doc.minPrice = minPrice;
      doc.mrp = relatedMrp;
      if (relatedMrp > minPrice)
        doc.discount = Math.round(((relatedMrp - minPrice) / relatedMrp) * 100);
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

const compareTierTies = (leftDoc, rightDoc) => {
  const leftStarred = leftDoc?.type === "product" && leftDoc?.isStarred ? 1 : 0;
  const rightStarred =
    rightDoc?.type === "product" && rightDoc?.isStarred ? 1 : 0;

  if (leftStarred !== rightStarred) {
    return rightStarred - leftStarred;
  }

  const leftName = String(leftDoc?.name || "");
  const rightName = String(rightDoc?.name || "");
  const byName = leftName.localeCompare(rightName, "en", {
    sensitivity: "base",
    numeric: true,
  });

  if (byName !== 0) {
    return byName;
  }

  return String(leftDoc?.id || "").localeCompare(String(rightDoc?.id || ""));
};

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

const hydrateIndex = async () => {
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    const si = new Map(),
      sw = new Map(),
      sp = new Map(),
      ss = new Map();

    const stageDoc = (doc) => {
      const { grams, words } = documentNgrams(doc);
      const { words: primaryWords } = documentPrimaryNgrams(doc);
      grams.forEach((g) => {
        if (!si.has(g)) si.set(g, new Set());
        si.get(g).add(doc.id);
      });
      words.forEach((w) => {
        if (!sw.has(w)) sw.set(w, new Set());
        sw.get(w).add(doc.id);
      });
      primaryWords.forEach((w) => {
        if (!sp.has(w)) sp.set(w, new Set());
        sp.get(w).add(doc.id);
      });
      ss.set(doc.id, { doc, grams, words, primaryWords });
    };

    const [products, categories] = await Promise.all([
      Product.find({ status: "Active" }).populate("category", "name").lean(),
      Category.find({ status: "Active" }).lean(),
    ]);

    products.forEach((p) => stageDoc(buildProductDoc(p)));
    categories.forEach((c) => stageDoc(buildCategoryDoc(c)));

    invertedIndex.clear();
    si.forEach((v, k) => invertedIndex.set(k, v));
    wordIndex.clear();
    sw.forEach((v, k) => wordIndex.set(k, v));
    primaryWordIndex.clear();
    sp.forEach((v, k) => primaryWordIndex.set(k, v));
    documentStore.clear();
    ss.forEach((v, k) => documentStore.set(k, v));

    isHydrated = true;
    lastHydratedAt = Date.now();
  })().finally(() => {
    hydrationPromise = null;
  });

  return hydrationPromise;
};

const ensureHydrated = async () => {
  if (!isHydrated || Date.now() - lastHydratedAt > INDEX_TTL_MS) {
    lastHydratedAt = Date.now(); // optimistic lock
    await hydrateIndex();
  }
};

// ---------------------------------------------------------------------------
// Core scoring — PRIORITY TIERS
// ---------------------------------------------------------------------------

/**
 * Scoring tiers (higher = ranked first):
 *
 *  TIER 1  Products — name STARTS WITH query (exact word boundary preferred)
 *  TIER 2  Products — name CONTAINS query
 *  TIER 3  Categories — name starts with / contains query
 *  TIER 4  Products — subCategory matches query    ← disabled for queries < MIN_FUZZY_LENGTH
 *  TIER 5  Products — tags / attributes match query ← disabled for queries < MIN_FUZZY_LENGTH
 *
 * SHORT QUERY PROTECTION (queryLen < MIN_FUZZY_LENGTH):
 *   Tiers 4 and 5 are completely skipped. Only name-level matches (Tiers 1–3)
 *   are considered. This prevents irrelevant products whose attributes happen
 *   to contain a short prefix (e.g. "lace" fabric matching "la") from
 *   appearing in results alongside — or above — products whose name matches.
 */
const TIER = {
  PRODUCT_NAME_STARTS: 50000,
  PRODUCT_NAME_CONTAINS: 40000,
  CATEGORY_NAME: 30000,
  PRODUCT_SUBCATEGORY: 20000,
  PRODUCT_ATTRIBUTE: 10000,
};

/**
 * Given a normalised query and a normalised target string, return a score
 * or null if no match is found.
 *
 * Sub-ranks within a tier (bonus 0–9999), ordered highest → lowest:
 *
 *   9000  Exact full string match         "mini dress" === "mini dress"
 *   8500  Name starts with query,         "mini dress kurta" startsWith "mini"
 *         at a word boundary
 *   8000  Name starts with query,         "miniskirt" startsWith "m"
 *         mid-word (no space after)
 *   7500  First word of name starts       word[0] = "mustard", query = "m"
 *         with query
 *   ---- GAP: 1000 points per word position ----
 *   6500  Word #1 (2nd word) starts       word[1] = "mini", query = "m"
 *   5500  Word #2 (3rd word) starts       word[2] = "mini", query = "m"
 *   4500  Word #3 (4th word) starts       word[3] = "mini", query = "m"
 *   ...   (each subsequent word -1000)
 *
 *   3500  Substring match in name         name contains "m" not at word start
 *
 *   2000  Fuzzy match (>= MIN_FUZZY_LENGTH only)
 */
const scoreNameMatch = (query, targetName, tierBase, options = {}) => {
  const { allowFuzzy = true } = options;
  if (!query || !targetName) return null;

  const queryLen = query.length;
  const targetWords = targetName.split(" ").filter(Boolean);

  // ── Exact full-string match ──────────────────────────────────────────────
  if (targetName === query) {
    return { score: tierBase + 9000 };
  }

  // ── Full name starts with query ──────────────────────────────────────────
  if (targetName.startsWith(query)) {
    const nextChar = targetName[queryLen];
    const atWordBoundary = !nextChar || nextChar === " ";
    return { score: tierBase + (atWordBoundary ? 8500 : 8000) };
  }

  // ── Word-by-word prefix match — large penalty per word position ──────────
  for (let i = 0; i < targetWords.length; i++) {
    if (targetWords[i].startsWith(query)) {
      if (i === 0) {
        return { score: tierBase + 7500 };
      } else {
        const containsTierBase =
          tierBase === TIER.PRODUCT_NAME_STARTS
            ? TIER.PRODUCT_NAME_CONTAINS
            : tierBase;
        const bonus = Math.max(2000, 6500 - (i - 1) * 1000);
        return { score: containsTierBase + bonus };
      }
    }
  }

  // ── Substring match (query appears inside a word, not at its start) ──────
  if (queryLen >= 1) {
    const idx = targetName.indexOf(query);
    if (idx !== -1) {
      const containsTierBase =
        tierBase === TIER.PRODUCT_NAME_STARTS
          ? TIER.PRODUCT_NAME_CONTAINS
          : tierBase;
      const positionPenalty = Math.min(idx, 20) * 30;
      return { score: containsTierBase + 3500 - positionPenalty };
    }
  }

  // ── Fuzzy — only for queries >= MIN_FUZZY_LENGTH ─────────────────────────
  if (!allowFuzzy || queryLen < MIN_FUZZY_LENGTH) return null;

  const queryWords = query.split(" ").filter(Boolean);
  const matchingWordsCount = queryWords.filter((qw) =>
    targetWords.some(
      (tw) => fuzzyWordsMatch(qw, tw) || tw.startsWith(qw) || tw.includes(qw),
    ),
  ).length;

  if (matchingWordsCount > 0) {
    const matchRatio = matchingWordsCount / queryWords.length;
    const bonus = Math.round(matchRatio * 2000);
    return { score: TIER.PRODUCT_NAME_CONTAINS + bonus };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Attribute fields considered for Tier 5
// ---------------------------------------------------------------------------
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

/**
 * Returns a bonus score if the product's attributes match the query.
 *
 * Matching rules (strict — no substring leakage):
 *   9000  Attribute value exactly equals the query          ("Silk" === "Silk")
 *   8000  Attribute value starts with the query             ("Silk Blend".startsWith("Silk"))
 *   7000  A WORD inside the attribute value equals query    ("Mirror Work" has word "work" == "work")
 *   6000  A word inside the value starts with query         ("Embroidered" word starts "emb")
 *   5000  All query words fuzzy-match words in the value    (>= MIN_FUZZY_LENGTH only)
 *
 * NOT matched:
 *   - "red" inside "Embroidered"  (substring, not word boundary)
 *   - "dress" inside "Addressed"  (substring, not word boundary)
 *
 * Colors are checked separately but with the same word-boundary rules.
 *
 * NOTE: This function is only called when queryLen >= MIN_FUZZY_LENGTH.
 * Callers must guard accordingly.
 */
const scoreAttributeMatch = (doc, query) => {
  if (doc.type !== "product") return 0;

  const scoreValue = (v) => {
    if (!v) return 0;
    const norm = normalise(v);
    if (!norm) return 0;
    const vWords = norm.split(" ").filter(Boolean);

    // Exact full match
    if (norm === query) return 9000;

    // A word inside the value exactly equals the query
    if (vWords.some((w) => w === query)) return 7000;

    return 0;
  };

  for (const field of ATTRIBUTE_FIELDS) {
    const values = Array.isArray(doc[field]) ? doc[field] : [];
    for (const raw of values) {
      const s = scoreValue(raw);
      if (s > 0) return s;
    }
  }

  // Colors — same rules
  if (Array.isArray(doc.colors)) {
    for (const color of doc.colors) {
      const s = scoreValue(color);
      if (s > 0) return s;
    }
  }

  return 0;
};

// ---------------------------------------------------------------------------
// Main search function
// ---------------------------------------------------------------------------

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

  const normQ = normaliseSearchText(query);
  const queryLen = normQ.length;
  const allowFuzzy = queryLen >= MIN_FUZZY_LENGTH;

  // ── Step 1: Candidate retrieval via inverted index ──────────────────────
  // Collect every doc that shares at least one prefix gram with the query.
  const { grams: queryGrams } = generateNgrams(normQ);
  const candidateScores = new Map(); // docId → raw gram-hit count

  queryGrams.forEach((gram) => {
    const bucket = invertedIndex.get(gram);
    if (!bucket) return;
    bucket.forEach((docId) => {
      candidateScores.set(docId, (candidateScores.get(docId) || 0) + 1);
    });
  });

  // Minimum gram hits required to be considered a candidate.
  // For short queries (1–2 chars) we require every gram to match (strict).
  // For longer queries we require at least 30% of query grams.
  const minGrams = allowFuzzy
    ? Math.max(1, Math.floor(queryGrams.size * 0.3))
    : queryGrams.size; // strict: ALL grams must hit for short queries

  // ── Step 2: Tier-based scoring ──────────────────────────────────────────
  const tieredResults = []; // { docId, finalScore }

  for (const [docId, gramHits] of candidateScores) {
    if (gramHits < minGrams) continue;

    const entry = documentStore.get(docId);
    if (!entry) continue;
    const { doc } = entry;
    const normName = normaliseSearchText(doc.name);
    const normSubCat = normaliseSearchText(doc.subCategory || "");
    const normCatName = normaliseSearchText(
      typeof doc.category === "string"
        ? doc.category
        : doc.category?.name || "",
    );

    let finalScore = 0;

    if (doc.type === "product") {
      // ── Tier 1 & 2: Product name ─────────────────────────────────────
      // Always evaluated regardless of query length.
      const nameMatch = scoreNameMatch(
        normQ,
        normName,
        TIER.PRODUCT_NAME_STARTS,
      );
      if (nameMatch) {
        finalScore = Math.max(finalScore, nameMatch.score);
      }

      // ── Tier 4: SubCategory ────────────────────────────────────────
      if (normSubCat) {
        const subCatMatch = scoreNameMatch(
          normQ,
          normSubCat,
          TIER.PRODUCT_SUBCATEGORY,
          { allowFuzzy: false },
        );
        if (subCatMatch) finalScore = Math.max(finalScore, subCatMatch.score);
      }

      // ── Tier 4 (also): Category name on product ────────────────────
      if (normCatName) {
        const catOnProductMatch = scoreNameMatch(
          normQ,
          normCatName,
          TIER.PRODUCT_SUBCATEGORY,
          { allowFuzzy: false },
        );
        if (catOnProductMatch)
          finalScore = Math.max(finalScore, catOnProductMatch.score);
      }

      // ── Tier 5: Attributes / Tags ──────────────────────────────────
      const attrBonus = scoreAttributeMatch(doc, normQ);
      if (attrBonus > 0) {
        finalScore = Math.max(finalScore, TIER.PRODUCT_ATTRIBUTE + attrBonus);
      }

      // Drop products that didn't match in any tier
      if (finalScore === 0) continue;
    } else if (doc.type === "category") {
      // ── Tier 3: Category name ────────────────────────────────────────
      // Categories are always matched by name regardless of query length.
      const catMatch = scoreNameMatch(normQ, normName, TIER.CATEGORY_NAME, {
        allowFuzzy: false,
      });
      if (!catMatch) continue;
      finalScore = catMatch.score;
    }

    tieredResults.push({ docId, finalScore });
  }

  // ── Step 3: Fuzzy expansion for longer queries ──────────────────────────
  // When the query is >= MIN_FUZZY_LENGTH, scan primaryWordIndex for words
  // that fuzzy-match any query word. This catches typos and phonetic variants.
  // Only expands for products — prevents noisy category fuzzy hits.
  // Skipped entirely for short queries (allowFuzzy = false).
  if (allowFuzzy) {
    const seenDocIds = new Set(tieredResults.map((r) => r.docId));
    const queryWords = normQ
      .split(" ")
      .filter((w) => w.length >= MIN_FUZZY_LENGTH);

    if (queryWords.length > 0) {
      primaryWordIndex.forEach((bucket, indexWord) => {
        const matches = queryWords.some((qw) => fuzzyWordsMatch(qw, indexWord));
        if (!matches) return;

        bucket.forEach((docId) => {
          if (seenDocIds.has(docId)) return; // already scored via gram hits
          const entry = documentStore.get(docId);
          if (!entry || entry.doc.type !== "product") return;

          const { doc } = entry;
          const normName = normaliseSearchText(doc.name);

          // Fuzzy expansion products must have ALL query words match somewhere
          // in name + category + subCategory + attributes. This prevents leakage.
          const qWords = normQ.split(" ").filter(Boolean);
          const searchable = [
            normName,
            normaliseSearchText(doc.category || ""),
            normaliseSearchText(doc.subCategory || ""),
          ].join(" ");
          const searchableWords = searchable.split(" ").filter(Boolean);

          const matchingCount = qWords.filter((qw) =>
            searchableWords.some(
              (sw) =>
                fuzzyWordsMatch(qw, sw) || sw.startsWith(qw) || sw.includes(qw),
            ),
          ).length;
          if (matchingCount === 0) return;

          // Score fuzzy expansions below direct-hit results within each tier
          const nameMatch = scoreNameMatch(
            normQ,
            normName,
            TIER.PRODUCT_NAME_STARTS,
          );
          const fuzzyScore = nameMatch
            ? nameMatch.score - 2000 // deduct 2000 to rank below direct hits
            : TIER.PRODUCT_ATTRIBUTE + 3000; // attribute-level fuzzy

          seenDocIds.add(docId);
          tieredResults.push({ docId, finalScore: fuzzyScore });
        });
      });
    }
  }

  // ── Step 4: Sort by finalScore descending ───────────────────────────────
  tieredResults.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }

    const leftDoc = documentStore.get(a.docId)?.doc;
    const rightDoc = documentStore.get(b.docId)?.doc;
    return compareTierTies(leftDoc, rightDoc);
  });

  // ── Step 5: Paginate ────────────────────────────────────────────────────
  const total = tieredResults.length;
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const hits = tieredResults
    .slice(skip, skip + limit)
    .map(({ docId }) => {
      const entry = documentStore.get(docId);
      return entry ? entry.doc : null;
    })
    .filter(Boolean);

  return { hits, total, page, totalPages };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const syncToIndex = async (item, type) => {
  try {
    const doc =
      type === "product"
        ? buildProductDoc(item)
        : type === "category"
          ? buildCategoryDoc(item)
          : null;
    if (doc) upsertDocumentIntoIndex(doc);
  } catch (err) {
    console.error("[NGramSearch] syncToIndex error:", err);
  }
};

export const deleteFromIndex = async (objectId) => {
  try {
    removeDocumentFromIndex(objectId.toString());
  } catch (err) {
    console.error("[NGramSearch] deleteFromIndex error:", err);
  }
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
