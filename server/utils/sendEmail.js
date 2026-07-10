import {
  SMTP_MAIL,
  createMailTransport,
  ensureEmailConfig,
} from "./mailTransport.js";
import logger from "./logger.js";

/**
 * Sends an email using Brevo's Transactional HTTP REST API (Port 443).
 */
const sendViaBrevo = async (options) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("Brevo API key is not configured. Set BREVO_API_KEY in your env.");
  }

  // Sender details (using your single verified email)
  const senderName = process.env.BREVO_SENDER_NAME || "Studio By Sheetal";
  const senderEmail = process.env.BREVO_SENDER_EMAIL || SMTP_MAIL;
  if (!senderEmail) {
    throw new Error("Sender email is not configured. Set BREVO_SENDER_EMAIL or SMTP_MAIL in your env.");
  }

  const to = options.email;
  const subject = options.subject;
  const htmlContent = options.html || options.message;

  // Format to parameter for Brevo API (expects array of objects: [{ email: '...' }])
  const recipients = Array.isArray(to) 
    ? to.map(email => ({ email })) 
    : [{ email: to }];

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: recipients,
      subject: subject,
      htmlContent: htmlContent,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Brevo API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
    );
  }

  return await response.json();
};

/**
 * Sends an email using SMTP (Nodemailer).
 */
const sendViaSmtp = async (options) => {
  ensureEmailConfig();
  const transporter = createMailTransport();

  const mailOptions = {
    from: SMTP_MAIL,
    to: options.email,
    subject: options.subject,
    html: options.html || options.message,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Main email sender function that routes emails based on the active provider.
 */
const sendEmail = async (options) => {
  const provider = (process.env.EMAIL_PROVIDER || "brevo").trim().toLowerCase();

  if (provider === "brevo") {
    try {
      logger.info(`[Email] Sending email to ${options.email} via Brevo HTTP API...`);
      return await sendViaBrevo(options);
    } catch (error) {
      logger.error("[Email] Failed to send email via Brevo:", { error: error.message, stack: error.stack });
      
      const fallbackEnabled = process.env.EMAIL_FALLBACK_TO_SMTP === "true";
      if (fallbackEnabled) {
        logger.warn("[Email] Falling back to SMTP...");
        try {
          return await sendViaSmtp(options);
        } catch (smtpError) {
          logger.error("[Email] Fallback to SMTP failed as well:", { error: smtpError.message, stack: smtpError.stack });
          throw smtpError;
        }
      }
      throw error;
    }
  } else {
    logger.info(`[Email] Sending email to ${options.email} via SMTP...`);
    return await sendViaSmtp(options);
  }
};

export default sendEmail;
