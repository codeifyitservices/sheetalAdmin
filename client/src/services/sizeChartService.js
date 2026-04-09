import { API_BASE_URL } from "./api";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
};

export const getSizeCharts = async () => {
  const res = await fetch(`${API_BASE_URL}/size-chart`, {
    credentials: "include",
  });
  return handleResponse(res);
};

export const getSizeChart = async (id) => {
  const res = await fetch(`${API_BASE_URL}/size-chart/${id}`, {
    credentials: "include",
  });
  return handleResponse(res);
};

export const createSizeChart = async (chartData) => {
  const res = await fetch(`${API_BASE_URL}/size-chart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(chartData),
  });
  return handleResponse(res);
};

export const updateSizeChart = async (id, chartData) => {
  const res = await fetch(`${API_BASE_URL}/size-chart/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(chartData),
  });
  return handleResponse(res);
};

export const deleteSizeChart = async (id) => {
  const res = await fetch(`${API_BASE_URL}/size-chart/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse(res);
};

export const uploadHowToMeasureImage = async (id, formData) => {
  const res = await fetch(`${API_BASE_URL}/size-chart/${id}/how-to-measure`, {
    method: "PUT",
    credentials: "include",
    body: formData,
  });
  return handleResponse(res);
};

export const addSizeChartRow = async (id, rowData) => {
  const res = await fetch(`${API_BASE_URL}/size-chart/${id}/rows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(rowData),
  });
  return handleResponse(res);
};

export const updateSizeChartRow = async (chartId, rowId, rowData) => {
  const res = await fetch(`${API_BASE_URL}/size-chart/${chartId}/rows/${rowId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(rowData),
  });
  return handleResponse(res);
};

export const deleteSizeChartRow = async (chartId, rowId) => {
  const res = await fetch(`${API_BASE_URL}/size-chart/${chartId}/rows/${rowId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse(res);
};
