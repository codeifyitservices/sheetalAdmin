"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Mail, RefreshCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import DateRangeControl from "@/components/admin/common/DateRangeControl";
import PageHeader from "@/components/admin/layout/PageHeader";
import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import DeleteConfirmModal from "@/components/admin/common/DeleteConfirmModal";
import { useDateRange } from "@/hooks/useDateRange";
import {
  deleteSubscriber,
  fetchSubscribers,
  formatSubscriberDate,
  updateSubscriberStatus,
} from "@/services/newsletterService";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";

const STATUS_OPTIONS = ["All", "New", "Added"];

const SORT_OPTIONS = [
  { value: "latest", label: "Latest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "new", label: "New first" },
  { value: "added", label: "Added first" },
];

const STATUS_STYLES = {
  New: "bg-amber-50 text-amber-700 border-amber-200",
  Added: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_PRIORITY = {
  new: { New: 0, Added: 1 },
  added: { Added: 0, New: 1 },
};

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("latest");
  const [pendingAction, setPendingAction] = useState(null);
  const [subscriberToDelete, setSubscriberToDelete] = useState(null);
  const [isExporting, setIsExporting] = useState(null);
  const {
    rangeType,
    setRangeType,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dateRange,
    dateRangeLabel,
  } = useDateRange("last_30_days");

  const abortRef = useRef(null);

  const loadSubscribers = async (signal) => {
    setIsLoading(true);
    try {
      const data = await fetchSubscribers(signal);
      if (signal?.aborted) return;
      setSubscribers(data);
    } catch (error) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") return;
      toast.error("Failed to load newsletter subscribers");
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    void loadSubscribers(controller.signal);

    return () => controller.abort();
  }, []);

  const visibleSubscribers = useMemo(() => {
    const filtered =
      statusFilter === "All"
        ? [...subscribers]
        : subscribers.filter((subscriber) => subscriber.status === statusFilter);

    const startTime = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
    const endTime = new Date(dateRange.endDate).setHours(23, 59, 59, 999);

    const dateFiltered = filtered.filter((subscriber) => {
      const createdTime = new Date(subscriber.createdAt).getTime();
      return !Number.isNaN(createdTime) && createdTime >= startTime && createdTime <= endTime;
    });

    if (sortBy === "latest" || sortBy === "oldest") {
      dateFiltered.sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortBy === "latest" ? -diff : diff;
      });
      return dateFiltered;
    }

    const priority = STATUS_PRIORITY[sortBy] || STATUS_PRIORITY.new;
    dateFiltered.sort((a, b) => {
      const rankDiff = (priority[a.status] ?? 99) - (priority[b.status] ?? 99);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return dateFiltered;
  }, [dateRange.endDate, dateRange.startDate, sortBy, statusFilter, subscribers]);

  const counts = useMemo(
    () => ({
      total: subscribers.length,
      new: subscribers.filter((item) => item.status === "New").length,
      added: subscribers.filter((item) => item.status === "Added").length,
    }),
    [subscribers],
  );

  const handleStatusUpdate = async (id, status) => {
    setPendingAction({ id, type: status });
    try {
      await updateSubscriberStatus(id, status);
      setSubscribers((current) =>
        current.map((subscriber) =>
          subscriber._id === id ? { ...subscriber, status } : subscriber,
        ),
      );
      toast.success(`Subscriber marked as ${status.toLowerCase()}`);
    } catch {
      toast.error("Failed to update subscriber status");
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!subscriberToDelete?._id) return;

    setPendingAction({ id: subscriberToDelete._id, type: "delete" });
    try {
      await deleteSubscriber(subscriberToDelete._id);
      setSubscribers((current) =>
        current.filter((subscriber) => subscriber._id !== subscriberToDelete._id),
      );
      toast.success("Subscriber deleted");
      setSubscriberToDelete(null);
    } catch {
      toast.error("Failed to delete subscriber");
    } finally {
      setPendingAction(null);
    }
  };

  const handleExportExcel = async () => {
    if (!visibleSubscribers.length) {
      toast.error("No subscribers to export");
      return;
    }

    setIsExporting("excel");
    try {
      downloadCsvReport({
        filename: `newsletter_subscribers_${rangeType}_${new Date().toISOString().split("T")[0]}`,
        columns: [
          { key: "email", label: "Email" },
          { key: "status", label: "Status" },
          { key: "createdAt", label: "Subscribed On" },
        ],
        rows: visibleSubscribers.map((subscriber) => ({
          email: subscriber.email,
          status: subscriber.status,
          createdAt: formatSubscriberDate(subscriber.createdAt),
        })),
      });
      toast.success("Excel export downloaded");
    } catch {
      toast.error("Failed to export Excel file");
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (!visibleSubscribers.length) {
      toast.error("No subscribers to export");
      return;
    }

    setIsExporting("pdf");
    try {
      await downloadPdfReport({
        filename: `newsletter_subscribers_${rangeType}_${new Date().toISOString().split("T")[0]}`,
        title: "Newsletter Subscribers",
        meta: [
          `Date Range: ${dateRangeLabel}`,
          `Generated on: ${new Date().toLocaleString()}`,
          `Subscribers: ${visibleSubscribers.length}`,
        ],
        columns: [
          { key: "email", label: "Email" },
          { key: "status", label: "Status" },
          { key: "createdAt", label: "Subscribed On" },
        ],
        rows: visibleSubscribers.map((subscriber) => ({
          email: subscriber.email,
          status: subscriber.status,
          createdAt: formatSubscriberDate(subscriber.createdAt),
        })),
      });
      toast.success("PDF export downloaded");
    } catch {
      toast.error("Failed to export PDF file");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Newsletter Subscribers"
        subtitle={dateRangeLabel}
        action={
          <div className="flex items-center gap-2">
            <ReportExportMenu
              disabled={isLoading || visibleSubscribers.length === 0}
              busy={isExporting !== null}
              onExportPdf={handleExportPdf}
              onExportExcel={handleExportExcel}
            />
            <button
              type="button"
              onClick={() => void loadSubscribers(abortRef.current?.signal)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <DateRangeControl
          rangeType={rangeType}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onRangeTypeChange={setRangeType}
          onCustomStartDateChange={setCustomStartDate}
          onCustomEndDateChange={setCustomEndDate}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Subscribers" value={counts.total} tone="slate" />
        <StatCard label="New" value={counts.new} tone="amber" />
        <StatCard label="Added" value={counts.added} tone="emerald" />
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FilterField
            label="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />
          <FilterField
            label="Sort"
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS.map((option) => option.value)}
            optionLabels={Object.fromEntries(
              SORT_OPTIONS.map((option) => [option.value, option.label]),
            )}
          />
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
          Showing {visibleSubscribers.length} of {counts.total} subscribers
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-sm text-slate-500">
                    Loading subscribers...
                  </td>
                </tr>
              ) : visibleSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-sm text-slate-500">
                    No newsletter subscribers found.
                  </td>
                </tr>
              ) : (
                visibleSubscribers.map((subscriber) => {
                  const isBusy = pendingAction?.id === subscriber._id;

                  return (
                    <tr
                      key={subscriber._id}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                            <Mail size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {subscriber.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">
                        {formatSubscriberDate(subscriber.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                            STATUS_STYLES[subscriber.status] ||
                            "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {subscriber.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <ActionButton
                            label="Mark Added"
                            tone="emerald"
                            icon={Check}
                            disabled={isBusy || subscriber.status === "Added"}
                            onClick={() =>
                              handleStatusUpdate(subscriber._id, "Added")
                            }
                          />
                          <ActionButton
                            label="Delete"
                            tone="slate"
                            icon={Trash2}
                            disabled={isBusy}
                            onClick={() => setSubscriberToDelete(subscriber)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={Boolean(subscriberToDelete)}
        onClose={() => {
          if (pendingAction?.type === "delete") return;
          setSubscriberToDelete(null);
        }}
        onConfirm={handleDelete}
        entityName="subscriber"
        itemName={subscriberToDelete?.email}
      />
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function FilterField({ label, value, onChange, options, optionLabels = {} }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabels[option] || option}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </label>
  );
}

function ActionButton({ label, tone, icon: Icon, disabled, onClick }) {
  const tones = {
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    slate: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
