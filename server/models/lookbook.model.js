import mongoose from "mongoose";

const lookbookSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    leftSliderImages: [
      {
        url: { type: String, required: true },
        key: { type: String, required: true },
        alt: String,
      },
    ],
    rightSliderImages: [
      {
        url: { type: String, required: true },
        key: { type: String, required: true },
        alt: String,
      },
    ],
    centerContent: {
      label: { type: String, default: "Exclusive Deal · Few Days Left" },
      heading: { type: String, default: "Timeless Women's Collection" },
      description: { type: String, default: "" },
      buttonLink: { type: String, default: "#" },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const Lookbook = mongoose.model("Lookbook", lookbookSchema);

export default Lookbook;
