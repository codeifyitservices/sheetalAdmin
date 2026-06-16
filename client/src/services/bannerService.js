import { API_BASE_URL } from "./api";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
};

// 1. Get Stats (Admin)
export const getBannerStats = async () => {
  // Yahan "/banner" kar diya kyunki aapka route v1/banner hai
  const res = await fetch(`${API_BASE_URL}/banner/admin/stats`, {
    credentials: "include",
  });
  return handleResponse(res);
};

// 2. Get All Banners (Admin Table)
export const getBanners = async (page = 1, limit = 50, search = "") => {
  const res = await fetch(
    `${API_BASE_URL}/banner/admin/all?page=${page}&limit=${limit}&search=${search}`,
    { credentials: "include" },
  );
  return handleResponse(res);
};

// 3. Get Active Banners (Home Page Slider ke liye)
export const getActiveBanners = async () => {
  const res = await fetch(`${API_BASE_URL}/banner`, {
    method: "GET",
    // Home page slider public hota hai, isme credentials ki zaroorat nahi agar backend allow kare
  });
  return handleResponse(res);
};

// 4. Add Banner
export const addBanner = async (formData) => {
  const res = await fetch(`${API_BASE_URL}/banner/admin`, {
    method: "POST",
    credentials: "include",
    body: formData, // Auto boundary set karega browser
  });
  return handleResponse(res);
};

// 5. Update Banner
export const updateBanner = async (id, formData) => {
  const res = await fetch(`${API_BASE_URL}/banner/admin/${id}`, {
    method: "PUT",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res);
};

// 6. Delete Banner
export const deleteBanner = async (id) => {
  const res = await fetch(`${API_BASE_URL}/banner/admin/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse(res);
};

export const reorderBanners = async (orderedIds) => {
  const res = await fetch(`${API_BASE_URL}/banner/admin/reorder`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ orderedIds }),
  });
  return handleResponse(res);
};
