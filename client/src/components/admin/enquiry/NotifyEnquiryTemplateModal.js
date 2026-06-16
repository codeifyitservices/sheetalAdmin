"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, Eye, Code2, RotateCcw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getSettings, updateSettings } from "@/services/settingsService";

const DEFAULT_NOTIFY_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Back In Stock – Studio By Sheetal</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    body { margin:0; padding:0; background:#F0EDE8; font-family:'Inter',Arial,sans-serif; color:#1a1208; -webkit-font-smoothing:antialiased; }
    a { color:inherit; text-decoration:none; }
    img { border:0; display:block; }
    table { border-collapse:collapse; }
  </style>
</head>
<body style="margin:0;padding:0;background:#F0EDE8;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0EDE8;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background:#ffffff;border-radius:20px 20px 0 0;padding:22px 36px;border-bottom:1px solid #ede8e0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;">
            <div style="width:36px;height:36px;background:#1a1208;border-radius:10px;text-align:center;line-height:36px;font-family:'DM Serif Display',Georgia,serif;font-size:16px;color:#d4b996;display:inline-block;">S</div>
          </td>
          <td style="vertical-align:middle;padding-left:11px;">
            <div style="font-family:'DM Serif Display',Georgia,serif;font-size:19px;color:#1a1208;letter-spacing:-0.2px;line-height:1.2;">Studio By Sheetal</div>
            <div style="font-size:10px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;color:#b8a898;margin-top:1px;">Couture &amp; Design</div>
          </td>
        </tr></table>
      </td>
      <td align="right" style="vertical-align:middle;">
        <span style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#4a7c59;background:#e8f5ee;border:1px solid #c2dece;padding:5px 13px;border-radius:20px;display:inline-block;">&#10003; Back In Stock</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- HERO -->
  <tr><td style="background:#1a1208;padding:52px 40px 48px;text-align:center;">
    <div style="margin:0 auto 28px auto;width:72px;height:72px;border-radius:50%;border:1px solid rgba(212,185,150,.35);display:table;text-align:center;">
      <div style="display:table-cell;vertical-align:middle;">
        <div style="width:52px;height:52px;border-radius:50%;background:rgba(212,185,150,.15);border:1px solid rgba(212,185,150,.3);margin:0 auto;text-align:center;line-height:52px;font-size:22px;color:#d4b996;">&#127873;</div>
      </div>
    </div>
    <div style="font-family:'DM Serif Display',Georgia,serif;font-size:38px;color:#ffffff;line-height:1.15;margin-bottom:14px;font-weight:400;">Good news,<br/><em style="font-style:italic;color:#d4b996;">it&rsquo;s back!</em></div>
    <div style="font-size:15px;color:rgba(255,255,255,.6);max-width:360px;margin:0 auto;line-height:1.65;">Hello <strong style="color:rgba(255,255,255,.9);font-weight:600;">{{name}}</strong>, the item you had your eye on is back in stock. We&rsquo;ve reserved this moment just for you &mdash; don&rsquo;t let it slip away again.</div>
  </td></tr>

  <!-- GOLD RIBBON -->
  <tr><td height="4" style="background:#c9a96e;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td></tr>

  <!-- BODY -->
  <tr><td style="background:#ffffff;padding:40px 40px 36px;">

    <!-- PRODUCT CARD -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e8e0d4;border-radius:16px;overflow:hidden;margin-bottom:28px;">
      <tr><td style="background:#1a1208;padding:13px 20px;">
        <span style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#d4b996;">YOUR ITEM</span>
      </td></tr>
      <tr><td style="padding:24px;background:#fdfbf8;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="110" valign="top">
            <img src="{{productImage}}" width="110" alt="{{productName}}" style="width:110px;height:148px;object-fit:cover;border-radius:10px;border:1px solid #e8e0d4;display:block;"/>
          </td>
          <td valign="top" style="padding-left:20px;">
            <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#b8a898;margin-bottom:6px;">Now Available</div>
            <div style="font-family:'DM Serif Display',Georgia,serif;font-size:20px;color:#1a1208;line-height:1.3;margin-bottom:10px;">{{productName}}</div>
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
              <tr>
                <td style="padding-right:16px;">
                  <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#b8a898;margin-bottom:3px;">Size</div>
                  <div style="font-size:14px;font-weight:700;color:#1a1208;">{{size}}</div>
                </td>
                <td>
                  <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#b8a898;margin-bottom:3px;">Status</div>
                  <div style="font-size:14px;font-weight:700;color:#4a7c59;">In Stock</div>
                </td>
              </tr>
            </table>
            <a href="{{productUrl}}" style="display:inline-block;background:#1a1208;color:#d4b996;padding:11px 22px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:.3px;">Shop Now &rarr;</a>
          </td>
        </tr></table>
      </td></tr>
    </table>

    <!-- URGENCY STRIP -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr><td style="background:#fef3c7;border:1px solid #f5d98a;border-radius:12px;padding:14px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle" style="font-size:18px;width:28px;">&#9889;</td>
          <td valign="middle" style="padding-left:10px;">
            <div style="font-size:13px;font-weight:700;color:#92692a;margin-bottom:2px;">Limited Stock Available</div>
            <div style="font-size:12px;color:#a07830;line-height:1.5;">Items like this tend to sell out quickly. We recommend securing yours at the earliest.</div>
          </td>
        </tr></table>
      </td></tr>
    </table>

    <!-- OPTIONAL NOTE FROM TEAM -->

    <!-- CTA BUTTONS -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
      <tr>
        <td width="48%" style="padding-right:8px;">
          <a href="{{productUrl}}" style="display:block;background:#1a1208;color:#d4b996;text-align:center;padding:15px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.3px;">Buy Now</a>
        </td>
        <td width="4%"></td>
        <td width="48%" style="padding-left:8px;">
          <a href="mailto:info@studiobysheetal.com" style="display:block;background:#fff;color:#1a1208;text-align:center;padding:14px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.3px;border:1.5px solid #d6cdc0;">Contact Us</a>
        </td>
      </tr>
    </table>

    <!-- DIVIDER -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr><td height="1" style="background:#ede8e0;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>

    <!-- CONTACT -->
    <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#b8a898;margin-bottom:8px;">Need Help?</div>
    <div style="font-size:16px;font-weight:700;color:#1a1208;margin-bottom:4px;">Studio By Sheetal</div>
    <div style="font-size:13px;color:#6e5e4a;line-height:1.6;">info@studiobysheetal.com<br/>Available Mon&ndash;Sat, 10am&ndash;7pm</div>

  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1a1208;border-radius:0 0 20px 20px;padding:40px 40px 36px;text-align:center;">
    <div style="font-family:'DM Serif Display',Georgia,serif;font-size:20px;color:#fff;margin-bottom:4px;">Studio By Sheetal</div>
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9a96e;margin-bottom:28px;">Couture &amp; Bespoke Design</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr><td height="1" style="background:rgba(212,185,150,.2);font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:24px;">
      <tr>
        <td style="padding:0 12px;"><a href="#" style="font-size:12px;color:#7a6a58;text-decoration:none;font-weight:500;">About</a></td>
        <td style="padding:0 12px;"><a href="#" style="font-size:12px;color:#7a6a58;text-decoration:none;font-weight:500;">Collections</a></td>
        <td style="padding:0 12px;"><a href="#" style="font-size:12px;color:#7a6a58;text-decoration:none;font-weight:500;">Shop</a></td>
        <td style="padding:0 12px;"><a href="#" style="font-size:12px;color:#7a6a58;text-decoration:none;font-weight:500;">Support</a></td>
        <td style="padding:0 12px;"><a href="#" style="font-size:12px;color:#7a6a58;text-decoration:none;font-weight:500;">Privacy</a></td>
      </tr>
    </table>
    <div style="font-size:11.5px;color:#4a3e30;line-height:1.9;">
      &copy; {{year}} Studio By Sheetal. All rights reserved.<br/>
      You&rsquo;re receiving this because you requested a restock notification.<br/>
      <a href="#" style="color:#6a5a48;text-decoration:underline;">Unsubscribe</a> &middot; <a href="#" style="color:#6a5a48;text-decoration:underline;">Update Preferences</a>
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

const VARIABLES = [
  "{{name}}",
  "{{productName}}",
  "{{size}}",
  "{{productImage}}",
  "{{productUrl}}",
  "{{reply}}",
  "{{year}}",
];

export default function NotifyEnquiryTemplateModal({ onClose, onSave }) {
  const [tab, setTab] = useState("preview");
  const [template, setTemplate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSettings();
        if (res.success) {
          setTemplate(
            res.data.notifyBackInStockEmailTemplate || DEFAULT_NOTIFY_TEMPLATE,
          );
        } else {
          setTemplate(DEFAULT_NOTIFY_TEMPLATE);
        }
      } catch {
        setTemplate(DEFAULT_NOTIFY_TEMPLATE);
        toast.error("Failed to load template");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (tab !== "preview" || !iframeRef.current || isLoading) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(template);
    doc.close();

    const enableEditing = () => {
      try {
        doc
          .querySelectorAll("div, td, span, p, a, h1, h2, h3, em, strong")
          .forEach((el) => {
            if (
              ["TABLE", "TBODY", "TR", "HTML", "BODY", "HEAD", "STYLE"].includes(
                el.tagName,
              )
            )
              return;
            const hasBlockChild = Array.from(el.children).some((c) =>
              ["DIV", "TABLE", "TR", "TD", "P", "UL", "OL"].includes(c.tagName),
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
  }, [tab, template, isLoading]);

  const syncFromIframe = () => {
    try {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      let html = doc.documentElement.outerHTML;
      html = html.replace(/\s*contenteditable="true"/g, "");
      html = html.replace(/\s*style="[^"]*box-shadow:[^"]*"/g, (m) =>
        m.replace(/;?\s*box-shadow:[^;"]*/g, "").replace(/style="\s*"/, ""),
      );
      setTemplate(html);
    } catch (e) {
      console.warn("Sync error:", e);
    }
  };

  const handleSave = async () => {
    if (tab === "preview") syncFromIframe();
    setIsSaving(true);
    try {
      const res = await updateSettings({
        notifyBackInStockEmailTemplate: template,
      });
      if (res.success) {
        toast.success("Template saved");
        onSave?.();
        onClose();
      }
    } catch {
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset this template to default?")) {
      setTemplate(DEFAULT_NOTIFY_TEMPLATE);
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
              Back In Stock Email Template
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Edit the rich notification sent when products are restocked
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* TAB BAR */}
        <div className="flex items-center px-6 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex gap-1">
            <button
              onClick={() => {
                syncFromIframe();
                setTab("preview");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === "preview" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-white/60"}`}
            >
              <Eye size={13} /> Preview
            </button>
            <button
              onClick={() => {
                syncFromIframe();
                setTab("code");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === "code" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-white/60"}`}
            >
              <Code2 size={13} /> Code
            </button>
          </div>
        </div>

        {/* VARIABLES BAR */}
        <div className="flex flex-wrap items-center gap-1.5 px-6 py-2.5 border-b border-slate-100 bg-amber-50/40 shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mr-1">
            Variables:
          </span>
          {VARIABLES.map((v) => (
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
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
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
            {isSaving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}{" "}
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}