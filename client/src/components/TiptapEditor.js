"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { createPortal } from "react-dom";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import EmojiPicker from "emoji-picker-react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Smile,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Trash2,
  ExternalLink,
  Unlink,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// FontSize extension
// ---------------------------------------------------------------------------
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

// ---------------------------------------------------------------------------
// Content normalisation
// ---------------------------------------------------------------------------
const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

const normalizeContent = (value) => {
  if (!value) return EMPTY_DOC;

  if (typeof value === "object" && value !== null) {
    if (value.type === "doc") return value;
    return EMPTY_DOC;
  }

  if (typeof value !== "string") return EMPTY_DOC;

  const trimmed = value.trim();
  if (!trimmed) return EMPTY_DOC;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.type === "doc") return parsed;
    } catch {
      // not JSON — fall through
    }
  }

  return normalizeHtmlString(trimmed);
};

const escapeHtml = (value = "") =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeMarkdownInline = (text = "") => {
  const source = String(text ?? "");
  let output = "";
  let i = 0;

  while (i < source.length) {
    if (source[i] === "*" && source[i + 1] === "*") {
      const end = source.indexOf("**", i + 2);
      if (end === -1) {
        output += escapeHtml("**");
        i += 2;
        continue;
      }
      output += `<strong>${normalizeMarkdownInline(source.slice(i + 2, end))}</strong>`;
      i = end + 2;
      continue;
    }
    if (source[i] === "*" || source[i] === "_") {
      const marker = source[i];
      const end = source.indexOf(marker, i + 1);
      if (end === -1) {
        output += escapeHtml(marker);
        i += 1;
        continue;
      }
      output += `<em>${normalizeMarkdownInline(source.slice(i + 1, end))}</em>`;
      i = end + 1;
      continue;
    }
    let j = i;
    while (j < source.length && source[j] !== "*" && source[j] !== "_") j += 1;
    output += escapeHtml(source.slice(i, j));
    i = j;
  }

  return output;
};

const markdownToHtml = (input = "") => {
  const lines = String(input ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const blocks = [];
  let bullets = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      `<ul>${bullets.map((item) => `<li>${item}</li>`).join("")}</ul>`,
    );
    bullets = [];
  };

  const isBullet = (line = "") =>
    /^\s*(?:-|\u2022|\u00B7|\u2013|\u2014)(?:\s+|(?=\S))/.test(line);
  const stripBullet = (line = "") =>
    line.replace(/^\s*(?:-|\u2022|\u00B7|\u2013|\u2014)\s*/, "");

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      blocks.push("<p><br></p>");
      return;
    }
    const heading = trimmed.match(/^(#{1,6})\s+([\s\S]+)$/);
    if (heading) {
      flushBullets();
      const level = heading[1].length;
      blocks.push(
        `<h${level}>${normalizeMarkdownInline(heading[2].trim())}</h${level}>`,
      );
      return;
    }
    if (isBullet(trimmed)) {
      bullets.push(normalizeMarkdownInline(stripBullet(trimmed)));
      return;
    }
    flushBullets();
    blocks.push(`<p>${normalizeMarkdownInline(line)}</p>`);
  });

  flushBullets();
  return blocks.join("");
};

const markdownToFragment = (doc, text = "") => {
  const html = normalizeMarkdownInline(text);
  const container = doc.createElement("span");
  container.innerHTML = html;
  const fragment = doc.createDocumentFragment();
  while (container.firstChild) fragment.appendChild(container.firstChild);
  return fragment;
};

const applyMarkdownToHtml = (html) => {
  if (typeof document === "undefined") return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="root">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("root");
  if (!root) return html;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    if (!node.isConnected) return;
    const text = node.nodeValue || "";
    const parentTag = node.parentElement?.tagName?.toLowerCase();
    if (["script", "style"].includes(parentTag)) return;
    if (!text.includes("*") && !text.includes("_") && !text.includes("#"))
      return;
    const fragment = markdownToFragment(doc, text);
    node.parentNode?.replaceChild(fragment, node);
  });
  return root.innerHTML;
};

const normalizeHtmlString = (input = "") => {
  if (!input) return "";
  if (/<[a-z][\s\S]*>/i.test(input)) {
    let html = input
      .replace(
        /<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi,
        "<strong>$1</strong>",
      )
      .replace(/<(?:i|em)\b[^>]*>([\s\S]*?)<\/(?:i|em)>/gi, "<em>$1</em>")
      .replace(
        /<p[^>]*>\s*([-\u2022\u00B7\u2013\u2014])\s*([\s\S]*?)<\/p>/gi,
        "<ul><li>$2</li></ul>",
      )
      .replace(
        /<div[^>]*>\s*([-\u2022\u00B7\u2013\u2014])\s*([\s\S]*?)<\/div>/gi,
        "<ul><li>$2</li></ul>",
      );
    html = applyMarkdownToHtml(html);
    if (
      /^\s*<(?:p|div|h[1-6]|blockquote|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|pre|hr)\b/i.test(
        html,
      )
    ) {
      return html;
    }
    return `<p>${html}</p>`;
  }
  return markdownToHtml(input);
};

const contentKey = (value) => {
  const normalized = normalizeContent(value);
  if (typeof normalized === "string") return normalized;
  return JSON.stringify(normalized);
};

// ---------------------------------------------------------------------------
// Link modal
// ---------------------------------------------------------------------------
const LinkModal = ({ isOpen, onClose, onConfirm, initialUrl, initialText }) => {
  const [url, setUrl] = useState(initialUrl || "");
  const [text, setText] = useState(initialText || "");
  const inputRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl || "");
      setText(initialText || "");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialUrl, initialText]);

  const handleSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
    }
    onConfirm({ url: url.trim(), text: text.trim() });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
      handleSubmit();
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 z-10">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Insert Link
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              URL
            </label>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com"
              className="w-full text-black border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Display text{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Link text"
              className="w-full text-black border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-slate-800 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-700 transition"
            >
              Insert
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 rounded-lg py-2 text-sm font-medium hover:bg-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ---------------------------------------------------------------------------
// Toolbar helpers
// ---------------------------------------------------------------------------
const ToolbarGroup = ({ children }) => (
  <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-2 last:border-r-0 last:mr-0 last:pr-0">
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Editor component
// ---------------------------------------------------------------------------
const TiptapEditor = ({ value, onChange }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [linkModal, setLinkModal] = useState({
    open: false,
    url: "",
    text: "",
  });
  const [, forceUpdate] = useState(0);

  const lastSetKeyRef = useRef(contentKey(value));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        bulletList: {
          HTMLAttributes: { class: "list-disc pl-6 my-2" },
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          HTMLAttributes: { class: "list-decimal pl-6 my-2" },
        },
        blockquote: {
          HTMLAttributes: {
            class:
              "border-l-4 border-slate-700 pl-4 py-1 my-4 italic bg-slate-50",
          },
        },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        validate: (href) => /^https?:\/\//.test(href),
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "rounded-lg max-w-full my-4 block" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: { class: "flex items-start gap-2 my-1" },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class:
            "border-collapse table-auto w-full my-4 border border-slate-300",
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: "bg-slate-100 font-bold border border-slate-300 p-2 text-left",
        },
      }),
      TableCell.configure({
        HTMLAttributes: { class: "border border-slate-300 p-2" },
      }),
    ],
    content: normalizeContent(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[400px] p-6 bg-white rounded-b-lg max-w-none prose prose-slate prose-sm md:prose-base lg:prose-lg overflow-y-auto",
      },
      // Allow clicking links with Ctrl/Cmd
      handleClick(view, pos, event) {
        const attrs = view.state.doc
          .nodeAt(pos)
          ?.marks?.find((m) => m.type.name === "link")?.attrs;
        if (attrs?.href && (event.ctrlKey || event.metaKey)) {
          window.open(attrs.href, "_blank", "noopener,noreferrer");
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastSetKeyRef.current = contentKey(html);
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => forceUpdate((prev) => prev + 1);
    editor.on("transaction", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);
    return () => {
      editor.off("transaction", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (value === null || value === undefined) return;
    const incoming = contentKey(value);
    if (incoming === lastSetKeyRef.current) return;
    lastSetKeyRef.current = incoming;
    editor.commands.setContent(normalizeContent(value), false);
  }, [value, editor]);

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const existingHref = editor.getAttributes("link").href || "";
    // Try to get selected text
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    setLinkModal({ open: true, url: existingHref, text: selectedText });
  }, [editor]);

  const handleLinkConfirm = useCallback(
    ({ url, text }) => {
      if (!editor) return;
      setLinkModal({ open: false, url: "", text: "" });

      if (!url) {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }

      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (text && !hasSelection) {
        // Insert new text with link mark
        editor
          .chain()
          .focus()
          .insertContent(
            `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`,
          )
          .run();
      } else {
        // Apply link to existing selection
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url, target: "_blank" })
          .run();
      }
    },
    [editor],
  );

  const removeLink = useCallback(() => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
  }, [editor]);

  const addImage = () => {
    const url = window.prompt("Image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const btnClass = (active) =>
    `p-2 rounded transition ${
      active
        ? "bg-slate-900 text-white"
        : "hover:bg-slate-200 text-slate-700 hover:text-slate-900"
    }`;

  if (!editor) {
    return (
      <div className="min-h-[400px] w-full bg-slate-50 border border-slate-400 rounded-lg animate-pulse" />
    );
  }

  return (
    <>
      <LinkModal
        isOpen={linkModal.open}
        onClose={() => setLinkModal({ open: false, url: "", text: "" })}
        onConfirm={handleLinkConfirm}
        initialUrl={linkModal.url}
        initialText={linkModal.text}
      />

      <div className="w-full text-left border rounded-lg border-slate-400 shadow-sm relative flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-y-2 p-2 bg-slate-100 border-b border-slate-400 items-center rounded-t-lg sticky top-0 z-10">
          <ToolbarGroup>
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-2 rounded hover:bg-slate-200 text-slate-700 disabled:opacity-40"
              title="Undo"
            >
              <Undo size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-2 rounded hover:bg-slate-200 text-slate-700 disabled:opacity-40"
              title="Redo"
            >
              <Redo size={18} />
            </button>
          </ToolbarGroup>

          <ToolbarGroup>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={btnClass(editor.isActive("heading", { level: 1 }))}
              title="Heading 1"
            >
              <Heading1 size={18} />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={btnClass(editor.isActive("heading", { level: 2 }))}
              title="Heading 2"
            >
              <Heading2 size={18} />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={btnClass(editor.isActive("heading", { level: 3 }))}
              title="Heading 3"
            >
              <Heading3 size={18} />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 4 }).run()
              }
              className={btnClass(editor.isActive("heading", { level: 4 }))}
              title="Heading 4"
            >
              <Heading4 size={18} />
            </button>
          </ToolbarGroup>

          <ToolbarGroup>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={btnClass(editor.isActive("bold"))}
              title="Bold"
            >
              <Bold size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={btnClass(editor.isActive("italic"))}
              title="Italic"
            >
              <Italic size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={btnClass(editor.isActive("underline"))}
              title="Underline"
            >
              <UnderlineIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={btnClass(editor.isActive("strike"))}
              title="Strikethrough"
            >
              <Strikethrough size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={btnClass(editor.isActive("code"))}
              title="Inline Code"
            >
              <Code size={18} />
            </button>
          </ToolbarGroup>

          <ToolbarGroup>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              className={btnClass(editor.isActive("superscript"))}
              title="Superscript"
            >
              <SuperscriptIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              className={btnClass(editor.isActive("subscript"))}
              title="Subscript"
            >
              <SubscriptIcon size={18} />
            </button>
          </ToolbarGroup>

          <ToolbarGroup>
            <div className="relative flex items-center">
              <input
                type="color"
                onInput={(e) =>
                  editor.chain().focus().setColor(e.target.value).run()
                }
                value={editor.getAttributes("textStyle").color || "#000000"}
                className="w-8 h-8 p-1 bg-transparent cursor-pointer rounded overflow-hidden"
                title="Text Color"
              />
            </div>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={btnClass(editor.isActive("highlight"))}
              title="Highlight"
            >
              <Highlighter size={18} />
            </button>
          </ToolbarGroup>

          <ToolbarGroup>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className={btnClass(editor.isActive({ textAlign: "left" }))}
              title="Align Left"
            >
              <AlignLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              className={btnClass(editor.isActive({ textAlign: "center" }))}
              title="Align Center"
            >
              <AlignCenter size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className={btnClass(editor.isActive({ textAlign: "right" }))}
              title="Align Right"
            >
              <AlignRight size={18} />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              className={btnClass(editor.isActive({ textAlign: "justify" }))}
              title="Justify"
            >
              <AlignJustify size={18} />
            </button>
          </ToolbarGroup>

          <ToolbarGroup>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={btnClass(editor.isActive("bulletList"))}
              title="Bullet List"
            >
              <List size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={btnClass(editor.isActive("orderedList"))}
              title="Ordered List"
            >
              <ListOrdered size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={btnClass(editor.isActive("taskList"))}
              title="Task List"
            >
              <CheckSquare size={18} />
            </button>
          </ToolbarGroup>

          <ToolbarGroup>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={btnClass(editor.isActive("blockquote"))}
              title="Blockquote"
            >
              <Quote size={18} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="p-2 rounded hover:bg-slate-200 text-slate-700"
              title="Horizontal Rule"
            >
              <Minus size={18} />
            </button>
          </ToolbarGroup>

          {/* Link buttons — insert, open, remove */}
          <ToolbarGroup>
            <button
              type="button"
              onClick={openLinkModal}
              className={btnClass(editor.isActive("link"))}
              title="Insert / Edit Link"
            >
              <LinkIcon size={18} />
            </button>
            {editor.isActive("link") && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const href = editor.getAttributes("link").href;
                    if (href)
                      window.open(href, "_blank", "noopener,noreferrer");
                  }}
                  className="p-2 rounded hover:bg-slate-200 text-slate-700"
                  title="Open link"
                >
                  <ExternalLink size={18} />
                </button>
                <button
                  type="button"
                  onClick={removeLink}
                  className="p-2 rounded hover:bg-red-100 text-red-500"
                  title="Remove link"
                >
                  <Unlink size={18} />
                </button>
              </>
            )}
          </ToolbarGroup>

          <ToolbarGroup>
            <button
              type="button"
              onClick={addImage}
              className={btnClass(false)}
              title="Insert Image"
            >
              <ImageIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
              className={btnClass(false)}
              title="Insert Table"
            >
              <TableIcon size={18} />
            </button>
          </ToolbarGroup>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={btnClass(showEmojiPicker)}
              title="Insert Emoji"
            >
              <Smile size={18} />
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full right-0 z-50 mt-2 shadow-xl border border-slate-200 rounded-xl">
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowEmojiPicker(false)}
                />
                <div className="relative z-50">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      editor
                        .chain()
                        .focus()
                        .insertContent(emojiData.emoji)
                        .run();
                      setShowEmojiPicker(false);
                    }}
                    width={300}
                    height={400}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table Controls */}
        {editor.isActive("table") && (
          <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border-b border-slate-400 text-xs items-center">
            <span className="font-bold text-slate-500 mr-2 uppercase">
              Table:
            </span>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              className="px-2 py-1 bg-white border rounded hover:bg-slate-100"
            >
              Add Col Before
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="px-2 py-1 bg-white border rounded hover:bg-slate-100"
            >
              Add Col After
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50"
            >
              Del Col
            </button>
            <div className="w-[1px] h-4 bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              className="px-2 py-1 bg-white border rounded hover:bg-slate-100"
            >
              Add Row Before
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="px-2 py-1 bg-white border rounded hover:bg-slate-100"
            >
              Add Row After
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50"
            >
              Del Row
            </button>
            <div className="w-[1px] h-4 bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 flex items-center gap-1"
            >
              <Trash2 size={12} /> Table
            </button>
          </div>
        )}

        <EditorContent editor={editor} />

        <style jsx global>{`
          .ProseMirror ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin: 0.5rem 0;
          }
          .ProseMirror ol {
            list-style-type: decimal;
            padding-left: 1.5rem;
            margin: 0.5rem 0;
          }
          .ProseMirror ul[data-type="taskList"] {
            list-style: none;
            padding: 0;
          }
          .ProseMirror ul[data-type="taskList"] li {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
          }
          .ProseMirror ul[data-type="taskList"] li > label {
            margin-top: 0.15rem;
          }
          .ProseMirror h1 {
            font-size: 2em;
            font-weight: bold;
            margin-top: 0.67em;
            margin-bottom: 0.67em;
          }
          .ProseMirror h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin-top: 0.83em;
            margin-bottom: 0.83em;
          }
          .ProseMirror h3 {
            font-size: 1.17em;
            font-weight: bold;
            margin-top: 1em;
            margin-bottom: 1em;
          }
          .ProseMirror h4 {
            font-size: 1em;
            font-weight: bold;
            margin-top: 1.33em;
            margin-bottom: 1.33em;
          }
          .ProseMirror blockquote {
            border-left: 4px solid #cbd5e1;
            padding-left: 1rem;
            margin-left: 0;
            font-style: italic;
            color: #475569;
          }
          .ProseMirror code {
            background-color: #f1f5f9;
            padding: 0.2rem 0.4rem;
            border-radius: 0.25rem;
            font-family: monospace;
            font-size: 0.9em;
          }
          .ProseMirror a {
            color: #2563eb;
            text-decoration: underline;
            cursor: pointer;
          }
          .ProseMirror a:hover {
            color: #1d4ed8;
          }
          .ProseMirror table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
            margin: 0;
            overflow: hidden;
          }
          .ProseMirror td,
          .ProseMirror th {
            min-width: 1em;
            border: 1px solid #ced4da;
            padding: 3px 5px;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
          }
          .ProseMirror th {
            font-weight: bold;
            text-align: left;
            background-color: #f8f9fa;
          }
          .ProseMirror .selectedCell:after {
            z-index: 2;
            position: absolute;
            content: "";
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            background: rgba(200, 200, 255, 0.4);
            pointer-events: none;
          }
          .ProseMirror img {
            border: 2px solid transparent;
            display: block;
            max-width: 100%;
            height: auto;
          }
          .ProseMirror img.ProseMirror-selectednode {
            border-color: #3b82f6;
          }
          .ProseMirror p.is-editor-empty:first-child::before {
            color: #adb5bd;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }
        `}</style>
      </div>
    </>
  );
};

export default TiptapEditor;
