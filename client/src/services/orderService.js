import { API_BASE_URL } from "./api";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
};

export const getAllOrders = async (
  page = 1,
  limit = 10,
  status = "",
  startDate = "",
  endDate = "",
) => {
  let url = `${API_BASE_URL}/orders/admin/all?page=${page}&limit=${limit}`;
  if (status) url += `&status=${status}`;
  if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
  if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
};

export const updateOrderStatus = async (orderId, updateData) => {
  const res = await fetch(`${API_BASE_URL}/orders/admin/update/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(updateData), // status, trackingId, courierPartner
  });

  return handleResponse(res);
};

export const getAdminOrderById = async (orderId) => {
  const res = await fetch(`${API_BASE_URL}/orders/admin/${orderId}`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
};

export const getOrderStats = async (startDate = "", endDate = "") => {
  const query = new URLSearchParams();
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const url = query.toString()
    ? `${API_BASE_URL}/orders/admin/stats?${query}`
    : `${API_BASE_URL}/orders/admin/stats`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
};

export const createOrder = async (orderData) => {
  const res = await fetch(`${API_BASE_URL}/orders/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(orderData),
  });

  return handleResponse(res);
};

/**
 * Triggers AWB assignment for an order that has already been pushed to Shiprocket.
 * @param {string} orderId - Our MongoDB order _id
 * @param {number|null} courierId - Optional Shiprocket courier company ID (null = auto)
 */
export const assignAwb = async (orderId, courierId = null) => {
  const res = await fetch(`${API_BASE_URL}/orders/admin/assign-awb/${orderId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(courierId ? { courierId } : {}),
  });
  return handleResponse(res);
};

export const getMyOrders = async (page = 1) => {
  const res = await fetch(`${API_BASE_URL}/orders/my-orders?page=${page}`, {
    method: "GET",
    credentials: "include",
  });
  return handleResponse(res);
};

