import { API_BASE_URL } from "./api";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
};

export const getBestSellingItems = async ({ limit } = {}) => {
  const query = new URLSearchParams();
  if (limit != null) query.set("limit", limit);

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
export const getChartData = async ({ period, startDate, endDate } = {}) => {
  const query = new URLSearchParams();
  if (period) query.set("period", period);
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
export const getRevenueData = async ({ period, startDate, endDate } = {}) => {
  const query = new URLSearchParams();
  if (period) query.set("period", period);
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
export const getSalesData = async ({ period, startDate, endDate } = {}) => {
  const query = new URLSearchParams();
  if (period) query.set("period", period);
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const res = await fetch(`${API_BASE_URL}/sales/get-sales?${query}`, {
    credentials: "include",
  });
  return handleResponse(res);
};

export const getAbandonedCarts = async (limit = 10) => {
  const res = await fetch(`${API_BASE_URL}/sales/abandoned-carts?limit=${limit}`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
};
