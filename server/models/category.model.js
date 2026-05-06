import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    order: {
      type: Number,
      index: true,
    },
    description: { type: String },
    mainImage: {
      url: { type: String, default: "" },
      public_id: { type: String },
    },
    bannerImage: {
      url: { type: String, default: "" },
      public_id: { type: String },
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    metaKeywords: { type: String },
    ogImage: { type: String },
    canonicalUrl: { type: String },

    categoryBanner: { type: String },
    gstPercent: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    subCategories: { type: [String], default: [] },
    style: { type: [String], default: [] },
    work: { type: [String], default: [] },
    fabric: { type: [String], default: [] },
    productType: { type: [String], default: [] },
    wearType: { type: [String], default: [], index: true },
    occasion: { type: [String], default: [], index: true },
    byPrice: { type: [String], default: [], index: true },
    sizeMode: {
      type: String,
      enum: ["none", "chart", "free"],
      default: "none",
    },
    sizeChart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SizeChart",
      default: null,
    },
  },
  { timestamps: true },
);

categorySchema.pre("save", async function () {
  if (this.isNew && (this.order === null || this.order === undefined)) {
    const highestOrderCategory = await this.constructor
      .findOne()
      .sort("-order");
    this.order =
      highestOrderCategory && highestOrderCategory.order
        ? highestOrderCategory.order + 1
        : 1;
  }
});

const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);
export default Category;
