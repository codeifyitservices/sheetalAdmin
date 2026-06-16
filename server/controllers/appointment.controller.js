import Appointment from "../models/appointment.model.js";
import { sendAppointmentConfirmationEmail } from "../services/appointment.email.service.js";

// @desc    Book an appointment
// @route   POST /api/v1/appointments
// @access  Public
export const createAppointment = async (req, res, next) => {
  try {
    const { name, email, contact, address, city, pincode, requirements } =
      req.body;
    const trimmedContact = contact?.trim();
    const trimmedPincode = pincode?.trim();

    if (!name?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    if (!email?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    if (!trimmedContact)
      return res
        .status(400)
        .json({ success: false, message: "Contact is required" });
    if (!/^\d{10}$/.test(trimmedContact)) {
      return res
        .status(400)
        .json({ success: false, message: "Contact must be a 10-digit number" });
    }
    if (!address?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Address is required" });
    if (!city?.trim())
      return res
        .status(400)
        .json({ success: false, message: "City is required" });
    if (!trimmedPincode)
      return res
        .status(400)
        .json({ success: false, message: "Pincode is required" });
    if (!/^\d{6}$/.test(trimmedPincode)) {
      return res
        .status(400)
        .json({ success: false, message: "Pincode must be a 6-digit number" });
    }

    const appointment = await Appointment.create({
      name: name.trim(),
      email: email.trim(),
      contact: trimmedContact,
      address: address.trim(),
      city: city.trim(),
      pincode: trimmedPincode,
      requirements: requirements?.trim() || "",
    });

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all appointments (with search + filter)
// @route   GET /api/v1/appointments
// @access  Private/Admin
export const getAppointments = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (search?.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const totalAppointments = await Appointment.countDocuments(query);
    const totalPages = Math.ceil(totalAppointments / limitNum);

    const appointments = await Appointment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      appointments,
      pagination: {
        totalAppointments,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment
// @route   GET /api/v1/appointments/:id
// @access  Private/Admin
export const getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    res.status(200).json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status
// @route   PATCH /api/v1/appointments/:id/status
// @access  Private/Admin
export const updateStatus = async (req, res, next) => {
  try {
    const { status, appointmentDate, appointmentTime } = req.body;
    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const updateData = { status };

    if (status === "confirmed") {
      if (!appointmentDate || !appointmentTime) {
        return res.status(400).json({
          success: false,
          message: "Appointment date and time are required to confirm appointment",
        });
      }
      updateData.appointmentDate = appointmentDate;
      updateData.appointmentTime = appointmentTime;
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });

    if (status === "confirmed") {
      await sendAppointmentConfirmationEmail(appointment);
    }

    res.status(200).json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment notes
// @route   PATCH /api/v1/appointments/:id/notes
// @access  Private/Admin
export const updateNotes = async (req, res, next) => {
  try {
    const { notes } = req.body;

    if (typeof notes !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Notes must be a string" });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { notes: notes.trim() },
      { new: true },
    );

    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });

    res.status(200).json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete appointment
// @route   DELETE /api/v1/appointments/:id
// @access  Private/Admin
export const deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    res.status(200).json({ success: true, message: "Appointment deleted" });
  } catch (error) {
    next(error);
  }
};
