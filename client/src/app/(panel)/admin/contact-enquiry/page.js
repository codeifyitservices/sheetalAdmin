"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";

import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import EnquiryStatsCards from "@/components/admin/enquiry/EnquiryStatsCards";
import EnquiryFilters from "@/components/admin/enquiry/EnquiryFilters";
import EnquiryTable from "@/components/admin/enquiry/EnquiryTable";
import EnquiryModal from "@/components/admin/enquiry/EnquiryModal";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEnquiries, setTotalEnquiries] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

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
      const [filteredData, allData] = await Promise.all([
        fetchContactEnquiries({
          status: statusFilter,
          search,
          page: currentPage,
          limit: rowsPerPage
        }, signal),
        fetchContactEnquiries({ status: "all", limit: 1000 }, signal),
      ]);

      if (signal.aborted) return;

      setEnquiries(filteredData.contactEnquiries);
      setTotalPages(filteredData.pagination.totalPages);
      setTotalEnquiries(filteredData.pagination.totalEnquiries);
      setCounts(deriveContactEnquiryCounts(allData.contactEnquiries));
    } catch (err) {
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
      toast.error("Failed to load contact enquiries");
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, [statusFilter, search, currentPage, rowsPerPage]);

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
      <div className="flex w-full justify-end">
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
        onFilterChange={(s) => { setStatusFilter(s); setCurrentPage(1); }}
        totalLabel="All contact enquiries"
      />

      <EnquiryFilters
        search={search}
        onSearchChange={(s) => { setSearch(s); setCurrentPage(1); }}
        statusFilter={statusFilter}
        onStatusFilterChange={(s) => { setStatusFilter(s); setCurrentPage(1); }}
        count={totalEnquiries}
        title="Contact Enquiries"
        searchPlaceholder="Search by name, email, phone or query..."
      />

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <EnquiryTable
          enquiries={enquiries}
          isLoading={isLoading}
          deletingId={pendingAction?.action === "delete" ? pendingAction.id : null}
          onSelect={handleSelect}
          onDelete={handleDelete}
        />

        {/* Pagination UI */}
        {!isLoading && totalEnquiries > 0 && (
          <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                Rows per page
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 text-xs font-bold text-slate-700 py-1 px-2 rounded-md outline-none cursor-pointer"
              >
                {[10, 20, 50, 100].map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-[11px] font-medium text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {(currentPage - 1) * rowsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(currentPage * rowsPerPage, totalEnquiries)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900">
                  {totalEnquiries}
                </span>{" "}
                results
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1 || isLoading}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="p-2 border border-slate-200 rounded-lg cursor-pointer bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-colors"
                >
                  <ChevronLeft size={16} className="text-slate-600" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => {
                      if (
                        totalPages > 5 &&
                        page !== 1 &&
                        page !== totalPages &&
                        Math.abs(page - currentPage) > 1
                      ) {
                        if (Math.abs(page - currentPage) === 2) {
                          return <span key={page} className="text-slate-400">...</span>;
                        }
                        return null;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all ${
                            currentPage === page
                              ? "bg-slate-900 text-white shadow-md"
                              : "bg-white border border-slate-100 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  disabled={currentPage >= totalPages || isLoading}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="p-2 border border-slate-200 rounded-lg cursor-pointer bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-colors"
                >
                  <ChevronRight size={16} className="text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <EnquiryModal
          enquiry={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          pendingAction={pendingAction}
        />
      )}
    </div>
  );
}
