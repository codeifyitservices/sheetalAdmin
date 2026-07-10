import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Layers, Shirt, X, Video, ChevronDown } from "lucide-react";
import { getColors } from "@/services/productService";
import toast from "react-hot-toast";
import {
  getRatioLabel,
  getImageAspectRatioWarning,
  validateVideoAspectRatio,
} from "@/utils/imageAspectRatio";

const VARIANT_MEDIA_RATIO = { width: 3, height: 4 };
const VARIANT_MEDIA_RATIO_LABEL = getRatioLabel(
  VARIANT_MEDIA_RATIO.width,
  VARIANT_MEDIA_RATIO.height,
);

const validateVariantImage = async (file) => {
  return await getImageAspectRatioWarning(file, VARIANT_MEDIA_RATIO, {
    label: "Variant image",
  });
};

const validateVariantVideo = async (file) => {
  await validateVideoAspectRatio(file, VARIANT_MEDIA_RATIO, {
    label: "Variant video",
  });
};

/**
 * Single source of truth: is the currently selected size chart "free size"?
 * Checks the sentinel string "free" (set by CategoryModal) OR a chart name
 * that looks like "free size" / "freesize" / "free" (legacy support).
 */
const isFreeSizeSelected = (sizeChart = "", selectedChartName = "") => {
  if (String(sizeChart).trim().toLowerCase() === "free") return true;
  return /^\s*free[\s-]?size?\s*$/i.test(String(selectedChartName).trim()) ||
    /^\s*free\s*$/i.test(String(selectedChartName).trim());
};

const FREE_SIZE_ROW = () => ({ name: "Free Size", stock: 0, price: 0, discountPrice: 0 });

const toTitleCase = (str) => {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function InventoryParams({
  formData,
  setFormData,
  createEmptyVariant,
}) {
  const [filePreviews, setFilePreviews] = useState(() => new Map());
  const previewsRef = useRef(filePreviews);

  const [activeColorDropdown, setActiveColorDropdown] = useState(null);
  const [colorSearch, setColorSearch] = useState("");
  const [catalogColors, setCatalogColors] = useState([]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await getColors();
        if (res.success) setCatalogColors(res.data || []);
      } catch (err) {
        console.error("Failed to fetch catalog colors", err);
      }
    };
    fetchCatalog();
  }, []);

  // Derive free-size flag once at component level so all variant rows share it
  const isFreeSize = isFreeSizeSelected(
    formData.sizeChart,
    formData.selectedChartName,
  );

  useEffect(() => {
    previewsRef.current = filePreviews;
  }, [filePreviews]);

  useEffect(
    () => () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  // Sync all variant size rows whenever sizeChart toggles to/from "free"
  useEffect(() => {
    if (!Array.isArray(formData?.variants) || formData.variants.length === 0) return;

    if (isFreeSize) {
      // Ensure every variant has exactly one locked "Free Size" row
      setFormData((prev) => ({
        ...prev,
        variants: prev.variants.map((v) => ({
          ...v,
          sizes:
            v.sizes.length === 0
              ? [FREE_SIZE_ROW()]
              : v.sizes.map((s) => ({ ...s, name: "Free Size" })),
        })),
      }));
    }
    // When switching away from free size we leave existing rows intact so
    // the user can rename them — no auto-wipe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreeSize]);

  useEffect(() => {
    const variants = Array.isArray(formData?.variants) ? formData.variants : [];

    setFilePreviews((prev) => {
      const next = new Map(prev);
      let mutated = false;
      const activeFiles = new Set();

      variants.forEach((variant) => {
        if (variant?.v_image instanceof File) activeFiles.add(variant.v_image);
        if (variant?.videoFile instanceof File) activeFiles.add(variant.videoFile);
        if (Array.isArray(variant?.gallery)) {
          variant.gallery.forEach((image) => {
            if (image instanceof File) activeFiles.add(image);
          });
        }
      });

      activeFiles.forEach((file) => {
        if (!next.has(file)) {
          next.set(file, URL.createObjectURL(file));
          mutated = true;
        }
      });

      const stale = [];
      next.forEach((url, file) => {
        if (file instanceof File && !activeFiles.has(file)) {
          stale.push(file);
          URL.revokeObjectURL(url);
          mutated = true;
        }
      });
      stale.forEach((file) => next.delete(file));

      return mutated ? next : prev;
    });
  }, [formData.variants]);

  const getImagePreview = (image) => {
    if (!image) return "/placeholder.png";
    if (image instanceof File)
      return filePreviews.get(image) || "/placeholder.png";
    return image.url || image;
  };

  const getVideoPreview = (video) => {
    if (!video) return null;
    if (video instanceof File) return filePreviews.get(video) || null;
    return video.url || video || null;
  };

  // ── helpers ───────────────────────────────────────────────────────────────

  const updateVariant = (variantIndex, updater) => {
    setFormData((prev) => {
      const variants = [...prev.variants];
      variants[variantIndex] = updater(variants[variantIndex]);
      return { ...prev, variants };
    });
  };

  const updateSize = (variantIndex, sizeIndex, field, value) => {
    if (field === "name") {
      value = String(value || "").toUpperCase().slice(0, 4);
    }
    updateVariant(variantIndex, (v) => {
      const sizes = [...v.sizes];
      const current = sizes[sizeIndex];
      let updated = { ...current, [field]: value };

      // If MRP is lowered below the existing discountPrice, clamp discountPrice down.
      if (field === "price" && updated.discountPrice > value && value > 0) {
        updated.discountPrice = value;
      }

      // If discountPrice is set above MRP, clamp it to MRP.
      if (field === "discountPrice" && updated.price > 0 && value > updated.price) {
        updated.discountPrice = updated.price;
      }

      sizes[sizeIndex] = updated;
      return { ...v, sizes };
    });
  };

  const handleAddVariant = () => {
    const emptyVariant = createEmptyVariant();
    // If free size is active, seed one locked row automatically
    if (isFreeSize) {
      emptyVariant.sizes = [FREE_SIZE_ROW()];
    }
    setFormData((p) => ({
      ...p,
      variants: [...p.variants, emptyVariant],
    }));
  };

  const handleAddSize = (variantIndex) => {
    updateVariant(variantIndex, (v) => ({
      ...v,
      sizes: [...v.sizes, { name: "", stock: 0, price: 0, discountPrice: 0 }],
    }));
  };

  const handleRemoveSize = (variantIndex, sizeIndex) => {
    updateVariant(variantIndex, (v) => ({
      ...v,
      sizes: v.sizes.filter((_, i) => i !== sizeIndex),
    }));
  };

  // handleColorBlur removed in favor of color catalog select

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-md">
        <div className="bg-slate-900 px-5 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <Layers size={20} className="text-blue-400" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Manage Variants
              </h3>
              <p className="text-[10px] text-slate-400">
                Configure size, color, and specific images
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddVariant}
            className="bg-white text-slate-900 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition flex items-center gap-2 text-xs font-bold"
          >
            <Plus size={16} /> Add Variant
          </button>
        </div>

        <div className="p-5 space-y-6">
          {formData.variants.map((v, i) => {
            const isDuplicateColor =
              v.colorId &&
              formData.variants.some(
                (other, idx) => idx !== i && other.colorId === v.colorId
              );

            return (
              <div
                key={i}
                className="group p-5 bg-slate-50 border border-slate-200 rounded-2xl relative hover:border-slate-400 transition-all"
              >
                {/* Remove variant */}
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      variants: prev.variants.filter((_, idx) => idx !== i),
                    }))
                  }
                  className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                >
                  <Trash2 size={14} />
                </button>

                {/* SKU / Color / Image row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Variant SKU
                    </label>
                    <input
                      className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-xs font-bold uppercase focus:ring-2 focus:ring-slate-900 outline-none"
                      placeholder="e.g. TSHIRT-RED"
                      value={v.v_sku}
                      onChange={(e) => {
                        const up = [...formData.variants];
                        up[i].v_sku = e.target.value.toUpperCase();
                        setFormData({ ...formData, variants: up });
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Select Color
                    </label>
                    
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveColorDropdown(activeColorDropdown === i ? null : i);
                          setColorSearch("");
                        }}
                        className={`w-full flex items-center justify-between border px-3 py-2 rounded-lg text-xs font-medium outline-none transition-all ${
                          isDuplicateColor
                            ? "border-rose-500 bg-rose-50/50 text-rose-900"
                            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                        }`}
                      >
                        {(() => {
                          const selectedColorDoc = catalogColors.find(c => c._id === v.colorId);
                          if (selectedColorDoc) {
                            return (
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-inner flex-shrink-0"
                                  style={{ backgroundColor: selectedColorDoc.hex }}
                                />
                                <span>{selectedColorDoc.name}</span>
                              </div>
                            );
                          }
                          return <span className="text-slate-400">Choose a Color</span>;
                        })()}
                        <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-1" />
                      </button>

                      {activeColorDropdown === i && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 p-2 animate-in fade-in slide-in-from-top-1 duration-150">
                          <input
                            type="text"
                            placeholder="Search colors..."
                            value={colorSearch}
                            onChange={(e) => setColorSearch(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs mb-2 outline-none focus:border-indigo-500"
                            autoFocus
                          />
                          <div className="max-h-40 overflow-y-auto space-y-0.5 custom-scrollbar">
                            {catalogColors
                              .filter((c) =>
                                c.name.toLowerCase().includes(colorSearch.toLowerCase())
                              )
                              .map((c) => (
                                <button
                                  key={c._id}
                                  type="button"
                                  onClick={() => {
                                    const up = [...formData.variants];
                                    up[i].colorId = c._id;
                                    setFormData({ ...formData, variants: up });
                                    setActiveColorDropdown(null);
                                  }}
                                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-xs transition-colors ${
                                    v.colorId === c._id
                                      ? "bg-indigo-50 text-indigo-700 font-bold"
                                      : "text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  <span
                                    className="w-3 h-3 rounded-full border border-slate-200"
                                    style={{ backgroundColor: c.hex }}
                                  />
                                  <span>{c.name}</span>
                                </button>
                              ))}
                            {catalogColors.filter((c) =>
                              c.name.toLowerCase().includes(colorSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="text-[10px] text-slate-400 text-center py-2">
                                No matching colors
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {isDuplicateColor && (
                      <p className="text-[9px] font-bold text-red-500 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        Duplicate color variant selected
                      </p>
                    )}
                  </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Variant Image
                  </label>
                  <p className="text-[9px] text-slate-400 mb-1">
                    Required aspect ratio: {VARIANT_MEDIA_RATIO_LABEL}
                  </p>
                  <div className="flex items-center gap-3">
                    {v.v_image ? (
                      <div className="relative w-10 h-10 rounded border border-slate-300 overflow-hidden bg-white">
                        <img
                          src={getImagePreview(v.v_image)}
                          className="w-full h-full object-cover"
                          alt="variant-preview"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/placeholder.png";
                          }}
                        />
                        <button
                          onClick={() => {
                            const up = [...formData.variants];
                            up[i].v_image = "";
                            setFormData({ ...formData, variants: up });
                          }}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-10 h-10 flex items-center justify-center border-2 border-dashed border-slate-300 rounded cursor-pointer hover:bg-white transition text-slate-400">
                        <Plus size={14} />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            (async () => {
                              try {
                                const warning = await validateVariantImage(file);
                                const up = [...formData.variants];
                                up[i].v_image = file;
                                setFormData({ ...formData, variants: up });
                                if (warning) toast.error(warning);
                              } catch (err) {
                                toast.error(err.message || "Invalid variant image");
                                e.target.value = "";
                              }
                            })();
                          }}
                        />
                      </label>
                    )}
                    <span className="text-[9px] text-slate-400 leading-tight">
                      Image for this color
                    </span>
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Variant Gallery
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Add up to 6 images for this color variant
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    <Plus size={14} /> Add Images
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        if (selectedFiles.length === 0) return;
                        const up = [...formData.variants];
                        const existingGallery = Array.isArray(up[i].gallery)
                          ? up[i].gallery
                          : [];
                        const remainingSlots = Math.max(0, 6 - existingGallery.length);
                        const filesToAdd = selectedFiles.slice(0, remainingSlots);
                        if (selectedFiles.length > remainingSlots) {
                          toast.error("Each variant can have at most 6 gallery images.");
                        }
                        up[i].gallery = [...existingGallery, ...filesToAdd];
                        setFormData({ ...formData, variants: up });
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {Array.isArray(v.gallery) && v.gallery.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {v.gallery.map((image, imageIndex) => (
                      <div
                        key={imageIndex}
                        className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white"
                      >
                        <img
                          src={getImagePreview(image)}
                          alt={`variant-gallery-${imageIndex + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/placeholder.png";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const up = [...formData.variants];
                            up[i].gallery = up[i].gallery.filter(
                              (_, idx) => idx !== imageIndex,
                            );
                            setFormData({ ...formData, variants: up });
                          }}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-xs text-slate-400">
                    No gallery images added for this variant
                  </div>
                )}
              </div>

              {/* Video */}
              <div className="space-y-2 md:col-span-4 mt-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase mr-2">
                  Variant Video
                </label>
                <p className="text-[9px] text-slate-400 mt-1 mb-2">
                  Required aspect ratio: {VARIANT_MEDIA_RATIO_LABEL}
                </p>
                {(v.v_video || v.videoFile) && (
                  <div className="mb-3 flex items-center gap-3">
                    <div className="relative group h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-lg border border-slate-300 bg-black flex-shrink-0">
                      <video
                        key={
                          v.videoFile
                            ? v.videoFile.name
                            : v.v_video?.url || v.v_video
                        }
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-cover bg-black"
                      >
                        {getVideoPreview(v.videoFile || v.v_video) ? (
                          <source
                            src={getVideoPreview(v.videoFile || v.v_video)}
                            type="video/mp4"
                          />
                        ) : null}
                      </video>
                      <button
                        type="button"
                        onClick={() => {
                          const up = [...formData.variants];
                          up[i].videoFile = null;
                          up[i].v_video = "";
                          setFormData({ ...formData, variants: up });
                        }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate max-w-[220px]">
                        {v.videoFile
                          ? v.videoFile.name
                          : v.v_video?.url?.split("/").pop() || "Variant video"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Small preview thumbnail
                      </p>
                    </div>
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <Video size={14} />{" "}
                  {v.v_video || v.videoFile ? "Change Video" : "Add Video"}
                  <input
                    type="file"
                    className="hidden"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const MAX_VIDEO_SIZE_MB = 5;
                      const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
                      if (file.size > MAX_VIDEO_SIZE_BYTES) {
                        toast.error(`Video file size exceeds the ${MAX_VIDEO_SIZE_MB}MB limit.`);
                        e.target.value = "";
                        return;
                      }
                      (async () => {
                        try {
                          await validateVariantVideo(file);
                          const up = [...formData.variants];
                          up[i].videoFile = file;
                          up[i].v_video = "";
                          setFormData({ ...formData, variants: up });
                          e.target.value = "";
                        } catch (err) {
                          toast.error(err.message || "Invalid variant video");
                          e.target.value = "";
                        }
                      })();
                    }}
                  />
                </label>
                <p className="text-[10px] text-slate-400 mt-1">
                  One video per variant. MP4, WEBM up to 5MB.
                </p>
              </div>

              {/* Sizes */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Sizes for this variant
                    </label>
                    {isFreeSize && (
                      <p className="text-[9px] text-indigo-500 mt-0.5">
                        Free size — one fixed row, name is locked
                      </p>
                    )}
                  </div>
                  {!isFreeSize && ( 
                    <button
                      type="button"
                      onClick={() => handleAddSize(i)}
                      className="bg-blue-100 text-blue-700 cursor-pointer px-2 py-1 rounded text-xs font-bold hover:bg-blue-200 transition"
                    >
                      Add Size
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {v.sizes.map((s, s_idx) => {
                    const isDuplicateSize =
                      !isFreeSize &&
                      s.name.trim() !== "" &&
                      v.sizes.some(
                        (other, otherIdx) =>
                          otherIdx !== s_idx &&
                          other.name.trim().toUpperCase() ===
                            s.name.trim().toUpperCase(),
                      );

                    return (
                      <div key={s_idx} className="flex items-start gap-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-grow">
                          {/* Size Name */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">
                              Size
                            </label>
                            <input
                              className={`w-full border px-3 py-2 rounded-lg text-xs ${
                                isFreeSize
                                  ? "bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed"
                                  : isDuplicateSize
                                    ? "bg-red-50 border-red-500 text-red-900 focus:ring-red-200"
                                    : "bg-white border-slate-300 focus:ring-slate-900"
                              } outline-none transition-all`}
                              placeholder="e.g. M, L, XL"
                              value={isFreeSize ? "Free Size" : s.name}
                              readOnly={isFreeSize}
                              maxLength={isFreeSize ? undefined : 4}
                              title={
                                isFreeSize
                                  ? "Free size — name is fixed"
                                  : undefined
                              }
                              onChange={
                                isFreeSize
                                  ? undefined
                                  : (e) =>
                                      updateSize(i, s_idx, "name", e.target.value.slice(0, 4))
                              }
                            />
                            {isDuplicateSize && (
                              <p className="text-[9px] font-bold text-red-500 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                Size already exists
                              </p>
                            )}
                          </div>

                          {/* Stock */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">
                              Stock
                            </label>
                            <input
                              className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-xs"
                              placeholder="Stock"
                              type="number"
                              min={0}
                              value={s.stock}
                              onChange={(e) =>
                                updateSize(i, s_idx, "stock", Number(e.target.value))
                              }
                            />
                          </div>

                          {/* MRP */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">
                              MRP (₹)
                            </label>
                            <input
                              className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-xs"
                              placeholder="MRP (₹)"
                              type="number"
                              min={0}
                              value={s.price}
                              onChange={(e) =>
                                updateSize(i, s_idx, "price", Number(e.target.value))
                              }
                            />
                          </div>

                          {/* Discount Price */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">
                              Disc. (₹)
                            </label>
                            <input
                              className={`w-full border px-3 py-2 rounded-lg text-xs outline-none transition-all ${
                                s.price > 0 && s.discountPrice > s.price
                                  ? "bg-red-50 border-red-500 text-red-900 focus:ring-red-200"
                                  : "bg-white border-slate-300 focus:ring-slate-900"
                              }`}
                              placeholder="Disc. Price (₹)"
                              type="number"
                              min={0}
                              max={s.price > 0 ? s.price : undefined}
                              value={s.discountPrice}
                              onChange={(e) =>
                                updateSize(
                                  i,
                                  s_idx,
                                  "discountPrice",
                                  Number(e.target.value),
                                )
                              }
                            />
                            {s.price > 0 && s.discountPrice > s.price && (
                              <p className="text-[9px] font-bold text-red-500 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                Cannot exceed MRP (₹{s.price})
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Delete size row — hidden for free size (keep at least one row) */}
                        {!isFreeSize && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSize(i, s_idx)}
                            className="text-red-500 p-2 mt-4 flex-shrink-0 hover:text-red-700 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
{v.sizes.length === 0 && !isFreeSize && (
  <p className="text-[10px] text-slate-400 py-2">
    No sizes added. Click &quot;Add Size&quot; to add one.
  </p>
)}
</div>
</div>
</div>
);
})}

          {formData.variants.length === 0 && (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Shirt size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm font-medium">
                No variants added yet
              </p>
              <p className="text-slate-400 text-xs">
                Click the button above to add sizes and colors
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}