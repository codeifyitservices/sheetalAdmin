import { API_BASE_URL } from "./api";

export const getDashboardStats = async (startDate, endDate) => {
  const query = new URLSearchParams();
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const url = query.toString()
    ? `${API_BASE_URL}/admin/dashboard-stats?${query}`
    : `${API_BASE_URL}/admin/dashboard-stats`;

  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  return res.json();
};

export const updatePassword = async (newPassword) => {
  const res = await fetch(`${API_BASE_URL}/admin/change-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ newPassword }),
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to update password");
  }
  return res.json();
};
