import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsRow({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md transition-all"
        >
          <p className="text-xs font-medium text-slate-400 mb-2">{stat.label}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
              {stat.value}
            </h2>
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-2 ${
                stat.trend === "up"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-500"
              }`}
            >
              {stat.change}
              {stat.trend === "up" ? <TrendingUp/> : <TrendingDown/>}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
