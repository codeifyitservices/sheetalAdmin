import { API_BASE_URL } from "./api";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
};

export const getBlogs = async (
  page = 1,
  limit = 50,
  search = "",
  status = "",
) => {
  const res = await fetch(
    `${API_BASE_URL}/blogs/admin/all?page=${page}&limit=${limit}&search=${search}&status=${status}`,
    { credentials: "include" },
  );
  return handleResponse(res);
};

export const addBlog = async (formData) => {
  const res = await fetch(`${API_BASE_URL}/blogs/admin`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res);
};

export const updateBlog = async (id, formData) => {
  const res = await fetch(`${API_BASE_URL}/blogs/admin/${id}`, {
    method: "PUT",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res);
};

export const deleteBlog = async (id) => {
  const res = await fetch(`${API_BASE_URL}/blogs/admin/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse(res);
};

export const getBlogStats = async () => {
  const res = await fetch(`${API_BASE_URL}/blogs/admin/stats`, {
    credentials: "include",
  });
  return handleResponse(res);
};

export const reorderBlogs = async (reorderedIds) => {
  const res = await fetch(`${API_BASE_URL}/blogs/admin/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reorderedIds }),
  });
  return handleResponse(res);
};

export const getSingleBlog = async (slug) => {
  const res = await fetch(`${API_BASE_URL}/blogs/post/${slug}`);
  return handleResponse(res);
};
