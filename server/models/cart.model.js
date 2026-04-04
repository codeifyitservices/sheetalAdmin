import mongoose from "mongoose";

const reminderAttemptSchema = new mongoose.Schema(
  {
    cycleId: { type: String, default: null },
    stage: { type: String, required: true },
    jobId: { type: String, required: true },
    status: {
      type: String,
      enum: ["success", "failure", "skipped"],
      required: true,
    },
    channels: { type: [String], default: [] },
    attemptedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    error: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
        size: { type: String },
        color: { type: String },
        variantImage: { type: String },
        price: { type: Number, required: true, default: 0 },
        discountPrice: { type: Number, required: true, default: 0 },
      },
    ],
    email: { type: String, trim: true, lowercase: true, default: null },
    phoneNumber: { type: String, trim: true, default: null },
    cartTrackingId: { type: String, trim: true, default: null },
    lastActivityAt: { type: Date, default: Date.now },
    abandonmentStatus: {
      type: String,
      enum: ["active", "abandoned", "completed"],
      default: "active",
      index: true,
    },
    abandonedAt: { type: Date, default: null },
    checkoutExitedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    abandonmentReason: {
      type: String,
      enum: ["inactivity", "checkout_exit", "order_completed"],
      default: null,
    },
    abandonmentCycleId: { type: String, default: null, index: true },
    abandonmentReminderJobIds: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    abandonmentReminderAttempts: {
      type: [reminderAttemptSchema],
      default: [],
    },
  },
  { timestamps: true },
);

cartSchema.index(
  { cartTrackingId: 1 },
  {
    unique: true,
    partialFilterExpression: { cartTrackingId: { $type: "string" } },
  },
);

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

export default Cart;
