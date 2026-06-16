import {
  SMTP_MAIL,
  createMailTransport,
  ensureEmailConfig,
} from "./mailTransport.js";

const sendEmail = async (options) => {
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

export default sendEmail;
