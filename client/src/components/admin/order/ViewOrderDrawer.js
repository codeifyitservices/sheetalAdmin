"use client";
import Link from "next/link";
import {
  X,
  Package,
  Truck,
  CheckCircle2,
  MapPin,
  CreditCard,
  ShoppingBag,
  AlertCircle,
  Tag,
  Hash,
  FileText,
  Download,
} from "lucide-react";

export default function ViewOrderDrawer({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  const invoiceHref = `/admin/orders/${order._id}/invoice`;
  const invoiceDownloadHref = `${invoiceHref}?print=1`;

  // Timeline logic
  const getTimeline = () => {
    const base = [
      { label: "Order Placed", date: order.createdAt, active: true },
      {
        label: "Processing",
        date: order.updatedAt,
        active: order.orderStatus !== "Pending",
      },
      {
        label: "Shipped",
        date: order.shippedAt,
        active: ["Shipped", "Delivered"].includes(order.orderStatus),
      },
      {
        label: "Delivered",
        date: order.deliveredAt,
        active: order.orderStatus === "Delivered",
      },
    ];
    if (["Return Requested", "Returned"].includes(order.orderStatus)) {
      base.push({
        label: "Return Process",
        date: order.updatedAt,
        active: true,
        color: "text-purple-600",
      });
    }
    if (order.orderStatus === "Cancelled") {
      base.push({
        label: "Cancelled",
        date: order.updatedAt,
        active: true,
        color: "text-rose-600",
      });
    }
    return base;
  };

  return (
    <div
      className={`fixed inset-0 z-[500] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        className={`absolute inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl transform transition-transform duration-500 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="h-full flex flex-col bg-slate-50/50">
          {/* Header: Pro Dark Gradient */}
          <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10">
                <ShoppingBag size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight leading-none">
                  Order Details
                </h2>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">
                  ID: #{order._id.slice(-12).toUpperCase()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 cursor-pointer bg-white/10 hover:bg-white/20 rounded-xl transition-all group"
            >
              <X
                size={20}
                className="group-hover:rotate-90 transition-transform"
              />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* 1. Status Badge & Date */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  Current Status
                </p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white`}
                >
                  {order.orderStatus}
                </span>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  Order Date
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* 1b. AWB / Tracking Info — shown when AWB is assigned */}
            {(order.awbCode || order.trackingId) && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-violet-600">
                  <Truck size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Shipment & Tracking
                  </span>
                </div>
                <div className="space-y-2">
                  {order.awbCode && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AWB Code</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wide">
                        <Tag size={10} />
                        {order.awbCode}
                      </span>
                    </div>
                  )}
                  {order.courierPartner && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Courier</span>
                      <span className="text-[11px] font-black text-slate-800">{order.courierPartner}</span>
                    </div>
                  )}
                  {order.trackingId && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracking ID</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-800">
                        <Hash size={10} className="text-slate-400" />
                        {order.trackingId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Customer & Address Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-blue-600">
                  <MapPin size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Shipping
                  </span>
                </div>
                <p className="text-xs font-black text-slate-800">
                  {order.shippingAddress?.fullName}
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1 font-medium">
                  {order.shippingAddress?.addressLine1 ||
                    order.shippingAddress?.address}
                  , {order.shippingAddress?.city}
                  <br />
                  {order.shippingAddress?.state} -{" "}
                  {order.shippingAddress?.postalCode}
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-amber-600">
                  <CreditCard size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Payment
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-black text-slate-800">
                    {order.paymentInfo?.method === "Online"
                      ? "Prepaid Online"
                      : "Cash on Delivery (COD)"}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p
                      className={`text-[10px] font-bold ${order.paymentInfo?.status === "Paid" ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      ● {order.paymentInfo?.status || "Pending"}
                    </p>
                    {order.paymentInfo?.method === "Online" &&
                      order.paymentInfo?.id && (
                        <p className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                          Ref: {order.paymentInfo.id.slice(-8).toUpperCase()}
                        </p>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Items List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Package size={14} /> Items ({order.orderItems?.length || 0})
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {order.orderItems?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-inner">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={20} className="text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">
                          Qty: {item.quantity} ×{" "}
                          <span className="text-slate-900">
                            ₹{item.price.toLocaleString()}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Timeline Journey */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">
                Order Journey
              </h3>
              <div className="space-y-6 relative ml-2">
                {getTimeline().map((step, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {i !== getTimeline().length - 1 && (
                      <div
                        className={`absolute left-[11px] top-6 w-0.5 h-6 ${step.active ? "bg-emerald-500" : "bg-slate-100"}`}
                      />
                    )}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${step.active
                        ? "bg-emerald-500 text-white ring-4 ring-emerald-50 shadow-sm"
                        : "bg-slate-100 text-slate-300"
                        }`}
                    >
                      <CheckCircle2 size={12} />
                    </div>
                    <div>
                      <p
                        className={`text-[11px] font-black uppercase tracking-tight ${step.active ? step.color || "text-slate-900" : "text-slate-400"}`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {step.active && step.date
                          ? new Date(step.date).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                          : "Pending..."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Pricing Summary with Discount */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-2xl shadow-slate-200">
              <div className="flex flex-wrap gap-2 no-print">
                <Link
                  href={invoiceHref}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-white transition-all hover:bg-white/20"
                >
                  <FileText size={13} />
                  View Invoice
                </Link>
                <Link
                  href={invoiceDownloadHref}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-500/15 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-emerald-100 transition-all hover:bg-emerald-500/25"
                >
                  <Download size={13} />
                  Download Invoice
                </Link>
              </div>

              <div className="space-y-2 pb-4 border-b border-white/10">
                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span className="text-white">
                    ₹
                    {(
                      order.itemsPrice ||
                      order.totalPrice -
                      (order.shippingPrice || 0) +
                      (order.discountPrice || 0)
                    ).toLocaleString()}
                  </span>
                </div>

                {order.discountPrice > 0 && (
                  <div className="flex justify-between text-[11px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <Tag size={12} /> Discount{" "}
                      {order.couponCode && `(${order.couponCode})`}
                    </span>
                    <span>- ₹{order.discountPrice.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Shipping</span>
                  <span
                    className={
                      order.shippingPrice > 0
                        ? "text-white"
                        : "text-emerald-400"
                    }
                  >
                    {order.shippingPrice > 0
                      ? `₹${order.shippingPrice}`
                      : "FREE"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">
                    Amount to Pay
                  </p>
                  <p className="text-3xl font-black tracking-tighter">
                    ₹{order.totalPrice?.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest">
                    {order.paymentInfo?.status === "Paid"
                      ? "Verified"
                      : "Unpaid"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
        }
        .custom-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
