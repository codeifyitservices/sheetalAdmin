import Appointment from "../models/appointment.model.js";

// @desc    Book an appointment
// @route   POST /api/v1/appointments
// @access  Public
export const createAppointment = async (req, res, next) => {
    try {
        const { name, email, contact, address, city, pincode, requirements } = req.body;

        if (!name?.trim()) return res.status(400).json({ success: false, message: "Name is required" });
        if (!email?.trim()) return res.status(400).json({ success: false, message: "Email is required" });
        if (!contact?.trim()) return res.status(400).json({ success: false, message: "Contact is required" });
        if (!address?.trim()) return res.status(400).json({ success: false, message: "Address is required" });
        if (!city?.trim()) return res.status(400).json({ success: false, message: "City is required" });
        if (!pincode?.trim()) return res.status(400).json({ success: false, message: "Pincode is required" });

        const appointment = await Appointment.create({
            name: name.trim(),
            email: email.trim(),
            contact: contact.trim(),
            address: address.trim(),
            city: city.trim(),
            pincode: pincode.trim(),
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
        const { status, search } = req.query;

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

        const appointments = await Appointment.find(query).sort({ createdAt: -1 });

        res.status(200).json({ success: true, appointments });
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
        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
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
        const { status } = req.body;
        if (!["pending", "confirmed", "cancelled"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

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
            return res.status(400).json({ success: false, message: "Notes must be a string" });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { notes: notes.trim() },
            { new: true }
        );

        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

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
        if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
        res.status(200).json({ success: true, message: "Appointment deleted" });
    } catch (error) {
        next(error);
    }
};
