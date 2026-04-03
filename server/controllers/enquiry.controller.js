import Enquiry from "../models/enquiry.model.js";
import { sendAvailabilityEmail } from "../services/enquiry.service.js";
import mongoose from "mongoose";

// @desc    Submit an enquiry
// @route   POST /api/v1/enquiries
// @access  Public
export const createEnquiry = async (req, res, next) => {
  try {
    const { product, productName, size, name, email, phone, message } = req.body;

    if (!productName?.trim())
      return res.status(400).json({ success: false, message: "Product name is required" });
    if (!size?.trim())
      return res.status(400).json({ success: false, message: "Size is required" });
    if (!name?.trim())
      return res.status(400).json({ success: false, message: "Name is required" });
    if (!email?.trim())
      return res.status(400).json({ success: false, message: "Email is required" });
    if (!phone?.trim())
      return res.status(400).json({ success: false, message: "Phone is required" });

    const enquiry = await Enquiry.create({
      product:
        product && mongoose.Types.ObjectId.isValid(product) ? product : null,
      productName: productName.trim(),
      size:        size.trim(),
      name:        name.trim(),
      email:       email.trim(),
      phone:       phone.trim(),
      message:     message?.trim() || "",
    });

    res.status(201).json({ success: true, enquiry });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all enquiries
// @route   GET /api/v1/enquiries
// @access  Private/Admin
export const getEnquiries = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;

    if (search?.trim()) {
      query.$or = [
        { name:        { $regex: search.trim(), $options: "i" } },
        { email:       { $regex: search.trim(), $options: "i" } },
        { productName: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const enquiries = await Enquiry.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, enquiries });
  } catch (error) {
    next(error);
  }
};

// @desc    Update enquiry status
// @route   PATCH /api/v1/enquiries/:id/status
// @access  Private/Admin
export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["new", "read", "replied"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!enquiry)
      return res.status(404).json({ success: false, message: "Enquiry not found" });

    res.status(200).json({ success: true, enquiry });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete enquiry
// @route   DELETE /api/v1/enquiries/:id
// @access  Private/Admin
export const deleteEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry)
      return res.status(404).json({ success: false, message: "Enquiry not found" });

    res.status(200).json({ success: true, message: "Enquiry deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc    Send availability email
// @route   POST /api/v1/enquiries/:id/send-availability
// @access  Private/Admin
export const sendAvailability = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    await sendAvailabilityEmail({
      name:        enquiry.name,
      email:       enquiry.email,
      productName: enquiry.productName,
      size:        enquiry.size,
    });

    enquiry.status = "replied";
    await enquiry.save();

    res.status(200).json({ success: true, message: "Availability email sent", enquiry });
  } catch (error) {
    next(error);
  }
};
