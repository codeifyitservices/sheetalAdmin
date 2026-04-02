import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    image: {
      desktop: {
        url: { type: String },
        public_id: { type: String },
      },
      mobile: {
        url: { type: String },
        public_id: { type: String },
      },
    },
    link: { type: String, default: "/", trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    order: {
      type: Number,
      default: 0,
    },
    isActive: { type: Boolean, default: true },
    startsAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

bannerSchema.pre("save", function () {
  if (!this.image?.desktop?.url && !this.image?.mobile?.url) {
    throw new Error("At least one banner image is required");
  }
  this.isActive = this.status === "Active";
});

const Banner = mongoose.models.Banner || mongoose.model("Banner", bannerSchema);

export default Banner;
