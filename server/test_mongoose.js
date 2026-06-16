import mongoose from "mongoose";

const sizeChartSchema = new mongoose.Schema({
  name: { type: String },
  headers: { type: [String] },
  table: [{ type: mongoose.Schema.Types.Mixed }],
});

const SizeChart = mongoose.model("SizeChart", sizeChartSchema);

async function run() {
  try {
    const doc = new SizeChart({
      name: "Test",
      headers: ["1", "2"],
      table: [{ cells: ["A", "B"] }],
    });

    await doc.validate();
    console.log("Validation passed", doc.toObject());
  } catch (error) {
    console.error("Validation error:", error);
  }
}

run();
