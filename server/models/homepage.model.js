import mongoose from "mongoose";

const homepageSchema = new mongoose.Schema(
  {
    sections: {
      topInfo: { type: Boolean, default: true },
      homeBanner: { type: Boolean, default: true },
      aboutSBS: { type: Boolean, default: true },
      hiddenBeauty: { type: Boolean, default: true },
      trendingThisWeek: { type: Boolean, default: true },
      newArrivals: { type: Boolean, default: true },
      collections: { type: Boolean, default: true },
      timelessWomenCollection: { type: Boolean, default: true },
      instagramDiaries: { type: Boolean, default: true },
      testimonials: { type: Boolean, default: true },
      blogs: { type: Boolean, default: true },
      bookAppointmentWidget: { type: Boolean, default: true },
    },
    topInfoConfig: {
      mode: {
        type: String,
        enum: ["coupon", "custom", "hidden"],
        default: "coupon",
      },
      customText: {
        type: String,
        default: "",
        trim: true,
      },
      customCtaLabel: {
        type: String,
        default: "Shop Now",
        trim: true,
      },
      customCtaHref: {
        type: String,
        default: "/product-list",
        trim: true,
      },
    },
  },
  { timestamps: true },
);

const Homepage = mongoose.model("Homepage", homepageSchema);
export default Homepage;
