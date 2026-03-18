import { MessageSquare, AlertCircle, BookOpen, CheckCheck } from "lucide-react";

const STAT_CARDS = [
  {
    label: "Total",
    key: "total",
    sub: () => "All enquiries",
    icon: MessageSquare,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    filter: "all",
  },
  {
    label: "New",
    key: "new",
    sub: (counts) =>
      counts.total
        ? `${Math.round((counts.new / counts.total) * 100)}% of total`
        : "0% of total",
    icon: AlertCircle,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-500",
    filter: "new",
  },
  {
    label: "Read",
    key: "read",
    sub: (counts) =>
      counts.total
        ? `${Math.round((counts.read / counts.total) * 100)}% of total`
        : "0% of total",
    icon: BookOpen,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    filter: "read",
  },
  {
    label: "Replied",
    key: "replied",
    sub: (counts) =>
      counts.replied === 0
        ? "None yet"
        : `${Math.round((counts.replied / counts.total) * 100)}% of total`,
    icon: CheckCheck,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-500",
    filter: "replied",
  },
];

export default function EnquiryStatsCards({
  counts,
  statusFilter,
  onFilterChange,
  totalLabel = "All enquiries",
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_CARDS.map((card) => (
        <button
          key={card.label}
          onClick={() => onFilterChange(card.filter)}
          className={`bg-white border rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer ${
            statusFilter === card.filter ? "border-slate-400" : "border-slate-200"
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
                {counts[card.key]}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {card.key === "total" ? totalLabel : card.sub(counts)}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
