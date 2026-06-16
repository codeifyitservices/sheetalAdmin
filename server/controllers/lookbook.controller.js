import Lookbook from "../models/lookbook.model.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { deleteS3File } from "../utils/fileHelper.js";

// @desc    Get lookbook by slug
// @route   GET /api/v1/lookbooks/:slug
// @access  Public
export const getLookbookBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const lookbook = await Lookbook.findOne({ slug });

    if (!lookbook) {
      return res.status(200).json({
        success: true,
        lookbook: null,
      });
    }

    res.status(200).json({
      success: true,
      lookbook,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lookbook images + center content
// @route   POST /api/v1/lookbooks/:slug
// @access  Private/Admin
export const updateLookbook = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { title } = req.body;

    let lookbook = await Lookbook.findOne({ slug });

    if (!lookbook) {
      lookbook = new Lookbook({
        slug,
        title: title || "Lookbook",
        leftSliderImages: [],
        rightSliderImages: [],
      });
    }

    // Parse existing images
    let existingLeft = [];
    try {
      existingLeft = JSON.parse(req.body.existingLeftImages || "[]");
    } catch (e) {
      console.error("Error parsing existingLeftImages", e);
    }

    let existingRight = [];
    try {
      existingRight = JSON.parse(req.body.existingRightImages || "[]");
    } catch (e) {
      console.error("Error parsing existingRightImages", e);
    }

    // Parse centerContent
    let centerContent = null;
    try {
      centerContent = JSON.parse(req.body.centerContent || "null");
    } catch (e) {
      console.error("Error parsing centerContent", e);
    }

    // Find and delete removed images from S3
    const toDelete = [];

    lookbook.leftSliderImages.forEach((img) => {
      if (!existingLeft.find((e) => e.key === img.key)) {
        toDelete.push(img.key);
      }
    });

    lookbook.rightSliderImages.forEach((img) => {
      if (!existingRight.find((e) => e.key === img.key)) {
        toDelete.push(img.key);
      }
    });

    toDelete.forEach((key) => deleteS3File(key));

    // Process new uploads
    const newLeftFiles = req.files["leftImages"] || [];
    const newRightFiles = req.files["rightImages"] || [];

    const newLeftImages = newLeftFiles.map((file) => ({
      url: file.location,
      key: file.key,
      alt: file.originalname,
    }));

    const newRightImages = newRightFiles.map((file) => ({
      url: file.location,
      key: file.key,
      alt: file.originalname,
    }));

    // Apply updates
    lookbook.title = title || lookbook.title;
    lookbook.leftSliderImages = [...existingLeft, ...newLeftImages];
    lookbook.rightSliderImages = [...existingRight, ...newRightImages];

    if (centerContent) {
      lookbook.centerContent = {
        ...(lookbook.centerContent.toObject?.() ?? lookbook.centerContent),
        ...centerContent,
      };
    }

    await lookbook.save();

    res.status(200).json({
      success: true,
      message: "Lookbook updated successfully",
      lookbook,
    });
  } catch (error) {
    next(error);
  }
};
