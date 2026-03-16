import {
  X,
  Loader2,
  Trash2,
  Mail,
  Phone,
  User,
  Package,
  Ruler,
  MessageSquare,
} from "lucide-react";
import DetailRow from "./DetailRow";
import { STATUS_STYLES } from "./enquiryConstants";
import { formatEnquiryDate } from "@/services/enquiryService";

export default function EnquiryModal({
  enquiry,
  onClose,
  onStatusChange,
  onDelete,
  onSendAvailability,
  pendingAction,
}) {
  const isThisEnquiry = pendingAction?.id === enquiry._id;
  const isAreaLocked = isThisEnquiry;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-base">
              {enquiry.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-black text-slate-900">{enquiry.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {formatEnquiryDate(enquiry.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl cursor-pointer hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <DetailRow icon={User}          label="Name"    value={enquiry.name} />
          <DetailRow icon={Mail}          label="Email"   value={enquiry.email} />
          <DetailRow icon={Phone}         label="Phone"   value={enquiry.phone} />
          <DetailRow icon={Package}       label="Product" value={enquiry.productName} />
          <DetailRow icon={Ruler}         label="Size"    value={enquiry.size} />
          {enquiry.message && (
            <DetailRow icon={MessageSquare} label="Message" value={enquiry.message} />
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Update Status
          </p>
          <div className="flex gap-2 flex-wrap">
            {["new", "read", "replied"].map((s) => {
              const isCurrentStatus = enquiry.status === s;
              const isThisButtonSpinning =
                isThisEnquiry &&
                pendingAction.action === "status" &&
                pendingAction.targetStatus === s;

              return (
                <button
                  key={s}
                  onClick={() => onStatusChange(enquiry._id, s)}
                  disabled={isCurrentStatus || isAreaLocked}
                  className={`px-4 cursor-pointer py-2 rounded-xl text-xs font-bold capitalize transition-all border disabled:cursor-not-allowed
                    ${isCurrentStatus
                      ? STATUS_STYLES[s] + " opacity-100"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400"
                    }`}
                >
                  {isThisButtonSpinning ? (
                    <Loader2 size={12} className="animate-spin inline" />
                  ) : s}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onSendAvailability(enquiry)}
            disabled={isAreaLocked}
            className="w-full cursor-pointer flex items-center justify-center gap-2 border border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {isThisEnquiry && pendingAction.action === "send" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : <Mail size={13} />}
            Send Availability Email
          </button>

          <button
            onClick={() => onDelete(enquiry._id)}
            disabled={isAreaLocked}
            className="w-full cursor-pointer flex items-center justify-center gap-2 border border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {isThisEnquiry && pendingAction.action === "delete" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : <Trash2 size={13} />}
            Delete Enquiry
          </button>
        </div>
      </div>
    </div>
  );
}
