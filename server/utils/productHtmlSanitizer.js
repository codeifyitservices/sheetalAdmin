import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "sup",
  "sub",
  "mark",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "img",
  "hr",
  "pre",
  "code",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "span",
  "div",
  "label",
  "input",
];

const allowedAttributes = {
  a: ["href", "name", "target", "rel", "title", "class"],
  img: ["src", "alt", "title", "width", "height", "loading", "class"],
  input: ["type", "checked", "disabled", "data-checked", "class"],
  table: ["class"],
  thead: ["class"],
  tbody: ["class"],
  tfoot: ["class"],
  tr: ["class"],
  th: ["colspan", "rowspan", "scope", "class"],
  td: ["colspan", "rowspan", "class"],
  ul: ["class", "data-type"],
  ol: ["class"],
  li: ["class", "data-type", "data-checked"],
  blockquote: ["class"],
  pre: ["class"],
  code: ["class"],
  span: ["class", "style"],
  div: ["class", "style"],
  label: ["class"],
  "*": ["class"],
};

const allowedStyles = {
  "*": {
    "text-align": [/^(left|right|center|justify)$/i],
    color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
    "background-color": [
      /^#[0-9a-f]{3,8}$/i,
      /^rgba?\([\d\s.,%]+\)$/i,
      /^[a-z]+$/i,
    ],
    "font-size": [/^-?\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i],
    "font-weight": [/^(normal|bold|bolder|lighter|[1-9]00)$/i],
    "font-style": [/^(normal|italic|oblique)$/i],
  },
};

const sanitizeOptions = {
  allowedTags,
  allowedAttributes,
  allowedStyles,
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
};

export const sanitizeProductHtml = (value = "") => {
  if (typeof value !== "string") return "";
  return sanitizeHtml(value, sanitizeOptions);
};

export const sanitizeProductRecord = (product) => {
  if (!product || typeof product !== "object") return product;

  // Handle mongoose document vs plain object
  const raw = product.toObject ? product.toObject() : JSON.parse(JSON.stringify(product));

  if (raw.variants) {
    raw.variants = raw.variants.map((v) => {
      if (v.colorId && typeof v.colorId === "object") {
        v.color = {
          name: v.colorId.name || "",
          code: v.colorId.code || v.colorId.hex || "#000000",
          hex: v.colorId.hex || v.colorId.code || "#000000",
        };
      }
      return v;
    });
  }

  return {
    ...raw,
    description: sanitizeProductHtml(raw.description || ""),
    materialCare: sanitizeProductHtml(raw.materialCare || ""),
  };
};
