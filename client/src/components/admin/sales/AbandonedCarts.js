'use client'

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ShoppingCart } from "lucide-react";
import AbandonedCartDetailsModal from "./AbandonedCartDetailsModal";

export default function AbandonedCarts({ carts = [] }) {
  const [selectedCart, setSelectedCart] = useState(null);

  return (
    <>
      <div
        style={{ fontFamily: "'DM Sans', sans-serif" }}
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2"
      >
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=DM+Mono:wght@500&display=swap"
          rel="stylesheet"
        />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #fb7185, #e11d48)",
                  boxShadow: "0 0 8px rgba(225,29,72,0.5)",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#e11d48",
                  textTransform: "uppercase",
                }}
              >
                Needs Attention
              </span>
            </div>
            <h3 className="text-xl font-extrabold leading-tight text-slate-900">
              Abandoned Carts
            </h3>
          </div>

          <Link
            href="/admin/sales-report/abandoned-carts"
            style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", textDecoration: "none" }}
            className="hover:underline"
          >
            View All <ArrowRight/>
          </Link>
        </div>

        {carts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div style={{ background: "#f8fafc", borderRadius: 16, padding: 16 }}>
              <ShoppingCart size={28} color="#cbd5e1" />
            </div>
            <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
              No abandoned carts
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {carts.map((cart) => (
              <button
                type="button"
                key={cart.cartId || cart.email}
                onClick={() => setSelectedCart(cart)}
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
                className="w-full cursor-pointer hover:bg-slate-50 hover:shadow-sm"
              >
                <div className="min-w-0 flex flex-1 items-center gap-3 text-left">
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
                    <p
                      className="truncate"
                      style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}
                    >
                      {cart.email}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        fontWeight: 500,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {cart.date}
                    </p>
                  </div>
                </div>

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
                  Rs. {cart.cartValue.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AbandonedCartDetailsModal
        cart={selectedCart}
        isOpen={Boolean(selectedCart)}
        onClose={() => setSelectedCart(null)}
      />
    </>
  );
}
