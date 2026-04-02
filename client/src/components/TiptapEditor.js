"use client";

import { useEditor, EditorContent } from "@tiptap/react";
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
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
//
// `value` coming in can be:
//   1. A Tiptap JSON object  { type: "doc", content: [...] }
//   2. A JSON string         '{"type":"doc","content":[...]}'
//   3. An HTML string        '<p>Hello <strong>world</strong></p>'
//   4. A plain string        'Hello world'
//   5. null / undefined / ""
//
// We return a value that Tiptap's setContent() accepts directly:
//   - JSON object  → pass as-is (Tiptap handles it natively)
//   - HTML string  → pass as-is (Tiptap parses it)
//   - empty        → empty paragraph JSON
// ---------------------------------------------------------------------------

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

/**
 * Normalise any incoming value into something Tiptap's setContent() accepts.
 * Returns either a Tiptap JSON object or an HTML string.
 */
const normalizeContent = (value) => {
  if (!value) return EMPTY_DOC;

  // Already a JSON object
  if (typeof value === "object" && value !== null) {
    if (value.type === "doc") return value;
    return EMPTY_DOC;
  }

  if (typeof value !== "string") return EMPTY_DOC;

  const trimmed = value.trim();
  if (!trimmed) return EMPTY_DOC;

  // Try to parse as JSON first (stored as JSON string)
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.type === "doc") return parsed;
    } catch {
      // not JSON — fall through
    }
  }

  // HTML or plain text — return as-is, Tiptap will parse it
  return normalizeHtmlString(trimmed);
};

// ---------------------------------------------------------------------------
// HTML string normaliser (kept for legacy HTML values already in the DB)
// ---------------------------------------------------------------------------
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
  const lines = String(input ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let bullets = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(`<ul>${bullets.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    bullets = [];
  };

  const isBullet = (line = "") => /^\s*(?:-|\u2022|\u00B7|\u2013|\u2014)(?:\s+|(?=\S))/.test(line);
  const stripBullet = (line = "") => line.replace(/^\s*(?:-|\u2022|\u00B7|\u2013|\u2014)\s*/, "");

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
      blocks.push(`<h${level}>${normalizeMarkdownInline(heading[2].trim())}</h${level}>`);
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
  const doc = parser.parseFromString(`<div id="root">${html}</div>`, "text/html");
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

    if (!text.includes("*") && !text.includes("_") && !text.includes("#")) return;

    const fragment = markdownToFragment(doc, text);
    node.parentNode?.replaceChild(fragment, node);
  });

  return root.innerHTML;
};

const normalizeHtmlString = (input = "") => {
  if (!input) return "";

  if (/<[a-z][\s\S]*>/i.test(input)) {
    let html = input
      .replace(/<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi, "<strong>$1</strong>")
      .replace(/<(?:i|em)\b[^>]*>([\s\S]*?)<\/(?:i|em)>/gi, "<em>$1</em>")
      .replace(/<p[^>]*>\s*([-\u2022\u00B7\u2013\u2014])\s*([\s\S]*?)<\/p>/gi, "<ul><li>$2</li></ul>")
      .replace(/<div[^>]*>\s*([-\u2022\u00B7\u2013\u2014])\s*([\s\S]*?)<\/div>/gi, "<ul><li>$2</li></ul>");

    html = applyMarkdownToHtml(html);

    if (/^\s*<(?:p|div|h[1-6]|blockquote|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|pre|hr)\b/i.test(html)) {
      return html;
    }
    return `<p>${html}</p>`;
  }

  return markdownToHtml(input);
};

/**
 * Stable serialiser used ONLY for change-detection in the sync effect.
 * Produces a canonical string from whatever normalizeContent returns,
 * so we can compare old vs new without false positives.
 */
const contentKey = (value) => {
  const normalized = normalizeContent(value);
  if (typeof normalized === "string") return normalized;
  return JSON.stringify(normalized);
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
  const [, forceUpdate] = useState(0);

  // Track the last value we set so we don't re-set on our own onChange echo
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
            class: "border-l-4 border-slate-700 pl-4 py-1 my-4 italic bg-slate-50",
          },
        },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "text-blue-600 underline cursor-pointer" },
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
          class: "border-collapse table-auto w-full my-4 border border-slate-300",
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
    // normalizeContent handles JSON objects, JSON strings, HTML strings, plain text
    content: normalizeContent(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[400px] p-6 bg-white rounded-b-lg max-w-none prose prose-slate prose-sm md:prose-base lg:prose-lg overflow-y-auto",
      },
    },
    onUpdate: ({ editor }) => {
      // Always emit HTML string upward so the parent/DB gets a consistent format
      const html = editor.getHTML();
      lastSetKeyRef.current = contentKey(html); // mark canonical form to stop sync echoes
      onChange(html);
    },
  });

  // Force toolbar re-render on selection/transaction changes
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

  // Sync external value changes into the editor
  useEffect(() => {
    if (!editor) return;
    if (value === null || value === undefined) return;

    const incoming = contentKey(value);

    // Skip if this is just an echo of what we emitted ourselves
    if (incoming === lastSetKeyRef.current) return;

    lastSetKeyRef.current = incoming;
    editor.commands.setContent(normalizeContent(value), false);
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[400px] w-full bg-slate-50 border border-slate-400 rounded-lg animate-pulse" />
    );
  }

  const addEmoji = (emojiData) => {
    editor.chain().focus().insertContent(emojiData.emoji).run();
    setShowEmojiPicker(false);
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

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

  return (
    <div className="w-full text-left border rounded-lg border-slate-400 shadow-sm relative flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-y-2 p-2 bg-slate-100 border-b border-slate-400 items-center rounded-t-lg sticky top-0 z-10">

        <ToolbarGroup>
          <button type="button" onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded hover:bg-slate-200 text-slate-700 disabled:opacity-40" title="Undo">
            <Undo size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded hover:bg-slate-200 text-slate-700 disabled:opacity-40" title="Redo">
            <Redo size={18} />
          </button>
        </ToolbarGroup>

        <ToolbarGroup>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={btnClass(editor.isActive("heading", { level: 1 }))} title="Heading 1">
            <Heading1 size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={btnClass(editor.isActive("heading", { level: 2 }))} title="Heading 2">
            <Heading2 size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={btnClass(editor.isActive("heading", { level: 3 }))} title="Heading 3">
            <Heading3 size={18} />
          </button>
        </ToolbarGroup>

        <ToolbarGroup>
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
            className={btnClass(editor.isActive("bold"))} title="Bold">
            <Bold size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
            className={btnClass(editor.isActive("italic"))} title="Italic">
            <Italic size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={btnClass(editor.isActive("underline"))} title="Underline">
            <UnderlineIcon size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}
            className={btnClass(editor.isActive("strike"))} title="Strikethrough">
            <Strikethrough size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleCode().run()}
            className={btnClass(editor.isActive("code"))} title="Inline Code">
            <Code size={18} />
          </button>
        </ToolbarGroup>

        <ToolbarGroup>
          <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={btnClass(editor.isActive("superscript"))} title="Superscript">
            <SuperscriptIcon size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={btnClass(editor.isActive("subscript"))} title="Subscript">
            <SubscriptIcon size={18} />
          </button>
        </ToolbarGroup>

        <ToolbarGroup>
          <div className="relative flex items-center">
            <input type="color"
              onInput={(e) => editor.chain().focus().setColor(e.target.value).run()}
              value={editor.getAttributes("textStyle").color || "#000000"}
              className="w-8 h-8 p-1 bg-transparent cursor-pointer rounded overflow-hidden"
              title="Text Color" />
          </div>
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={btnClass(editor.isActive("highlight"))} title="Highlight">
            <Highlighter size={18} />
          </button>
        </ToolbarGroup>

        <ToolbarGroup>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={btnClass(editor.isActive({ textAlign: "left" }))} title="Align Left">
            <AlignLeft size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={btnClass(editor.isActive({ textAlign: "center" }))} title="Align Center">
            <AlignCenter size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={btnClass(editor.isActive({ textAlign: "right" }))} title="Align Right">
            <AlignRight size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={btnClass(editor.isActive({ textAlign: "justify" }))} title="Justify">
            <AlignJustify size={18} />
          </button>
        </ToolbarGroup>

        <ToolbarGroup>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={btnClass(editor.isActive("bulletList"))} title="Bullet List">
            <List size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={btnClass(editor.isActive("orderedList"))} title="Ordered List">
            <ListOrdered size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={btnClass(editor.isActive("taskList"))} title="Task List">
            <CheckSquare size={18} />
          </button>
        </ToolbarGroup>

        <ToolbarGroup>
          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={btnClass(editor.isActive("blockquote"))} title="Blockquote">
            <Quote size={18} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-2 rounded hover:bg-slate-200 text-slate-700" title="Horizontal Rule">
            <Minus size={18} />
          </button>
        </ToolbarGroup>

        <ToolbarGroup>
          <button type="button" onClick={setLink}
            className={btnClass(editor.isActive("link"))} title="Insert Link">
            <LinkIcon size={18} />
          </button>
          <button type="button" onClick={addImage}
            className={btnClass(false)} title="Insert Image">
            <ImageIcon size={18} />
          </button>
          <button type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className={btnClass(false)} title="Insert Table">
            <TableIcon size={18} />
          </button>
        </ToolbarGroup>

        <div className="relative">
          <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={btnClass(showEmojiPicker)} title="Insert Emoji">
            <Smile size={18} />
          </button>
          {showEmojiPicker && (
            <div className="absolute top-full right-0 z-50 mt-2 shadow-xl border border-slate-200 rounded-xl">
              <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
              <div className="relative z-50">
                <EmojiPicker onEmojiClick={addEmoji} width={300} height={400} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Controls */}
      {editor.isActive("table") && (
        <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border-b border-slate-400 text-xs items-center">
          <span className="font-bold text-slate-500 mr-2 uppercase">Table:</span>
          <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="px-2 py-1 bg-white border rounded hover:bg-slate-100">Add Col Before</button>
          <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 bg-white border rounded hover:bg-slate-100">Add Col After</button>
          <button onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50">Del Col</button>
          <div className="w-[1px] h-4 bg-slate-300 mx-1" />
          <button onClick={() => editor.chain().focus().addRowBefore().run()} className="px-2 py-1 bg-white border rounded hover:bg-slate-100">Add Row Before</button>
          <button onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 bg-white border rounded hover:bg-slate-100">Add Row After</button>
          <button onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50">Del Row</button>
          <div className="w-[1px] h-4 bg-slate-300 mx-1" />
          <button onClick={() => editor.chain().focus().deleteTable().run()} className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 flex items-center gap-1">
            <Trash2 size={12} /> Table
          </button>
        </div>
      )}

      <EditorContent editor={editor} />

      <style jsx global>{`
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .ProseMirror ul[data-type="taskList"] { list-style: none; padding: 0; }
        .ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; }
        .ProseMirror ul[data-type="taskList"] li > label { margin-top: 0.15rem; }
        .ProseMirror h1 { font-size: 2em; font-weight: bold; margin-top: 0.67em; margin-bottom: 0.67em; }
        .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-top: 0.83em; margin-bottom: 0.83em; }
        .ProseMirror h3 { font-size: 1.17em; font-weight: bold; margin-top: 1em; margin-bottom: 1em; }
        .ProseMirror blockquote { border-left: 4px solid #cbd5e1; padding-left: 1rem; margin-left: 0; font-style: italic; color: #475569; }
        .ProseMirror code { background-color: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.9em; }
        .ProseMirror a { color: #2563eb; text-decoration: underline; cursor: pointer; }
        .ProseMirror table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 0; overflow: hidden; }
        .ProseMirror td, .ProseMirror th { min-width: 1em; border: 1px solid #ced4da; padding: 3px 5px; vertical-align: top; box-sizing: border-box; position: relative; }
        .ProseMirror th { font-weight: bold; text-align: left; background-color: #f8f9fa; }
        .ProseMirror .selectedCell:after { z-index: 2; position: absolute; content: ""; left: 0; right: 0; top: 0; bottom: 0; background: rgba(200, 200, 255, 0.4); pointer-events: none; }
        .ProseMirror img { border: 2px solid transparent; display: block; max-width: 100%; height: auto; }
        .ProseMirror img.ProseMirror-selectednode { border-color: #3b82f6; }
        .ProseMirror p.is-editor-empty:first-child::before { color: #adb5bd; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
      `}</style>
    </div>
  );
};

export default TiptapEditor;
