import React, { useState, useEffect } from "react";
import {
  PlusSquare,
  Trash2,
  Images,
  Save,
  Loader2,
  Info,
  Type,
  Link,
  Tag,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "@/services/api";
import TiptapEditor from "@/components/TiptapEditor";
import { fetchAllCategories } from "@/services/categoryService";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png";

const DEFAULT_CENTER = {
  label: "Exclusive Deal · Few Days Left",
  heading: "Timeless Women's Collection",
  description:
    "<p>Upgrade your everyday style with beautifully crafted pieces that blend comfort, elegance, and effortless charm.</p>",
  buttonText: "VIEW MORE",
  buttonLink: "",
  categoryLink: "",
};

export default function LookbookForm() {
  const [sliderImages, setSliderImages] = useState([]);
  const [centerContent, setCenterContent] = useState(DEFAULT_CENTER);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  const SLUG = "timeless-women";

  // Load lookbook data + categories in parallel
  useEffect(() => {
    const load = async () => {
      try {
        const [lookbookRes, catRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/lookbooks/${SLUG}`, {
            withCredentials: true,
          }),
          fetchAllCategories(),
        ]);

        // Categories — API returns { success, data: [...] }
        if (catRes && catRes.data) {
          setCategories(catRes.data);
        }

        // Lookbook data
        const lb = lookbookRes.data?.lookbook;
        if (lb) {
          // Prefer unified sliderImages; fall back to leftSliderImages for migration
          const imgs =
            lb.sliderImages?.length > 0
              ? lb.sliderImages
              : lb.leftSliderImages || [];
          setSliderImages(imgs);

          if (lb.centerContent) {
            setCenterContent({ ...DEFAULT_CENTER, ...lb.centerContent });
          }
        }
      } catch (error) {
        console.error("Error fetching lookbook data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ─── Image helpers ─────────────────────────────────────────────────────────

  const validateImage = (file) =>
    new Promise((resolve, reject) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        reject(`"${file.name}" is not valid. Only JPG and PNG are allowed.`);
      } else {
        resolve();
      }
    });

  const handleImageUpload = async (e) => {
    const newFiles = Array.from(e.target.files);
    if (!newFiles.length) return;

    const valid = [];
    const errors = [];

    await Promise.all(
      newFiles.map(async (file) => {
        try {
          await validateImage(file);
          valid.push(file);
        } catch (err) {
          errors.push(err);
        }
      }),
    );

    if (errors.length) errors.forEach((err) => toast.error(err, { duration: 4000 }));

    if (valid.length) {
      const newImgs = valid.map((file) => ({
        url: URL.createObjectURL(file),
        file,
        isNew: true,
        categoryLink: "",
      }));
      setSliderImages((prev) => [...prev, ...newImgs]);
      toast.success(`${valid.length} image(s) added`);
    }

    e.target.value = "";
  };

  const removeImage = (index) => {
    setSliderImages((prev) => prev.filter((_, i) => i !== index));
  };

  const updateImageCategory = (index, categorySlug) => {
    setSliderImages((prev) =>
      prev.map((img, i) =>
        i === index ? { ...img, categoryLink: categorySlug } : img,
      ),
    );
  };

  // ─── Center content ─────────────────────────────────────────────────────────

  const handleCenterChange = (field, value) => {
    setCenterContent((prev) => ({ ...prev, [field]: value }));
  };

  // ─── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    const formData = new FormData();

    const existingImgs = sliderImages.filter((img) => !img.isNew);
    const newImgs = sliderImages.filter((img) => img.isNew);

    // Send existing images (with their categoryLinks already embedded)
    formData.append("existingSliderImages", JSON.stringify(existingImgs));

    // Send new image files (binary) — multer can't carry metadata alongside files,
    // so we send their categoryLinks separately as ordered JSON
    newImgs.forEach((img) => formData.append("sliderImages", img.file));
    formData.append(
      "newSliderImagesMeta",
      JSON.stringify(newImgs.map((img) => ({ categoryLink: img.categoryLink || "" }))),
    );

    formData.append("title", "Timeless Women Collection");
    formData.append("centerContent", JSON.stringify(centerContent));

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/lookbooks/${SLUG}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        },
      );

      if (data.success) {
        toast.success("Lookbook updated successfully!");
        const lb = data.lookbook;
        const imgs =
          lb.sliderImages?.length > 0
            ? lb.sliderImages
            : lb.leftSliderImages || [];
        setSliderImages(imgs);
        if (lb.centerContent) setCenterContent(lb.centerContent);
      }
    } catch (error) {
      console.error("Error saving lookbook:", error);
      toast.error(error.response?.data?.message || "Failed to update lookbook");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Image Spec Banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-black text-amber-800 uppercase tracking-wide">
            Image Requirements
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            All images must be exactly{" "}
            <span className="font-bold">650 × 500 px</span> and in{" "}
            <span className="font-bold">JPG or PNG</span> format. The same
            images are displayed in <span className="font-bold">both</span>{" "}
            sliders. Assign a category link to each image so clicking it takes
            users to that category page.
          </p>
        </div>
      </div>

      {/* Shared Slider Images */}
      <SharedImageSection
        images={sliderImages}
        onUpload={handleImageUpload}
        onRemove={removeImage}
        onCategoryChange={updateImageCategory}
        categories={categories}
      />

      {/* Center Content */}
      <CenterSection
        content={centerContent}
        onChange={handleCenterChange}
        categories={categories}
      />

      {/* Save */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center cursor-pointer gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
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

// ─── Category Dropdown ─────────────────────────────────────────────────────────

function CategorySelect({ value, onChange, categories, placeholder = "No link — select category" }) {
  return (
    <div className="relative">
      <Tag
        size={12}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <ChevronDown
        size={12}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none pl-7 pr-7 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {categories.map((cat) => (
          <option key={cat._id} value={cat.slug}>
            {cat.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Shared Image Section ──────────────────────────────────────────────────────

function SharedImageSection({
  images,
  onUpload,
  onRemove,
  onCategoryChange,
  categories,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase">
            Slider Images
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            These images appear in <span className="font-bold text-indigo-600">both</span> the left and right carousels.
            Assign a category to each so clicking the image navigates the user there.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              📐 650 × 500 px
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              🖼 JPG · PNG
            </span>
            <span className="inline-flex items-center gap-1 bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              🔗 Shared in both sliders
            </span>
          </div>
        </div>
        <label className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md active:scale-95">
          <PlusSquare size={16} className="text-white/80 group-hover:text-white" />
          <span>Add Images</span>
          <input
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={onUpload}
          />
        </label>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((img, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-visible bg-white border-2 border-indigo-400 relative shadow-sm transition-all animate-in zoom-in-95 duration-200 group"
          >
            {/* Image */}
            <div className="aspect-[2/3] overflow-hidden rounded-t-xl">
              <img
                src={img.url}
                alt={`Slide ${i + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* NEW badge */}
            {img.isNew && (
              <div className="absolute top-2 left-2 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm bg-indigo-500 z-10">
                New
              </div>
            )}

            {/* Delete */}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-2 right-2 bg-white/90 backdrop-blur text-rose-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-500 hover:text-white z-10"
            >
              <Trash2 size={14} />
            </button>

            {/* Category link dropdown */}
            <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Links to
              </p>
              <CategorySelect
                value={img.categoryLink}
                onChange={(slug) => onCategoryChange(i, slug)}
                categories={categories}
                placeholder="No link"
              />
              {img.categoryLink && (
                <p className="text-[8px] text-indigo-500 font-semibold mt-1 truncate">
                  → /{img.categoryLink}
                </p>
              )}
            </div>
          </div>
        ))}

        {images.length === 0 && (
          <div className="col-span-full py-10 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Images size={40} strokeWidth={1} />
            <p className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-400">
              No images added
            </p>
            <p className="text-[9px] text-slate-300 mt-1">
              650 × 500 px · JPG or PNG
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Center Content Section ────────────────────────────────────────────────────

function CenterSection({ content, onChange, categories }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Type size={15} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase">
            Center Content
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Edit the text and link for the middle banner panel.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Top Label */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Top Label
          </label>
          <input
            type="text"
            value={content.label}
            onChange={(e) => onChange("label", e.target.value)}
            placeholder="e.g. Exclusive Deal · Few Days Left"
            className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition placeholder:text-slate-300"
          />
        </div>

        {/* Heading */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Heading
          </label>
          <input
            type="text"
            value={content.heading}
            onChange={(e) => onChange("heading", e.target.value)}
            placeholder="e.g. Timeless Women's Collection"
            className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition placeholder:text-slate-300"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Description
          </label>
          <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400 focus-within:border-emerald-400 transition">
            <TiptapEditor
              value={content.description}
              onChange={(val) => onChange("description", val)}
            />
          </div>
        </div>

        {/* Button Text */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Button Text
          </label>
          <input
            type="text"
            value={content.buttonText || ""}
            onChange={(e) => onChange("buttonText", e.target.value)}
            placeholder="e.g. VIEW MORE"
            className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition placeholder:text-slate-300"
          />
        </div>

        {/* Category Link for Banner */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Link Banner &amp; Button to Category
          </label>
          <CategorySelect
            value={content.categoryLink}
            onChange={(slug) => {
              onChange("categoryLink", slug);
              // Also update buttonLink to /{slug} for backwards compat
              onChange("buttonLink", slug ? `/${slug}` : "");
            }}
            categories={categories}
            placeholder="No link — select a category"
          />
          {content.categoryLink && (
            <p className="text-[10px] text-emerald-600 font-semibold mt-1.5">
              → /{content.categoryLink}
            </p>
          )}
          <p className="text-[9px] text-slate-400 mt-1">
            Clicking the banner image or the button will navigate users to this category page.
          </p>
        </div>

        {/* Live Preview */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Preview
          </label>
          <a
            
            className="bg-[#faf9f7] border border-slate-200 rounded-2xl px-6 py-8 flex flex-col items-center text-center gap-3 hover:shadow-md transition cursor-pointer"
          >
            {content.label && (
              <p className="text-[10px] tracking-widest text-slate-500 uppercase">
                {content.label}
              </p>
            )}
            {content.heading && (
              <h2 className="text-xl font-serif font-bold text-slate-800 leading-snug max-w-xs">
                {content.heading}
              </h2>
            )}
            {content.description && (
              <div
                className="text-xs text-slate-500 max-w-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content.description }}
              />
            )}
            {(content.buttonText || content.categoryLink) && (
              <span className="mt-2 inline-flex items-center gap-1.5 bg-slate-900 text-white text-[10px] font-bold px-4 py-2 rounded-full tracking-wider">
                {content.buttonText || "VIEW MORE"}
                {/* {content.categoryLink && (
                  <Link size={10} className="opacity-70" />
                )} */}
              </span>
            )}
          </a>
        </div>
      </div>
    </div>
  );
}
