import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    addressLine: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const basicInfoSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: "singleton",
    },
    gstNumber: {
      type: String,
      trim: true,
      default: "",
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
    },
    invoiceDeclaration: {
      type: String,
      trim: true,
      default: "",
    },
    invoiceContactText: {
      type: String,
      trim: true,
      default: "",
    },
    invoiceFooterYear: {
      type: String,
      trim: true,
      default: "",
    },
    shippingAddress: {
      type: addressSchema,
      default: () => ({}),
    },
    billingAddress: {
      type: addressSchema,
      default: () => ({}),
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const BasicInfo =
  mongoose.models.BasicInfo || mongoose.model("BasicInfo", basicInfoSchema);

export default BasicInfo;
