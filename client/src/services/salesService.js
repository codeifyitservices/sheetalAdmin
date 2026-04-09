import { API_BASE_URL } from "./api";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
};

export const getBestSellingItems = async ({
  limit,
  period,
  refDate,
  startDate,
  endDate,
} = {}) => {
  const query = new URLSearchParams();
  if (limit != null) query.set("limit", limit);
  if (period) query.set("period", period);
  if (refDate) query.set("refDate", refDate);
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const url = query.toString()
    ? `${API_BASE_URL}/sales/best-selling?${query}`
    : `${API_BASE_URL}/sales/best-selling`;

  const res = await fetch(url, {
    credentials: "include",
  });
  return handleResponse(res);
};

/**
 * Fetch combined sales + revenue chart data.
 */
export const getChartData = async ({ period, startDate, endDate, refDate } = {}) => {
  const query = new URLSearchParams();
  if (period) query.set("period", period);
  if (refDate) query.set("refDate", refDate);
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const res = await fetch(`${API_BASE_URL}/sales/get-chart?${query}`, {
    credentials: "include",
  });
  return handleResponse(res);
};

/**
 * Fetch revenue-only data (breakdown: itemsRevenue, tax, shipping).
 */
export const getRevenueData = async ({ period, startDate, endDate, refDate } = {}) => {
  const query = new URLSearchParams();
  if (period) query.set("period", period);
  if (refDate) query.set("refDate", refDate);
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const res = await fetch(`${API_BASE_URL}/sales/get-revenue?${query}`, {
    credentials: "include",
  });
  return handleResponse(res);
};

/**
 * Fetch sales-only data (order counts, units sold).
 */
export const getSalesData = async ({ period, startDate, endDate, refDate } = {}) => {
  const query = new URLSearchParams();
  if (period) query.set("period", period);
  if (refDate) query.set("refDate", refDate);
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const res = await fetch(`${API_BASE_URL}/sales/get-sales?${query}`, {
    credentials: "include",
  });
  return handleResponse(res);
};

export const getAbandonedCarts = async (
  limitOrOptions = 10,
  includeRecovered = false,
) => {
  const options =
    typeof limitOrOptions === "object" && limitOrOptions !== null
      ? limitOrOptions
      : { limit: limitOrOptions, includeRecovered };

  const query = new URLSearchParams();
  if (options.limit != null) query.set("limit", options.limit);
  if (options.includeRecovered) query.set("includeRecovered", "true");
  if (options.startDate) query.set("startDate", options.startDate);
  if (options.endDate) query.set("endDate", options.endDate);

  const url = query.toString()
    ? `${API_BASE_URL}/sales/abandoned-carts?${query}`
    : `${API_BASE_URL}/sales/abandoned-carts`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
};
