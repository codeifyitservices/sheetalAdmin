import Color from "../models/color.model.js";
import Product from "../models/product.model.js";

/**
 * Creates a new Color in the catalog
 */
export const createColorService = async (colorData) => {
  const { name, hex } = colorData;
  if (!name || !name.trim()) {
    return { success: false, statusCode: 400, message: "Color name is required" };
  }
  if (!hex || !hex.trim()) {
    return { success: false, statusCode: 400, message: "Hex code is required" };
  }

  // Check if name already exists case-insensitively
  const nameTrimmed = name.trim();
  const existing = await Color.findOne({
    name: { $regex: new RegExp(`^${nameTrimmed}$`, "i") },
  });
  if (existing) {
    return { success: false, statusCode: 400, message: "Color name already exists" };
  }

  const color = await Color.create({ name: nameTrimmed, hex: hex.trim() });
  return { success: true, data: color };
};

/**
 * Retrieves all Colors
 */
export const getAllColorsService = async () => {
  const colors = await Color.find({}).sort({ name: 1 });
  return { success: true, data: colors };
};

/**
 * Updates a Color
 */
export const updateColorService = async (colorId, updateData) => {
  const { name, hex } = updateData;

  const color = await Color.findById(colorId);
  if (!color) {
    return { success: false, statusCode: 404, message: "Color not found" };
  }

  if (name && name.trim()) {
    const nameTrimmed = name.trim();
    // Check if name is taken by another color
    const existing = await Color.findOne({
      _id: { $ne: colorId },
      name: { $regex: new RegExp(`^${nameTrimmed}$`, "i") },
    });
    if (existing) {
      return { success: false, statusCode: 400, message: "Color name already exists" };
    }
    color.name = nameTrimmed;
  }

  if (hex && hex.trim()) {
    color.hex = hex.trim();
  }

  await color.save();
  return { success: true, data: color };
};

/**
 * Deletes a Color, blocking if any product references it
 */
export const deleteColorService = async (colorId) => {
  const color = await Color.findById(colorId);
  if (!color) {
    return { success: false, statusCode: 404, message: "Color not found" };
  }

  // Check if any product references this color
  const productRef = await Product.findOne({ "variants.colorId": colorId });
  if (productRef) {
    return {
      success: false,
      statusCode: 400,
      message: `Cannot delete color "${color.name}" because it is referenced by product "${productRef.name}".`,
    };
  }

  await Color.findByIdAndDelete(colorId);
  return { success: true, message: "Color deleted successfully" };
};
