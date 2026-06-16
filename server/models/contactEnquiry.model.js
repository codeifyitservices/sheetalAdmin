import mongoose from "mongoose";

const contactEnquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{10}$/, "Phone must be a 10-digit number"],
    },
    query: { type: String, required: true, trim: true },
    reply: { type: String, trim: true },
    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
    },
  },
  { timestamps: true },
);

const ContactEnquiry = mongoose.model("ContactEnquiry", contactEnquirySchema);
export default ContactEnquiry;
