import { Search, ChevronDown } from "lucide-react";
import { STATUS_OPTIONS } from "./enquiryConstants";

export default function EnquiryFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  count,
  title = "Notify Enquiries",
  singularLabel = "enquiry",
  pluralLabel = "enquiries",
  searchPlaceholder = "Search by name, email or product...",
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase">
            {title}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {count} {count !== 1 ? pluralLabel : singularLabel} found
          </p>
        </div>
        
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="enquiry-search" className="sr-only">
            Search enquiries
          </label>
          <Search
            size={13}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            id="enquiry-search"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition placeholder:text-slate-300"
          />
        </div>
        <div className="relative">
          <label htmlFor="enquiry-status" className="sr-only">
            Filter enquiries by status
          </label>
          <select
            id="enquiry-status"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
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
  );
}
