"use client";

import { useEffect, useState } from "react";
import {
  X,
  Clock3,
  Mail,
  MessageSquareText,
  Save,
  TicketPercent,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { getSettings, updateSettings } from "@/services/settingsService";

const DEFAULT_COUPON = { code: "SAVE10", percent: 10 };

const STEPS = [
  {
    stage: "first",
    label: "Step 1",
    title: "30 Minutes Reminder",
    description:
      "A quick nudge while the customer is still actively browsing. Lightest-touch message in the sequence.",
    channels: "Email / WhatsApp",
    timing: "After 30 minutes",
    tone: "Soft Reminder",
    accent: "rose",
  },
  {
    stage: "second",
    label: "Step 2",
    title: "6 Hour Reminder",
    description:
      "A stronger re-engagement message that brings the cart back to the top of the customer's mind.",
    channels: "Email + WhatsApp",
    timing: "After 6 hours",
    tone: "Warm Follow-up",
    accent: "amber",
  },
  {
    stage: "third",
    label: "Step 3",
    title: "24 Hour Reminder",
    description:
      "The primary recovery step. A coupon is attached here and sent with the email CTA — it auto-applies when the customer returns to checkout.",
    channels: "Email + WhatsApp + SMS",
    timing: "After 24 hours",
    tone: "Coupon Offer",
    accent: "emerald",
    coupon: true,
  },
  {
    stage: "final",
    label: "Step 4",
    title: "48 Hour Final Reminder",
    description:
      "Last message before the cart is considered exhausted. Should feel like a closing opportunity, not pressure.",
    channels: "Email only",
    timing: "After 48 hours",
    tone: "Last Chance",
    accent: "slate",
  },
];

const ACCENT = {
  rose: {
    card: "border-rose-100 bg-white",
    icon: "bg-rose-50 border-rose-200 text-rose-500",
    badge: "bg-rose-50 border-rose-200 text-rose-600",
    connector: "from-rose-200",
  },
  amber: {
    card: "border-amber-100 bg-white",
    icon: "bg-amber-50 border-amber-200 text-amber-600",
    badge: "bg-amber-50 border-amber-200 text-amber-600",
    connector: "from-amber-200",
  },
  emerald: {
    card: "border-emerald-200 bg-emerald-50/40",
    icon: "bg-emerald-50 border-emerald-200 text-emerald-600",
    badge: "bg-emerald-50 border-emerald-200 text-emerald-700",
    connector: "from-emerald-200",
  },
  slate: {
    card: "border-slate-200 bg-white",
    icon: "bg-slate-50 border-slate-200 text-slate-500",
    badge: "bg-slate-50 border-slate-200 text-slate-600",
    connector: "from-slate-200",
  },
};

export default function AbandonedCartStepsModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [couponCode, setCouponCode] = useState(DEFAULT_COUPON.code);
  const [discountPercent, setDiscountPercent] = useState(DEFAULT_COUPON.percent);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);

    getSettings()
      .then((res) => {
        if (!mounted) return;
        const data = res?.data || {};
        setCouponCode(data.abandonedCartCouponCode || DEFAULT_COUPON.code);
        setDiscountPercent(
          Number(data.abandonedCartDiscountPercent || DEFAULT_COUPON.percent)
        );
      })
      .catch((err) => toast.error(err?.message || "Failed to load settings"))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const cleanedCode = couponCode.trim().toUpperCase();
    const percent = Math.max(1, Math.min(90, Number(discountPercent) || 0));
    if (!cleanedCode) return toast.error("Enter a coupon code");

    setSaving(true);
    try {
      await updateSettings({
        abandonedCartCouponCode: cleanedCode,
        abandonedCartDiscountPercent: percent,
      });
      setCouponCode(cleanedCode);
      setDiscountPercent(percent);
      setSaved(true);
      toast.success("Coupon saved");
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 sm:p-6 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                Abandoned Cart Recovery
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                Reminder Workflow
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                4-step automated sequence across Email, WhatsApp, and SMS.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-0.5 flex-shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X size={15} />
            </button>
          </div>

          {/* Meta pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { icon: <Clock3 size={11} />, text: "4-step sequence" },
              { icon: <Mail size={11} />, text: "Email" },
              { icon: <MessageSquareText size={11} />, text: "WhatsApp & SMS" },
              { icon: <ShieldCheck size={11} />, text: "Auto-apply coupon" },
            ].map((p) => (
              <span
                key={p.text}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500"
              >
                <span className="text-slate-400">{p.icon}</span>
                {p.text}
              </span>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-2.5">
            {STEPS.map((step, index) => (
              <StepCard
                key={step.stage}
                step={step}
                isLast={index === STEPS.length - 1}
                loading={loading}
                saving={saving}
                saved={saved}
                couponCode={couponCode}
                discountPercent={discountPercent}
                onCodeChange={setCouponCode}
                onPercentChange={setDiscountPercent}
                onSave={handleSave}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({
  step,
  isLast,
  loading,
  saving,
  saved,
  couponCode,
  discountPercent,
  onCodeChange,
  onPercentChange,
  onSave,
}) {
  const a = ACCENT[step.accent];

  return (
    <div className={`relative rounded-xl border px-4 py-4 ${a.card}`}>
      {/* Connector line */}
      {!isLast && (
        <div
          className={`absolute left-[27px] top-[52px] w-px bg-gradient-to-b ${a.connector} to-transparent`}
          style={{ height: "calc(100% - 36px + 10px)" }}
        />
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border ${a.icon}`}
        >
          <Clock3 size={13} />
        </div>

        <div className="min-w-0 flex-1">
          {/* Top row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                {step.label}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-semibold text-slate-400">
                {step.timing}
              </span>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.15em] ${a.badge}`}
            >
              {step.tone}
            </span>
          </div>

          {/* Title */}
          <h3 className="mt-1 text-sm font-black text-slate-900">{step.title}</h3>

          {/* Description */}
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {step.description}
          </p>

          {/* Channels pill */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            <Mail size={10} className="text-slate-400" />
            {step.channels}
          </div>

          {/* ── Coupon editor inline in Step 3 ── */}
          {step.coupon && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3.5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50">
                  <TicketPercent size={12} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
                    Recovery Coupon
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Auto-applies when customer returns to checkout
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-4 text-center text-xs font-semibold text-slate-400">
                  Loading settings…
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_100px] gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Coupon Code
                      </label>
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => onCodeChange(e.target.value)}
                        placeholder="SAVE10"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Discount %
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={discountPercent}
                        onChange={(e) => onPercentChange(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className="mt-2.5 cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 py-2 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saved ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        Saved
                      </>
                    ) : saving ? (
                      "Saving…"
                    ) : (
                      <>
                        <Save size={13} />
                        Save Coupon
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}