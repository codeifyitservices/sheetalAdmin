import React, { useEffect, useState } from "react";
import {
  PlusSquare,
  Trash2,
  Images,
  Save,
  Loader2,
  Info,
  Type,
  Tag,
  ChevronDown,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "@/services/api";
import TiptapEditor from "@/components/TiptapEditor";
import { fetchAllCategories } from "@/services/categoryService";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "image/jfif",
];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.gif,.svg,.avif,.jfif";
const MAX_IMAGES_PER_SIDE = 5;

const DEFAULT_CENTER = {
  label: "Exclusive Deal - Few Days Left",
  heading: "Timeless Women's Collection",
  description:
    "<p>Upgrade your everyday style with beautifully crafted pieces that blend comfort, elegance, and effortless charm.</p>",
  buttonText: "VIEW MORE",
  buttonLink: "",
  categoryLink: "",
  categoryLinks: [],
};

const normalizeCategoryLinks = (content = {}) => {
  const categoryLinks = Array.isArray(content.categoryLinks)
    ? content.categoryLinks
    : content.categoryLink
      ? [content.categoryLink]
      : [];

  return categoryLinks.filter(Boolean);
};

const buildLookbookProductListHref = (categoryLinks = []) => {
  const selected = categoryLinks.filter(Boolean);
  if (selected.length === 0) return "";

  const params = new URLSearchParams({
    fromLookbook: "true",
    categories: selected.join(","),
  });

  return `/product-list?${params.toString()}`;
};

const limitSideImages = (images = []) => images.slice(0, MAX_IMAGES_PER_SIDE);

export default function LookbookForm() {
  const [leftImages, setLeftImages] = useState([]);
  const [rightImages, setRightImages] = useState([]);
  const [centerContent, setCenterContent] = useState(DEFAULT_CENTER);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  const SLUG = "timeless-women";

  useEffect(() => {
    const load = async () => {
      try {
        const [lookbookRes, catRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/lookbooks/${SLUG}`, {
            withCredentials: true,
          }),
          fetchAllCategories(),
        ]);

        if (catRes?.data) {
          setCategories(catRes.data);
        }

        const lb = lookbookRes.data?.lookbook;
        if (lb) {
          const sharedFallback = lb.sliderImages || [];
          setLeftImages(
            limitSideImages(
              lb.leftSliderImages?.length > 0
                ? lb.leftSliderImages
                : sharedFallback,
            ),
          );
          setRightImages(
            limitSideImages(
              lb.rightSliderImages?.length > 0
                ? lb.rightSliderImages
                : sharedFallback,
            ),
          );

          if (lb.centerContent) {
            const categoryLinks = normalizeCategoryLinks(lb.centerContent);
            setCenterContent({
              ...DEFAULT_CENTER,
              ...lb.centerContent,
              categoryLink: categoryLinks[0] || "",
              categoryLinks,
              buttonLink:
                buildLookbookProductListHref(categoryLinks) ||
                lb.centerContent.buttonLink ||
                "",
            });
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

  const validateImage = (file) =>
    new Promise((resolve, reject) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        const ext = file.name.split(".").pop()?.toUpperCase() || "UNKNOWN";
        reject(`Images of ${ext} are not allowed`);
      } else {
        resolve();
      }
    });

  const handleImageUpload = async (e, side) => {
    const newFiles = Array.from(e.target.files);
    if (!newFiles.length) return;

    const currentImages = side === "left" ? leftImages : rightImages;
    const remainingSlots = MAX_IMAGES_PER_SIDE - currentImages.length;

    if (remainingSlots <= 0) {
      toast.error(`You can add at most ${MAX_IMAGES_PER_SIDE} ${side} images.`);
      e.target.value = "";
      return;
    }

    const filesToValidate = newFiles.slice(0, remainingSlots);
    if (newFiles.length > remainingSlots) {
      toast.error(
        `Only ${remainingSlots} more ${side} image(s) can be added. Maximum is ${MAX_IMAGES_PER_SIDE}.`,
      );
    }

    const valid = [];
    const errors = [];

    await Promise.all(
      filesToValidate.map(async (file) => {
        try {
          await validateImage(file);
          valid.push(file);
        } catch (err) {
          errors.push(err);
        }
      }),
    );

    if (errors.length) {
      errors.forEach((err) => toast.error(err, { duration: 4000 }));
    }

    if (valid.length) {
      const newImgs = valid.map((file) => ({
        url: URL.createObjectURL(file),
        file,
        isNew: true,
        categoryLink: "",
      }));
      const setter = side === "left" ? setLeftImages : setRightImages;
      setter((prev) => [...prev, ...newImgs]);
      toast.success(`${valid.length} ${side} image(s) added`);
    }

    e.target.value = "";
  };

  const removeImage = (side, index) => {
    const setter = side === "left" ? setLeftImages : setRightImages;
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const updateImageCategory = (side, index, categorySlug) => {
    const setter = side === "left" ? setLeftImages : setRightImages;
    setter((prev) =>
      prev.map((img, i) =>
        i === index ? { ...img, categoryLink: categorySlug } : img,
      ),
    );
  };

  const handleCenterChange = (field, value) => {
    setCenterContent((prev) => ({ ...prev, [field]: value }));
  };

  const appendImagesToForm = (formData, side, images) => {
    const existingImages = images.filter((img) => !img.isNew);
    const newImages = images.filter((img) => img.isNew);
    const existingKey = side === "left" ? "existingLeftImages" : "existingRightImages";
    const fileKey = side === "left" ? "leftImages" : "rightImages";
    const metaKey = side === "left" ? "newLeftImagesMeta" : "newRightImagesMeta";

    formData.append(existingKey, JSON.stringify(existingImages));
    newImages.forEach((img) => formData.append(fileKey, img.file));
    formData.append(
      metaKey,
      JSON.stringify(
        newImages.map((img) => ({ categoryLink: img.categoryLink || "" })),
      ),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    const formData = new FormData();

    appendImagesToForm(formData, "left", leftImages);
    appendImagesToForm(formData, "right", rightImages);
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
        toast.success("Deals updated successfully!");
        const lb = data.lookbook;
        setLeftImages(limitSideImages(lb.leftSliderImages || []));
        setRightImages(limitSideImages(lb.rightSliderImages || []));
        if (lb.centerContent) {
          const categoryLinks = normalizeCategoryLinks(lb.centerContent);
          setCenterContent({
            ...DEFAULT_CENTER,
            ...lb.centerContent,
            categoryLink: categoryLinks[0] || "",
            categoryLinks,
            buttonLink:
              buildLookbookProductListHref(categoryLinks) ||
              lb.centerContent.buttonLink ||
              "",
          });
        }
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
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-black text-amber-800 uppercase tracking-wide">
            Image Requirements
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Add separate images for the left and right lookbook sliders. Each
            image can link to its own category. The View More button uses the
            center content link only. Supported formats: JPG, PNG, WEBP, GIF, SVG, AVIF, JFIF.
          </p>
        </div>
      </div>

      <ImageSection
        title="Left Slider Images"
        description="Images and links for the left carousel."
        images={leftImages}
        onUpload={(e) => handleImageUpload(e, "left")}
        onRemove={(index) => removeImage("left", index)}
        onCategoryChange={(index, slug) =>
          updateImageCategory("left", index, slug)
        }
        categories={categories}
        maxImages={MAX_IMAGES_PER_SIDE}
      />

      <ImageSection
        title="Right Slider Images"
        description="Images and links for the right carousel."
        images={rightImages}
        onUpload={(e) => handleImageUpload(e, "right")}
        onRemove={(index) => removeImage("right", index)}
        onCategoryChange={(index, slug) =>
          updateImageCategory("right", index, slug)
        }
        categories={categories}
        maxImages={MAX_IMAGES_PER_SIDE}
      />

      <CenterSection
        content={centerContent}
        onChange={handleCenterChange}
        categories={categories}
      />

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

function CategorySelect({
  value,
  onChange,
  categories,
  placeholder = "No link - select category",
}) {
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

function MultiCategorySelect({
  value = [],
  onChange,
  categories,
  placeholder = "Select categories",
}) {
  const selected = Array.isArray(value) ? value : [];
  const selectedCategories = categories.filter((cat) =>
    selected.includes(cat.slug),
  );
  const availableCategories = categories.filter(
    (cat) => !selected.includes(cat.slug),
  );

  const addCategory = (slug) => {
    if (!slug || selected.includes(slug)) return;
    onChange([...selected, slug]);
  };

  const removeCategory = (slug) => {
    onChange(selected.filter((item) => item !== slug));
  };

  return (
    <div className="space-y-2">
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
          value=""
          onChange={(e) => addCategory(e.target.value)}
          className="w-full appearance-none pl-7 pr-7 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {availableCategories.map((cat) => (
            <option key={cat._id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCategories.map((cat) => (
            <span
              key={cat._id}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
            >
              {cat.name}
              <button
                type="button"
                onClick={() => removeCategory(cat.slug)}
                className="rounded-full p-0.5 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-800"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageSection({
  title,
  description,
  images,
  onUpload,
  onRemove,
  onCategoryChange,
  categories,
  maxImages,
}) {
  const isAtLimit = images.length >= maxImages;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4 gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase">
            {title}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              400 x 310 ratio
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Max {maxImages} images
            </span>
            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              JPG / PNG / WEBP / GIF / SVG / AVIF / JFIF
            </span>
          </div>
        </div>
        <label
          className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
            isAtLimit
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
          }`}
        >
          <PlusSquare size={16} className="text-white/80 group-hover:text-white" />
          <span>{isAtLimit ? "Limit Reached" : "Add Images"}</span>
          <input
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={onUpload}
            disabled={isAtLimit}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((img, i) => (
          <div
            key={`${img.key || img.url}-${i}`}
            className="rounded-2xl overflow-visible bg-white border-2 border-indigo-400 relative shadow-sm transition-all animate-in zoom-in-95 duration-200 group"
          >
            <div className="aspect-[400/310] overflow-hidden rounded-t-xl">
              <img
                src={img.url}
                alt={`Slide ${i + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>

            {img.isNew && (
              <div className="absolute top-2 left-2 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm bg-indigo-500 z-10">
                New
              </div>
            )}

            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-2 right-2 bg-white/90 backdrop-blur text-rose-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-500 hover:text-white z-10"
            >
              <Trash2 size={14} />
            </button>

            <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Image link
              </p>
              <CategorySelect
                value={img.categoryLink}
                onChange={(slug) => onCategoryChange(i, slug)}
                categories={categories}
                placeholder="No link"
              />
              {img.categoryLink && (
                <p className="text-[8px] text-indigo-500 font-semibold mt-1 truncate">
                  /{img.categoryLink}
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
              400 x 310 ratio - JPG, PNG, WEBP, GIF, SVG, AVIF, JFIF
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CenterSection({ content, onChange, categories }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Type size={15} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase">
            Center Content
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            The View More button uses this link, separate from image links.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Top Label
          </label>
          <input
            type="text"
            value={content.label}
            onChange={(e) => onChange("label", e.target.value)}
            placeholder="e.g. Exclusive Deal - Few Days Left"
            className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition placeholder:text-slate-300"
          />
        </div>

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

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            View More Button Categories
          </label>
          <MultiCategorySelect
            value={content.categoryLinks}
            onChange={(slugs) => {
              onChange("categoryLinks", slugs);
              onChange("categoryLink", slugs[0] || "");
              onChange("buttonLink", buildLookbookProductListHref(slugs));
            }}
            categories={categories}
            placeholder="Add a category"
          />
          {content.buttonLink && (
            <p className="text-[10px] text-emerald-600 font-semibold mt-1.5">
              {content.buttonLink}
            </p>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
            Preview
          </label>
          <div className="bg-[#faf9f7] border border-slate-200 rounded-2xl px-6 py-8 flex flex-col items-center text-center gap-3 hover:shadow-md transition">
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
            {content.buttonText && (
              <span className="mt-2 inline-flex items-center gap-1.5 bg-slate-900 text-white text-[10px] font-bold px-4 py-2 rounded-full tracking-wider">
                {content.buttonText}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
