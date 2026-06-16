import ContactEnquiry from "../models/contactEnquiry.model.js";
import sendEmail from "../utils/sendEmail.js";
import Settings from "../models/settings.model.js";

// @desc    Submit a contact enquiry
// @route   POST /api/v1/contact-enquiries
// @access  Public
export const createContactEnquiry = async (req, res, next) => {
  try {
    const { name, email, phone, query } = req.body;
    const trimmedPhone = phone?.trim();

    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }
    if (!email?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    if (!trimmedPhone) {
      return res
        .status(400)
        .json({ success: false, message: "Phone is required" });
    }
    if (!/^\d{10}$/.test(trimmedPhone)) {
      return res
        .status(400)
        .json({ success: false, message: "Phone must be a 10-digit number" });
    }
    if (!query?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Query is required" });
    }

    const contactEnquiry = await ContactEnquiry.create({
      name: name.trim(),
      email: email.trim(),
      phone: trimmedPhone,
      query: query.trim(),
    });

    res.status(201).json({ success: true, contactEnquiry });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contact enquiries
// @route   GET /api/v1/contact-enquiries
// @access  Private/Admin
export const getContactEnquiries = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const dbQuery = {};

    if (status && status !== "all") dbQuery.status = status;

    if (search?.trim()) {
      dbQuery.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { phone: { $regex: search.trim(), $options: "i" } },
        { query: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const totalEnquiries = await ContactEnquiry.countDocuments(dbQuery);
    const totalPages = Math.ceil(totalEnquiries / limitNum);

    const contactEnquiries = await ContactEnquiry.find(dbQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      contactEnquiries,
      pagination: {
        totalEnquiries,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update contact enquiry status
// @route   PATCH /api/v1/contact-enquiries/:id/status
// @access  Private/Admin
export const updateContactEnquiryStatus = async (req, res, next) => {
  try {
    const { status, reply } = req.body;

    if (!["new", "read", "replied"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const contactEnquiry = await ContactEnquiry.findById(req.params.id);
    if (!contactEnquiry) {
      return res
        .status(404)
        .json({ success: false, message: "Contact enquiry not found" });
    }

    const oldStatus = contactEnquiry.status;

    // Handle email logic first
    if (status === "read" && oldStatus === "new") {
      try {
        const settings = await Settings.findOne();
        let template = settings?.contactEnquiryProgressEmailTemplate;
        if (template) {
          const replacements = {
            "{{name}}": contactEnquiry.name,
            "{{query}}": contactEnquiry.query,
          };
          Object.keys(replacements).forEach((key) => {
            template = template.replaceAll(key, replacements[key]);
          });
          await sendEmail({
            email: contactEnquiry.email,
            subject: "Your enquiry is under progress",
            html: template,
          });
        } else {
          await sendEmail({
            email: contactEnquiry.email,
            subject: "Your enquiry is under progress",
            html: `<p>Dear ${contactEnquiry.name},</p>
                   <p>Your query: "<strong>${contactEnquiry.query}</strong>" has been submitted and is under progress.</p>
                   <p>Best regards,<br>Studio By Sheetal</p>`,
          });
        }
      } catch (emailError) {
        console.error("Progress email failed:", emailError);
        return res.status(500).json({ 
          success: false, 
          message: "Failed to send progress email. Status not updated." 
        });
      }
    } else if (status === "replied" && reply) {
      try {
        const settings = await Settings.findOne();
        let template = settings?.contactEnquiryReplyEmailTemplate;
        if (template) {
          const replacements = {
            "{{name}}": contactEnquiry.name,
            "{{query}}": contactEnquiry.query,
            "{{reply}}": reply,
          };
          Object.keys(replacements).forEach((key) => {
            template = template.replaceAll(key, replacements[key]);
          });
          await sendEmail({
            email: contactEnquiry.email,
            subject: "Reply to your enquiry",
            html: template,
          });
        } else {
          await sendEmail({
            email: contactEnquiry.email,
            subject: "Reply to your enquiry",
            html: `<p>Dear ${contactEnquiry.name},</p>
                   <p>In response to your query: "<strong>${contactEnquiry.query}</strong>"</p>
                   <p><strong>Our reply:</strong></p>
                   <p>${reply}</p>
                   <p>Best regards,<br>Studio By Sheetal</p>`,
          });
        }
      } catch (emailError) {
        console.error("Reply email failed:", emailError);
        return res.status(500).json({ 
          success: false, 
          message: "Failed to send reply email. Status not updated." 
        });
      }
    }

    // If email succeeded (or wasn't needed), update the DB
    contactEnquiry.status = status;
    if (status === "replied" && reply) {
      contactEnquiry.reply = reply;
    }
    await contactEnquiry.save();

    res.status(200).json({ success: true, contactEnquiry });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete contact enquiry
// @route   DELETE /api/v1/contact-enquiries/:id
// @access  Private/Admin
export const deleteContactEnquiry = async (req, res, next) => {
  try {
    const contactEnquiry = await ContactEnquiry.findByIdAndDelete(
      req.params.id,
    );

    if (!contactEnquiry) {
      return res
        .status(404)
        .json({ success: false, message: "Contact enquiry not found" });
    }

    res.status(200).json({ success: true, message: "Contact enquiry deleted" });
  } catch (error) {
    next(error);
  }
};
