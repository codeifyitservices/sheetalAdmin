import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^\d{10}$/, "Phone number must be a 10-digit number"],
  },
  addressLine1: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: {
    type: String,
    required: true,
    match: [/^\d{6}$/, "Postal code must be a 6-digit number"],
  },
  country: { type: String, default: "India" },
  isDefault: { type: Boolean, default: false },
  addressType: {
    type: String,
    enum: ["Home", "Office", "Other"],
    default: "Home",
  },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      select: false,
      minlength: [8, "Password must be at least 8 characters"],
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, "Phone number must be a 10-digit number"],
    },
    alternativeMobileNumber: {
      type: String,
      trim: true,
      match: [
        /^\d{10}$/,
        "Alternative mobile number must be a 10-digit number",
      ],
    }, // New field
    gender: { type: String, enum: ["Male", "Female"], trim: true }, // New field
    dateOfBirth: { type: Date }, // New field
    profilePicture: { type: String, default: "" }, // New field
    profilePictureKey: { type: String, default: "" }, // For S3 file deletion
    role: { type: String, enum: ["user", "admin", "guest"], default: "user" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    isGuest: { type: Boolean, default: false },
    addresses: [addressSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    cart: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, default: 1 },
      },
    ],
    // All orders placed by this customer (references to Order documents)
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    isVerified: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true },
);

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } },
);
userSchema.index(
  { phoneNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { phoneNumber: { $type: "string" } },
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
