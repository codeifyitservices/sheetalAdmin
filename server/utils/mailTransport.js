import nodemailer from "nodemailer";

const SMTP_MAIL = (process.env.SMTP_MAIL || "").trim();
const SMTP_PASSWORD = (process.env.SMTP_PASSWORD || "").trim();
const SMTP_SERVICE = (process.env.SMTP_SERVICE || "gmail").trim();
const SMTP_HOST = (process.env.SMTP_HOST || "").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 0);
const SMTP_SECURE =
  typeof process.env.SMTP_SECURE === "string"
    ? process.env.SMTP_SECURE.trim().toLowerCase() === "true"
    : SMTP_PORT === 465;
const SMTP_FAMILY = Number(process.env.SMTP_FAMILY || 4);

export function ensureEmailConfig() {
  if (!SMTP_MAIL || !SMTP_PASSWORD) {
    throw new Error(
      "SMTP email is not configured. Set SMTP_MAIL and SMTP_PASSWORD.",
    );
  }
}

export function createMailTransport() {
  const baseConfig = {
    auth: {
      user: SMTP_MAIL,
      pass: SMTP_PASSWORD,
    },
    family: SMTP_FAMILY,
  };

  if (SMTP_HOST) {
    return nodemailer.createTransport({
      ...baseConfig,
      host: SMTP_HOST,
      port: SMTP_PORT || 587,
      secure: SMTP_SECURE,
    });
  }

  return nodemailer.createTransport({
    ...baseConfig,
    service: SMTP_SERVICE,
  });
}

export {
  SMTP_FAMILY,
  SMTP_HOST,
  SMTP_MAIL,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_SERVICE,
};
