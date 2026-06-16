import Testimonial from "../models/testimonials.model.js";
import { deleteS3File } from "../utils/fileHelper.js";

// @desc    Get all testimonials
// @route   GET /api/v1/testimonials
// @access  Public
export const getTestimonials = async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find({ isActive: true }).sort({
      order: 1,
      createdAt: -1,
    });
    res.status(200).json({ success: true, testimonials });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a testimonial
// @route   POST /api/v1/testimonials
// @access  Private/Admin
export const addTestimonial = async (req, res, next) => {
  try {
    const { name, comment } = req.body;

    if (!name?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    if (!comment?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Comment is required" });

    const count = await Testimonial.countDocuments();

    const testimonial = await Testimonial.create({
      name: name.trim(),
      comment: comment.trim(),
      image: req.file
        ? { url: req.file.location, key: req.file.key, alt: name.trim() }
        : { url: null, key: null, alt: "" },
      order: count,
    });

    res.status(201).json({ success: true, testimonial });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a testimonial
// @route   PATCH /api/v1/testimonials/:id
// @access  Private/Admin
export const updateTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, comment } = req.body;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial)
      return res
        .status(404)
        .json({ success: false, message: "Testimonial not found" });

    if (name?.trim()) testimonial.name = name.trim();
    if (comment?.trim()) testimonial.comment = comment.trim();

    if (req.file) {
      if (testimonial.image?.key) deleteS3File(testimonial.image.key);
      testimonial.image = {
        url: req.file.location,
        key: req.file.key,
        alt: testimonial.name,
      };
    }

    await testimonial.save();
    res.status(200).json({ success: true, testimonial });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a testimonial
// @route   DELETE /api/v1/testimonials/:id
// @access  Private/Admin
export const deleteTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial)
      return res
        .status(404)
        .json({ success: false, message: "Testimonial not found" });

    if (testimonial.image?.key) deleteS3File(testimonial.image.key);
    await testimonial.deleteOne();

    res.status(200).json({ success: true, message: "Testimonial deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder testimonials
// @route   PUT /api/v1/testimonials/reorder
// @access  Private/Admin
export const reorderTestimonials = async (req, res, next) => {
  try {
    const { reorderedIds } = req.body;
    if (!reorderedIds || !Array.isArray(reorderedIds)) {
      return res
        .status(400)
        .json({ success: false, message: "reorderedIds array is required" });
    }

    const operations = reorderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index } },
      },
    }));

    await Testimonial.bulkWrite(operations);
    res
      .status(200)
      .json({ success: true, message: "Testimonials reordered successfully" });
  } catch (error) {
    next(error);
  }
};
