import {
  createSubscriberService,
  deleteSubscriberService,
  getAllSubscribersService,
  updateSubscriberStatusService,
} from "../services/newsletter.service.js";

export const createSubscriber = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }
    const { success, message } = await createSubscriberService({ email });
    if (!success) {
      return res.status(400).json({
        success,
        message,
      });
    }
    res.status(200).json({ success, message });
  } catch (error) {
    next(error);
  }
};

export const getAllSubscribers = async (req, res, next) => {
  try {
    const { success, message, subscribers } = await getAllSubscribersService();
    if (!success) {
      return res.status(404).json({
        message,
        success,
      });
    }

    res.status(200).json({
      success,
      subscribers,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubscriberStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: "Id and status are required",
      });
    }

    const { success, message } = await updateSubscriberStatusService({
      id,
      status,
    });

    if (!success) {
      return res.status(400).json({
        success,
        message,
      });
    }

    res.status(200).json({
      success,
      message,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubscriber = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required",
      });
    }

    const { success, message } = await deleteSubscriberService(id);

    if (!success) {
      return res.status(404).json({
        success,
        message,
      });
    }

    res.status(200).json({
      success,
      message,
    });
  } catch (error) {
    next(error);
  }
};
