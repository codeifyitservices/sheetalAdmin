import Lookbook from "../models/lookbook.model.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { deleteS3File } from "../utils/fileHelper.js";

const MAX_IMAGES_PER_SIDE = 5;

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
        sliderImages: [],
        leftSliderImages: [],
        rightSliderImages: [],
      });
    }

    // Parse existing shared slider images (new unified field)
    let existingSlider = [];
    try {
      existingSlider = JSON.parse(req.body.existingSliderImages || "[]");
    } catch (e) {
      console.error("Error parsing existingSliderImages", e);
    }

    // Legacy: also handle left/right for backwards compat
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

    // Determine which images to delete from S3
    // Use sliderImages if provided, otherwise fall back to left/right
    const isUnifiedMode = req.body.existingSliderImages !== undefined;
    const toDelete = [];

    if (isUnifiedMode) {
      // Unified mode: compare against sliderImages pool
      const currentImages = [
        ...lookbook.sliderImages,
        ...lookbook.leftSliderImages,
        ...lookbook.rightSliderImages,
      ];
      currentImages.forEach((img) => {
        if (!existingSlider.find((e) => e.key === img.key)) {
          toDelete.push(img.key);
        }
      });
    } else {
      // Legacy left/right mode
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
    }

    // Deduplicate before deleting (keys can appear in sliderImages AND mirrored left/right)
    const uniqueKeysToDelete = [...new Set(toDelete)];
    uniqueKeysToDelete.forEach((key) => deleteS3File(key));

    // Process new uploads
    const newSliderFiles = (req.files && req.files["sliderImages"]) || [];
    const newLeftFiles = (req.files && req.files["leftImages"]) || [];
    const newRightFiles = (req.files && req.files["rightImages"]) || [];

    // Parse per-image metadata for new slider uploads (categoryLink etc.)
    let newSliderMeta = [];
    try {
      newSliderMeta = JSON.parse(req.body.newSliderImagesMeta || "[]");
    } catch (e) {
      console.error("Error parsing newSliderImagesMeta", e);
    }

    let newLeftMeta = [];
    try {
      newLeftMeta = JSON.parse(req.body.newLeftImagesMeta || "[]");
    } catch (e) {
      console.error("Error parsing newLeftImagesMeta", e);
    }

    let newRightMeta = [];
    try {
      newRightMeta = JSON.parse(req.body.newRightImagesMeta || "[]");
    } catch (e) {
      console.error("Error parsing newRightImagesMeta", e);
    }

    const newSliderImages = newSliderFiles.map((file, idx) => ({
      url: file.location,
      key: file.key,
      alt: file.originalname,
      categoryLink: newSliderMeta[idx]?.categoryLink || "",
    }));

    const newLeftImages = newLeftFiles.map((file, idx) => ({
      url: file.location,
      key: file.key,
      alt: file.originalname,
      categoryLink: newLeftMeta[idx]?.categoryLink || "",
    }));

    const newRightImages = newRightFiles.map((file, idx) => ({
      url: file.location,
      key: file.key,
      alt: file.originalname,
      categoryLink: newRightMeta[idx]?.categoryLink || "",
    }));

    // Apply updates
    lookbook.title = title || lookbook.title;

    if (isUnifiedMode) {
      // Save to unified sliderImages field
      lookbook.sliderImages = [...existingSlider, ...newSliderImages];
      // Mirror to left/right for frontend rendering compatibility
      lookbook.leftSliderImages = lookbook.sliderImages;
      lookbook.rightSliderImages = lookbook.sliderImages;
    } else {
      // Legacy path
      lookbook.leftSliderImages = [...existingLeft, ...newLeftImages].slice(
        0,
        MAX_IMAGES_PER_SIDE,
      );
      lookbook.rightSliderImages = [...existingRight, ...newRightImages].slice(
        0,
        MAX_IMAGES_PER_SIDE,
      );
    }

    if (centerContent) {
      lookbook.centerContent = {
        ...(lookbook.centerContent.toObject?.() ?? lookbook.centerContent),
        ...centerContent,
      };
    }

    await lookbook.save();

    res.status(200).json({
      success: true,
      message: "Deals updated successfully",
      lookbook,
    });
  } catch (error) {
    next(error);
  }
};
