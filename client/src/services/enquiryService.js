import axios from "axios";
import { API_BASE_URL } from "@/services/api";

/**
 * Fetches enquiries with optional status filter and search query.
 * @param {{ status: string, search: string, page: number, limit: number }} params
 * @returns {Promise<Object>} API response
 */
export async function fetchEnquiries({
  status = "all",
  search = "",
  startDate = "",
  endDate = "",
  page = 1,
  limit = 50,
} = {}, signal) {
  const params = { status, search, page, limit };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const { data } = await axios.get(`${API_BASE_URL}/enquiry`, {
    params,
    signal,
    withCredentials: true,
  });
  if (!data.success) throw new Error("Failed to fetch enquiries");
  return data;
}

/**
 * Deletes an enquiry by ID.
 * @param {string} id
 */
export async function deleteEnquiry(id) {
  const { data } = await axios.delete(`${API_BASE_URL}/enquiry/${id}`, {
    withCredentials: true,
  });
  if (!data.success) throw new Error("Failed to delete enquiry");
  return data;
}

/**
 * Updates the status of an enquiry.
 * @param {string} id
 * @param {string} status - "new" | "read" | "replied"
 * @returns {Promise<Object>} updated enquiry
 */
export async function updateEnquiryStatus(id, status) {
  const { data } = await axios.patch(
    `${API_BASE_URL}/enquiry/${id}/status`,
    { status },
    { withCredentials: true },
  );
  if (!data.success) throw new Error("Failed to update status");
  return data.enquiry;
}

/**
 * Sends a product availability email to the customer.
 * Marks the enquiry as "replied" on the backend.
 * @param {string} enquiryId
 */
export async function sendAvailabilityEmail(enquiryId) {
  const { data } = await axios.post(
    `${API_BASE_URL}/enquiry/${enquiryId}/send-availability`,
    {},
    { withCredentials: true },
  );
  if (!data.success) throw new Error("Failed to send availability email");
  return data;
}

/**
 * Derives status counts from an array of enquiries.
 * @param {Object[]} enquiries
 * @returns {{ total: number, new: number, read: number, replied: number }}
 */
export function deriveEnquiryCounts(enquiries) {
  return {
    total: enquiries.length,
    new: enquiries.filter((e) => e.status === "new").length,
    read: enquiries.filter((e) => e.status === "read").length,
    replied: enquiries.filter((e) => e.status === "replied").length,
  };
}

/**
 * Formats an ISO date string for display.
 * @param {string} iso
 * @returns {string}
 */
export function formatEnquiryDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
