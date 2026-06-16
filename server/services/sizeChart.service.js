import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import SizeChart from "../models/sizechart.model.js";
import { deleteFile, deleteS3File } from "../utils/fileHelper.js";

const DEFAULT_HEADERS = ["Size", "Bust", "Waist"];
const LEGACY_HEADERS = ["Size", "Bust", "Waist", "Hip", "Shoulder", "Length"];
const MAX_COLUMNS = 8;

const normalizeHeaderLabel = (header, index) =>
  String(header || "").trim() || `Column ${index + 1}`;

const inferHeadersFromRows = (rows = []) => {
  const next = ["Size"];
  const legacyFields = [
    { key: "bust", label: "Bust" },
    { key: "waist", label: "Waist" },
    { key: "hip", label: "Hip" },
    { key: "shoulder", label: "Shoulder" },
    { key: "length", label: "Length" },
  ];

  legacyFields.forEach(({ key, label }) => {
    if (rows.some((row) => String(row?.[key] || "").trim())) {
      next.push(label);
    }
  });

  while (next.length < DEFAULT_HEADERS.length) {
    next.push(DEFAULT_HEADERS[next.length]);
  }

  return next.slice(0, MAX_COLUMNS);
};

const normalizeHeaders = (headers, rows = []) => {
  const source =
    Array.isArray(headers) && headers.length > 0
      ? headers
      : inferHeadersFromRows(rows);

  return source.slice(0, MAX_COLUMNS).map(normalizeHeaderLabel);
};

const getLegacyCellValue = (row, index) => {
  const legacyKeys = ["label", "bust", "waist", "hip", "shoulder", "length"];
  return String(row?.[legacyKeys[index]] || "").trim();
};

const buildLegacyRow = (cells = []) => ({
  label: String(cells[0] || "").trim(),
  bust: String(cells[1] || "").trim(),
  waist: String(cells[2] || "").trim(),
  hip: String(cells[3] || "").trim(),
  shoulder: String(cells[4] || "").trim(),
  length: String(cells[5] || "").trim(),
});

const normalizeTableRows = (rows, headers) => {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const cells = Array.isArray(row?.cells)
      ? headers.map((_, index) => String(row.cells[index] || "").trim())
      : headers.map((_, index) => getLegacyCellValue(row, index));

    return {
      cells,
      ...buildLegacyRow(cells),
    };
  });
};

const normalizeChartPayload = (chartData = {}) => {
  const headers = normalizeHeaders(chartData.headers, chartData.table);
  const table = normalizeTableRows(chartData.table, headers);

  return { headers, table };
};

const serializeChart = (chart) => {
  const rawChart =
    chart && typeof chart.toObject === "function" ? chart.toObject() : chart;

  if (!rawChart) return rawChart;

  const headers = normalizeHeaders(rawChart.headers, rawChart.table);
  const table = normalizeTableRows(rawChart.table, headers);

  return {
    ...rawChart,
    headers,
    table,
  };
};

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
  return { charts: charts.map((chart) => serializeChart(chart)) };
};

export const getSizeChartByIdService = async (id) => {
  const chart = await SizeChart.findById(id);
  if (!chart) return null;
  return serializeChart(chart);
};

export const createSizeChartService = async (chartData = {}) => {
  const name = (chartData.name || "").trim();
  if (!name) {
    return { success: false, message: "Size chart name is required" };
  }

  const existing = await SizeChart.findOne({ name });
  if (existing) {
    return {
      success: false,
      message: "A size chart with this name already exists",
    };
  }

  const normalized = normalizeChartPayload(chartData);
  const sizeChart = await SizeChart.create({
    name,
    headers: normalized.headers,
    table: normalized.table,
  });

  return { success: true, data: serializeChart(sizeChart) };
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
      return {
        success: false,
        message: "A size chart with this name already exists",
      };
    }
    sizeChart.name = nextName;
  }

  if (chartData.table !== undefined) {
    if (!Array.isArray(chartData.table)) {
      return { success: false, message: "Table must be an array" };
    }
  }

  if (chartData.headers !== undefined || chartData.table !== undefined) {
    const normalized = normalizeChartPayload({
      headers: chartData.headers ?? sizeChart.headers,
      table: chartData.table ?? sizeChart.table,
    });
    sizeChart.headers = normalized.headers;
    sizeChart.table = normalized.table;
  }

  await sizeChart.save();
  return { success: true, data: serializeChart(sizeChart) };
};

export const deleteSizeChartService = async (id) => {
  const sizeChart = await SizeChart.findById(id);
  if (!sizeChart) {
    return { success: false, statusCode: 404, message: "Size chart not found" };
  }

  await cleanupPreviousImage(sizeChart.howToMeasureImage);
  await sizeChart.deleteOne();

  await Category.updateMany({ sizeChart: id }, { $unset: { sizeChart: "" } });
  await Product.updateMany({ sizeChart: id }, { $unset: { sizeChart: "" } });

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
  return { success: true, data: serializeChart(sizeChart) };
};

export const addSizeRowService = async (id, sizeData) => {
  const sizeChart = await SizeChart.findById(id);
  if (!sizeChart) {
    return { success: false, statusCode: 404, message: "Size chart not found" };
  }

  const headers = normalizeHeaders(sizeChart.headers, sizeChart.table);
  const [nextRow] = normalizeTableRows([sizeData], headers);
  sizeChart.headers = headers;
  sizeChart.table.push(nextRow);
  await sizeChart.save();
  return { success: true, data: serializeChart(sizeChart) };
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

  const headers = normalizeHeaders(sizeChart.headers, sizeChart.table);
  const [nextRow] = normalizeTableRows([sizeData], headers);
  sizeChart.headers = headers;
  sizeChart.table[sizeIndex] = nextRow;
  await sizeChart.save();
  return { success: true, data: serializeChart(sizeChart) };
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
  return { success: true, data: serializeChart(sizeChart) };
};
