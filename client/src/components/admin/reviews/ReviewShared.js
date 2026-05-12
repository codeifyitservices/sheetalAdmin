import { useState } from "react";
import { Star } from "lucide-react";
import AdminStatCard from "@/components/admin/common/AdminStatCard";

const AVATAR_COLORS = [
  ["#e0e7ff", "#4f46e5"],
  ["#fce7f3", "#be185d"],
  ["#dcfce7", "#15803d"],
  ["#fef9c3", "#a16207"],
  ["#ffe4e6", "#be123c"],
  ["#f0fdf4", "#166534"],
];

export function Avatar({ name }) {
  const idx = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const [bg, fg] = AVATAR_COLORS[idx];
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0"
      style={{ backgroundColor: bg, color: fg }}
    >
      {name?.substring(0, 2) || "??"}
    </div>
  );
}

export function StarRow({ rating, interactive = false, onChange }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={interactive ? 20 : 12}
          onClick={() => interactive && onChange?.(i + 1)}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(null)}
          className={[
            interactive ? "cursor-pointer transition-transform hover:scale-110" : "",
            i < (hovered !== null ? hovered + 1 : rating)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-200 fill-slate-200",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export function FilterTab({ label, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 cursor-pointer py-2 rounded-lg text-sm font-semibold transition-all ${
        active
          ? "bg-white text-slate-900 shadow-sm border border-slate-200"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function StatCard({ icon, label, value, color, subtext }) {
  return <AdminStatCard icon={icon} label={label} value={value} subtext={subtext} />;
}
