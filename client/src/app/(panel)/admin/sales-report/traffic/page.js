"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Globe,
  Search,
  Share2,
  Link2,
  TrendingUp,
  Users,
  RefreshCw,
  MousePointerClick,
} from "lucide-react";
import AdminStatCard from "@/components/admin/common/AdminStatCard";
import PageHeader from "@/components/admin/layout/PageHeader";
import TrafficSources from "@/components/admin/sales/TrafficSource";
import { getPaginationRange } from "@/utils/pagination";

// ── Mock data — swap this for a real API call when ready ──────────────────────
const MOCK_TRAFFIC_SOURCES = [
  { label: "Direct", percentage: 45, color: "bg-primary", visits: 18450, change: "+5.2%" },
  { label: "Search", percentage: 30, color: "bg-emerald-500", visits: 12300, change: "+11.4%" },
  { label: "Social", percentage: 15, color: "bg-amber-500", visits: 6150, change: "-2.1%" },
  { label: "Referral", percentage: 10, color: "bg-slate-300", visits: 4100, change: "+0.8%" },
];

const TOTAL_VISITS = MOCK_TRAFFIC_SOURCES.reduce((s, t) => s + t.visits, 0);

const SOURCE_ICONS = {
  Direct: <MousePointerClick size={20} />,
  Search: <Search size={20} />,
  Social: <Share2 size={20} />,
  Referral: <Link2 size={20} />,
};

const SOURCE_COLORS = {
  Direct: { card: "indigo", hex: "#4f46e5" },
  Search: { card: "emerald", hex: "#10b981" },
  Social: { card: "amber", hex: "#f59e0b" },
  Referral: { card: "slate", hex: "#94a3b8" },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function TrafficSourcesPage() {
  // When you have a real API, replace this with useCallback + useEffect + fetch
  const [sources] = useState(MOCK_TRAFFIC_SOURCES);
  const [loading] = useState(false);

  const topSource = [...sources].sort((a, b) => b.visits - a.visits)[0];

  return (
    <div className="min-h-screen w-full animate-in fade-in duration-500">
      <PageHeader
        title="Traffic Sources"
        subtitle="Understand where your visitors are coming from and how each channel performs"
        action={
          <button
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminStatCard
          title="Total Visits"
          value={TOTAL_VISITS.toLocaleString()}
          icon={<Users size={20} />}
          color="indigo"
        />
        <AdminStatCard
          title="Top Source"
          value={topSource?.label || "—"}
          icon={<TrendingUp size={20} />}
          color="emerald"
          isText
        />
        <AdminStatCard
          title="Top Source Share"
          value={`${topSource?.percentage || 0}%`}
          icon={<Globe size={20} />}
          color="amber"
        />
        <AdminStatCard
          title="Tracked Channels"
          value={sources.length}
          icon={<Link2 size={20} />}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — donut widget (your existing component) */}
        <div className="lg:col-span-1">
          <TrafficSources sources={sources} />
        </div>

        {/* Right — detailed breakdown table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-1">
              <div
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "linear-gradient(135deg,#818cf8,#4f46e5)",
                  boxShadow: "0 0 8px rgba(99,102,241,0.6)",
                }}
              />
              <span className="text-[10px] font-bold tracking-[0.12em] text-indigo-500 uppercase">
                Breakdown
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
              Channel Performance
            </h3>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                    Visits
                  </th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                    Share
                  </th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">
                    Change
                  </th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Distribution
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sources.map((source, i) => {
                  const colorHex = SOURCE_COLORS[source.label]?.hex || "#94a3b8";
                  const isPositive = source.change?.startsWith("+");

                  return (
                    <tr key={source.label} className="hover:bg-slate-50/50 transition-colors group">
                      {/* Channel */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2 rounded-lg flex-shrink-0"
                            style={{
                              background: `${colorHex}15`,
                              color: colorHex,
                            }}
                          >
                            {SOURCE_ICONS[source.label] || <Globe size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">
                              {source.label}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium">
                              #{i + 1} channel
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Visits */}
                      <td className="px-6 py-4 text-right">
                        <span
                          className="font-black text-slate-900"
                          style={{ fontFamily: "'DM Mono', monospace", fontSize: 13 }}
                        >
                          {source.visits.toLocaleString()}
                        </span>
                      </td>

                      {/* Share */}
                      <td className="px-6 py-4 text-right">
                        <span
                          className="font-black"
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 13,
                            color: colorHex,
                          }}
                        >
                          {source.percentage}%
                        </span>
                      </td>

                      {/* Change */}
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-xs font-black px-2 py-1 rounded-full ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-rose-50 text-rose-600 border border-rose-100"
                          }`}
                        >
                          {source.change}
                        </span>
                      </td>

                      {/* Distribution bar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex-1 rounded-full overflow-hidden"
                            style={{ height: 6, background: "#f1f5f9" }}
                          >
                            <div
                              style={{
                                width: `${source.percentage}%`,
                                height: "100%",
                                borderRadius: 99,
                                background: `linear-gradient(90deg, ${colorHex}99, ${colorHex})`,
                                transition: "width 0.6s ease",
                              }}
                            />
                          </div>
                          <span
                            className="text-[11px] font-black text-slate-400 flex-shrink-0"
                            style={{ fontFamily: "'DM Mono', monospace", width: 32 }}
                          >
                            {source.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer total row */}
              <tfoot>
                <tr className="border-t-2 border-slate-100 bg-slate-50/50">
                  <td className="px-6 py-4">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Total
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className="font-black text-slate-900"
                      style={{ fontFamily: "'DM Mono', monospace", fontSize: 13 }}
                    >
                      {TOTAL_VISITS.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className="font-black text-slate-900"
                      style={{ fontFamily: "'DM Mono', monospace", fontSize: 13 }}
                    >
                      100%
                    </span>
                  </td>
                  <td className="px-6 py-4" />
                  <td className="px-6 py-4" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mock data notice */}
          <div className="px-6 py-3 border-t border-slate-100 bg-amber-50/50">
            <p className="text-[11px] text-amber-600 font-medium">
              ⚠ Displaying mock data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, isText = false }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
      <div className={`p-3 rounded-lg border flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
          {title}
        </p>
        <p className={`font-black text-slate-900 mt-1.5 leading-none truncate ${isText ? "text-sm" : "text-2xl"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
