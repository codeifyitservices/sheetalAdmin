import React from "react";
import { X } from "lucide-react";
import InputField from "./InputField";
import TiptapEditor from "@/components/TiptapEditor";

export default function BasicInfoParams({
  formData,
  handleChange,
  setFormData,
  categories,
  handleAddTag,
  removeTag,
}) {
  const selectedCategory = categories.find((c) => c._id === formData.category);

  return (
    <div className="space-y-5 animate-in fade-in duration-300 min-h-0">
      <InputField
        label="Product Title"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="e.g. Cotton Slim Fit Shirt"
        required
        maxLength={150}
      />

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Short Description (Summary)
        </label>
        <textarea
          name="shortDescription"
          value={formData.shortDescription}
          onChange={handleChange}
          placeholder="Write a brief summary for product cards..."
          className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none shadow-sm min-h-[80px]"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none cursor-pointer appearance-none shadow-sm"
          >
            <option value="">Choose Category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Sub Category
          </label>
          <select
            name="subCategory"
            value={formData.subCategory}
            onChange={handleChange}
            disabled={!formData.category}
            className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none cursor-pointer appearance-none shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">Choose Sub Category</option>
            {categories
              .find((c) => c._id === formData.category)
              ?.subCategories?.map((sub, idx) => (
                <option key={idx} value={sub}>
                  {sub}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full bg-white border border-slate-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-slate-900 outline-none shadow-sm"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <InputField
          label="SKU Code"
          name="sku"
          value={formData.sku}
          onChange={handleChange}
          placeholder="CLOTH-001"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            Low Stock Alert Threshold
            <span className="text-[10px] font-normal text-slate-400 normal-case tracking-normal">
              (alert when any size stock ≤ this number)
            </span>
          </label>
          <input
            type="number"
            name="lowStockThreshold"
            value={formData.lowStockThreshold ?? 5}
            onChange={handleChange}
            min={0}
            className="w-full bg-white border border-amber-400 px-4 py-2.5 rounded-lg text-sm text-slate-900 focus:border-amber-600 outline-none shadow-sm max-w-[200px]"
            placeholder="e.g. 5"
          />
        </div>
        <div className="flex flex-col gap-3 justify-evenly">
          {[
            {
              name: "isTrending",
              label: "Push for Trending",
              track: "peer-checked:border-emerald-500 peer-checked:bg-emerald-500",
            },
            {
              name: "isNewArrival",
              label: "Push for New Arrivals",
              track: "peer-checked:border-emerald-500 peer-checked:bg-emerald-500",
            },
            {
              name: "isCollection",
              label: "Push for Collection",
              track: "peer-checked:border-emerald-500 peer-checked:bg-emerald-500",
            },
          ].map(({ name, label, track }) => (
            <label
              key={name}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="relative">
                <input
                  type="checkbox"
                  name={name}
                  checked={formData[name] ?? false}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div
                  className={`w-10 h-5 rounded-full border-2 transition-all duration-200 border-slate-300 bg-slate-100 ${track}`}
                />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 peer-checked:translate-x-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider transition-colors duration-200 text-slate-400 group-hover:text-slate-600">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Full Description
        </label>
        <TiptapEditor
          value={formData.description}
          onChange={(content) =>
            setFormData((prev) => ({ ...prev, description: content }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Material & Care Instructions
        </label>
        <TiptapEditor
          value={formData.materialCare}
          onChange={(content) =>
            setFormData((prev) => ({
              ...prev,
              materialCare: content,
            }))
          }
        />
      </div>

      {/* General Tags */}
      <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Tags (Press Enter)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map((tag, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider"
            >
              {tag}{" "}
              <button type="button" onClick={() => removeTag(tag, "tags")}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          onKeyDown={(e) => handleAddTag(e, "tags")}
          placeholder="e.g. Trending, Premium..."
          className="w-full bg-white border border-slate-300 px-4 py-2 rounded-lg text-sm outline-none"
        />
      </div>

      {/* New Categorization Tags: Type, Fabric, Style, Work */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: "Product Type",
            key: "productType",
            color: "bg-indigo-600",
            lightColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
          },
          {
            label: "Fabric",
            key: "fabric",
            color: "bg-teal-600",
            lightColor: "bg-teal-50 text-teal-700 border-teal-200",
          },
          {
            label: "Style",
            key: "style",
            color: "bg-orange-600",
            lightColor: "bg-orange-50 text-orange-700 border-orange-200",
          },
          {
            label: "Work",
            key: "work",
            color: "bg-rose-600",
            lightColor: "bg-rose-50 text-rose-700 border-rose-200",
          },
          {
            label: "Wear Type",
            key: "wearType",
            color: "bg-purple-600",
            lightColor: "bg-purple-50 text-purple-700 border-purple-200",
          },
          {
            label: "Occasion",
            key: "occasion",
            color: "bg-pink-600",
            lightColor: "bg-pink-50 text-pink-700 border-pink-200",
          },
          {
            label: "By Price",
            key: "byPrice",
            color: "bg-amber-600",
            lightColor: "bg-amber-50 text-amber-700 border-amber-200",
          },
        ].map((section) => (
          <div
            key={section.key}
            className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 flex flex-col"
          >
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {section.label}
            </label>

            {/* Selected Tags */}
            <div className="flex flex-wrap gap-2 mb-2 min-h-[24px]">
              {formData[section.key].map((tag, idx) => (
                <span
                  key={idx}
                  className={`flex items-center gap-1 ${section.color} text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-sm`}
                >
                  {tag}{" "}
                  <button
                    type="button"
                    onClick={() => removeTag(tag, section.key)}
                    className="hover:text-slate-200"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>

            {/* Category Suggestions */}
            {selectedCategory &&
              selectedCategory[section.key] &&
              selectedCategory[section.key].length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Suggested from {selectedCategory.name}:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCategory[section.key].map((catTag, idx) => {
                      const isSelected = formData[section.key].includes(catTag);
                      if (isSelected) return null;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (!formData[section.key].includes(catTag)) {
                              setFormData((prev) => ({
                                ...prev,
                                [section.key]: [...prev[section.key], catTag],
                              }));
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${section.lightColor} border hover:shadow-sm`}
                        >
                          + {catTag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            <input
              type="text"
              onKeyDown={(e) => handleAddTag(e, section.key)}
              placeholder={`Add ${section.label}...`}
              className="mt-auto w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-sm outline-none focus:border-slate-800 transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
