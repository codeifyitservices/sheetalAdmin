import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import SizeChart from "../models/sizechart.model.js";
import { deleteFile, deleteS3File } from "../utils/fileHelper.js";

const cleanupPreviousImage = async (image) => {
  if (!image?.public_id) return;

  if (image.url?.startsWith("http")) {
    await deleteS3File(image.public_id);
  } else if (image.url) {
    await deleteFile(image.url);
  }
};

export const getSizeChartsService = async () => {
  const charts = await SizeChart.find().sort({ createdAt: -1 }).lean();
  return { charts };
};

export const getSizeChartByIdService = async (id) => {
  const chart = await SizeChart.findById(id);
  if (!chart) return null;
  return chart;
};

export const createSizeChartService = async (chartData = {}) => {
  const name = (chartData.name || "").trim();
  if (!name) {
    return { success: false, message: "Size chart name is required" };
  }

  const existing = await SizeChart.findOne({ name });
  if (existing) {
    return { success: false, message: "A size chart with this name already exists" };
  }

  const sizeChart = await SizeChart.create({
    name,
    table: Array.isArray(chartData.table) ? chartData.table : [],
  });

  return { success: true, data: sizeChart };
};

export const updateSizeChartService = async (id, chartData = {}) => {
  const sizeChart = await SizeChart.findById(id);
  if (!sizeChart) {
    return { success: false, statusCode: 404, message: "Size chart not found" };
  }

  if (chartData.name !== undefined) {
    const nextName = String(chartData.name).trim();
    if (!nextName) {
      return { success: false, message: "Size chart name cannot be empty" };
    }

    const duplicate = await SizeChart.findOne({
      _id: { $ne: id },
      name: nextName,
    });
    if (duplicate) {
      return { success: false, message: "A size chart with this name already exists" };
    }
    sizeChart.name = nextName;
  }

  if (chartData.table !== undefined) {
    if (!Array.isArray(chartData.table)) {
      return { success: false, message: "Table must be an array" };
    }
    sizeChart.table = chartData.table;
  }

  await sizeChart.save();
  return { success: true, data: sizeChart };
};

export const deleteSizeChartService = async (id) => {
  const sizeChart = await SizeChart.findById(id);
  if (!sizeChart) {
    return { success: false, statusCode: 404, message: "Size chart not found" };
  }

  await cleanupPreviousImage(sizeChart.howToMeasureImage);
  await sizeChart.deleteOne();

  await Category.updateMany(
    { sizeChart: id },
    { $unset: { sizeChart: "" } },
  );
  await Product.updateMany(
    { sizeChart: id },
    { $unset: { sizeChart: "" } },
  );

  return { success: true };
};

export const uploadHowToMeasureImageService = async (id, file) => {
  const sizeChart = await SizeChart.findById(id);
  if (!sizeChart) {
    return { success: false, statusCode: 404, message: "Size chart not found" };
  }

  await cleanupPreviousImage(sizeChart.howToMeasureImage);

  sizeChart.howToMeasureImage = {
    url: file.location || file.path,
    public_id: file.key || file.filename,
  };

  await sizeChart.save();
  return { success: true, data: sizeChart };
};

export const addSizeRowService = async (id, sizeData) => {
  const sizeChart = await SizeChart.findById(id);
  if (!sizeChart) {
    return { success: false, statusCode: 404, message: "Size chart not found" };
  }

  sizeChart.table.push(sizeData);
  await sizeChart.save();
  return { success: true, data: sizeChart };
};

export const updateSizeRowService = async (id, sizeId, sizeData) => {
  const sizeChart = await SizeChart.findById(id);
  if (!sizeChart) {
    return { success: false, statusCode: 404, message: "Size chart not found" };
  }

  const sizeIndex = sizeChart.table.findIndex(
    (size) => size._id.toString() === sizeId,
  );
  if (sizeIndex === -1) {
    return { success: false, statusCode: 404, message: "Size row not found" };
  }

  sizeChart.table[sizeIndex] = {
    ...sizeChart.table[sizeIndex],
    ...sizeData,
  };
  await sizeChart.save();
  return { success: true, data: sizeChart };
};

export const deleteSizeRowService = async (id, sizeId) => {
  const sizeChart = await SizeChart.findById(id);
  if (!sizeChart) {
    return { success: false, statusCode: 404, message: "Size chart not found" };
  }

  sizeChart.table = sizeChart.table.filter(
    (size) => size._id.toString() !== sizeId,
  );
  await sizeChart.save();
  return { success: true, data: sizeChart };
};
