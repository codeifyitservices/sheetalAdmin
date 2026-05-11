"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, Save, Info, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "@/services/api";

const SECTION_LABELS = {
  topInfo: {
    label: "Top Info Bar",
    description: "Announcement strip above the navbar",
  },
  homeBanner: { label: "Home Banner", description: "Main hero/slider banner" },
  aboutSBS: { label: "About SBS", description: "Brand introduction section" },
  hiddenBeauty: {
    label: "Hidden Beauty",
    description: "Featured highlight section",
  },
  trendingThisWeek: {
    label: "Trending This Week",
    description: "Trending products carousel",
  },
  newArrivals: {
    label: "New Arrivals",
    description: "Latest product additions",
  },
  collections: {
    label: "Collections",
    description: "Curated collection showcase",
  },
  timelessWomenCollection: {
    label: "Timeless Women Collection",
    description: "Lookbook section with sliders",
  },
  instagramDiaries: {
    label: "Instagram Diaries",
    description: "Instagram image carousel",
  },
  testimonials: {
    label: "Testimonials",
    description: "Customer reviews slider",
  },
  blogs: { label: "Blogs", description: "Latest blog posts" },
  bookAppointmentWidget: {
    label: "Book Appointment Widget",
    description: "Floating appointment button",
  },
};

const DEFAULT_TOP_INFO_CONFIG = {
  mode: "coupon",
  customText: "",
  customCtaLabel: "Shop Now",
  customCtaHref: "/product-list",
};

export default function HomepageSectionsForm() {
  const [sections, setSections] = useState({});
  const [topInfoConfig, setTopInfoConfig] = useState(DEFAULT_TOP_INFO_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const lastVisibleTopInfoModeRef = useRef("coupon");

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/homepage/sections`);
        if (data.success) {
          setSections(data.sections || {});
          const nextTopInfoConfig = {
            ...DEFAULT_TOP_INFO_CONFIG,
            ...(data.topInfoConfig || {}),
          };
          setTopInfoConfig(nextTopInfoConfig);
          if (nextTopInfoConfig.mode !== "hidden") {
            lastVisibleTopInfoModeRef.current = nextTopInfoConfig.mode;
          }
        }
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSections();
  }, []);

  const handleToggle = (key) => {
    setSections((prev) => {
      const nextVisible = !(prev[key] ?? true);

      if (key === "topInfo") {
        setTopInfoConfig((current) => {
          if (!nextVisible) {
            if (current.mode !== "hidden") {
              lastVisibleTopInfoModeRef.current = current.mode;
            }
            return { ...current, mode: "hidden" };
          }

          return {
            ...current,
            mode:
              current.mode === "hidden"
                ? lastVisibleTopInfoModeRef.current || "coupon"
                : current.mode,
          };
        });
      }

      return { ...prev, [key]: nextVisible };
    });
  };

  const handleTopInfoConfigChange = (key, value) => {
    setTopInfoConfig((prev) => {
      const nextConfig = { ...prev, [key]: value };

      if (key === "mode") {
        if (value !== "hidden") {
          lastVisibleTopInfoModeRef.current = value;
        }

        setSections((currentSections) => ({
          ...currentSections,
          topInfo: value !== "hidden",
        }));
      }

      return nextConfig;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data } = await axios.patch(
        `${API_BASE_URL}/homepage/sections`,
        { sections, topInfoConfig },
        { withCredentials: true },
      );
      if (data.success) {
        setSections(data.sections || {});
        const nextTopInfoConfig = {
          ...DEFAULT_TOP_INFO_CONFIG,
          ...(data.topInfoConfig || {}),
        };
        setTopInfoConfig(nextTopInfoConfig);
        if (nextTopInfoConfig.mode !== "hidden") {
          lastVisibleTopInfoModeRef.current = nextTopInfoConfig.mode;
        }

        toast.success("Homepage updated!");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const visibleCount = Object.values(sections).filter(Boolean).length;
  const totalCount = Object.keys(SECTION_LABELS).length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-black text-amber-800 uppercase tracking-wide">
            Homepage Visibility
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Toggle sections to show or hide them on the homepage. Changes take
            effect immediately after saving.{" "}
            <span className="font-bold">
              {visibleCount} of {totalCount}
            </span>{" "}
            sections currently visible.
          </p>
        </div>
      </div>

      {/* Sections List */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase">
            Sections
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Sections are listed in the order they appear on the homepage.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {Object.entries(SECTION_LABELS).map(
            ([key, { label, description }]) => {
              const isVisible = sections[key] ?? true;
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between px-6 py-4 transition-colors ${
                    isVisible ? "bg-white" : "bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isVisible ? "bg-emerald-100" : "bg-slate-100"
                      }`}
                    >
                      {isVisible ? (
                        <Eye size={14} className="text-emerald-600" />
                      ) : (
                        <EyeOff size={14} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-black ${isVisible ? "text-slate-900" : "text-slate-400"}`}
                      >
                        {label}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggle(key)}
                    className={`relative cursor-pointer w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                      isVisible ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        isVisible ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            },
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase">
            Top Info Content
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Choose whether the top bar shows a homepage coupon, a custom announcement, or stays hidden.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                Mode
              </span>
              <select
                value={topInfoConfig.mode}
                onChange={(e) =>
                  handleTopInfoConfigChange("mode", e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
              >
                <option value="coupon">Homepage Coupon</option>
                <option value="custom">Custom Announcement</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-600">
                Effective Behavior
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {sections.topInfo === false
                  ? "Top Info Bar section is disabled, so the bar will stay hidden."
                  : topInfoConfig.mode === "coupon"
                    ? "The storefront will show the coupon marked for homepage promotion."
                    : topInfoConfig.mode === "custom"
                      ? "The storefront will show your custom text and CTA."
                      : "The storefront will hide the top bar and navbar offset animation."}
              </p>
            </div>
          </div>

          {topInfoConfig.mode === "custom" && (
            <div className="grid gap-5">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                  Announcement Text
                </span>
                <textarea
                  rows={3}
                  value={topInfoConfig.customText}
                  onChange={(e) =>
                    handleTopInfoConfigChange("customText", e.target.value)
                  }
                  placeholder="Enter the message to show in the top bar"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                    CTA Label
                  </span>
                  <input
                    type="text"
                    value={topInfoConfig.customCtaLabel}
                    onChange={(e) =>
                      handleTopInfoConfigChange("customCtaLabel", e.target.value)
                    }
                    placeholder="Shop Now"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600">
                    CTA URL / Path
                  </span>
                  <input
                    type="text"
                    value={topInfoConfig.customCtaHref}
                    onChange={(e) =>
                      handleTopInfoConfigChange("customCtaHref", e.target.value)
                    }
                    placeholder="/product-list or https://example.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2 border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-slate-900 cursor-pointer text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
