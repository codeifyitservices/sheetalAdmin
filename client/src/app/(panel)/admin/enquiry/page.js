"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";

import EnquiryStatsCards from "@/components/admin/enquiry/EnquiryStatsCards";
import EnquiryFilters from "@/components/admin/enquiry/EnquiryFilters";
import EnquiryTable from "@/components/admin/enquiry/EnquiryTable";
import EnquiryModal from "@/components/admin/enquiry/EnquiryModal";

import {
  fetchEnquiries,
  deleteEnquiry,
  updateEnquiryStatus,
  sendAvailabilityEmail,
  deriveEnquiryCounts
} from "@/services/enquiryService";

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [counts, setCounts] = useState({ total: 0, new: 0, read: 0, replied: 0 });

  // Ref holds the AbortController for the in-flight fetch pair so we can
  // cancel it the moment a newer search/filter change comes in.
  const abortRef = useRef(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadEnquiries = useCallback(async () => {
    // Cancel any previous in-flight request before starting a new one.
    // This prevents an older slow response from overwriting newer state.
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setIsLoading(true);
    try {
      const [filtered, all] = await Promise.all([
        fetchEnquiries({ status: statusFilter, search }, signal),
        fetchEnquiries({ status: "all" }, signal),
      ]);

      // If this request was aborted (a newer one started), do not commit.
      if (signal.aborted) return;

      setEnquiries(filtered);
      setCounts(deriveEnquiryCounts(all));
    } catch (err) {
      // AbortError is expected when we cancel — don't surface it as a toast.
      if (err.name === "AbortError") return;
      toast.error("Failed to load enquiries");
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => loadEnquiries(), 300);
    return () => {
      clearTimeout(timer);
      // Also abort if the component unmounts mid-flight.
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadEnquiries]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelect = async (enquiry) => {
    setSelected(enquiry);
    if (enquiry.status === "new") {
      await handleStatusChange(enquiry._id, "read", true);
    }
  };

  const handleStatusChange = async (id, status, silent = false) => {
    setUpdatingId(id);
    try {
      const updated = await updateEnquiryStatus(id, status);
      await loadEnquiries()
      if (selected?._id === id) setSelected(updated);
      if (!silent) toast.success("Status updated");
    } catch {
      if (!silent) toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteEnquiry(id);
      await loadEnquiries()
      if (selected?._id === id) setSelected(null);
      toast.success("Enquiry deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendAvailability = async (enquiry) => {
    setSendingId(enquiry._id);
    try {
      await sendAvailabilityEmail(enquiry._id);
      await handleStatusChange(enquiry._id, "replied", true);
      toast.success("Availability email sent!");
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSendingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <EnquiryStatsCards
        counts={counts}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      <EnquiryFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        count={enquiries.length}
      />

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <EnquiryTable
          enquiries={enquiries}
          isLoading={isLoading}
          deletingId={deletingId}
          onSelect={handleSelect}
          onDelete={handleDelete}
        />
      </div>

      {selected && (
        <EnquiryModal
          enquiry={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onSendAvailability={handleSendAvailability}
          updatingId={updatingId}
          deletingId={deletingId}
          sendingId={sendingId}
        />
      )}
    </div>
  );
}
