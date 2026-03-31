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
  Palette,
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
  Columns,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

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
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

const escapeHtml = (value = "") =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeMarkdownInline = (text = "") => {
  let output = String(text);
  output = output.replace(/(^|[^*])\*\*([\s\S]+?)\*\*(?!\*)/g, "$1<strong>$2</strong>");
  output = output.replace(/(^|[^_])__([\s\S]+?)__(?!_)/g, "$1<strong>$2</strong>");
  output = output.replace(/(^|[^*])\*([^\n*][\s\S]*?[^\n*])\*(?!\*)/g, "$1<em>$2</em>");
  output = output.replace(/(^|[^_])_([^\n_][\s\S]*?[^\n_])_(?!_)/g, "$1<em>$2</em>");
  return output;
};

const normalizeImportedContent = (value = "") => {
  if (typeof value !== "string") return "";

  const input = value.trim();
  if (!input) return "";

  if (/<[a-z][\s\S]*>/i.test(input)) {
    let html = input
      .replace(/<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi, "<strong>$1</strong>")
      .replace(/<(?:i|em)\b[^>]*>([\s\S]*?)<\/(?:i|em)>/gi, "<em>$1</em>")
      .replace(/<p[^>]*>\s*([-\u2022\u00B7\u2013\u2014])\s*([\s\S]*?)<\/p>/gi, "<ul><li>$2</li></ul>")
      .replace(/<div[^>]*>\s*([-\u2022\u00B7\u2013\u2014])\s*([\s\S]*?)<\/div>/gi, "<ul><li>$2</li></ul>");

    if (/^\s*<(?:p|div|h[1-6]|blockquote|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|pre|hr)\b/i.test(html)) {
      return html;
    }
    return `<p>${html}</p>`;
  }

  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let bullets = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(`<ul>${bullets.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    bullets = [];
  };

  const isBullet = (line = "") => /^\s*(?:-|\u2022|\u00B7|\u2013|\u2014)(?:\s+|(?=\S))/.test(line);
  const stripBullet = (line = "") =>
    line.replace(/^\s*(?:-|\u2022|\u00B7|\u2013|\u2014)\s*/, "");
  const heading = (line = "") => {
    const match = String(line).trim().match(/^(#{1,3})\s+([\s\S]+)$/);
    if (!match) return null;
    const level = match[1].length;
    return `<h${level}>${normalizeMarkdownInline(escapeHtml(match[2].trim()))}</h${level}>`;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      blocks.push("<p><br></p>");
      return;
    }

    const headingHtml = heading(trimmed);
    if (headingHtml) {
      flushBullets();
      blocks.push(headingHtml);
      return;
    }

    if (isBullet(trimmed)) {
      bullets.push(normalizeMarkdownInline(escapeHtml(stripBullet(trimmed))));
      return;
    }

    flushBullets();
    blocks.push(`<p>${normalizeMarkdownInline(escapeHtml(trimmed))}</p>`);
  });

  flushBullets();
  return blocks.join("");
};

const ToolbarGroup = ({ children }) => (
  <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-2 last:border-r-0 last:mr-0 last:pr-0">
    {children}
  </div>
);

const TiptapEditor = ({ value, onChange }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [, forceUpdate] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc pl-6 my-2",
          },
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal pl-6 my-2",
          },
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
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
        },
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "rounded-lg max-w-full my-4 block",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph", "image"],
      }),
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2 my-1",
        },
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
        HTMLAttributes: {
          class: "border border-slate-300 p-2",
        },
      }),
    ],
    content: normalizeImportedContent(value || ""),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[400px] p-6 bg-white rounded-b-lg max-w-none prose prose-slate prose-sm md:prose-base lg:prose-lg overflow-y-auto",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;

    // Force re-render on any transaction or selection change
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

    const normalizedValue = normalizeImportedContent(value);
    const current = editor.getHTML();
    if (normalizedValue !== current) {
      editor.commands.setContent(normalizedValue, false);
    }
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
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const btnClass = (active) =>
    `p-2 rounded transition ${active
      ? "bg-slate-900 text-white"
      : "hover:bg-slate-200 text-slate-700 hover:text-slate-900"
    }`;

  return (
    <div className="w-full text-left border rounded-lg border-slate-400 shadow-sm relative flex flex-col">
      <div className="flex flex-wrap gap-y-2 p-2 bg-slate-100 border-b border-slate-400 items-center rounded-t-lg sticky top-0 z-10">

        {/* History */}
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

        {/* Headings */}
        <ToolbarGroup>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={btnClass(editor.isActive("heading", { level: 1 }))}
            title="Heading 1"
          >
            <Heading1 size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={btnClass(editor.isActive("heading", { level: 2 }))}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={btnClass(editor.isActive("heading", { level: 3 }))}
            title="Heading 3"
          >
            <Heading3 size={18} />
          </button>
        </ToolbarGroup>

        {/* Font Styling */}
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

        {/* Advanced Font Styling */}
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

        {/* Colors */}
        <ToolbarGroup>
          <div className="relative flex items-center">
            <input
              type="color"
              onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
              value={editor.getAttributes('textStyle').color || '#000000'}
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

        {/* Alignment */}
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
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
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
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={btnClass(editor.isActive({ textAlign: "justify" }))}
            title="Justify"
          >
            <AlignJustify size={18} />
          </button>
        </ToolbarGroup>

        {/* Lists */}
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

        {/* Blocks */}
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

        {/* Inserts */}
        <ToolbarGroup>
          <button
            type="button"
            onClick={setLink}
            className={btnClass(editor.isActive("link"))}
            title="Insert Link"
          >
            <LinkIcon size={18} />
          </button>
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
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className={btnClass(false)}
            title="Insert Table"
          >
            <TableIcon size={18} />
          </button>
        </ToolbarGroup>

        {/* Emoji */}
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
                <EmojiPicker onEmojiClick={addEmoji} width={300} height={400} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Controls (Visible when in table) */}
      {editor.isActive('table') && (
        <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border-b border-slate-400 text-xs items-center">
          <span className="font-bold text-slate-500 mr-2 uppercase">Table:</span>
          <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="px-2 py-1 bg-white border rounded hover:bg-slate-100">Add Col Before</button>
          <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 bg-white border rounded hover:bg-slate-100">Add Col After</button>
          <button onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50">Del Col</button>
          <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>
          <button onClick={() => editor.chain().focus().addRowBefore().run()} className="px-2 py-1 bg-white border rounded hover:bg-slate-100">Add Row Before</button>
          <button onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 bg-white border rounded hover:bg-slate-100">Add Row After</button>
          <button onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50">Del Row</button>
          <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>
          <button onClick={() => editor.chain().focus().deleteTable().run()} className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded hover:bg-red-50 flex items-center gap-1"><Trash2 size={12} /> Table</button>
        </div>
      )}

      <EditorContent editor={editor} />

      <style jsx global>{`
        /* Lists */
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

        /* Task List */
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

        /* Headings */
        .ProseMirror h1 { font-size: 2em; font-weight: bold; margin-top: 0.67em; margin-bottom: 0.67em; }
        .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-top: 0.83em; margin-bottom: 0.83em; }
        .ProseMirror h3 { font-size: 1.17em; font-weight: bold; margin-top: 1em; margin-bottom: 1em; }

        /* Blockquote */
        .ProseMirror blockquote {
             border-left: 4px solid #cbd5e1;
             padding-left: 1rem;
             margin-left: 0;
             font-style: italic;
             color: #475569;
        }

        /* Code */
        .ProseMirror code {
             background-color: #f1f5f9;
             padding: 0.2rem 0.4rem;
             border-radius: 0.25rem;
             font-family: monospace;
             font-size: 0.9em;
        }

        /* Links */
        .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }

        /* Tables */
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
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(200, 200, 255, 0.4);
          pointer-events: none;
        }
        
        /* Image Resizing / Selection (Basic) */
        .ProseMirror img {
            border: 2px solid transparent;
            display: block;
            max-width: 100%;
            height: auto;
        }
        .ProseMirror img.ProseMirror-selectednode {
            border-color: #3b82f6;
        }
        
        /* Placeholder for empty p */
        .ProseMirror p.is-editor-empty:first-child::before {
            color: #adb5bd;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default TiptapEditor;
