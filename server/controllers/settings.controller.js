import * as settingsService from "../services/settings.service.js";
import successResponse from "../utils/successResponse.js";

export const getSettings = async (req, res, next) => {
  try {
    const result = await settingsService.getSettings();
    if (!result.success) return res.status(500).json(result);
    return successResponse(res, 200, result.data, "Settings retrieved");
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const result = await settingsService.updateSettings(req.body);
    if (!result.success) return res.status(500).json(result);
    return successResponse(res, 200, result.data, "Settings updated");
  } catch (error) {
    next(error);
  }
};
