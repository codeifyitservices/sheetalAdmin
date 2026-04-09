"use client";

import { X, CheckCircle2, Clock3, CircleDashed, AlertTriangle, Ban } from "lucide-react";

const STATUS_STYLES = {
  success: {
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Sent",
  },
  failure: {
    icon: AlertTriangle,
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    label: "Failed",
  },
  skipped: {
    icon: Ban,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    label: "Skipped",
  },
  pending: {
    icon: Clock3,
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    label: "Pending",
  },
};

const formatMoney = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "Not yet";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatReason = (value) => {
  if (!value) return "Inactivity";
  if (value === "checkout_exit") return "Checkout exit";
  if (value === "order_completed") return "Order completed";
  return "Inactivity";
};

const formatStatus = (value) => {
  if (value === "recovered") return "Recovered";
  return "Abandoned";
};

export default function AbandonedCartDetailsModal({ cart, isOpen, onClose }) {
  if (!isOpen || !cart) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 p-4 sm:p-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:text-slate-900"
          >
            <X size={18} />
          </button>

          <div className="grid max-h-[92vh] grid-cols-1 overflow-y-auto lg:grid-cols-[1.15fr_0.85fr]">
            <section className="border-b border-slate-200 p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="mb-6 flex items-start justify-between gap-4 pr-10">
                <div>
                  <p
                    className={`text-[11px] font-black uppercase tracking-[0.28em] ${
                      cart.status === "recovered"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {cart.status === "recovered" ? "Recovered Cart" : "Abandoned Cart"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">
                    {cart.name || cart.email || "Customer"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {cart.email || "No email"}{cart.phoneNumber ? ` - ${cart.phoneNumber}` : ""}
                  </p>
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 text-right ${
                    cart.status === "recovered"
                      ? "border border-emerald-200 bg-emerald-50"
                      : "border border-rose-200 bg-rose-50"
                  }`}
                >
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                      cart.status === "recovered"
                        ? "text-emerald-500"
                        : "text-rose-500"
                    }`}
                  >
                    {formatStatus(cart.status)}
                  </p>
                  <p
                    className={`mt-1 text-xl font-black ${
                      cart.status === "recovered"
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {formatMoney(cart.cartValue)}
                  </p>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InfoCard label="Items" value={`${cart.itemCount}`} />
                <InfoCard label="Event" value={cart.date || "Now"} />
                <InfoCard label="Reason" value={formatReason(cart.abandonmentReason)} />
                <InfoCard label="Attempts" value={`${cart.reminderAttemptsCount || 0}`} />
              </div>

              {cart.status === "recovered" ? (
                <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                    Cart retained
                  </p>
                  <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-emerald-900">
                      {cart.recoveredAtStep || "Recovery step not tracked"}
                    </p>
                    <p className="text-xs font-semibold text-emerald-700">
                      {formatDateTime(cart.recoveredAt)}
                    </p>
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                    Cart Items
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">
                    Last activity {formatDateTime(cart.lastActivityAt)}
                  </span>
                </div>

                <div className="space-y-3">
                  {(cart.items || []).map((item, index) => (
                    <div
                      key={`${item.productId || item.name}-${index}`}
                      className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Qty {item.quantity}
                          {item.size ? ` - Size ${item.size}` : ""}
                          {item.color ? ` - ${item.color}` : ""}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-500">
                            Unit {formatMoney(item.unitPrice)}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-800 shadow-sm">
                            {formatMoney(item.lineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="bg-slate-50/70 p-6 sm:p-8">
              <div className="mb-5">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">
                  Recovery Steps
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-900">
                  4-step reminder checkpoints
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Each checkpoint shows whether the reminder was sent, skipped, failed, or is still pending.
                </p>
              </div>

              <div className="space-y-4">
                {(cart.checkpoints || []).map((checkpoint, index) => (
                  <CheckpointCard
                    key={checkpoint.stage || index}
                    checkpoint={checkpoint}
                    isLast={index === (cart.checkpoints || []).length - 1}
                  />
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function CheckpointCard({ checkpoint, isLast }) {
  const statusKey = STATUS_STYLES[checkpoint.status] ? checkpoint.status : "pending";
  const status = STATUS_STYLES[statusKey];
  const Icon = status.icon;
  const channels = Array.isArray(checkpoint.channels) ? checkpoint.channels : [];

  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      {!isLast ? (
        <div className="absolute left-[25px] top-[72px] h-[calc(100%-52px)] w-px bg-slate-200" />
      ) : null}

      <div className="flex gap-4">
        <div className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-white bg-slate-100 shadow-sm">
          <div className={`h-3 w-3 rounded-full ${status.dot}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                {checkpoint.label}
              </p>
              <h4 className="text-base font-black text-slate-900">
                {checkpoint.title}
              </h4>
            </div>

            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${status.badge}`}>
              <Icon size={14} />
              {status.label}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-500">
            <p>Scheduled for {formatDateTime(checkpoint.scheduledFor)}</p>
            <p>Processed at {formatDateTime(checkpoint.completedAt || checkpoint.attemptedAt)}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {channels.length > 0 ? (
              channels.map((channel) => (
                <span
                  key={`${checkpoint.stage}-${channel.channel}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold capitalize text-slate-600"
                >
                  {channel.status === "sent" ? (
                    <CheckCircle2 size={12} className="text-emerald-500" />
                  ) : channel.status === "failed" ? (
                    <AlertTriangle size={12} className="text-rose-500" />
                  ) : channel.status === "skipped" ? (
                    <Ban size={12} className="text-amber-500" />
                  ) : (
                    <CircleDashed size={12} className="text-slate-400" />
                  )}
                  {channel.channel}
                </span>
              ))
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
                <CircleDashed size={12} />
                No channel activity yet
              </span>
            )}
          </div>

          {checkpoint.error ? (
            <p className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {checkpoint.error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
