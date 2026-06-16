import { config } from "../config/config.js";
import {
  SMTP_MAIL,
  createMailTransport,
  ensureEmailConfig,
} from "../utils/mailTransport.js";
import Settings from "../models/settings.model.js";

const STORE_NAME = (process.env.STORE_NAME || "Our Store").trim();
const STORE_URL =
  (process.env.STORE_URL || "").trim() || config.frontendDomain || "#";

const transporter = createMailTransport();

let verifyPromise = null;

async function verifyTransporter() {
  ensureEmailConfig();

  if (!verifyPromise) {
    verifyPromise = transporter.verify().catch((error) => {
      verifyPromise = null;
      throw error;
    });
  }

  await verifyPromise;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendAvailabilityEmail({
  name,
  email,
  productName,
  size,
  productImage,
  productUrl,
  reply,
}) {
  await verifyTransporter();

  const settings = await Settings.findOne();
  let template = settings?.notifyBackInStockEmailTemplate;

  if (template) {
    const replacements = {
      "{{name}}": name,
      "{{productName}}": productName,
      "{{size}}": size,
      "{{productImage}}": productImage || "",
      "{{productUrl}}": productUrl || STORE_URL,
      "{{reply}}": reply || "",
    };

    Object.keys(replacements).forEach((key) => {
      template = template.replaceAll(key, replacements[key]);
    });
  } else {
    // Fallback if no template
    template = `
      <p>Dear ${escapeHtml(name)},</p>
      <p>The ${escapeHtml(productName)} in size ${escapeHtml(size)} is now back in stock!</p>
      <p><a href="${escapeHtml(productUrl || STORE_URL)}">Shop Now</a></p>
    `;
  }

  await transporter.sendMail({
    from: `"${STORE_NAME}" <${SMTP_MAIL}>`,
    to: email,
    subject: `Great news - ${productName} in size ${size} is available!`,
    html: template,
  });
}
