'use client'

import { ShoppingCart } from "lucide-react";

export default function AbandonedCarts({ carts = [] }) {
  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2"
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
                background: "linear-gradient(135deg, #fb7185, #e11d48)",
                boxShadow: "0 0 8px rgba(225,29,72,0.5)",
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#e11d48", textTransform: "uppercase" }}>
              Needs Attention
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
            Abandoned Carts
          </h3>
        </div>

        <a
          href="#"
          style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", textDecoration: "none" }}
          className="hover:underline"
        >
          View All →
        </a>
      </div>

      {carts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div style={{ background: "#f8fafc", borderRadius: 16, padding: 16 }}>
            <ShoppingCart size={28} color="#cbd5e1" />
          </div>
          <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>No abandoned carts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {carts.map((cart) => (
            <div
              key={cart.email}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                border: "1px solid #f1f5f9",
                borderRadius: 14,
                padding: "12px 14px",
                transition: "box-shadow 0.15s ease, background 0.15s ease",
              }}
              className="hover:bg-slate-50 hover:shadow-sm"
            >
              {/* Avatar + email */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #e0e7ff, #ede9fe)",
                    border: "1px solid #e0e7ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    color: "#4f46e5",
                    flexShrink: 0,
                  }}
                >
                  {cart.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                    {cart.email}
                  </p>
                  <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, fontFamily: "'DM Mono', monospace" }}>
                    {cart.date}
                  </p>
                </div>
              </div>

              {/* Cart value */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#e11d48",
                  fontFamily: "'DM Mono', monospace",
                  background: "#fff1f2",
                  border: "1px solid #ffe4e6",
                  borderRadius: 8,
                  padding: "4px 10px",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                ₹{cart.cartValue.toFixed(2)}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
