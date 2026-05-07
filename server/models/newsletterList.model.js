import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["New", "Added"],
      default: "New",
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.model("Newsletter", newsletterSchema);
