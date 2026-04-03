"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";

import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import EnquiryStatsCards from "@/components/admin/enquiry/EnquiryStatsCards";
import EnquiryFilters from "@/components/admin/enquiry/EnquiryFilters";
import EnquiryTable from "@/components/admin/enquiry/EnquiryTable";
import EnquiryModal from "@/components/admin/enquiry/EnquiryModal";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";

import {
  fetchContactEnquiries,
  deleteContactEnquiry,
  updateContactEnquiryStatus,
  deriveContactEnquiryCounts,
} from "@/services/contactEnquiryService";
import { formatEnquiryDate } from "@/services/enquiryService";

export default function ContactEnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [counts, setCounts] = useState({
    total: 0,
    new: 0,
    read: 0,
    replied: 0,
  });
  const [isExporting, setIsExporting] = useState(false);

  const abortRef = useRef(null);

  const loadEnquiries = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setIsLoading(true);
    try {
      const [filtered, all] = await Promise.all([
        fetchContactEnquiries({ status: statusFilter, search }, signal),
        fetchContactEnquiries({ status: "all" }, signal),
      ]);

      if (signal.aborted) return;

      setEnquiries(filtered);
      setCounts(deriveContactEnquiryCounts(all));
    } catch (err) {
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
      toast.error("Failed to load contact enquiries");
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => loadEnquiries(), 300);
    return () => {
      clearTimeout(timer);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadEnquiries]);

  const handleSelect = async (enquiry) => {
    setSelected(enquiry);
    if (enquiry.status === "new") {
      await handleStatusChange(enquiry._id, "read", true);
    }
  };

  const handleStatusChange = async (id, status, silent = false) => {
    setPendingAction({ id, action: "status", targetStatus: status });
    try {
      const updated = await updateContactEnquiryStatus(id, status);
      await loadEnquiries();
      if (selected?._id === id) setSelected(updated);
      if (!silent) toast.success("Status updated");
    } catch {
      if (!silent) toast.error("Failed to update status");
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async (id) => {
    setPendingAction({ id, action: "delete" });
    try {
      await deleteContactEnquiry(id);
      await loadEnquiries();
      if (selected?._id === id) setSelected(null);
      toast.success("Contact enquiry deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setPendingAction(null);
    }
  };

  const exportColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status" },
    { key: "query", label: "Query" },
    { key: "createdAt", label: "Created At" },
  ];

  const exportRows = enquiries.map((enquiry) => ({
    name: enquiry.name || "-",
    email: enquiry.email || "-",
    phone: enquiry.phone || "-",
    status: enquiry.status || "-",
    query: enquiry.query || "-",
    createdAt: formatEnquiryDate(enquiry.createdAt),
  }));

  const handleExport = async (format) => {
    if (exportRows.length === 0) return;

    setIsExporting(true);
    try {
      const filename = `contact_enquiries_${new Date().toISOString().split("T")[0]}`;
      const meta = [
        `Generated on: ${new Date().toLocaleString()}`,
        `Status filter: ${statusFilter}`,
        `Search: ${search || "None"}`,
        `Records: ${exportRows.length}`,
      ];

      if (format === "pdf") {
        await downloadPdfReport({
          filename,
          title: "Contact Enquiries Report",
          meta,
          columns: exportColumns,
          rows: exportRows,
        });
        return;
      }

      downloadCsvReport({
        filename,
        columns: exportColumns,
        rows: exportRows,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="w-full flex justify-end">
        <ReportExportMenu
          disabled={enquiries.length === 0}
          busy={isExporting}
          onExportPdf={() => handleExport("pdf")}
          onExportExcel={() => handleExport("excel")}
        />
      </div>
      <EnquiryStatsCards
        counts={counts}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
        totalLabel="All contact enquiries"
      />

      <EnquiryFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        count={enquiries.length}
        title="Contact Enquiries"
        searchPlaceholder="Search by name, email, phone or query..."
      />

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <EnquiryTable
          enquiries={enquiries}
          isLoading={isLoading}
          deletingId={
            pendingAction?.action === "delete" ? pendingAction.id : null
          }
          onSelect={handleSelect}
          onDelete={handleDelete}
          type="contact"
        />
      </div>

      {selected && (
        <EnquiryModal
          enquiry={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          pendingAction={pendingAction}
          type="contact"
        />
      )}
    </div>
  );
}
