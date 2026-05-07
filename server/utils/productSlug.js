export const sanitizeProductSlug = (value) => {
  const base = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "product";
};

export const buildSlugConflictQuery = (slug, excludeProductId = null) => {
  const query = {
    $or: [{ slug }, { previousSlugs: slug }],
  };

  if (excludeProductId) {
    query._id = { $ne: excludeProductId };
  }

  return query;
};

export const generateUniqueProductSlug = async (
  ProductModel,
  rawValue,
  options = {},
) => {
  const { excludeProductId = null, reservedSlugs = new Set() } = options;
  const baseSlug = sanitizeProductSlug(rawValue);
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    if (!reservedSlugs.has(candidate)) {
      const existing = await ProductModel.exists(
        buildSlugConflictQuery(candidate, excludeProductId),
      );
      if (!existing) {
        reservedSlugs.add(candidate);
        return candidate;
      }
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};
