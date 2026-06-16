"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, Eye, Code2, RotateCcw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getSettings, updateSettings } from "@/services/settingsService";

const DEFAULT_PROGRESS_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #0f172a; }
    .footer { margin-top: 30px; font-size: 14px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Enquiry Received</div>
    <p>Dear {{name}},</p>
    <p>Your query: "<strong>{{query}}</strong>" has been submitted and is under progress.</p>
    <p>We will get back to you shortly.</p>
    <div class="footer">
      Best regards,<br>
      Studio By Sheetal
    </div>
  </div>
</body>
</html>`;

const DEFAULT_REPLY_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #0f172a; }
    .reply-box { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0f172a; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 14px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Reply to your enquiry</div>
    <p>Dear {{name}},</p>
    <p>In response to your query: "<strong>{{query}}</strong>"</p>
    <div class="reply-box">
      <strong>Our reply:</strong><br>
      {{reply}}
    </div>
    <div class="footer">
      Best regards,<br>
      Studio By Sheetal
    </div>
  </div>
</body>
</html>`;

const VARIABLES_BY_TYPE = {
  progress: ["{{name}}", "{{query}}"],
  reply: ["{{name}}", "{{query}}", "{{reply}}"],
};

export default function ContactEnquiryTemplateModal({ onClose, onSave }) {
  const [activeTemplateType, setActiveTemplateType] = useState("progress");
  const [tab, setTab] = useState("preview");
  const [templates, setTemplates] = useState({ progress: "", reply: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSettings();
        if (res.success) {
          setTemplates({
            progress: res.data.contactEnquiryProgressEmailTemplate || DEFAULT_PROGRESS_TEMPLATE,
            reply: res.data.contactEnquiryReplyEmailTemplate || DEFAULT_REPLY_TEMPLATE,
          });
        } else {
          setTemplates({ progress: DEFAULT_PROGRESS_TEMPLATE, reply: DEFAULT_REPLY_TEMPLATE });
        }
      } catch {
        setTemplates({ progress: DEFAULT_PROGRESS_TEMPLATE, reply: DEFAULT_REPLY_TEMPLATE });
        toast.error("Failed to load templates");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const currentTemplate = templates[activeTemplateType];

  useEffect(() => {
    if (tab !== "preview" || !iframeRef.current || isLoading) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(currentTemplate);
    doc.close();

    const enableEditing = () => {
      try {
        doc.querySelectorAll("div, td, span, p, a, h1, h2, h3, em, strong").forEach((el) => {
          if (["TABLE", "TBODY", "TR", "HTML", "BODY", "HEAD", "STYLE"].includes(el.tagName)) return;
          const hasBlockChild = Array.from(el.children).some((c) =>
            ["DIV", "TABLE", "TR", "TD", "P", "UL", "OL"].includes(c.tagName)
          );
          if (!hasBlockChild) {
            el.contentEditable = "true";
            el.style.outline = "none";
            el.style.cursor = "text";
            el.addEventListener("focus", () => {
              el.style.boxShadow = "0 0 0 2px rgba(15, 23, 42, 0.2)";
              el.style.borderRadius = "3px";
            });
            el.addEventListener("blur", () => {
              el.style.boxShadow = "";
              syncFromIframe();
            });
          }
        });
      } catch (e) {
        console.warn("Could not enable editing:", e);
      }
    };

    iframe.onload = enableEditing;
    setTimeout(enableEditing, 150);
  }, [tab, activeTemplateType, currentTemplate, isLoading]);

  const syncFromIframe = () => {
    try {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      let html = doc.documentElement.outerHTML;
      html = html.replace(/\s*contenteditable="true"/g, "");
      html = html.replace(/\s*style="[^"]*box-shadow:[^"]*"/g, (m) =>
        m.replace(/;?\s*box-shadow:[^;"]*/g, "").replace(/style="\s*"/, "")
      );
      setTemplates((prev) => ({ ...prev, [activeTemplateType]: html }));
    } catch (e) {
      console.warn("Sync error:", e);
    }
  };

  const handleSave = async () => {
    if (tab === "preview") syncFromIframe();
    setIsSaving(true);
    try {
      const res = await updateSettings({
        contactEnquiryProgressEmailTemplate: templates.progress,
        contactEnquiryReplyEmailTemplate: templates.reply,
      });
      if (res.success) {
        toast.success("Templates saved");
        onSave?.();
        onClose();
      }
    } catch {
      toast.error("Failed to save templates");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset this template to default?")) {
      const defaultTpl = activeTemplateType === "progress" ? DEFAULT_PROGRESS_TEMPLATE : DEFAULT_REPLY_TEMPLATE;
      setTemplates((prev) => ({ ...prev, [activeTemplateType]: defaultTpl }));
      toast.success("Template reset");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col animate-in zoom-in-95 duration-200"
        style={{ height: "90vh" }}
      >
        {/* TITLE BAR */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
              Contact Enquiry Email Templates
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Edit templates for automated notifications and manual replies
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition">
            <X size={16} />
          </button>
        </div>

        {/* TAB + TEMPLATE TYPE BAR */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex gap-1">
            <button
              onClick={() => { syncFromIframe(); setTab("preview"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === "preview" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-white/60"}`}
            >
              <Eye size={13} /> Preview
            </button>
            <button
              onClick={() => { syncFromIframe(); setTab("code"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === "code" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-white/60"}`}
            >
              <Code2 size={13} /> Code
            </button>
          </div>

          <div className="flex bg-slate-200/50 p-1 rounded-xl">
            <button
              onClick={() => { syncFromIframe(); setActiveTemplateType("progress"); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTemplateType === "progress" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Progress Mail
            </button>
            <button
              onClick={() => { syncFromIframe(); setActiveTemplateType("reply"); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTemplateType === "reply" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Reply Mail
            </button>
          </div>
        </div>

        {/* VARIABLES BAR */}
        <div className="flex flex-wrap items-center gap-1.5 px-6 py-2.5 border-b border-slate-100 bg-amber-50/40 shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mr-1">
            Variables:
          </span>
          {VARIABLES_BY_TYPE[activeTemplateType].map((v) => (
            <code
              key={v}
              className="text-[9px] bg-white border border-amber-200 px-1.5 py-0.5 rounded text-amber-700 font-mono shadow-sm"
            >
              {v}
            </code>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-slate-300" size={32} />
            </div>
          ) : tab === "preview" ? (
            <iframe
              ref={iframeRef}
              title="Email Preview"
              sandbox="allow-same-origin allow-scripts"
              className="w-full h-full border-0"
            />
          ) : (
            <textarea
              value={currentTemplate}
              onChange={(e) => setTemplates((prev) => ({ ...prev, [activeTemplateType]: e.target.value }))}
              className="w-full h-full text-xs font-mono p-6 bg-slate-950 text-emerald-400 outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/40 shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 border border-rose-200 text-rose-500 text-xs font-bold rounded-xl hover:bg-rose-50 transition"
          >
            <RotateCcw size={13} /> Reset
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Templates
          </button>
        </div>
      </div>
    </div>
  );
}