"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  Search,
  Trash2,
  X,
  MapPin,
  Phone,
  Mail,
  Calendar,
  FileText,
  ChevronDown,
  User,
  Clock,
  ThumbsUp,
  AlertCircle,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  Eye,
  Code2,
  RotateCcw,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  fetchAppointments,
  deleteAppointment,
  updateAppointmentStatus,
  updateAppointmentNotes,
  deriveAppointmentCounts,
} from "@/services/appointmentService";
import { getSettings, updateSettings } from "@/services/settingsService";
import ReportExportMenu from "@/components/admin/common/ReportExportMenu";
import { downloadCsvReport, downloadPdfReport } from "@/utils/reportExport";

// ─── Email-client-safe default template (table-based, no flex/grid) ──────────
const DEFAULT_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Appointment Confirmed – Studio By Sheetal</title>
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
          <!-- Logo: text-based fallback, no broken image -->
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
        <span style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#4a7c59;background:#e8f5ee;border:1px solid #c2dece;padding:5px 13px;border-radius:20px;display:inline-block;">&#10003; Confirmed</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- HERO -->
  <tr><td style="background:#1a1208;padding:52px 40px 48px;text-align:center;">

    <!-- Check ring: pure CSS circles using divs, no <td> border-radius -->
    <div style="margin:0 auto 28px auto;width:72px;height:72px;border-radius:50%;border:1px solid rgba(212,185,150,.35);display:table;text-align:center;">
      <div style="display:table-cell;vertical-align:middle;">
        <div style="width:52px;height:52px;border-radius:50%;background:rgba(212,185,150,.15);border:1px solid rgba(212,185,150,.3);margin:0 auto;text-align:center;line-height:52px;font-size:22px;color:#d4b996;font-weight:700;">&#10003;</div>
      </div>
    </div>

    <div style="font-family:'DM Serif Display',Georgia,serif;font-size:38px;color:#ffffff;line-height:1.15;margin-bottom:14px;font-weight:400;">Ready for your<br/><em style="font-style:italic;color:#d4b996;">session?</em></div>
    <div style="font-size:15px;color:rgba(255,255,255,.6);max-width:360px;margin:0 auto;line-height:1.65;">Hello <strong style="color:rgba(255,255,255,.9);font-weight:600;">{{name}}</strong>, your appointment with Studio By Sheetal has been confirmed. We&#39;ve reserved this time exclusively for you.</div>
  </td></tr>

  <!-- GOLD RIBBON -->
  <tr><td height="4" style="background:#c9a96e;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td></tr>

  <!-- BODY -->
  <tr><td style="background:#ffffff;padding:40px 40px 36px;">

    <!-- DETAILS BOX -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e8e0d4;border-radius:16px;overflow:hidden;margin-bottom:28px;">
      <tr><td colspan="2" style="background:#1a1208;padding:13px 20px;">
        <span style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#d4b996;">APPOINTMENT DETAILS</span>
      </td></tr>
      <tr>
        <td width="50%" valign="top" style="padding:20px 22px;border-right:1px solid #ede8e0;border-bottom:1px solid #ede8e0;background:#fdfbf8;">
          <div style="font-size:18px;margin-bottom:8px;">&#128197;</div>
          <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#b8a898;margin-bottom:5px;">Date</div>
          <div style="font-size:15px;font-weight:700;color:#1a1208;">{{date}}</div>
        </td>
        <td width="50%" valign="top" style="padding:20px 22px;border-bottom:1px solid #ede8e0;background:#fdfbf8;">
          <div style="font-size:18px;margin-bottom:8px;">&#128336;</div>
          <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#b8a898;margin-bottom:5px;">Time</div>
          <div style="font-size:15px;font-weight:700;color:#1a1208;">{{time}}</div>
          <div style="font-size:12px;color:#9a8878;margin-top:3px;">Studio session</div>
        </td>
      </tr>
      <tr>
        <td width="50%" valign="top" style="padding:20px 22px;border-right:1px solid #ede8e0;background:#fdfbf8;">
          <div style="font-size:18px;margin-bottom:8px;">&#128278;</div>
          <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#b8a898;margin-bottom:5px;">Reference ID</div>
          <div style="font-size:15px;font-weight:700;color:#1a1208;">#{{id}}</div>
          <div style="font-size:12px;color:#9a8878;margin-top:3px;">Keep this handy</div>
        </td>
        <td width="50%" valign="top" style="padding:20px 22px;background:#fdfbf8;">
          <div style="font-size:18px;margin-bottom:8px;">&#10024;</div>
          <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#b8a898;margin-bottom:5px;">Service Type</div>
          <div style="font-size:15px;font-weight:700;color:#1a1208;">Studio Consultation</div>
          <div style="font-size:12px;color:#9a8878;margin-top:3px;">In-person visit</div>
        </td>
      </tr>
    </table>

    <!-- TEAM CARD -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdfbf8;border:1px solid #e8e0d4;border-radius:16px;margin-bottom:28px;">
      <tr>
        <td valign="middle" width="52" style="padding:18px 0 18px 20px;">
          <div style="width:52px;height:52px;border-radius:14px;background:#1a1208;text-align:center;line-height:52px;font-family:'DM Serif Display',Georgia,serif;font-size:18px;color:#d4b996;">ST</div>
        </td>
        <td valign="middle" style="padding:18px 20px;">
          <div style="font-weight:700;font-size:15px;color:#1a1208;margin-bottom:2px;">Studio By Sheetal Team</div>
          <div style="font-size:12px;color:#9a8878;margin-bottom:8px;">Lead Design Consultant</div>
          <span style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#8a6020;background:#fef3c7;border:1px solid #f5d98a;padding:3px 8px;border-radius:6px;display:inline-block;">&#11088; 4.9 &middot; Top Rated</span>
        </td>
      </tr>
    </table>

    <!-- REQUIREMENTS -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr><td style="background:#f8f5f0;border-left:3px solid #c9a96e;padding:14px 18px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#b8a898;margin-bottom:6px;">Your Requirements</div>
        <div style="font-size:14px;color:#3a2e20;line-height:1.6;font-style:italic;">&ldquo;{{requirements}}&rdquo;</div>
      </td></tr>
    </table>

    <!-- WHAT TO EXPECT -->
    <div style="font-family:'DM Serif Display',Georgia,serif;font-size:22px;color:#1a1208;margin-bottom:20px;font-weight:400;">What to expect</div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr><td style="padding:14px 0;border-bottom:1px solid #f0ebe3;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td valign="top" width="26">
            <div style="width:26px;height:26px;border-radius:13px;background:#1a1208;color:#d4b996;font-size:11px;font-weight:700;text-align:center;line-height:26px;">1</div>
          </td>
          <td valign="top" style="padding-left:14px;">
            <div style="font-size:14px;font-weight:700;color:#1a1208;margin-bottom:3px;">Arrive Early</div>
            <div style="font-size:13px;color:#6e5e4a;line-height:1.55;">Please try to arrive 10&ndash;15 minutes before your scheduled slot. We&rsquo;ll have a refreshment waiting for you as you settle in.</div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 0;border-bottom:1px solid #f0ebe3;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td valign="top" width="26">
            <div style="width:26px;height:26px;border-radius:13px;background:#1a1208;color:#d4b996;font-size:11px;font-weight:700;text-align:center;line-height:26px;">2</div>
          </td>
          <td valign="top" style="padding-left:14px;">
            <div style="font-size:14px;font-weight:700;color:#1a1208;margin-bottom:3px;">Bring Inspiration</div>
            <div style="font-size:13px;color:#6e5e4a;line-height:1.55;">Feel free to bring reference images or fabric swatches that inspire your vision for the perfect ensemble.</div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td valign="top" width="26">
            <div style="width:26px;height:26px;border-radius:13px;background:#1a1208;color:#d4b996;font-size:11px;font-weight:700;text-align:center;line-height:26px;">3</div>
          </td>
          <td valign="top" style="padding-left:14px;">
            <div style="font-size:14px;font-weight:700;color:#1a1208;margin-bottom:3px;">Your Session</div>
            <div style="font-size:13px;color:#6e5e4a;line-height:1.55;">Our team will walk you through curated options tailored to your requirements. Expect a relaxed, personalised experience.</div>
          </td>
        </tr></table>
      </td></tr>
    </table>

    <!-- CTAs -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
      <tr>
        <td width="48%" style="padding-right:8px;">
          <a href="#" style="display:block;background:#1a1208;color:#d4b996;text-align:center;padding:15px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.3px;">Add to Calendar</a>
        </td>
        <td width="4%"></td>
        <td width="48%" style="padding-left:8px;">
          <a href="mailto:info@studiobysheetal.com" style="display:block;background:#fff;color:#1a1208;text-align:center;padding:14px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.3px;border:1.5px solid #d6cdc0;">Contact Team</a>
        </td>
      </tr>
    </table>

    <!-- DIVIDER -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr><td height="1" style="background:#ede8e0;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>

    <!-- LOCATION -->
    <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#b8a898;margin-bottom:8px;">Studio Location</div>
    <div style="font-size:16px;font-weight:700;color:#1a1208;margin-bottom:4px;">Studio By Sheetal</div>
    <div style="font-size:13px;color:#6e5e4a;line-height:1.6;margin-bottom:16px;">Studio By Sheetal Address<br/>000000</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td height="130" style="border-radius:14px;background:#ede5d8;border:1px solid #d6cdc0;text-align:center;vertical-align:middle;color:#8a7260;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
        &#128205; Map Preview
      </td></tr>
    </table>

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
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom:28px;">
      <tr>
        <td style="padding:0 5px;"><a href="#" style="display:inline-block;width:34px;height:34px;border-radius:8px;background:rgba(212,185,150,.08);border:1px solid rgba(212,185,150,.15);text-align:center;line-height:34px;color:#7a6a58;font-size:14px;text-decoration:none;">&#120143;</a></td>
        <td style="padding:0 5px;"><a href="#" style="display:inline-block;width:34px;height:34px;border-radius:8px;background:rgba(212,185,150,.08);border:1px solid rgba(212,185,150,.15);text-align:center;line-height:34px;color:#7a6a58;font-size:14px;text-decoration:none;">f</a></td>
        <td style="padding:0 5px;"><a href="#" style="display:inline-block;width:34px;height:34px;border-radius:8px;background:rgba(212,185,150,.08);border:1px solid rgba(212,185,150,.15);text-align:center;line-height:34px;color:#7a6a58;font-size:14px;text-decoration:none;">&#9711;</a></td>
      </tr>
    </table>
    <div style="font-size:11.5px;color:#4a3e30;line-height:1.9;">
      &copy; {{year}} Studio By Sheetal. All rights reserved.<br/>
      You&rsquo;re receiving this because you booked an appointment with us.<br/>
      <a href="#" style="color:#6a5a48;text-decoration:underline;">Unsubscribe</a> &middot; <a href="#" style="color:#6a5a48;text-decoration:underline;">Update Preferences</a>
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

// ─── Sample preview data (replaces {{variables}} in preview mode) ─────────────
const PREVIEW_DATA = {
  name: "USER",
  date: "Wednesday, July 9",
  time: "12:30 PM",
  id: "F1234A",
  requirements:
    "Looking for a bridal lehenga with pastel tones and heavy embroidery for a June wedding.",
  address: "42 Fashion Street, Sector 18",
  city: "Noida",
  pincode: "201301",
  contact: "+91 98765 43210",
  year: new Date().getFullYear(),
  bannerMarkup:
    '<img src="/favicon.png" width="36" height="36" alt="Logo" style="border-radius:8px;" />',
};

function fillPreviewData(template) {
  let result = template;
  Object.entries(PREVIEW_DATA).forEach(([key, val]) => {
    result = result.replaceAll(`{{${key}}}`, val);
  });
  return result;
}

// ─── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700 border border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  cancelled: "bg-rose-100 text-rose-500 border border-rose-200",
};
const STATUS_OPTIONS = ["all", "pending", "confirmed", "cancelled"];

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-500" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        <p className="text-sm text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Email Template Modal ──────────────────────────────────────────────────────
function EmailTemplateModal({ onClose, onSave }) {
  const [tab, setTab] = useState("preview");
  const [emailTemplate, setEmailTemplate] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSettings();
        if (res.success) {
          setEmailTemplate(
            res.data.appointmentEmailTemplate || DEFAULT_EMAIL_TEMPLATE,
          );
        } else {
          setEmailTemplate(DEFAULT_EMAIL_TEMPLATE);
        }
      } catch {
        setEmailTemplate(DEFAULT_EMAIL_TEMPLATE);
        toast.error("Failed to load email template");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (tab !== "preview" || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Write raw template — variables like {{name}} stay visible as-is
    doc.open();
    doc.write(emailTemplate);
    doc.close();

    const enableEditing = () => {
      try {
        doc
          .querySelectorAll("div, td, span, p, a, h1, h2, h3, em, strong")
          .forEach((el) => {
            if (
              ["TABLE", "TBODY", "TR", "HTML", "BODY", "HEAD"].includes(
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
                el.style.boxShadow = "0 0 0 2px rgba(201,169,110,0.5)";
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
  }, [tab, emailTemplate]);

  const syncFromIframe = () => {
    try {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      let html = doc.documentElement.outerHTML;
      // No reverse-substitution needed — variables were never replaced
      html = html.replace(/\s*contenteditable="true"/g, "");
      html = html.replace(/\s*style="[^"]*box-shadow:[^"]*"/g, (m) =>
        m.replace(/;?\s*box-shadow:[^;"]*/g, "").replace(/style="\s*"/, ""),
      );
      setEmailTemplate(html);
    } catch (e) {
      console.warn("Sync error:", e);
    }
  };

  const handleSave = async () => {
    syncFromIframe();
    setIsSavingTemplate(true);
    try {
      const res = await updateSettings({
        appointmentEmailTemplate: emailTemplate,
      });
      if (res.success) {
        toast.success("Email template saved");
        onSave?.();
        onClose();
      }
    } catch {
      toast.error("Failed to save template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        "Reset template to the default design? All changes will be lost.",
      )
    ) {
      setEmailTemplate(DEFAULT_EMAIL_TEMPLATE);
      toast.success("Template reset to default");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col animate-in zoom-in-95 duration-200"
        style={{ height: "90vh" }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
              Confirmation Email Template
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Click any text in the preview to edit it directly · Variables like{" "}
              <code className="bg-amber-50 border border-amber-200 px-1 rounded text-amber-700 font-mono">
                {"{{name}}"}
              </code>{" "}
              will be replaced with real data when sent
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <button
            onClick={() => {
              syncFromIframe();
              setTab("preview");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "preview"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
            }`}
          >
            <Eye size={13} />
            Preview
            {tab === "preview" && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full uppercase tracking-wide">
                Editable
              </span>
            )}
          </button>
          <button
            onClick={() => {
              syncFromIframe();
              setTab("code");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "code"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
            }`}
          >
            <Code2 size={13} />
            HTML Code
          </button>

          {/* Variables pill */}
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-400 font-semibold">
              Variables:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                "{{name}}",
                "{{date}}",
                "{{time}}",
                "{{id}}",
                "{{requirements}}",
                "{{address}}",
                "{{city}}",
                "{{pincode}}",
                "{{year}}",
              ].map((v) => (
                <code
                  key={v}
                  className="text-[9px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-amber-700 font-mono"
                >
                  {v}
                </code>
              ))}
            </div>
          </div>
        </div>

        {/* Content area */}
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
              style={{ background: "#F0EDE8" }}
            />
          ) : (
            <div className="h-full flex flex-col">
              <textarea
                value={emailTemplate}
                onChange={(e) => setEmailTemplate(e.target.value)}
                className="flex-1 w-full text-xs font-mono text-slate-700 bg-slate-950 text-green-300 px-6 py-5 outline-none resize-none leading-relaxed"
                style={{
                  fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                }}
                spellCheck={false}
                placeholder="Paste or edit your HTML template here..."
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/40 shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 border border-rose-200 text-rose-500 text-xs font-bold rounded-xl hover:bg-rose-50 transition cursor-pointer"
          >
            <RotateCcw size={13} />
            Reset to Default
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSavingTemplate}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
          >
            {isSavingTemplate ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [savingNotesId, setSavingNotesId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmDate, setConfirmDate] = useState("");
  const [confirmTime, setConfirmTime] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const fetchAppointmentsList = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAppointments({
        status: statusFilter,
        search,
        page: currentPage,
        limit: rowsPerPage,
      });
      if (data.success) {
        setAppointments(data.appointments);
        setTotalPages(data.pagination.totalPages);
        setTotalAppointments(data.pagination.totalAppointments);
      }
      const allData = await fetchAppointments({ status: "all", limit: 1000 });
      if (allData.success)
        setCounts(deriveAppointmentCounts(allData.appointments));
    } catch {
      toast.error("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, currentPage, rowsPerPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAppointmentsList();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAppointmentsList]);

  useEffect(() => {
    setNotes(selected?.notes || "");
  }, [selected?._id, selected?.notes]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    setDeletingId(id);
    try {
      await deleteAppointment(id);
      setAppointments((prev) => prev.filter((a) => a._id !== id));
      if (selected?._id === id) setSelected(null);
      toast.success("Appointment deleted");
      fetchAppointmentsList();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id, status, extraData = {}) => {
    if (status === "confirmed" && !extraData.appointmentDate) {
      setShowConfirmModal(true);
      return;
    }
    setUpdatingId(id);
    try {
      const updated = await updateAppointmentStatus(id, status, extraData);
      setAppointments((prev) => prev.map((a) => (a._id === id ? updated : a)));
      if (selected?._id === id) setSelected(updated);
      toast.success(
        status === "confirmed"
          ? "Appointment confirmed and email sent"
          : "Status updated",
      );
      setShowConfirmModal(false);
      fetchAppointmentsList();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async (id, nextNotes) => {
    setSavingNotesId(id);
    try {
      const updated = await updateAppointmentNotes(id, nextNotes);
      setAppointments((prev) => prev.map((a) => (a._id === id ? updated : a)));
      if (selected?._id === id) setSelected(updated);
      toast.success("Notes Saved");
      return updated;
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotesId(null);
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const exportColumns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "contact", label: "Contact" },
    { key: "city", label: "City" },
    { key: "status", label: "Status" },
    { key: "requirements", label: "Requirements" },
    { key: "notes", label: "Notes" },
    { key: "createdAt", label: "Created At" },
  ];
  const exportRows = appointments.map((a) => ({
    name: a.name || "-",
    email: a.email || "-",
    contact: a.contact || "-",
    city: a.city || "-",
    status: a.status || "-",
    requirements: a.requirements || "-",
    notes: a.notes || "-",
    createdAt: formatDate(a.createdAt),
  }));

  const handleExport = async (format) => {
    if (!exportRows.length) return;
    setIsExporting(true);
    try {
      const filename = `appointments_${new Date().toISOString().split("T")[0]}`;
      const meta = [
        `Generated on: ${new Date().toLocaleString()}`,
        `Status filter: ${statusFilter}`,
        `Search: ${search || "None"}`,
        `Records: ${exportRows.length}`,
      ];
      if (format === "pdf") {
        await downloadPdfReport({
          filename,
          title: "Appointments Report",
          meta,
          columns: exportColumns,
          rows: exportRows,
        });
        return;
      }
      downloadCsvReport({ filename, columns: exportColumns, rows: exportRows });
    } finally {
      setIsExporting(false);
    }
  };

  const statCards = [
    {
      label: "Total",
      value: counts.total,
      sub: "All appointments",
      icon: Calendar,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-500",
      filter: "all",
    },
    {
      label: "Pending",
      value: counts.pending,
      sub: counts.total
        ? `${Math.round((counts.pending / counts.total) * 100)}% of total`
        : "0%",
      icon: Clock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-500",
      filter: "pending",
    },
    {
      label: "Confirmed",
      value: counts.confirmed,
      sub: counts.total
        ? `${Math.round((counts.confirmed / counts.total) * 100)}% of total`
        : "0%",
      icon: ThumbsUp,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-500",
      filter: "confirmed",
    },
    {
      label: "Cancelled",
      value: counts.cancelled,
      sub:
        counts.cancelled === 0
          ? "All caught up!"
          : `${Math.round((counts.cancelled / counts.total) * 100)}% of total`,
      icon: AlertCircle,
      iconBg: "bg-rose-100",
      iconColor: "text-rose-400",
      filter: "cancelled",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Top action bar */}
      <div className="w-full flex justify-end gap-3">
        <button
          onClick={() => setShowTemplateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:border-slate-400 transition shadow-sm active:scale-95 cursor-pointer"
        >
          <SettingsIcon size={14} />
          Edit Confirmation Email
        </button>
        <ReportExportMenu
          disabled={!appointments.length}
          busy={isExporting}
          onExportPdf={() => handleExport("pdf")}
          onExportExcel={() => handleExport("excel")}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={() => {
              setStatusFilter(card.filter);
              setCurrentPage(1);
            }}
            className={`bg-white border rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer ${statusFilter === card.filter ? "border-slate-400" : "border-slate-200"}`}
          >
            <div className="flex items-start gap-4">
              <div className={`${card.iconBg} p-2.5 rounded-xl shrink-0`}>
                <card.icon size={18} className={card.iconColor} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {card.label}
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1 leading-none">
                  {card.value}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{card.sub}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Search / filter bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">
              Appointments
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {totalAppointments} appointment
              {totalAppointments !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name or email..."
              className="w-full pl-8 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-400 transition placeholder:text-slate-300"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-slate-400 transition cursor-pointer font-medium capitalize"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s === "all" ? "All Statuses" : s}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin text-slate-400" size={28} />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300">
            <Calendar size={40} strokeWidth={1} />
            <p className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-400">
              No appointments found
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {[
                      "Name",
                      "Email",
                      "Contact",
                      "City",
                      "Date",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3.5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((a) => (
                    <tr
                      key={a._id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setSelected(a)}
                          className="font-semibold text-slate-800 hover:text-slate-900 hover:underline text-left"
                        >
                          {a.name}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{a.email}</td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {a.contact}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{a.city}</td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                        {formatDate(a.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setSelected(a)}
                            className="text-[10px] cursor-pointer font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 hover:border-slate-400 transition"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(a._id)}
                            disabled={deletingId === a._id}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500 hover:text-white border border-slate-200 hover:border-rose-500 transition disabled:opacity-50"
                          >
                            {deletingId === a._id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} className="cursor-pointer" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  Rows per page
                </span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 text-xs font-bold text-slate-700 py-1 px-2 rounded-md outline-none cursor-pointer"
                >
                  {[10, 20, 50, 100].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-[11px] font-medium text-slate-500">
                  {totalAppointments > 0 && (
                    <>
                      Showing{" "}
                      <span className="font-bold text-slate-900">
                        {(currentPage - 1) * rowsPerPage + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-bold text-slate-900">
                        {Math.min(currentPage * rowsPerPage, totalAppointments)}
                      </span>{" "}
                      of{" "}
                      <span className="font-bold text-slate-900">
                        {totalAppointments}
                      </span>{" "}
                      results
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1 || isLoading}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-2 border border-slate-200 rounded-lg cursor-pointer bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-colors"
                  >
                    <ChevronLeft size={16} className="text-slate-600" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => {
                        if (
                          totalPages > 5 &&
                          page !== 1 &&
                          page !== totalPages &&
                          Math.abs(page - currentPage) > 1
                        ) {
                          if (Math.abs(page - currentPage) === 2)
                            return (
                              <span key={page} className="text-slate-400">
                                ...
                              </span>
                            );
                          return null;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all ${currentPage === page ? "bg-slate-900 text-white shadow-md" : "bg-white border border-slate-100 text-slate-500 hover:border-slate-300"}`}
                          >
                            {page}
                          </button>
                        );
                      },
                    )}
                  </div>
                  <button
                    disabled={currentPage >= totalPages || isLoading}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-2 border border-slate-200 rounded-lg cursor-pointer bg-white disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-colors"
                  >
                    <ChevronRight size={16} className="text-slate-600" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-base">
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-slate-900">{selected.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatDate(selected.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl cursor-pointer hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <DetailRow icon={User} label="Full Name" value={selected.name} />
              <DetailRow icon={Mail} label="Email" value={selected.email} />
              <DetailRow
                icon={Phone}
                label="Contact"
                value={selected.contact}
              />
              <DetailRow
                icon={MapPin}
                label="Address"
                value={selected.address}
              />
              <DetailRow icon={MapPin} label="City" value={selected.city} />
              <DetailRow
                icon={MapPin}
                label="Pincode"
                value={selected.pincode}
              />
              {selected.requirements && (
                <DetailRow
                  icon={FileText}
                  label="Requirements"
                  value={selected.requirements}
                />
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StickyNote size={14} className="text-slate-400" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Internal Notes
                  </p>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add private notes about this appointment..."
                  rows={3}
                  className="w-full text-sm text-slate-700 placeholder-slate-300 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 resize-none outline-none focus:border-slate-400 focus:bg-white transition-all"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSaveNotes(selected._id, notes)}
                    disabled={
                      savingNotesId === selected._id ||
                      notes === (selected.notes || "")
                    }
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {savingNotesId === selected._id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <StickyNote size={12} />
                    )}
                    Save Notes
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Update Status
              </p>
              <div className="flex gap-2 flex-wrap">
                {["pending", "confirmed", "cancelled"].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selected._id, s)}
                    disabled={
                      selected.status === s || updatingId === selected._id
                    }
                    className={`px-4 cursor-pointer py-2 rounded-xl text-xs font-bold capitalize transition-all border disabled:cursor-not-allowed ${selected.status === s ? STATUS_STYLES[s] + " opacity-100" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400"}`}
                  >
                    {updatingId === selected._id && selected.status !== s ? (
                      <Loader2 size={12} className="animate-spin inline" />
                    ) : (
                      s
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleDelete(selected._id)}
                disabled={deletingId === selected._id}
                className="w-full cursor-pointer flex items-center justify-center gap-2 mt-2 border border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {deletingId === selected._id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                Delete Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm appointment modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 uppercase text-sm">
                Confirm Appointment
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Appointment Date
                </label>
                <input
                  type="date"
                  value={confirmDate}
                  onChange={(e) => setConfirmDate(e.target.value)}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-400 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Appointment Time
                </label>
                <input
                  type="time"
                  value={confirmTime}
                  onChange={(e) => setConfirmTime(e.target.value)}
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-400 transition"
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Confirming this appointment will send a notification email to{" "}
                <span className="font-bold text-slate-600">
                  {selected?.email}
                </span>{" "}
                with the scheduled date and time.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleStatusChange(selected._id, "confirmed", {
                    appointmentDate: confirmDate,
                    appointmentTime: confirmTime,
                  })
                }
                disabled={!confirmDate || !confirmTime || updatingId}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer flex justify-center items-center gap-2"
              >
                {updatingId ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ThumbsUp size={14} />
                )}
                Confirm & Notify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email template modal */}
      {showTemplateModal && (
        <EmailTemplateModal
          onClose={() => setShowTemplateModal(false)}
          onSave={fetchAppointmentsList}
        />
      )}
    </div>
  );
}
