import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      sparse: true,
    },
    description: { type: String, required: true },
    offerType: {
      type: String,
      enum: ["Percentage", "FixedAmount", "BOGO", "FreeShipping"],
      required: true,
    },
    offerValue: { type: Number, required: true },
    isAutomatic: { type: Boolean, default: false },
    couponType: {
      type: String,
      enum: ["CouponCode", "FestiveSale", "FlashSale"],
      default: "CouponCode",
    },
    buyQuantity: { type: Number, default: 0 },
    getQuantity: { type: Number, default: 0 },
    scope: {
      type: String,
      enum: ["All", "Category", "Specific_Product"],
      default: "All",
    },
    modelRef: {
      type: String,
      required: true,
      enum: ["Category", "Product", "None"],
      default: "None",
    },
    applicableIds: [
      { type: mongoose.Schema.Types.ObjectId, refPath: "modelRef" },
    ],
    usageLimitPerUser: { type: Number, default: 1 },
    totalUsageLimit: { type: Number, required: true },
    usedCount: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usedBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        count: { type: Number, default: 0 },
        lastUsed: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
    showOnHomepage: { type: Boolean, default: false },
    showOnLoginPage: { type: Boolean, default: false },
    isAbandonedCartCoupon: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

couponSchema.methods.canUserUse = function (userId) {
  if (!userId) return false;
  const userRecord = this.usedBy.find(
    (u) => u.userId.toString() === userId.toString(),
  );
  return !userRecord || userRecord.count < this.usageLimitPerUser;
};

couponSchema.methods.isValid = function (userId, orderAmount, cartItems = []) {
  const now = new Date();

  if (!this.isActive) return { valid: false, message: "Coupon inactive" };
  if (now < this.startDate || now > this.endDate)
    return { valid: false, message: "Offer expired" };
  if (this.usedCount >= this.totalUsageLimit)
    return { valid: false, message: "Usage limit reached" };

  if (this.scope === "Category") {
    const categoryItems = cartItems.filter(
      (item) =>
        item.product.category &&
        this.applicableIds.some(
          (id) => id.toString() === item.product.category._id.toString(),
        ),
    );
    if (categoryItems.length === 0) {
      return {
        valid: false,
        message: "Coupon not valid for items in your cart",
      };
    }
    const categoryTotal = categoryItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    if (categoryTotal < this.minOrderAmount) {
      return {
        valid: false,
        message: `Minimum cart value of ₹${this.minOrderAmount} required for the applicable category items.`,
      };
    }
  } else if (this.scope === "Specific_Product") {
    const productItems = cartItems.filter(
      (item) =>
        item.product &&
        this.applicableIds.some(
          (id) => id.toString() === item.product._id.toString(),
        ),
    );
    if (productItems.length === 0) {
      return {
        valid: false,
        message: "Coupon not valid for items in your cart",
      };
    }
    const productTotal = productItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (productTotal < this.minOrderAmount) {
      return {
        valid: false,
        message: `Minimum cart value of ₹${this.minOrderAmount} required for the applicable products.`,
      };
    }
  } else {
    if (orderAmount < this.minOrderAmount) {
      return {
        valid: false,
        message: `Minimum cart value of ₹${this.minOrderAmount} required.`,
      };
    }
  }

  if (userId) {
    const userUsage = this.usedBy.find(
      (u) => u.userId.toString() === userId.toString(),
    );
    if (userUsage && userUsage.count >= this.usageLimitPerUser) {
      return {
        valid: false,
        message: "User limit for this coupon has been exceeded",
      };
    }
  }

  return { valid: true, message: "Valid" };
};

if (!mongoose.models.None) {
  mongoose.model("None", new mongoose.Schema({}));
}

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
export default Coupon;
