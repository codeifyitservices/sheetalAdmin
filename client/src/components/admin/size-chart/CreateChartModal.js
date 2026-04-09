"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { createSizeChart } from "@/services/sizeChartService";
import toast from "react-hot-toast";

const EMPTY_ROW = {
  label: "",
  bust: "",
  waist: "",
  hip: "",
  shoulder: "",
  length: "",
};

const cloneRow = (row = {}) => ({
  label: row.label || "",
  bust: row.bust || "",
  waist: row.waist || "",
  hip: row.hip || "",
  shoulder: row.shoulder || "",
  length: row.length || "",
});

export default function CreateChartModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [rows, setRows] = useState([cloneRow(EMPTY_ROW)]);
  const [loading, setLoading] = useState(false);

  const rowCount = useMemo(() => rows.length, [rows]);

  if (!isOpen) return null;

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, cloneRow(EMPTY_ROW)]);
  };

  const removeRow = (index) => {
    setRows((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length > 0 ? next : [cloneRow(EMPTY_ROW)];
    });
  };

  const resetForm = () => {
    setName("");
    setRows([cloneRow(EMPTY_ROW)]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Chart name is required.");
      return;
    }

    const cleanedRows = rows
      .map((row) => ({
        label: row.label.trim(),
        bust: row.bust.trim(),
        waist: row.waist.trim(),
        hip: row.hip.trim(),
        shoulder: row.shoulder.trim(),
        length: row.length.trim(),
      }))
      .filter((row) => row.label);

    if (cleanedRows.length === 0) {
      toast.error("Add at least one size row.");
      return;
    }

    setLoading(true);
    try {
      const data = await createSizeChart({
        name: name.trim(),
        table: cleanedRows,
      });
      onSuccess(data.data);
      resetForm();
    } catch (error) {
      console.error("Failed to create chart", error);
      toast.error(error.message || "Failed to create size chart.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[120]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col text-black">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-black">New Size Chart</h2>
            <p className="text-xs text-black/70 mt-1">
              Create the chart name and rows from here.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-700 hover:text-black transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-black mb-1.5">Chart name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Women's tops, Men's bottoms..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                autoFocus
              />
            </div>
            <div className="flex items-end">
              <div className="text-xs text-black/70">
                {rowCount} row{rowCount !== 1 ? "s" : ""} in this chart
              </div>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-black">Size Rows</h3>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 cursor-pointer"
            >
              <Plus size={14} />
              Add Row
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={`${row.label || "row"}-${index}`}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <Field
                    label="Size"
                    value={row.label}
                    onChange={(value) => updateRow(index, "label", value)}
                    placeholder="S, M, L"
                  />
                  <Field
                    label="Bust"
                    value={row.bust}
                    onChange={(value) => updateRow(index, "bust", value)}
                    placeholder="34"
                  />
                  <Field
                    label="Waist"
                    value={row.waist}
                    onChange={(value) => updateRow(index, "waist", value)}
                    placeholder="28"
                  />
                  <Field
                    label="Hip"
                    value={row.hip}
                    onChange={(value) => updateRow(index, "hip", value)}
                    placeholder="36"
                  />
                  <Field
                    label="Shoulder"
                    value={row.shoulder}
                    onChange={(value) => updateRow(index, "shoulder", value)}
                    placeholder="15"
                  />
                  <div className="flex items-end justify-end">
                    <Field
                      label="Length"
                      value={row.length}
                      onChange={(value) => updateRow(index, "length", value)}
                      placeholder="24"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Remove row
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? "Creating..." : "Create Chart"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-semibold text-black uppercase tracking-wider mb-1">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
      />
    </label>
  );
}
