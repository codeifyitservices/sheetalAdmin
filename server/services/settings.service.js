import Settings from "../models/settings.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

// Ensure settings document exists
const ensureSettings = async () => {
  const settings = await Settings.findOne();
  if (!settings) {
    return await Settings.create({});
  }
  return settings;
};

export const getGlobalTax = async () => {
  const settings = await ensureSettings();
  return settings.taxPercentage || 0;
};

export const getSettings = async () => {
  try {
    const settings = await ensureSettings();
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateLogo = async (logoData) => {
  try {
    const settings = await ensureSettings();

    // Before replacing, move current logo to history
    if (settings.logo && settings.logo.url) {
      settings.logoHistory.unshift({
        url: settings.logo.url,
        uploadDate: settings.logo.uploadDate,
        dimensions: settings.logo.dimensions,
      });

      // Keep only last 5 versions
      if (settings.logoHistory.length > 5) {
        settings.logoHistory = settings.logoHistory.slice(0, 5);
      }
    }

    settings.logo = {
      url: logoData.url,
      uploadDate: new Date(),
      dimensions: logoData.dimensions,
    };

    await settings.save();
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const restoreLogo = async (historyId) => {
  try {
    const settings = await ensureSettings();
    const historyItemIndex = settings.logoHistory.findIndex(
      (h) => h._id.toString() === historyId,
    );

    if (historyItemIndex === -1) {
      return { success: false, message: "History version not found" };
    }

    const historyItem = settings.logoHistory[historyItemIndex];

    // Swap current with history
    const currentLogo = {
      url: settings.logo.url,
      uploadDate: settings.logo.uploadDate,
      dimensions: settings.logo.dimensions,
    };

    settings.logo = {
      url: historyItem.url,
      uploadDate: historyItem.uploadDate,
      dimensions: historyItem.dimensions,
    };

    // Remove from history and add the previously current one
    settings.logoHistory.splice(historyItemIndex, 1);
    settings.logoHistory.unshift(currentLogo);

    await settings.save();
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateSettings = async (data) => {
  try {
    const oldSettings = await Settings.findOne();
    const settings = await Settings.findOneAndUpdate({}, data, {
      new: true,
      upsert: true,
    });

    // If taxPercentage changed, update all categories and products that follow the global tax
    if (
      data.taxPercentage !== undefined &&
      oldSettings?.taxPercentage !== data.taxPercentage
    ) {
      const newGst = Number(data.taxPercentage);
      const oldGst = oldSettings?.taxPercentage !== undefined ? Number(oldSettings.taxPercentage) : 0;

      // 1. Find categories with 0 GST, not set, or equal to the old global tax
      const categoriesToUpdate = await Category.find({
        $or: [
          { gstPercent: 0 },
          { gstPercent: { $exists: false } },
          { gstPercent: oldGst },
        ],
        noGst: { $ne: true },
      });
      const categoryIds = categoriesToUpdate.map((c) => c._id);

      if (categoryIds.length > 0) {
        // Update these categories' gstPercent in the database
        await Category.updateMany(
          { _id: { $in: categoryIds } },
          { $set: { gstPercent: newGst } },
        );

        // Update all products in these categories to the new GST rate
        await Product.updateMany(
          {
            category: { $in: categoryIds },
          },
          { $set: { gstPercent: newGst } },
        );
      }
    }

    return { success: true, data: settings };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
