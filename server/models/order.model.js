import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        variant: {
          size: String,
          color: String,
          v_sku: String,
        },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      addressLine1: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: "India" },
    },
    billingAddress: {
      fullName: { type: String },
      phoneNumber: { type: String },
      addressLine1: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String, default: "India" },
    },
    paymentInfo: {
      id: { type: String },
      status: { type: String, default: "Pending" },
      method: { type: String, enum: ["COD", "Online"], required: true },
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    couponCode: { type: String, default: "" },
    discountPrice: { type: Number, default: 0 },
    couponUsageConfirmed: { type: Boolean, default: false },
    itemsPrice: { type: Number, default: 0 },
    taxPrice: { type: Number, default: 0 },
    shippingPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    purchaseSource: {
      type: String,
      enum: ["cart", "buyNow"],
      default: "cart",
    },
    orderStatus: {
      type: String,
      required: true,
      enum: [
        "Processing",
        "Shipped",
        "Delivered",
        "Returned",
        "Exchanged",
        "Cancelled",
      ],
      default: "Processing",
    },
    trackingId: { type: String },
    courierPartner: { type: String },
    // Shiprocket Integration Fields
    shiprocketOrderId: { type: Number, default: null },  // Shiprocket's own order ID
    shipmentId: { type: Number, default: null },          // Needed for AWB / label / pickup
    awbCode: { type: String, default: null },             // AWB tracking number
    shiprocketStatus: { type: String, default: null },    // Last synced status from Shiprocket
    deliveredAt: Date,
    paidAt: Date,
  },
  { timestamps: true },
);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;
