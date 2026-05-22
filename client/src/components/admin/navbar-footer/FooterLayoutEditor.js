"use client";
import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getSettings, updateSettings } from "../../../services/settingsService";
import toast from "react-hot-toast";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";

const createId = () => Math.random().toString(36).substr(2, 9);

const defaultFooterLayout = [
  {
    id: createId(),
    type: "double",
    title: "Information",
    hidden: false,
    columns: [
      {
        id: createId(),
        hidden: false,
        links: [
          {
            id: createId(),
            label: "Our Story",
            href: "/about-us",
            hidden: false,
          },
          { id: createId(), label: "Blog", href: "/blog", hidden: false },
          { id: createId(), label: "FAQ's", href: "/faq", hidden: false },
          {
            id: createId(),
            label: "Contact Us",
            href: "/contact-us",
            hidden: false,
          },
        ],
      },
      {
        id: createId(),
        hidden: false,
        links: [
          {
            id: createId(),
            label: "My Account",
            href: "/my-account",
            hidden: false,
          },
          {
            id: createId(),
            label: "Track Order",
            href: "/track-order",
            hidden: false,
          },
          {
            id: createId(),
            label: "Return Order",
            href: "/return-order",
            hidden: false,
          },
          { id: createId(), label: "Sitemap", href: "/sitemap", hidden: false },
        ],
      },
    ],
  },
  {
    id: createId(),
    type: "single",
    title: "Quick Links",
    hidden: false,
    links: [
      {
        id: createId(),
        label: "Privacy Policy",
        href: "/privacy-policy",
        hidden: false,
      },
      {
        id: createId(),
        label: "Return & Exchange Policy",
        href: "/return-exchange-policy",
        hidden: false,
      },
      {
        id: createId(),
        label: "Shipping Policy",
        href: "/shipping-policy",
        hidden: false,
      },
      {
        id: createId(),
        label: "Terms of Use",
        href: "/terms-and-conditions",
        hidden: false,
      },
    ],
  },
];

// ── Sortable link row ──────────────────────────────────────────────────────
const SortableLinkItem = ({ id, link, onUpdate }) => {
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 mb-2 p-2 bg-[#102a20] rounded border border-white/10 ${link.hidden ? "opacity-50 grayscale" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-move text-gray-400 hover:text-white px-1 text-xs"
      >
        ⋮⋮
      </div>
      <input
        type="text"
        value={link.label}
        onChange={(e) => onUpdate(id, "label", e.target.value)}
        className="flex-1 bg-transparent text-[#b3a660] text-sm focus:outline-none"
        placeholder="Label"
      />
      <button
        type="button"
        onClick={() => onUpdate(id, "hidden", !link.hidden)}
        className="p-1 hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {link.hidden ? (
          <EyeOff size={14} className="text-red-400" />
        ) : (
          <Eye size={14} className="text-emerald-400" />
        )}
      </button>
    </div>
  );
};

// ── Single link-list column ────────────────────────────────────────────────
const LinkListEditor = ({ links, onChange, label }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleUpdate = (linkId, field, value) => {
    onChange(
      links.map((l) => (l.id === linkId ? { ...l, [field]: value } : l)),
    );
  };

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      const oldIdx = links.findIndex((l) => l.id === active.id);
      const newIdx = links.findIndex((l) => l.id === over.id);
      onChange(arrayMove(links, oldIdx, newIdx));
    }
  };

  return (
    <div>
      {label && (
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
          {label}
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={links.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {links.map((link) => (
            <SortableLinkItem
              key={link.id}
              id={link.id}
              link={link}
              onUpdate={handleUpdate}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

// ── Double-column block editor (Information) ───────────────────────────────
const DoubleColumnEditor = ({ block, onChange }) => {
  const updateColumn = (colIndex, newLinks) => {
    const newColumns = block.columns.map((col, i) =>
      i === colIndex ? { ...col, links: newLinks } : col,
    );
    onChange({ ...block, columns: newColumns });
  };

  return (
    <div className="bg-[#082722]/90 border border-[#f2bf42]/30 p-4 rounded-lg">
      {/* Title row */}
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
        <input
          type="text"
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          className="bg-transparent text-lg font-semibold text-[#f2bf42] focus:outline-none w-full"
          placeholder="Section Title (e.g. Information)"
        />
        <button onClick={() => onChange({ ...block, hidden: !block.hidden })}>
          {block.hidden ? (
            <EyeOff size={18} className="text-red-400" />
          ) : (
            <Eye size={18} className="text-emerald-400" />
          )}
        </button>
      </div>

      {/* Two sub-columns side by side */}
      <div className="grid grid-cols-2 gap-4">
        {block.columns.map((col, i) => (
          <div
            key={col.id}
            className="bg-[#0d2e20] rounded p-3 border border-white/10"
          >
            <p className="text-xs text-[#f2bf42]/60 mb-3 uppercase tracking-wider">
              Sub-column {i + 1}
            </p>
            <LinkListEditor
              links={col.links}
              onChange={(newLinks) => updateColumn(i, newLinks)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Single-column block editor (Quick Links) ───────────────────────────────
const SingleColumnEditor = ({ block, onChange }) => (
  <div className="bg-[#082722]/90 border border-[#f2bf42]/30 p-4 rounded-lg">
    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
      <input
        type="text"
        value={block.title}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
        className="bg-transparent text-lg font-semibold text-[#f2bf42] focus:outline-none w-full"
        placeholder="Section Title (e.g. Quick Links)"
      />
      <button onClick={() => onChange({ ...block, hidden: !block.hidden })}>
        {block.hidden ? (
          <EyeOff size={18} className="text-red-400" />
        ) : (
          <Eye size={18} className="text-emerald-400" />
        )}
      </button>
    </div>
    <LinkListEditor
      links={block.links}
      onChange={(newLinks) => onChange({ ...block, links: newLinks })}
    />
  </div>
);

// ── Main editor ────────────────────────────────────────────────────────────
const FooterLayoutEditor = () => {
  const [layout, setLayout] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await getSettings();
        const saved = res.data?.footerLayout;
        const isValid =
          Array.isArray(saved) &&
          saved.length > 0 &&
          saved[0].hasOwnProperty("type") &&
          (saved[0].type === "double" || saved[0].type === "single");

        setLayout(isValid ? saved : defaultFooterLayout);
      } catch {
        toast.error("Failed to load footer layout");
        setLayout(defaultFooterLayout);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const updateBlock = (id, updated) => {
    setLayout(layout.map((b) => (b.id === id ? updated : b)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({ footerLayout: layout });
      toast.success("Footer Layout Saved!");
    } catch {
      toast.error("Failed to save footer layout");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-center text-white">
        <Loader2 className="animate-spin inline mr-2" />
        Loading Footer Editor...
      </div>
    );

  return (
    <div className="w-full pb-10">
      <div className="flex justify-between items-center mb-6 px-4">
        <h2 className="text-xl text-black font-semibold">
          Footer Layout Editor
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Footer
        </button>
      </div>

      <p className="px-4 text-sm text-gray-500 mb-6">
        The first block is the "Information" double-column. The second is the
        "Quick Links" single column. Hide sections or individual links as
        needed.
      </p>

      <div className="flex flex-col gap-6 px-4">
        {layout.map((block) =>
          block.type === "double" ? (
            <DoubleColumnEditor
              key={block.id}
              block={block}
              onChange={(updated) => updateBlock(block.id, updated)}
            />
          ) : (
            <SingleColumnEditor
              key={block.id}
              block={block}
              onChange={(updated) => updateBlock(block.id, updated)}
            />
          ),
        )}
      </div>
    </div>
  );
};

export default FooterLayoutEditor;
