import { TrendingUp, TrendingDown } from "lucide-react";
import AdminStatCard from "@/components/admin/common/AdminStatCard";

export default function StatsRow({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <AdminStatCard
          key={stat.label}
          title={stat.label}
          value={stat.value}
          icon={stat.icon ? <stat.icon size={20} /> : null}
          subtext={
            stat.change ? (
              <span
                className={`inline-flex text-[11px] font-semibold px-1.5 py-0.5 rounded-md items-center gap-2 ${
                  stat.trend === "up"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-500"
                }`}
              >
                {stat.change}
                {stat.trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </span>
            ) : null
          }
        />
      ))}
    </div>
  );
}
