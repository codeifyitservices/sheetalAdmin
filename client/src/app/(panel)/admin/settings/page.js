"use client";
import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  Save,
  Loader2,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/admin/layout/PageHeader.js";
import { getSettings, updateSettings } from "@/services/settingsService";

export default function SettingsPage() {
  const inputStyle =
    "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all";
  const labelStyle =
    "text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block";

  const [globalSettings, setGlobalSettings] = useState({
    platformFee: 0,
    shippingFee: 0,
    freeShippingThreshold: 0,
    taxPercentage: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const settingsRes = await getSettings();

      if (settingsRes?.success && settingsRes?.data) {
        setGlobalSettings({
          platformFee: settingsRes.data.platformFee || 0,
          shippingFee: settingsRes.data.shippingFee || 0,
          freeShippingThreshold: settingsRes.data.freeShippingThreshold || 0,
          taxPercentage: settingsRes.data.taxPercentage || 0,
        });
      }

      if (showToast) toast.success("Settings loaded");
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGlobalSettingChange = (e) => {
    const { name, value } = e.target;
    setGlobalSettings((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateSettings(globalSettings);
      if (res.success) {
        toast.success("Global settings updated!");
      } else {
        toast.error(res.message || "Failed to update settings");
      }
    } catch (error) {
      toast.error("Error saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-500 pb-10">
      <PageHeader
        title="Store Settings"
        subtitle="Manage global tax and platform fees"
      />

      <div className="mt-8 max-w-4xl mx-auto">
        {/* --- Payments & Tax Settings --- */}
        <div className="bg-white p-6 md:p-8 rounded-[28px] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-500" /> Payments & Tax Settings
            </h3>
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-white hover:border-slate-300 disabled:opacity-70"
            >
              {isRefreshing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Refresh
            </button>
          </div>

          {isLoading ? (
             <div className="flex h-48 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50">
               <Loader2 size={22} className="animate-spin text-slate-400" />
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className={labelStyle}>Platform Fee (₹)</label>
                <input
                  type="number"
                  name="platformFee"
                  min="0"
                  value={globalSettings.platformFee}
                  onChange={handleGlobalSettingChange}
                  className={inputStyle}
                />
                <p className="text-[10px] text-slate-400">Fixed fee applied to every order.</p>
              </div>

              <div className="space-y-1.5">
                <label className={labelStyle}>Shipping Fee (₹)</label>
                <input
                  type="number"
                  name="shippingFee"
                  min="0"
                  value={globalSettings.shippingFee}
                  onChange={handleGlobalSettingChange}
                  className={inputStyle}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelStyle}>Free Shipping Above (₹)</label>
                <input
                  type="number"
                  name="freeShippingThreshold"
                  min="0"
                  value={globalSettings.freeShippingThreshold}
                  onChange={handleGlobalSettingChange}
                  className={inputStyle}
                />
                <p className="text-[10px] text-slate-400">Order amount to qualify for free shipping.</p>
              </div>

              <div className="space-y-1.5">
                <label className={labelStyle}>GST Percentage (%)</label>
                <input
                  type="number"
                  name="taxPercentage"
                  min="0"
                  max="100"
                  value={globalSettings.taxPercentage}
                  onChange={handleGlobalSettingChange}
                  className={inputStyle}
                />
                <p className="text-[10px] text-slate-400 font-medium text-emerald-600">
                  Default GST for categories without a specific rate.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end items-center gap-4 pt-8">
          <button
            onClick={() => loadData(true)}
            className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all"
          >
            Discard Changes
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
