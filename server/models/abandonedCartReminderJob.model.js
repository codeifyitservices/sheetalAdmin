import mongoose from "mongoose";

const abandonedCartReminderJobSchema = new mongoose.Schema(
  {
    cycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AbandonedCartCycle",
      required: true,
      index: true,
    },
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reminderType: {
      type: String,
      enum: ["first", "second", "third", "final"],
      required: true,
    },
    runAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["queued", "processing", "sent", "failed", "cancelled", "skipped"],
      default: "queued",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: String, default: null },
    lastError: { type: String, default: null },
    retryAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    attemptLogs: [
      {
        attemptedAt: { type: Date, default: Date.now },
        outcome: {
          type: String,
          enum: ["success", "failure", "skipped"],
          required: true,
        },
        message: { type: String, default: null },
        channels: [{ type: String }],
      },
    ],
    sentChannels: [
      {
        channel: {
          type: String,
          enum: ["email", "whatsapp", "sms"],
          required: true,
        },
        status: {
          type: String,
          enum: ["sent", "failed", "skipped"],
          required: true,
        },
        attemptedAt: { type: Date, default: Date.now },
        error: { type: String, default: null },
      },
    ],
    lockedReason: { type: String, default: null },
    lastRecoveredAt: { type: Date, default: null },
  },
  { timestamps: true },
);

abandonedCartReminderJobSchema.index(
  { cycle: 1, reminderType: 1 },
  { unique: true },
);

abandonedCartReminderJobSchema.index({ status: 1, runAt: 1 });

const AbandonedCartReminderJob =
  mongoose.models.AbandonedCartReminderJob ||
  mongoose.model("AbandonedCartReminderJob", abandonedCartReminderJobSchema);

export default AbandonedCartReminderJob;
