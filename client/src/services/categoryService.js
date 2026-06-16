import { API_BASE_URL } from "./api";

// Helper function to handle response (DRY Principle)
const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
};

/* =========================
   Get Categories (Admin)
   ========================= */
export const getCategories = async (page = 1, limit = 50, search = "") => {
  const res = await fetch(
    `${API_BASE_URL}/categories/admin/all?page=${page}&limit=${limit}&search=${search}`,
    { credentials: "include" },
  );
  return handleResponse(res);
};

/* =========================
   Get All Categories (Public)
   ========================= */
export const fetchAllCategories = async () => {
  const res = await fetch(`${API_BASE_URL}/categories`, {
    headers: { "Content-Type": "application/json" }
  });
  return handleResponse(res);
};

/* =========================
   Add Category (Handles Files)
   ========================= */
export const addCategory = async (formData) => {
  // NOTE: Jab hum FormData bhejte hain, toh "Content-Type" header
  // manually set NAHI karte, browser khud boundary set karta hai.
  const res = await fetch(`${API_BASE_URL}/categories/admin`, {
    method: "POST",
    credentials: "include",
    body: formData, // JSON.stringify nahi, seedha formData
  });

  return handleResponse(res);
};

/* =========================
   Update Category
   ========================= */
export const updateCategory = async (id, formData) => {
  const res = await fetch(`${API_BASE_URL}/categories/admin/${id}`, {
    method: "PUT",
    credentials: "include",
    body: formData, // Direct FormData for image support
  });

  return handleResponse(res);
};

/* =========================
   Delete Category
   ========================= */
export const deleteCategory = async (id) => {
  const res = await fetch(`${API_BASE_URL}/categories/admin/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  return handleResponse(res);
};

/* =========================
   Reorder Categories
   ========================= */
export const reorderCategories = async (orderedIds) => {
  const res = await fetch(`${API_BASE_URL}/categories/admin/reorder`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ orderedIds }),
  });
  return handleResponse(res);
};

/* =========================
   Get Category Stats
   ========================= */
export const getCategoryStats = async () => {
  const res = await fetch(`${API_BASE_URL}/categories/admin/stats`, {
    credentials: "include",
  });
  return handleResponse(res);
};
