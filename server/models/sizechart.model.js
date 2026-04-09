import mongoose from "mongoose";

const sizeChartSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Untitled Size Chart",
      trim: true,
    },
    table: [
      {
        label: { type: String, required: true },
        bust: { type: String },
        waist: { type: String },
        hip: { type: String },
        shoulder: { type: String },
        length: { type: String },
      },
    ],
    howToMeasureImage: {
      url: { type: String, default: "" },
      public_id: { type: String },
    },
  },
  { timestamps: true },
);

const SizeChart =
  mongoose.models.SizeChart || mongoose.model("SizeChart", sizeChartSchema);
export default SizeChart;
