import mongoose from "mongoose";

const sharedCartSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    items: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

sharedCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SharedCart =
  mongoose.models.SharedCart || mongoose.model("SharedCart", sharedCartSchema);

export default SharedCart;
