import Banner from "../models/banner.model.js";
import { deleteFile, deleteS3File } from "../utils/fileHelper.js";

const normalizeBannerStatus = (status) =>
  status === "Inactive" ? "Inactive" : "Active";

export const createBannerService = async (data, files) => {
  try {
    const { title, link, status, startsAt, expiresAt } = data;

    if (!title) return { success: false, message: "Banner title is required" };

    // Validate files object exists
    if (!files || typeof files !== "object") {
      return { success: false, message: "No files uploaded" };
    }

    const image = {};

    // Safely check and process desktop image
    if (
      files.desktopImage &&
      Array.isArray(files.desktopImage) &&
      files.desktopImage.length > 0
    ) {
      image.desktop = {
        url: files.desktopImage[0].location || files.desktopImage[0].path,
        public_id: files.desktopImage[0].key || files.desktopImage[0].filename,
      };
    }

    // Safely check and process mobile image
    if (
      files.mobileImage &&
      Array.isArray(files.mobileImage) &&
      files.mobileImage.length > 0
    ) {
      image.mobile = {
        url: files.mobileImage[0].location || files.mobileImage[0].path,
        public_id: files.mobileImage[0].key || files.mobileImage[0].filename,
      };
    }

    // Find the maximum order value
    const maxOrderBanner = await Banner.findOne().sort({ order: -1 });
    const newOrder = maxOrderBanner ? maxOrderBanner.order + 1 : 1;

    // Create new banner
    const newBanner = await Banner.create({
      title,
      link: link || "/",
      status: normalizeBannerStatus(status),
      image,
      order: newOrder,
      startsAt: startsAt || null,
      expiresAt: expiresAt || null,
    });

    return { success: true, data: newBanner };
  } catch (error) {
    console.error("Error in createBannerService:", error);
    return {
      success: false,
      message: error.message || "Failed to create banner",
      error: error.toString(),
    };
  }
};

export const getAllBannersService = async () => {
  const currentDate = new Date();
  await Banner.updateMany(
    { expiresAt: { $ne: null, $lt: currentDate }, status: "Active" },
    { $set: { status: "Inactive", isActive: false } },
  );

  const banners = await Banner.find({
    status: "Active",
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: currentDate } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: currentDate } }] },
    ],
  }).sort({ order: 1 });
  return { success: true, data: banners };
};

export const getAdminBannersService = async ({ page, limit, search }) => {
  const query = search ? { title: { $regex: search, $options: "i" } } : {};

  const total = await Banner.countDocuments(query);
  const banners = await Banner.find(query)
    .sort({ order: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    success: true,
    data: {
      banners,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    },
  };
};

export const getBannerStatsService = async () => {
  const total = await Banner.countDocuments();
  const active = await Banner.countDocuments({ status: "Active" });
  const inactive = await Banner.countDocuments({ status: "Inactive" });

  return {
    success: true,
    data: { total, active, inactive },
  };
};

export const updateBannerService = async (id, data, files) => {
  try {
    const banner = await Banner.findById(id);
    if (!banner) return { success: false, message: "Banner not found" };

    const updateData = {
      title: data.title,
      link: data.link,
      status: normalizeBannerStatus(data.status),
      image: banner.image || {}, // Ensure image object exists
      startsAt: data.startsAt || null,
      expiresAt: data.expiresAt || null,
      isActive: normalizeBannerStatus(data.status) === "Active", // Explicitly sync isActive with status
    };

    // Only process files if files object exists and is valid
    if (files && typeof files === "object") {
      // Process desktop image if provided
      if (
        files.desktopImage &&
        Array.isArray(files.desktopImage) &&
        files.desktopImage.length > 0
      ) {
        // Delete old desktop image if exists
        if (banner.image?.desktop?.public_id) {
          if (banner.image.desktop.url?.startsWith("http")) {
            await deleteS3File(banner.image.desktop.public_id);
          } else {
            await deleteFile(banner.image.desktop.url);
          }
        }
        updateData.image.desktop = {
          url: files.desktopImage[0].location || files.desktopImage[0].path,
          public_id:
            files.desktopImage[0].key || files.desktopImage[0].filename,
        };
      }

      // Process mobile image if provided
      if (
        files.mobileImage &&
        Array.isArray(files.mobileImage) &&
        files.mobileImage.length > 0
      ) {
        // Delete old mobile image if exists
        if (banner.image?.mobile?.public_id) {
          if (banner.image.mobile.url?.startsWith("http")) {
            await deleteS3File(banner.image.mobile.public_id);
          } else {
            await deleteFile(banner.image.mobile.url);
          }
        }
        updateData.image.mobile = {
          url: files.mobileImage[0].location || files.mobileImage[0].path,
          public_id: files.mobileImage[0].key || files.mobileImage[0].filename,
        };
      }
    }

    const updated = await Banner.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error in updateBannerService:", error);
    return {
      success: false,
      message: error.message || "Failed to update banner",
      error: error.toString(),
    };
  }
};

export const deleteBannerService = async (id) => {
  const banner = await Banner.findById(id);
  if (!banner) return { success: false, message: "Banner not found" };

  if (banner.image.desktop?.public_id) {
    if (banner.image.desktop.url?.startsWith("http")) {
      await deleteS3File(banner.image.desktop.public_id);
    } else {
      await deleteFile(banner.image.desktop.url);
    }
  }

  if (banner.image.mobile?.public_id) {
    if (banner.image.mobile.url?.startsWith("http")) {
      await deleteS3File(banner.image.mobile.public_id);
    } else {
      await deleteFile(banner.image.mobile.url);
    }
  }

  await banner.deleteOne();
  return { success: true, message: "Banner deleted successfully" };
};

export const reorderBannersService = async (orderedIds) => {
  try {
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    }));

    if (bulkOps.length === 0) {
      return { success: true, message: "No banners to reorder." };
    }

    await Banner.bulkWrite(bulkOps);
    return { success: true, message: "Banners reordered successfully." };
  } catch (error) {
    console.error("Error reordering banners:", error);
    return {
      success: false,
      statusCode: 500,
      message: "An error occurred while reordering banners.",
    };
  }
};
