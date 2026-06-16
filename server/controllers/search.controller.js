import asyncHandler from "express-async-handler";
import { searchService } from "../services/search.service.js";
import { rebuildIndex } from "../services/ngram.search.service.js";

/**
 * GET /api/v1/search?q=<query>&limit=<n>&page=<n>
 * Searches products and categories using the n-gram index.
 */
export const searchController = asyncHandler(async (req, res) => {
  const { q, limit = 50, page = 1 } = req.query;

  if (!q) {
    res
      .status(400)
      .json({ success: false, message: "Search query 'q' is required." });
    return;
  }

  const results = await searchService({
    query: q,
    limit: parseInt(limit),
    page: parseInt(page),
  });

  res.status(200).json({
    success: true,
    results,
  });
});

/**
 * POST /api/v1/search/rebuild-index  (admin only)
 * Triggers a full rebuild of the in-memory n-gram index from MongoDB.
 * Useful after bulk imports or data migrations.
 */
export const rebuildIndexController = asyncHandler(async (req, res) => {
  const result = await rebuildIndex();
  res.status(200).json({
    success: true,
    message: "N-gram index rebuilt successfully.",
    stats: result,
  });
});
