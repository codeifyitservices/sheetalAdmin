const escapeHtml = (value = "") =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const renderItalicMarkdown = (text = "") => {
  const source = String(text ?? "");
  let out = "";
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (ch === "*" || ch === "_") {
      const close = source.indexOf(ch, i + 1);
      if (close === -1) {
        out += escapeHtml(ch);
        i += 1;
        continue;
      }

      out += `<em>${renderItalicMarkdown(source.slice(i + 1, close))}</em>`;
      i = close + 1;
      continue;
    }

    let j = i;
    while (j < source.length && source[j] !== "*" && source[j] !== "_") {
      j += 1;
    }
    out += source.slice(i, j);
    i = j;
  }

  return out;
};

const renderInlineMarkdown = (text = "") => {
  const source = String(text ?? "");
  const boldStore = [];

  const extractBold = (input) => {
    let out = "";
    let i = 0;

    while (i < input.length) {
      const start = input.indexOf("**", i);
      if (start === -1) {
        out += escapeHtml(input.slice(i));
        break;
      }

      out += escapeHtml(input.slice(i, start));

      const end = input.indexOf("**", start + 2);
      if (end === -1) {
        out += escapeHtml("**");
        i = start + 2;
        continue;
      }

      const inner = input.slice(start + 2, end);
      const key = `{{B${boldStore.length}}}`;
      boldStore.push(`<strong>${renderInlineMarkdown(inner)}</strong>`);
      out += key;
      i = end + 2;
    }

    return out;
  };

  const restoreBold = (input) =>
    input.replace(/\{\{B(\d+)\}\}/g, (_, idx) => boldStore[Number(idx)] ?? "");

  const boldProcessed = extractBold(source);
  const italicProcessed = renderItalicMarkdown(boldProcessed);
  return restoreBold(italicProcessed);
};

const markdownToHtml = (text = "") => {
  const lines = String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const blocks = [];
  let bulletItems = [];

  const flushBullets = () => {
    if (!bulletItems.length) return;
    blocks.push(
      `<ul>${bulletItems.map((item) => `<li>${item}</li>`).join("")}</ul>`,
    );
    bulletItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      blocks.push("<p><br/></p>");
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+([\s\S]+)$/);
    if (headingMatch) {
      flushBullets();
      const level = headingMatch[1].length;
      blocks.push(
        `<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`,
      );
      continue;
    }

    const bulletMatch = trimmed.match(/^\-\s*([\s\S]*)$/);
    if (bulletMatch) {
      bulletItems.push(renderInlineMarkdown(bulletMatch[1].trim()));
      continue;
    }

    flushBullets();
    blocks.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  flushBullets();
  return blocks.join("");
};

export const spreadsheetCellToHtml = (cell) => {
  if (!cell) return "";

  const plainText = cell.v ?? cell.w ?? "";
  if (
    typeof plainText === "string" &&
    /(?:^|\n)\s*-\s*(?:\S|$)/.test(plainText)
  ) {
    return markdownToHtml(plainText);
  }

  if (typeof cell.h === "string" && /<[^>]+>/.test(cell.h)) {
    return cell.h;
  }

  const text = cell.h ?? plainText;
  return markdownToHtml(text);
};
