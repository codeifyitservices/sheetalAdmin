import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    product:    { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null, index: true },
    productName: { type: String, required: true, trim: true },
    size:        { type: String, required: true, trim: true },
    name:        { type: String, required: true, trim: true },
    email:       { type: String, required: true, trim: true, lowercase: true },
    phone:       { type: String, required: true, trim: true },
    message:     { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
    },
  },
  { timestamps: true },
);

const Enquiry = mongoose.model("Enquiry", enquirySchema);
export default Enquiry;
