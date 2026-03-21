import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [150, "Name cannot be more than 150 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
    },

    shortDescription: { type: String },
    description: { type: String, required: true },
    materialCare: {
      type: String,
      required: [true, "Material and Care instructions are required"],
    },
    gstPercent: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },

    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    stock: { type: Number, required: true, default: 0 },

    // Product categorization and filtering
    wearType: {
      type: [String],
      default: [],
      index: true,
    },
    occasion: {
      type: [String],
      default: [],
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    style: {
      type: [String],
      default: [],
      index: true,
    },
    work: {
      type: [String],
      default: [],
      index: true,
    },
    fabric: {
      type: [String],
      default: [],
      index: true,
    },
    productType: {
      type: [String],
      default: [],
      index: true,
    },
    byPrice: {
      type: [String],
      default: [],
      index: true,
    },

    displayCollections: { type: [String], default: [], index: true },
    eventTags: { type: [String], default: [], index: true },

    variants: [
      {
        v_sku: { type: String, uppercase: true, sparse: true },
        color: {
          name: { type: String },
          code: { type: String },
          swatchImage: { type: String },
        },
        sizes: [
          {
            name: { type: String },
            stock: { type: Number, default: 0 },
            price: { type: Number, required: true, min: 0 },
            discountPrice: { type: Number, default: 0 },
          },
        ],
        v_image: {
          url: { type: String },
          public_id: { type: String },
        },
        gallery: [
          {
            url: { type: String },
            public_id: { type: String },
            alt: { type: String, default: "variant gallery image" },
          },
        ],
      },
    ],

    brandInfo: { type: String, trim: true },
    warranty: { type: String, default: "No Warranty" },
    returnPolicy: { type: String, default: "7 Days Return Policy" },
    specifications: [{ key: { type: String }, value: { type: String } }],
    keyBenefits: { type: [String], default: [] },

    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    metaKeywords: { type: String },
    ogImage: { type: String },
    canonicalUrl: { type: String },

    isTrending: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isCollection: { type: Boolean, default: false },

    mainImage: {
      url: { type: String, required: true },
      public_id: { type: String },
      alt: { type: String, default: "product main image" },
    },
    hoverImage: {
      url: { type: String },
      public_id: { type: String },
      alt: { type: String, default: "product hover image" },
    },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String },
        alt: { type: String, default: "product gallery image" },
        isDefault: { type: Boolean, default: false },
      },
    ],
    video: {
      url: { type: String },
      public_id: { type: String },
      mimeType: { type: String, default: "video/mp4" },
      size: { type: Number },
    },

    orderStats: {
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
    },

    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategory: {
      type: String,
      default: null,
      index: true,
    },
    viewCount: { type: Number, default: 0, index: true },
    sizeChart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SizeChart",
      default: null,
    },
  },
  { timestamps: true },
);

productSchema.index({
  name: "text",
  sku: "text",
  eventTags: "text",
  wearType: "text",
  occasion: "text",
  tags: "text",
  style: "text",
  work: "text",
  fabric: "text",
  productType: "text",
  byPrice: "text",
  metaKeywords: "text",
  materialCare: "text",
});

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;
