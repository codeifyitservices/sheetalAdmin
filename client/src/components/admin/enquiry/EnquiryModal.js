import React, { useState, useEffect } from "react";
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
  Send,
  Eye,
  EyeOff,
} from "lucide-react";
import DetailRow from "./DetailRow";
import { STATUS_STYLES } from "./enquiryConstants";
import { formatEnquiryDate } from "@/services/enquiryService";
import { getSettings } from "@/services/settingsService";

export default function EnquiryModal({
  enquiry,
  onClose,
  onStatusChange,
  onDelete,
  pendingAction,
  type = "notify",
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [template, setTemplate] = useState("");

  const isThisEnquiry = pendingAction?.id === enquiry._id;
  const isAreaLocked = isThisEnquiry;

  useEffect(() => {
    if (isReplying && !template) {
      (async () => {
        try {
          const res = await getSettings();
          if (res.success) {
            setTemplate(
              type === "contact" 
                ? res.data.contactEnquiryReplyEmailTemplate 
                : res.data.notifyBackInStockEmailTemplate 
                || ""
            );
          }
        } catch (e) { console.error("Failed to load template", e); }
      })();
    }
  }, [isReplying, template, type]);

  const getPreviewHtml = () => {
    if (!template) return "";
    let html = template
      .replaceAll("{{name}}", enquiry.name)
      .replaceAll("{{productName}}", enquiry.productName || "");

    if (type === "contact") {
      html = html.replaceAll("{{query}}", enquiry.query || "")
                 .replaceAll("{{reply}}", replyText || "(Your reply will appear here)");
    } else {
      const prodImg = enquiry.product?.mainImage?.url || "https://placehold.co/400x600?text=Product+Image";
      
      // Try to build a realistic URL for preview
      const baseUrl = window.location.origin.replace("admin.", "").replace(":3001", ":3000"); // Rough guess for storefront
      const categorySlug = enquiry.product?.category?.slug;
      const productSlug = enquiry.product?.slug;
      
      let prodUrl = "#";
      if (productSlug) {
        prodUrl = categorySlug 
          ? `${baseUrl}/${categorySlug}/${productSlug}`
          : `${baseUrl}/product/${productSlug}`;
      }

      html = html.replaceAll("{{size}}", enquiry.size || "")
                 .replaceAll("{{productImage}}", prodImg)
                 .replaceAll("{{productUrl}}", prodUrl)
                 .replaceAll("{{reply}}", replyText || ""); 
    }
    return html;
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    await onStatusChange(enquiry._id, "replied", false, replyText.trim());
    setIsReplying(false);
    setReplyText("");
  };

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
          {type === "contact" ? (
            <>
              <DetailRow icon={MessageSquare} label="Query" value={enquiry.query} />
              {enquiry.reply && (
                <DetailRow icon={Send} label="Our Reply" value={enquiry.reply} />
              )}
            </>
          ) : (
            <>
              <DetailRow icon={Package} label="Product" value={enquiry.productName} />
              <DetailRow icon={Ruler} label="Size" value={enquiry.size} />
              {enquiry.message && (
                <DetailRow icon={MessageSquare} label="Message" value={enquiry.message} />
              )}
            </>
          )}
        </div>

        {/* Reply Section (Contact Only) */}
        {type === "contact" && isReplying && (
          <div className="px-6 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {isPreviewing ? "Email Preview" : "Type Your Reply"}
              </p>
              <button
                onClick={() => setIsPreviewing(!isPreviewing)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                {isPreviewing ? (
                  <><EyeOff size={12} /> Edit Text</>
                ) : (
                  <><Eye size={12} /> Preview Mail</>
                )}
              </button>
            </div>

            {isPreviewing ? (
              <div className="w-full min-h-[200px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden relative group">
                <iframe
                  title="Reply Preview"
                  srcDoc={getPreviewHtml()}
                  className="w-full h-[300px] border-0"
                />
                <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 pointer-events-none transition-colors" />
              </div>
            ) : (
              <textarea
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all resize-none"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSendReply}
                disabled={isAreaLocked}
                className="flex-1 cursor-pointer bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isThisEnquiry && pendingAction.targetStatus === "replied" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : <Send size={13} />}
                Send Reply
              </button>
              <button
                onClick={() => { setIsReplying(false); setIsPreviewing(false); }}
                disabled={isAreaLocked}
                className="px-4 cursor-pointer bg-slate-100 text-slate-600 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          {type === "contact" && (
            <>
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

                  const label = s === "replied" ? "reply" : s;

                  return (
                    <button
                      key={s}
                      onClick={() => {
                        if (s === "replied") {
                          setIsReplying(true);
                        } else {
                          onStatusChange(enquiry._id, s);
                        }
                      }}
                      disabled={(isCurrentStatus && s !== "replied") || isAreaLocked}
                      className={`px-4 cursor-pointer py-2 rounded-xl text-xs font-bold capitalize transition-all border disabled:cursor-not-allowed
                        ${isCurrentStatus
                          ? STATUS_STYLES[s] + " opacity-100"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400"
                        }`}
                    >
                      {isThisButtonSpinning ? (
                        <Loader2 size={12} className="animate-spin inline" />
                      ) : label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <button
            onClick={() => onDelete(enquiry._id)}
            disabled={isAreaLocked}
            className="w-full cursor-pointer flex items-center justify-center gap-2 border border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {isThisEnquiry && pendingAction.action === "delete" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : <Trash2 size={13} />}
            Delete {type === "contact" ? "Contact Enquiry" : "Enquiry"}
          </button>
        </div>
      </div>
    </div>
  );
}
