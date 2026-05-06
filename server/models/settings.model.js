import mongoose from "mongoose";

const navbarItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    href: { type: String },
    hidden: { type: Boolean, default: false },
    itemType: {
      type: String,
      enum: ["link", "category", "static", "custom"],
      default: "link",
    },
    categoryId: { type: String },
    categorySlug: { type: String },
    type: {
      type: String,
      enum: ["link", "category", "custom"],
      default: "link",
    },
    isDroppable: { type: Boolean, default: false },
    children: [mongoose.Schema.Types.Mixed],
  },
  { _id: false },
);

const footerLinkSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    href: { type: String, required: true },
    hidden: { type: Boolean, default: false },
  },
  { _id: false },
);

const footerSubColumnSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    hidden: { type: Boolean, default: false },
    links: { type: [footerLinkSchema], default: [] },
  },
  { _id: false },
);

const settingsSchema = new mongoose.Schema(
  {
    platformFee: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    freeShippingThreshold: { type: Number, default: 0 },
    taxPercentage: { type: Number, default: 0 },
    abandonedCartInactivityMinutes: { type: Number, default: 20 },
    abandonedCartDiscountPercent: { type: Number, default: 10 },
    abandonedCartCouponCode: { type: String, default: "SAVE10" },
    prepaidShippingCharge: { type: String, default: "Free Shipping" },
    codShippingCharge: { type: String, default: "Free Shipping" },
    returnPolicyContent: {
      type: String,
      default:
        "Your satisfaction is our top priority. If you're not completely satisfied with the product, we offer a hassle-free, no questions asked 7 days return and refund.",
    },
    supportEmail: { type: String, default: "info@studiobysheetal.com" },
    supportWhatsapp: { type: String, default: "919958813913" },
    navbarLayout: { type: [navbarItemSchema], default: [] },
    footerLayout: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

const Settings =
  mongoose.models.Settings || mongoose.model("Settings", settingsSchema);
export default Settings;
