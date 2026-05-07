import axios from "axios";
import { API_BASE_URL } from "@/services/api";

export async function fetchSubscribers(signal) {
  const { data } = await axios.get(`${API_BASE_URL}/newsletter`, {
    signal,
    withCredentials: true,
  });

  if (!data.success) {
    throw new Error("Failed to fetch subscribers");
  }

  return data.subscribers || [];
}

export async function updateSubscriberStatus(id, status) {
  const { data } = await axios.patch(
    `${API_BASE_URL}/newsletter/${id}`,
    { status },
    { withCredentials: true },
  );

  if (!data.success) {
    throw new Error("Failed to update subscriber status");
  }

  return data;
}

export async function deleteSubscriber(id) {
  const { data } = await axios.delete(`${API_BASE_URL}/newsletter/${id}`, {
    withCredentials: true,
  });

  if (!data.success) {
    throw new Error("Failed to delete subscriber");
  }

  return data;
}

export function formatSubscriberDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
