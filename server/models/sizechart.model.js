import mongoose from "mongoose";

const sizeChartSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Untitled Size Chart",
      trim: true,
    },
    headers: {
      type: [String],
      default: ["Size", "Bust", "Waist"],
    },
    table: [{ type: mongoose.Schema.Types.Mixed }],
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
