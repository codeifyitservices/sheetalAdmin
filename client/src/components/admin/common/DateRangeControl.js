"use client";

import { CalendarDays } from "lucide-react";
import { DATE_RANGE_PRESETS } from "@/utils/dateRange";

export default function DateRangeControl({
  rangeType,
  customStartDate,
  customEndDate,
  onRangeTypeChange,
  onCustomStartDateChange,
  onCustomEndDateChange,
  className = "",
}) {
  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      <div className="min-w-[180px]">
        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
          Date Range
        </label>
        <div className="relative">
          <CalendarDays
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <select
            value={rangeType}
            onChange={(e) => onRangeTypeChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm font-bold text-slate-700 shadow-sm outline-none transition-all hover:border-slate-400 focus:border-slate-500"
          >
            {DATE_RANGE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rangeType === "custom" ? (
        <>
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Start
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onCustomStartDateChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all hover:border-slate-400 focus:border-slate-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              End
            </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onCustomEndDateChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all hover:border-slate-400 focus:border-slate-500"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
