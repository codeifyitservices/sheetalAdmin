import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: { type: String, required: true },
    excerpt: { type: String, required: true, maxlength: 200 },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bannerImage: {
      url: { type: String, required: true },
      public_id: { type: String },
    },
    contentImage: {
      url: { type: String },
      public_id: { type: String },
    },
    imageAlt: { type: String, default: "blog-image" },
    tags: [{ type: String }],
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    metaTitle: {
      type: String,
      trim: true,
      maxlength: 70,
      default: function () {
        return this.title;
      },
    },
    metaDescription: { type: String, trim: true, maxlength: 160 },
    metaKeywords: { type: String, trim: true },
    ogImage: {
      url: { type: String },
      public_id: { type: String },
    },
    canonicalUrl: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    isPublished: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

blogSchema.index(
  { title: "text", content: "text", tags: "text" },
  { weights: { title: 10, tags: 5, content: 1 } },
);

const Blog = mongoose.models.Blog || mongoose.model("Blog", blogSchema);
export default Blog;
