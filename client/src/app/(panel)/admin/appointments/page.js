"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Search,
  Trash2,
  X,
  MapPin,
  Phone,
  Mail,
  Calendar,
  FileText,
  ChevronDown,
  User,
  Clock,
  ThumbsUp,
  AlertCircle,
  StickyNote,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "@/services/api";
import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700 border border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  cancelled: "bg-rose-100 text-rose-500 border border-rose-200",
};

const STATUS_OPTIONS = ["all", "pending", "confirmed", "cancelled"];

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-500" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-sm text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null); // for modal
  const [notes, setNotes] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [savingNotesId, setSavingNotesId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
  });

  // Update fetchAppointments to derive counts after fetching
  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/appointments`, {
        params: { status: statusFilter, search },
        withCredentials: true,
      });
      if (data.success) {
        setAppointments(data.appointments);
      }

      // Always fetch unfiltered counts
      const { data: allData } = await axios.get(
        `${API_BASE_URL}/appointments`,
        {
          params: { status: "all" },
          withCredentials: true,
        },
      );
      if (allData.success) {
        const all = allData.appointments;
        setCounts({
          total: all.length,
          pending: all.filter((a) => a.status === "pending").length,
          confirmed: all.filter((a) => a.status === "confirmed").length,
          cancelled: all.filter((a) => a.status === "cancelled").length,
        });
      }
    } catch (err) {
      toast.error("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppointments();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAppointments]);

  useEffect(() => {
    setNotes(selected?.notes || "");
  }, [selected?._id, selected?.notes]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const { data } = await axios.delete(
        `${API_BASE_URL}/appointments/${id}`,
        { withCredentials: true },
      );
      if (data.success) {
        setAppointments((prev) => prev.filter((a) => a._id !== id));
        if (selected?._id === id) setSelected(null);
        toast.success("Appointment deleted");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      const { data } = await axios.patch(
        `${API_BASE_URL}/appointments/${id}/status`,
        { status },
        { withCredentials: true },
      );
      if (data.success) {
        setAppointments((prev) =>
          prev.map((a) => (a._id === id ? data.appointment : a)),
        );
        if (selected?._id === id) setSelected(data.appointment);
        toast.success("Status updated");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async (id, nextNotes) => {
    setSavingNotesId(id);
    try {
      const { data } = await axios.patch(
        `${API_BASE_URL}/appointments/${id}/notes`,
        { notes: nextNotes },
        { withCredentials: true },
      );
      if (data.success) {
        setAppointments((prev) =>
          prev.map((appointment) =>
            appointment._id === id ? data.appointment : appointment,
          ),
        );
        if (selected?._id === id) setSelected(data.appointment);
        toast.success("Notes Saved");
        return data.appointment;
      }
      throw new Error("Failed to save notes");
    } catch (error) {
      toast.error("Failed to save notes");
      throw error;
    } finally {
      setSavingNotesId(null);
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const exportColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "contact", label: "Contact" },
    { key: "city", label: "City" },
    { key: "status", label: "Status" },
    { key: "requirements", label: "Requirements" },
    { key: "notes", label: "Notes" },
    { key: "createdAt", label: "Created At" },
  ];

  const exportRows = appointments.map((appointment) => ({
    name: appointment.name || "-",
    email: appointment.email || "-",
    contact: appointment.contact || "-",
    city: appointment.city || "-",
    status: appointment.status || "-",
    requirements: appointment.requirements || "-",
    notes: appointment.notes || "-",
    createdAt: formatDate(appointment.createdAt),
  }));

  const handleExport = async (format) => {
    if (exportRows.length === 0) return;

    setIsExporting(true);
    try {
      const filename = `appointments_${new Date().toISOString().split("T")[0]}`;
      const meta = [
        `Generated on: ${new Date().toLocaleString()}`,
        `Status filter: ${statusFilter}`,
        `Search: ${search || "None"}`,
        `Records: ${exportRows.length}`,
      ];

      if (format === "pdf") {
        await downloadPdfReport({
          filename,
          title: "Appointments Report",
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
      {/* Stats Cards */}
      <div className="w-full flex justify-end">
        <ReportExportMenu
            disabled={appointments.length === 0}
            busy={isExporting}
            onExportPdf={() => handleExport("pdf")}
            onExportExcel={() => handleExport("excel")}
          />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total",
            value: counts.total,
            sub: "All appointments",
            icon: Calendar,
            iconBg: "bg-slate-100",
            iconColor: "text-slate-500",
            filter: "all",
          },
          {
            label: "Pending",
            value: counts.pending,
            sub: counts.total
              ? `${Math.round((counts.pending / counts.total) * 100)}% of total`
              : "0% of total",
            icon: Clock,
            iconBg: "bg-amber-100",
            iconColor: "text-amber-500",
            filter: "pending",
          },
          {
            label: "Confirmed",
            value: counts.confirmed,
            sub: counts.total
              ? `${Math.round((counts.confirmed / counts.total) * 100)}% of total`
              : "0% of total",
            icon: ThumbsUp,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-500",
            filter: "confirmed",
          },
          {
            label: "Cancelled",
            value: counts.cancelled,
            sub:
              counts.cancelled === 0
                ? "All caught up!"
                : `${Math.round((counts.cancelled / counts.total) * 100)}% of total`,
            icon: AlertCircle,
            iconBg: "bg-rose-100",
            iconColor: "text-rose-400",
            filter: "cancelled",
          },
        ].map((card) => (
          <button
            key={card.label}
            onClick={() => setStatusFilter(card.filter)}
            className={`bg-white border rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer ${
              statusFilter === card.filter
                ? "border-slate-400"
                : "border-slate-200"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`${card.iconBg} p-2.5 rounded-xl shrink-0`}>
                <card.icon size={18} className={card.iconColor} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {card.label}
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1 leading-none">
                  {card.value}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{card.sub}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      {/* Header + Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">
              Appointments
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {appointments.length} appointment
              {appointments.length !== 1 ? "s" : ""} found
            </p>
          </div>
          
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-8 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition placeholder:text-slate-300"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-slate-400 transition cursor-pointer font-medium capitalize"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s === "all" ? "All Statuses" : s}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin text-slate-400" size={28} />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300">
            <Calendar size={40} strokeWidth={1} />
            <p className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-400">
              No appointments found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[
                    "Name",
                    "Email",
                    "Contact",
                    "City",
                    "Date",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3.5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((a) => (
                  <tr
                    key={a._id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setSelected(a)}
                        className="font-semibold text-slate-800 hover:text-slate-900 hover:underline text-left"
                      >
                        {a.name}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{a.email}</td>
                    <td className="px-5 py-3.5 text-slate-500">{a.contact}</td>
                    <td className="px-5 py-3.5 text-slate-500">{a.city}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelected(a)}
                          className="text-[10px] cursor-pointer font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 hover:border-slate-400 transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(a._id)}
                          disabled={deletingId === a._id}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500 hover:text-white border border-slate-200 hover:border-rose-500 transition disabled:opacity-50"
                        >
                          {deletingId === a._id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} className="cursor-pointer" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-base">
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-slate-900">{selected.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatDate(selected.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl cursor-pointer hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <DetailRow icon={User} label="Full Name" value={selected.name} />
              <DetailRow icon={Mail} label="Email" value={selected.email} />
              <DetailRow
                icon={Phone}
                label="Contact"
                value={selected.contact}
              />
              <DetailRow
                icon={MapPin}
                label="Address"
                value={selected.address}
              />
              <DetailRow icon={MapPin} label="City" value={selected.city} />
              <DetailRow
                icon={MapPin}
                label="Pincode"
                value={selected.pincode}
              />
              {selected.requirements && (
                <DetailRow
                  icon={FileText}
                  label="Requirements"
                  value={selected.requirements}
                />
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StickyNote size={14} className="text-slate-400" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Internal Notes
                  </p>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add private notes about this appointment..."
                  rows={3}
                  className="w-full text-sm text-slate-700 placeholder-slate-300 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 resize-none outline-none focus:border-slate-400 focus:bg-white transition-all"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSaveNotes(selected._id, notes)}
                    disabled={
                      savingNotesId === selected._id ||
                      notes === (selected.notes || "")
                    }
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {savingNotesId === selected._id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <StickyNote size={12} />
                    )}
                    Save Notes
                  </button>
                </div>
              </div>
            </div>

            {/* Status + Actions */}
            <div className="px-6 pb-6 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Update Status
              </p>
              <div className="flex gap-2 flex-wrap">
                {["pending", "confirmed", "cancelled"].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selected._id, s)}
                    disabled={
                      selected.status === s || updatingId === selected._id
                    }
                    className={`px-4 cursor-pointer py-2 rounded-xl text-xs font-bold capitalize transition-all border disabled:cursor-not-allowed
                                            ${
                                              selected.status === s
                                                ? STATUS_STYLES[s] +
                                                  " opacity-100"
                                                : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400"
                                            }`}
                  >
                    {updatingId === selected._id && selected.status !== s ? (
                      <Loader2 size={12} className="animate-spin inline" />
                    ) : (
                      s
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleDelete(selected._id)}
                disabled={deletingId === selected._id}
                className="w-full cursor-pointer flex items-center justify-center gap-2 mt-2 border border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {deletingId === selected._id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                Delete Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
