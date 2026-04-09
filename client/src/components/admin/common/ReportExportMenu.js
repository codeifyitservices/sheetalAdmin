"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";

export default function ReportExportMenu({
  onExportPdf,
  onExportExcel,
  disabled = false,
  busy = false,
  busyLabel = "Exporting...",
  label = "Download Report",
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDisabled = disabled || busy;

  const handleExport = async (callback) => {
    setOpen(false);
    await Promise.resolve(callback?.());
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download size={15} />
        <span>{busy ? busyLabel : label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !isDisabled ? (
        <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => handleExport(onExportPdf)}
            className="flex cursor-pointer w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <FileText size={15} className="text-rose-500" />
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => handleExport(onExportExcel)}
            className="flex cursor-pointer w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            Download Excel
          </button>
        </div>
      ) : null}
    </div>
  );
}
