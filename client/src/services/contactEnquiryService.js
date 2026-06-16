import axios from "axios";
import { API_BASE_URL } from "@/services/api";

export async function submitContactEnquiry(payload) {
  const { data } = await axios.post(
    `${API_BASE_URL}/contact-enquiries`,
    payload,
    { withCredentials: true },
  );
  if (!data.success) throw new Error("Failed to submit contact enquiry");
  return data.contactEnquiry;
}

export async function fetchContactEnquiries(
  { status = "all", search = "", page = 1, limit = 50 } = {},
  signal,
) {
  const { data } = await axios.get(`${API_BASE_URL}/contact-enquiries`, {
    params: { status, search, page, limit },
    signal,
    withCredentials: true,
  });
  if (!data.success) throw new Error("Failed to fetch contact enquiries");
  return data;
}

export async function deleteContactEnquiry(id) {
  const { data } = await axios.delete(`${API_BASE_URL}/contact-enquiries/${id}`, {
    withCredentials: true,
  });
  if (!data.success) throw new Error("Failed to delete contact enquiry");
  return data;
}

export async function updateContactEnquiryStatus(id, status, reply) {
  const { data } = await axios.patch(
    `${API_BASE_URL}/contact-enquiries/${id}/status`,
    { status, reply },
    { withCredentials: true },
  );
  if (!data.success) throw new Error("Failed to update contact enquiry status");
  return data.contactEnquiry;
}

export function deriveContactEnquiryCounts(contactEnquiries) {
  return {
    total: contactEnquiries.length,
    new: contactEnquiries.filter((enquiry) => enquiry.status === "new").length,
    read: contactEnquiries.filter((enquiry) => enquiry.status === "read").length,
    replied: contactEnquiries.filter((enquiry) => enquiry.status === "replied").length,
  };
}
