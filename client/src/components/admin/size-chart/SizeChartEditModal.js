"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X, GripVertical } from "lucide-react";
import { updateSizeChart } from "@/services/sizeChartService";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DEFAULT_HEADERS = ["Size", "Bust", "Waist"];
const MAX_COLUMNS = 8;

const createEmptyRow = (columnCount) => ({
  cells: Array.from({ length: columnCount }, () => ""),
});

const toLegacyRow = (cells = []) => ({
  label: String(cells[0] || "").trim(),
  bust: String(cells[1] || "").trim(),
  waist: String(cells[2] || "").trim(),
  hip: String(cells[3] || "").trim(),
  shoulder: String(cells[4] || "").trim(),
  length: String(cells[5] || "").trim(),
});

const normalizeRow = (row = {}, columnCount = DEFAULT_HEADERS.length) => {
  const cells = Array.isArray(row.cells)
    ? row.cells
    : [row.label, row.bust, row.waist, row.hip, row.shoulder, row.length];
  return {
    cells: Array.from({ length: columnCount }, (_, i) => cells[i] || ""),
  };
};

// Attach stable ids to a plain string headers array
const toHeaderObjects = (arr) =>
  arr.map((label, i) => ({ id: `col-${Date.now()}-${i}-${Math.random()}`, label }));

// ─── Sortable column header card ─────────────────────────────────────────────

function SortableColumnCard({ id, index, header, onUpdateHeader, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-gray-200 bg-white p-3 select-none"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className={`p-0.5 rounded transition-colors ${
              index === 0
                ? "text-gray-200 cursor-not-allowed"
                : "text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
            }`}
            title={index === 0 ? "Size column is locked" : "Drag to reorder"}
          >
            <GripVertical size={14} />
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Header {index + 1}
          </span>
        </div>
        {index > 0 && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-rose-600 hover:text-rose-700 cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <input
        type="text"
        value={header}
        onChange={(e) => onUpdateHeader(index, e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        placeholder={`Column ${index + 1}`}
      />
    </div>
  );
}

// ─── Drag overlay ghost ───────────────────────────────────────────────────────

function ColumnCardOverlay({ header }) {
  return (
    <div className="rounded-lg border-2 border-indigo-400 bg-indigo-50 shadow-xl p-3 w-44 rotate-2">
      <div className="mb-2 flex items-center gap-1.5">
        <GripVertical size={14} className="text-indigo-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
          Moving
        </span>
      </div>
      <div className="px-3 py-2 border border-indigo-200 rounded-lg text-sm text-indigo-700 bg-white truncate">
        {header || "Column"}
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function SizeChartEditModal({
  isOpen,
  onClose,
  onChartUpdated,
  chart,
}) {
  const [name, setName] = useState(chart?.name || "");
  const [headers, setHeaders] = useState(() => toHeaderObjects(DEFAULT_HEADERS));
  const [rows, setRows] = useState([createEmptyRow(DEFAULT_HEADERS.length)]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const columnCount = headers.length;
  const rowCount = useMemo(() => rows.length, [rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (!isOpen || !chart) return;
    const rawHeaders =
      Array.isArray(chart.headers) && chart.headers.length > 0
        ? chart.headers
        : DEFAULT_HEADERS;
    setName(chart.name || "");
    setHeaders(toHeaderObjects(rawHeaders));
    setRows(
      Array.isArray(chart.table) && chart.table.length > 0
        ? chart.table.map((row) => normalizeRow(row, rawHeaders.length))
        : [createEmptyRow(rawHeaders.length)]
    );
  }, [isOpen, chart]);

  if (!isOpen || !chart) return null;

  // ── Column operations ──────────────────────────────────────────────────────

  const updateHeader = (index, value) => {
    setHeaders((prev) =>
      prev.map((h, i) => (i === index ? { ...h, label: value } : h))
    );
  };

  const addColumn = () => {
    if (headers.length >= MAX_COLUMNS) {
      toast.error(`You can add up to ${MAX_COLUMNS} columns only.`);
      return;
    }
    const newId = `col-${Date.now()}`;
    setHeaders((prev) => [
      ...prev,
      { id: newId, label: `Column ${prev.length + 1}` },
    ]);
    setRows((prev) => prev.map((row) => normalizeRow(row, headers.length + 1)));
  };

  const removeColumn = (index) => {
    if (index === 0) {
      toast.error("The first column is required for sizes.");
      return;
    }
    setHeaders((prev) => prev.filter((_, i) => i !== index));
    setRows((prev) =>
      prev.map((row) => ({
        cells: row.cells.filter((_, ci) => ci !== index),
      }))
    );
  };

  // ── DnD handlers ──────────────────────────────────────────────────────────

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = headers.findIndex((h) => h.id === active.id);
    const newIndex = headers.findIndex((h) => h.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    if (oldIndex === 0 || newIndex === 0) {
      toast.error("The size column must stay first.");
      return;
    }

    setHeaders((prev) => arrayMove(prev, oldIndex, newIndex));
    setRows((prev) =>
      prev.map((row) => ({
        cells: arrayMove(row.cells, oldIndex, newIndex),
      }))
    );
  };

  // ── Row operations ─────────────────────────────────────────────────────────

  const updateRowCell = (rowIndex, cellIndex, value) => {
    setRows((prev) =>
      prev.map((row, ri) =>
        ri !== rowIndex
          ? row
          : {
              cells: row.cells.map((cell, ci) =>
                ci === cellIndex ? value : cell
              ),
            }
      )
    );
  };

  const addRow = () => setRows((prev) => [...prev, createEmptyRow(headers.length)]);

  const removeRow = (index) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [createEmptyRow(headers.length)];
    });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextName = name.trim();
    if (!nextName) { toast.error("Chart name is required."); return; }

    const cleanedHeaders = headers.map((h) => h.label.trim());
    if (cleanedHeaders.some((h) => !h)) {
      toast.error("All column headers are required.");
      return;
    }

    const cleanedRows = rows
      .map((row) => {
        const cells = row.cells.map((c) => String(c || "").trim());
        return {
          cells,
          ...toLegacyRow(cells),
        };
      })
      .filter((row) => row.cells[0]);

    if (cleanedRows.length === 0) {
      toast.error("Add at least one size row.");
      return;
    }

    setLoading(true);
    try {
      const data = await updateSizeChart(chart._id, {
        name: nextName,
        headers: cleanedHeaders,
        table: cleanedRows,
      });
      onChartUpdated(data.data);
      toast.success("Size chart updated");
    } catch (error) {
      console.error("Failed to update chart", error);
      toast.error(error.message || "Failed to update size chart.");
    } finally {
      setLoading(false);
    }
  };

  const activeHeader = headers.find((h) => h.id === activeId);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[120]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col text-black">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-black">Edit Size Chart</h2>
            <p className="text-xs text-black/60 mt-1">
              Update headers, drag to reorder columns, and keep the chart within 8 columns.
            </p>
            <p className="text-xs text-black/60 mt-1 italic font-semibold">
              THE VALUES MUST BE IN INCHES
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-700 hover:text-black transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 overflow-y-auto flex-1">
          {/* Name row */}
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
              <p className="text-xs text-black/50">
                {rowCount} row{rowCount !== 1 ? "s" : ""} · {columnCount} column{columnCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Columns section with DnD */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-black">Columns</h3>
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                  Drag <GripVertical size={11} className="inline-block" /> to reorder · first column is locked
                </p>
              </div>
              <button
                type="button"
                onClick={addColumn}
                disabled={headers.length >= MAX_COLUMNS}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
                Add Column
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={headers.map((h) => h.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${headers.length}, minmax(120px, 1fr))`,
                  }}
                >
                  {headers.map((header, index) => (
                    <SortableColumnCard
                      key={header.id}
                      id={header.id}
                      index={index}
                      header={header.label}
                      onUpdateHeader={updateHeader}
                      onRemove={removeColumn}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay dropAnimation={{ duration: 150 }}>
                {activeHeader ? <ColumnCardOverlay header={activeHeader.label} /> : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Rows */}
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
            {rows.map((row, rowIndex) => (
              <div
                key={`row-${rowIndex}`}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))`,
                  }}
                >
                  {headers.map((header, cellIndex) => (
                    <Field
                      key={`cell-${rowIndex}-${header.id}`}
                      label={header.label || `Column ${cellIndex + 1}`}
                      value={row.cells[cellIndex] || ""}
                      onChange={(value) => updateRowCell(rowIndex, cellIndex, value)}
                      placeholder={cellIndex === 0 ? "S, M, L" : "Value"}
                    />
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Remove row
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
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
