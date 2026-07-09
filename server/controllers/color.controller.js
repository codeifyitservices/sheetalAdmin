import * as colorService from "../services/color.service.js";
import successResponse from "../utils/successResponse.js";

export const getAllColors = async (req, res, next) => {
  try {
    const result = await colorService.getAllColorsService();
    return successResponse(res, 200, result.data, "Colors retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const createColor = async (req, res, next) => {
  try {
    const result = await colorService.createColorService(req.body);
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 201, result.data, "Color created successfully");
  } catch (error) {
    next(error);
  }
};

export const updateColor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await colorService.updateColorService(id, req.body);
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 200, result.data, "Color updated successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteColor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await colorService.deleteColorService(id);
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    return successResponse(res, 200, null, result.message);
  } catch (error) {
    next(error);
  }
};
