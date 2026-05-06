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

export const updateSettings = async (data) => {
    try {
        const oldSettings = await Settings.findOne();
        const settings = await Settings.findOneAndUpdate({}, data, {
            new: true,
            upsert: true,
        });

        // If taxPercentage changed, update all categories and products that have 0 GST
        if (data.taxPercentage !== undefined && oldSettings?.taxPercentage !== data.taxPercentage) {
            const newGst = Number(data.taxPercentage);
            
            // 1. Find categories with 0 GST (or not set)
            const categoriesToUpdate = await Category.find({ 
                $or: [{ gstPercent: 0 }, { gstPercent: { $exists: false } }] 
            });
            const categoryIds = categoriesToUpdate.map(c => c._id);

            // 2. Update products in these categories that have 0 GST
            if (categoryIds.length > 0) {
                await Product.updateMany(
                    { category: { $in: categoryIds }, $or: [{ gstPercent: 0 }, { gstPercent: { $exists: false } }] },
                    { $set: { gstPercent: newGst } }
                );
            }
            
            // Note: We don't update category.gstPercent itself because the user might want 
            // to keep it 0 to continue following the global setting. 
            // However, the products store the calculated GST for performance.
        }

        return { success: true, data: settings };
    } catch (error) {
        return { success: false, message: error.message };
    }
};
