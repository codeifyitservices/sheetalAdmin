import mongoose from "mongoose";

const instaCardSchema = new mongoose.Schema(
  {
    url: { type: String, required: true }, // S3 URL
    key: { type: String, required: true }, // S3 key for deletion
    alt: { type: String, default: "" },
    link: { type: String, required: true }, // Instagram post link
    order: { type: Number, default: 0 }, // for drag-to-reorder later
  },
  { timestamps: true },
);

const InstaCard = mongoose.model("InstaCard", instaCardSchema);

export default InstaCard;
