"use client";

import { Eye, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

function formatViews(views) {
  if (views >= 1000) return `${(views / 1000).toFixed(1)}k`;
  return views.toString();
}

export default function MostViewedItems({
  items = [],
  loading = false,
  error = null,
}) {
  const maxViews = items.length ? Math.max(...items.map((i) => i.views)) : 1;

  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=DM+Mono:wght@500&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#818cf8,#4f46e5)",
                boxShadow: "0 0 8px rgba(99,102,241,0.6)",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#6366f1",
                textTransform: "uppercase",
              }}
            >
              Trending
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
            Most Viewed Items
          </h3>
        </div>
        <Link
          href="/admin/sales-report/most-viewed"
          className="text-sm font-semibold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
        >
          See all Products <ArrowRight size={14} />
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Loading...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center justify-center py-12">
          <p style={{ fontSize: 13, color: "#ef4444", fontWeight: 500 }}>
            Failed to load: {error}
          </p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <p style={{ fontSize: 13, fontWeight: 500 }}>
            No data available yet.
          </p>
        </div>
      )}

      {/* List */}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => {
            const barWidth = Math.round((item.views / maxViews) * 100);
            const isTop = i === 0;

            return (
              <div
                key={item.rank}
                style={{
                  background: isTop
                    ? "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)"
                    : "#fff",
                  border: isTop ? "1px solid #e0e7ff" : "1px solid #f1f5f9",
                  borderRadius: 14,
                  padding: "12px 14px",
                  transition: "box-shadow 0.15s ease",
                }}
                className="hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: i < 3 ? "#6366f1" : "#cbd5e1",
                        fontFamily: "'DM Mono', monospace",
                        flexShrink: 0,
                        width: 20,
                      }}
                    >
                      {String(item.rank).padStart(2, "0")}
                    </span>

                    {/* Name + category */}
                    <div className="min-w-0">
                      <p
                        className="font-bold text-slate-800 truncate"
                        style={{ fontSize: 13 }}
                      >
                        {item.name}
                      </p>
                      <p
                        className="text-slate-400 truncate"
                        style={{ fontSize: 11, fontWeight: 500 }}
                      >
                        {item.category}
                      </p>
                    </div>
                  </div>

                  {/* Views */}
                  <div
                    className="flex items-center gap-1.5 flex-shrink-0"
                    style={{
                      color: isTop ? "#4f46e5" : "#94a3b8",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <Eye size={13} />
                    {formatViews(item.views)}
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    marginTop: 10,
                    height: 3,
                    borderRadius: 99,
                    background: "#f1f5f9",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      borderRadius: 99,
                      background: isTop
                        ? "linear-gradient(90deg,#818cf8,#4f46e5)"
                        : "linear-gradient(90deg,#c7d2fe,#a5b4fc)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
