import { API_BASE_URL } from "./api";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
};

export const getProducts = async (
  page = 1,
  limit = 10,
  search = "",
  category = "",
  sort = "",
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) params.set("search", search);
  if (category && category !== "all") params.set("category", category);
  if (sort) params.set("sort", sort);

  const res = await fetch(
    `${API_BASE_URL}/products/all?${params.toString()}`,
    { credentials: "include" },
  );
  return handleResponse(res);
};

export const createProduct = async (formData) => {
  const res = await fetch(`${API_BASE_URL}/products/admin/new`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res);
};

export const updateProduct = async (id, formData) => {
  const res = await fetch(`${API_BASE_URL}/products/admin/${id}`, {
    method: "PUT",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res);
};

export const deleteProduct = async (id) => {
  const res = await fetch(`${API_BASE_URL}/products/admin/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse(res);
};

export const getProductStats = async () => {
  const res = await fetch(`${API_BASE_URL}/products/admin/stats`, {
    credentials: "include",
  });
  return handleResponse(res);
};

export const bulkImportProducts = async (formData) => {
  const res = await fetch(`${API_BASE_URL}/products/admin/import`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res);
};

export const downloadSampleExcel = async () => {
  const res = await fetch(`${API_BASE_URL}/products/admin/sample-excel`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to download sample file");
  return res.blob();
};

export const getProductDetails = async (id) => {
  const res = await fetch(`${API_BASE_URL}/products/detail/${id}`, {
    credentials: "include",
  });
  return handleResponse(res);
};

export const getLowStockProducts = async () => {
  const res = await fetch(`${API_BASE_URL}/products/admin/low-stock`, {
    credentials: "include",
  });
  return handleResponse(res);
};

export const getAdminReviews = async (page = 1, limit = 10, status = "all") => {
  const res = await fetch(
    `${API_BASE_URL}/products/admin/reviews?page=${page}&limit=${limit}&status=${status}`,
    { credentials: "include" }
  );
  return handleResponse(res);
};

export const updateReviewStatusAdmin = async (id, data) => {
  const res = await fetch(`${API_BASE_URL}/products/admin/reviews/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const deleteReviewAdmin = async (id) => {
  const res = await fetch(`${API_BASE_URL}/products/admin/reviews?id=${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse(res);
};

export const incrementProductView = async (slug) => {
  try {
    await fetch(`${API_BASE_URL}/products/view/${slug}`, { method: "PATCH" });
  } catch (err) {
    // Silent fail — don't block UX for a view count
    console.error("View increment failed:", err);
  }
};

// Admin dashboard
export const getMostViewedProducts = async (
  limit = 5,
  periodOrOptions = "overall",
  refDate = "",
) => {
  const query = new URLSearchParams({ limit: String(limit) });

  if (typeof periodOrOptions === "object" && periodOrOptions !== null) {
    const { period, refDate: nextRefDate, startDate, endDate } = periodOrOptions;
    if (period) query.set("period", period);
    if (nextRefDate) query.set("refDate", nextRefDate);
    if (startDate) query.set("startDate", startDate);
    if (endDate) query.set("endDate", endDate);
  } else {
    query.set("period", periodOrOptions);
    if (refDate) query.set("refDate", refDate);
  }

  const res = await fetch(`${API_BASE_URL}/products/admin/most-viewed?${query}`, {
    credentials: "include",
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.items;
};

// ── Updated: accepts an optional `starred` boolean to SET state explicitly.
// ── When undefined (single-item toggle), the backend falls back to toggling.
export const starProduct = async (id, starred) => {
  const res = await fetch(`${API_BASE_URL}/products/admin/${id}/star`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    // Only send body when a specific state is requested
    body: JSON.stringify(starred !== undefined ? { starred } : {}),
  });
  return res.json();
};