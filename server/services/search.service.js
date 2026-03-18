import { searchNgram } from "./ngram.search.service.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

/**
 * Searches products and categories using the custom n-gram index.
 *
 * Behaviour:
 *  - Attribute-style queries like "party" should return all matched products.
 *  - Category scoping is only applied when the query itself clearly targets the
 *    matched category name.
 *
 * @param {{ query: string, limit: number, page: number }} params
 * @returns {Promise<Array<{ type: string, data: Object }>>}
 */
export const searchService = async ({ query, limit, page }) => {
  const result = await searchNgram(query, { limit, page });
  const hits = await hydrateSearchHits(result.hits);

  if (hits.length === 0) return hits;

  const normalisedQuery = normalise(query);
  const expandedQuery = expandQueryAliases(query);
  const normalisedExpandedQuery = normalise(expandedQuery);
  const targetedCategory = findTargetedCategoryHit(hits, normalisedQuery);

  if (targetedCategory) {
    return buildCategoryWithProductsResults(targetedCategory.data);
  }

  if (normalisedExpandedQuery && normalisedExpandedQuery !== normalisedQuery) {
    const aliasTargetedCategory = findTargetedCategoryHit(
      hits,
      normalisedExpandedQuery,
    );

    if (aliasTargetedCategory) {
      return buildCategoryWithProductsResults(aliasTargetedCategory.data);
    }

    const aliasMatchedHits = hits.filter((hit) =>
      hitMatchesAliasIntent(hit, normalisedExpandedQuery),
    );

    if (aliasMatchedHits.length > 0) {
      return aliasMatchedHits;
    }
  }

  const fieldMatchedProducts = hits.filter(
    (hit) =>
      hit.type === "product" &&
      productMatchesStructuredFields(hit.data, normalisedQuery),
  );

  if (fieldMatchedProducts.length > 0) {
    return fieldMatchedProducts;
  }

  const directMatchedHits = hits.filter((hit) =>
    hitMatchesPrimaryIntent(hit, normalisedQuery),
  );

  return directMatchedHits;
};

const QUERY_ALIASES = {
  sut: "suits",
  suts: "suits",
  soot: "suits",
  soots: "suits",
  sari: "sarees",
  saris: "sarees",
  seris: "sarees",
  sere: "sarees",
  sare: "sarees",
  seere: "sarees",
  lahange: "lehenga",
  lenga: "lehenga",
  langa: "lehenga",
  lehenga: "lehenga",
  kuta: "kurta set",
  koota: "kurta set",
  korta: "kurta set",
  koorta: "kurta set",
  dres: "dresses",
  dress: "dresses",
  derss: "dresses",
  druss: "dresses",
  dris: "dresses",
  driss: "dresses",
  kftn: "kaftan",
  cftn: "kaftan",
  kaftn: "kaftan",
  kftan: "kaftan",
  cftan: "kaftan",
  caftn: "kaftan",
  caftan: "kaftan",
  kft: "kaftan",
};

const expandQueryAliases = (query) => {
  return query
    .trim()
    .split(/\s+/)
    .map((word) => QUERY_ALIASES[word.toLowerCase()] ?? word)
    .join(" ");
};

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
    return values.some((value) => fieldValueMatchesQuery(value, normalisedQuery));
  });
};

const fieldValueMatchesQuery = (value, normalisedQuery) => {
  const normalisedValue = normalise(value);
  if (!normalisedValue) return false;

  return normalisedValue === normalisedQuery;
};

const hitMatchesAliasIntent = (hit, normalisedExpandedQuery) => {
  return hitMatchesPrimaryIntent(hit, normalisedExpandedQuery);
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

const findTargetedCategoryHit = (hits, normalisedQuery) => {
  return hits.find(
    (hit) =>
      hit.type === "category" &&
      isCategoryTargeted(
        normalisedQuery,
        normalise(hit.data.name),
        normalise(hit.data.slug),
      ),
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
    ...products.map((product) => ({
      type: "product",
      data: product,
    })),
  ];
};

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

  const productMap = new Map(
    products.map((product) => [product._id.toString(), product]),
  );
  const categoryMap = new Map(
    categories.map((category) => [category._id.toString(), category]),
  );

  return rawHits
    .map((hit) => {
      if (hit.type === "product") {
        const product = productMap.get(hit.id);
        if (!product) return null;
        return {
          type: "product",
          data: product,
        };
      }

      if (hit.type === "category") {
        const category = categoryMap.get(hit.id);
        if (!category) return null;
        return {
          type: "category",
          data: category,
        };
      }

      return null;
    })
    .filter(Boolean);
};

const getProductCategoryName = (product) => {
  if (!product?.category) return "";
  if (typeof product.category === "string") return product.category;
  return product.category.name || "";
};

const isCategoryTargeted = (query, categoryName, categorySlug = "") => {
  if (!query) return false;
  return query === categoryName || (categorySlug && query === categorySlug);
};

/**
 * Lowercases and trims a string for case-insensitive comparison.
 * Mirrors the normalise() logic in ngram.search.service.js.
 */
const normalise = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
