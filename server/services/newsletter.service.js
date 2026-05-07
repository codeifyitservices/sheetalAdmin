import { isValidObjectId } from "mongoose";
import Newsletter from "../models/newsletterList.model.js";

export const getAllSubscribersService = async () => {
  const subscribers = await Newsletter.find({}).sort({ createdAt: -1 });
  return {
    success: true,
    subscribers,
  };
};

export const createSubscriberService = async ({ email }) => {
  const existingSub = await Newsletter.findOne({ email });
  if (existingSub) {
    return {
      success: false,
      message: "Email already registered",
    };
  }

  const subscriber = await Newsletter.create({
    email,
  });

  return {
    success: true,
    message: "You have subscribed to the newsletter",
  };
};

export const updateSubscriberStatusService = async ({ id, status }) => {
  if (!isValidObjectId(id)) {
    return {
      success: false,
      message: "Invalid ID",
    };
  }

  const allowedStatus = ["New", "Added"];
  if (!allowedStatus.includes(status)) {
    return {
      success: false,
      message: `Status must include : ${allowedStatus.join(", ")}`,
    };
  }

  const subscriber = await Newsletter.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true },
  );

  if (!subscriber) {
    return {
      success: false,
      message: "Subscriber not found",
    };
  }

  return {
    success: true,
    message: "Status updated",
  };
};

export const deleteSubscriberService = async (id) => {
  if (!isValidObjectId(id)) {
    return {
      success: false,
      message: "Invalid id",
    };
  }
  const subscriber = await Newsletter.findByIdAndDelete(id);
  if (!subscriber) {
    return {
      success: true,
      message: "Subscriber not found",
    };
  }
  return {
    success: true,
    message: "Subscriber deleted",
  };
};
