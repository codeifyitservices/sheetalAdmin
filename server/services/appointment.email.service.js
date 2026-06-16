import sendEmail from "../utils/sendEmail.js";
import Settings from "../models/settings.model.js";

export const sendAppointmentConfirmationEmail = async (appointment) => {
  try {
    const settings = await Settings.findOne();
    let template = settings?.appointmentEmailTemplate || "";

    const bannerUrl = process.env.STORE_BANNER_URL || process.env.STORE_LOGO_URL || "";
    const bannerMarkup = bannerUrl
      ? `<img src="${bannerUrl}" alt="Studio By Sheetal" width="600" style="height:auto;display:block;border:0;">`
      : `<p style="margin:0;font-size:18px;font-weight:700;color:#111827;">Studio By Sheetal</p>`;

    // If template is empty (shouldn't happen with default), use a basic fallback
    if (!template) {
        template = `
            <h2>Appointment Confirmed</h2>
            <p>Dear {{name}},</p>
            <p>Your appointment has been confirmed for <strong>{{date}}</strong> at <strong>{{time}}</strong>.</p>
            <p>Location: {{address}}, {{city}} - {{pincode}}</p>
            <p>Thank you for choosing Studio By Sheetal!</p>
        `;
    }

    const replacements = {
      "{{id}}": appointment._id.toString().slice(-6).toUpperCase(),
      "{{name}}": appointment.name,
      "{{date}}": new Date(appointment.appointmentDate).toLocaleDateString("en-IN"),
      "{{time}}": appointment.appointmentTime,
      "{{address}}": appointment.address,
      "{{city}}": appointment.city,
      "{{pincode}}": appointment.pincode,
      "{{contact}}": appointment.contact,
      "{{requirements}}": appointment.requirements || "None",
      "{{bannerMarkup}}": bannerMarkup,
      "{{year}}": new Date().getFullYear(),
    };

    Object.keys(replacements).forEach((key) => {
      template = template.replace(new RegExp(key, "g"), replacements[key]);
    });

    await sendEmail({
      email: appointment.email,
      subject: "Your Appointment is Confirmed - Studio By Sheetal",
      html: template,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending appointment confirmation email:", error);
    return { success: false, error: error.message };
  }
};
