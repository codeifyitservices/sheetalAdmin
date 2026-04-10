import { API_BASE_URL } from "./api";

// ── Admin ──────────────────────────────────────────────────────

export const getCoupons = async (page = 1, limit = 10, search = "") => {
  const res = await fetch(
    `${API_BASE_URL}/coupons/admin/all?page=${page}&limit=${limit}&search=${search}`,
    { credentials: "include" },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch coupons");
  return data;
};

export const getCouponStats = async () => {
  const res = await fetch(`${API_BASE_URL}/coupons/admin/stats`, {
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch stats");
  return data;
};

export const addCoupon = async (couponData) => {
  const res = await fetch(`${API_BASE_URL}/coupons/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(couponData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to add coupon");
  return data;
};

export const updateCoupon = async (id, couponData) => {
  const res = await fetch(`${API_BASE_URL}/coupons/admin/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(couponData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update coupon");
  return data;
};

export const deleteCoupon = async (id) => {
  const res = await fetch(`${API_BASE_URL}/coupons/admin/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to delete coupon");
  }
  return true;
};

// ── Public ─────────────────────────────────────────────────────

export const applyCoupon = async (code, cartTotal, cartItems = []) => {
  const res = await fetch(`${API_BASE_URL}/coupons/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code, cartTotal, cartItems }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Invalid or Expired Coupon");
  return data;
};

// Returns the single coupon with showOnHomepage: true, or null.
// Dedicated endpoint — never limited by local pagination.
export const getHomepageCoupon = async () => {
  const res = await fetch(`${API_BASE_URL}/coupons/homepage`, {
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch homepage coupon");
  return data;
};

// Returns the single coupon with showOnLoginPage: true, or null.
export const getLoginCoupon = async () => {
  const res = await fetch(`${API_BASE_URL}/coupons/login`, {
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch login coupon");
  return data;
};

export const pushCouponToAbandonedCarts = async (couponId) => {
  const res = await fetch(`${API_BASE_URL}/abandoned-carts/push-coupon`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ couponId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to push coupon");
  return data;
};