import mongoose from "mongoose";

const productViewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

productViewSchema.index({ product: 1, viewedAt: -1 });

const ProductView =
  mongoose.models.ProductView || mongoose.model("ProductView", productViewSchema);

export default ProductView;
