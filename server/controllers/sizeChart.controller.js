import * as sizeChartService from "../services/sizeChart.service.js";
import successResponse from "../utils/successResponse.js";
import { deleteFile, deleteS3File } from "../utils/fileHelper.js";

export const uploadHowToMeasureImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file uploaded." });
    }
    const result = await sizeChartService.uploadHowToMeasureImageService(
      req.params.id,
      req.file,
    );
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 200, result.data, "How to measure image uploaded successfully");
  } catch (error) {
    // If an error occurs during processing, clean up the uploaded file
    if (req.file) {
      if (req.file.key) {
        // S3 file
        await deleteS3File(req.file.key);
      } else {
        // Local file
        deleteFile(req.file.path);
      }
    }
    next(error);
  }
};

export const getSizeChart = async (req, res, next) => {
  try {
    if (req.params.id) {
      const sizeChart = await sizeChartService.getSizeChartByIdService(
        req.params.id,
      );
      if (!sizeChart) {
        return res.status(404).json({
          success: false,
          message: "Size chart not found",
        });
      }
      return successResponse(res, 200, sizeChart, "Size chart fetched");
    }

    const sizeCharts = await sizeChartService.getSizeChartsService();
    return successResponse(res, 200, sizeCharts, "Size charts fetched");
  } catch (error) {
    next(error);
  }
};

export const addSize = async (req, res, next) => {
  try {
    const result = await sizeChartService.createSizeChartService(req.body);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 201, result.data, "Size chart created");
  } catch (error) {
    next(error);
  }
};

export const updateSize = async (req, res, next) => {
  try {
    const result = await sizeChartService.updateSizeChartService(
      req.params.id,
      req.body,
    );
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 200, result.data, "Size chart updated");
  } catch (error) {
    next(error);
  }
};

export const deleteSize = async (req, res, next) => {
  try {
    const result = await sizeChartService.deleteSizeChartService(req.params.id);
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 200, null, "Size chart deleted");
  } catch (error) {
    next(error);
  }
};

export const addSizeRow = async (req, res, next) => {
  try {
    const result = await sizeChartService.addSizeRowService(
      req.params.id,
      req.body,
    );
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 201, result.data, "Size row added");
  } catch (error) {
    next(error);
  }
};

export const updateSizeRow = async (req, res, next) => {
  try {
    const result = await sizeChartService.updateSizeRowService(
      req.params.id,
      req.params.rowId,
      req.body,
    );
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 200, result.data, "Size row updated");
  } catch (error) {
    next(error);
  }
};

export const deleteSizeRow = async (req, res, next) => {
  try {
    const result = await sizeChartService.deleteSizeRowService(
      req.params.id,
      req.params.rowId,
    );
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 200, result.data, "Size row deleted");
  } catch (error) {
    next(error);
  }
};
