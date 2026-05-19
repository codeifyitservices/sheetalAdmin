"use client";

import { useEffect, useState } from "react";
import { Truck, Save, RefreshCw, Mail, Phone, MessageSquare, Info } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/admin/layout/PageHeader.js";
import { getSettings, updateSettings } from "@/services/settingsService";

export default function DeliveryReturnsPage() {
  const [settings, setSettings] = useState({
    prepaidShippingCharge: "",
    codShippingCharge: "",
    returnPolicyContent: "",
    deliveryPoint2: "",
    deliveryPoint3: "",
    supportEmail: "",
    supportWhatsapp: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await getSettings();
      if (response?.success && response?.data) {
        setSettings({
          prepaidShippingCharge: response.data.prepaidShippingCharge || "",
          codShippingCharge: response.data.codShippingCharge || "",
          returnPolicyContent: response.data.returnPolicyContent || "",
          deliveryPoint2: response.data.deliveryPoint2 || "",
          deliveryPoint3: response.data.deliveryPoint3 || "",
          supportEmail: response.data.supportEmail || "",
          supportWhatsapp: response.data.supportWhatsapp || "",
        });
      }
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await updateSettings(settings);
      if (response?.success) {
        toast.success("Settings updated successfully");
      } else {
        toast.error(response?.message || "Failed to update settings");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all";
  const labelStyle =
    "text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block";

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-500 pb-10">
      <PageHeader
        title="Delivery & Returns"
        subtitle="Manage shipping charges, return policy, and contact info"
      />

      <div className="max-w-4xl mt-8 space-y-6">
        {/* Shipping Charges */}
        <div className="bg-white p-6 md:p-8 rounded-[28px] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
            <Truck size={18} className="text-indigo-500" /> Shipping Charges
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Pre-Paid Shipping Charge</label>
              <input
                type="text"
                value={settings.prepaidShippingCharge}
                onChange={(e) =>
                  setSettings({ ...settings, prepaidShippingCharge: e.target.value })
                }
                placeholder="e.g. Free Shipping"
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>COD Shipping Charge</label>
              <input
                type="text"
                value={settings.codShippingCharge}
                onChange={(e) =>
                  setSettings({ ...settings, codShippingCharge: e.target.value })
                }
                placeholder="e.g. Free Shipping"
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Return Policy */}
        <div className="bg-white p-6 md:p-8 rounded-[28px] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
            <Info size={18} className="text-amber-500" /> Return Policy Content
          </h3>
          <div>
            <label className={labelStyle}>Policy Text</label>
            <textarea
              rows="4"
              value={settings.returnPolicyContent}
              onChange={(e) =>
                setSettings({ ...settings, returnPolicyContent: e.target.value })
              }
              className={inputStyle}
              placeholder="Enter your return policy description..."
            ></textarea>
            <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              This text will be shown in the product details page.
            </p>
          </div>
        </div>

        {/* Delivery Options Points */}
        <div className="bg-white p-6 md:p-8 rounded-[28px] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
            <Info size={18} className="text-indigo-500" /> Delivery Options Badges
          </h3>
          <div className="space-y-6">
            <div>
              <label className={labelStyle}>First Point (Delivery Date Estimation)</label>
              <input
                type="text"
                value="Get it by [Estimated Date] (Dynamic)"
                disabled
                className={`${inputStyle} bg-slate-100 text-slate-400 cursor-not-allowed`}
              />
            </div>
            <div>
              <label className={labelStyle}>Second Point (Pay on Delivery)</label>
              <input
                type="text"
                value={settings.deliveryPoint2}
                onChange={(e) =>
                  setSettings({ ...settings, deliveryPoint2: e.target.value })
                }
                placeholder="e.g. Pay on delivery available"
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Third Point (Returns & Exchange)</label>
              <input
                type="text"
                value={settings.deliveryPoint3}
                onChange={(e) =>
                  setSettings({ ...settings, deliveryPoint3: e.target.value })
                }
                placeholder="e.g. Easy 7 days return & exchange available"
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Support Contact */}
        <div className="bg-white p-6 md:p-8 rounded-[28px] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
            <MessageSquare size={18} className="text-emerald-500" /> Support Contact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Support Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, supportEmail: e.target.value })
                  }
                  className={`${inputStyle} pl-11`}
                  placeholder="info@example.com"
                />
              </div>
            </div>
            <div>
              <label className={labelStyle}>WhatsApp Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={settings.supportWhatsapp}
                  onChange={(e) =>
                    setSettings({ ...settings, supportWhatsapp: e.target.value })
                  }
                  className={`${inputStyle} pl-11`}
                  placeholder="919958813913"
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Include country code without + (e.g. 91xxxxxxxxxx)
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
