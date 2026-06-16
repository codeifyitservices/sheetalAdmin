import axios from "axios";
import { API_BASE_URL } from "@/services/api";

/**
 * Fetches appointments with optional status filter and search query.
 * @param {{ status: string, search: string, page: number, limit: number }} params
 * @returns {Promise<Object>} API response
 */
export async function fetchAppointments({
  status = "all",
  search = "",
  page = 1,
  limit = 50,
} = {}, signal) {
  const { data } = await axios.get(`${API_BASE_URL}/appointments`, {
    params: { status, search, page, limit },
    signal,
    withCredentials: true,
  });
  if (!data.success) throw new Error("Failed to fetch appointments");
  return data;
}

/**
 * Deletes an appointment by ID.
 * @param {string} id
 */
export async function deleteAppointment(id) {
  const { data } = await axios.delete(`${API_BASE_URL}/appointments/${id}`, {
    withCredentials: true,
  });
  if (!data.success) throw new Error("Failed to delete appointment");
  return data;
}

/**
 * Updates the status of an appointment.
 * @param {string} id
 * @param {string} status - "pending" | "confirmed" | "cancelled"
 * @param {Object} extraData - Additional data like appointmentDate and appointmentTime
 * @returns {Promise<Object>} updated appointment
 */
export async function updateAppointmentStatus(id, status, extraData = {}) {
  const { data } = await axios.patch(
    `${API_BASE_URL}/appointments/${id}/status`,
    { status, ...extraData },
    { withCredentials: true },
  );
  if (!data.success) throw new Error("Failed to update status");
  return data.appointment;
}

/**
 * Updates the notes for an appointment.
 * @param {string} id
 * @param {string} notes
 * @returns {Promise<Object>} updated appointment
 */
export async function updateAppointmentNotes(id, notes) {
  const { data } = await axios.patch(
    `${API_BASE_URL}/appointments/${id}/notes`,
    { notes },
    { withCredentials: true },
  );
  if (!data.success) throw new Error("Failed to update notes");
  return data.appointment;
}

/**
 * Derives status counts from an array of appointments.
 * @param {Object[]} appointments
 * @returns {{ total: number, pending: number, confirmed: number, cancelled: number }}
 */
export function deriveAppointmentCounts(appointments) {
  return {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
  };
}
