import mongoose from "mongoose";

/**
 * AbandonedCartCoupon
 *
 * One record per abandoned-cart cycle that reaches the "third" reminder stage.
 * Ties a static coupon code to a specific user + cart + cycle so that even
 * though the code string (e.g. "SAVE10") is shared, validation is always
 * scoped to this user's current abandoned cycle.
 *
 * Discount rules:
 *   currentDiscount = discountPercent% of the current cart total
 *   recalculated on every cart mutation while status=applied
 */

const abandonedCartCouponSchema = new mongoose.Schema(
  {
    // Identity
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true,
    },

    // The abandonment cycle this coupon was issued for.
    // If the user abandons again a new cycle (and new record) is created.
    cycleId: {
      type: String,
      required: true,
      index: true,
    },

    // Discount parameters
    discountPercent: {
      type: Number,
      required: true,
    },

    // Cart total (sum of all items) at the moment the coupon was issued.
    // Kept for audit/debugging and to help compare the cart evolution later.
    snapshotTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    // Live discount amount. Always follows discountPercent% of the current
    // cart total while the coupon is active.
    currentDiscount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Lifecycle
    status: {
      type: String,
      enum: ["issued", "applied", "redeemed", "expired", "cancelled"],
      default: "issued",
      index: true,
    },

    issuedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    appliedAt: {
      type: Date,
      default: null,
    },

    redeemedAt: {
      type: Date,
      default: null,
    },

    // Order that consumed this coupon (set on redemption).
    redeemedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    // Recovery token (for email link)
    recoveryToken: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    recoveryTokenExpiresAt: {
      type: Date,
      default: null,
    },

    recoveryTokenUsed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Compound indexes

// Fast lookup when a user manually enters the coupon code at checkout.
abandonedCartCouponSchema.index({ code: 1, userId: 1, status: 1 });

// Prevent duplicate issuance for the same cycle.
abandonedCartCouponSchema.index({ cartId: 1, cycleId: 1 }, { unique: true });

// Instance helpers

/**
 * Returns true if the coupon is still within its validity window
 * and has not been redeemed, expired, or cancelled.
 */
abandonedCartCouponSchema.methods.isUsable = function () {
  if (!["issued", "applied"].includes(this.status)) return false;
  return new Date() < this.expiresAt;
};

/**
 * Computes what the live discount should be given the current cart total.
 * Does NOT mutate the document - caller must save.
 *
 * @param {number} currentCartTotal Sum of (effectivePrice x qty) for all
 *                                  items currently in the cart.
 * @returns {number} New currentDiscount value.
 */
abandonedCartCouponSchema.methods.computeDiscount = function (
  currentCartTotal,
) {
  const recalculated = (this.discountPercent / 100) * currentCartTotal;
  return parseFloat(Math.max(0, recalculated).toFixed(2));
};

const AbandonedCartCoupon =
  mongoose.models.AbandonedCartCoupon ||
  mongoose.model("AbandonedCartCoupon", abandonedCartCouponSchema);

export default AbandonedCartCoupon;
