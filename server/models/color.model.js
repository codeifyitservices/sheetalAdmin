import mongoose from "mongoose";

const colorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Color name is required"],
      unique: true,
      trim: true,
    },
    hex: {
      type: String,
      required: [true, "Hex code is required"],
      trim: true,
      validate: {
        validator: function (v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: (props) => `${props.value} is not a valid hex color!`,
      },
    },
    code: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Pre-save slug generation & code field synchronization
colorSchema.pre("save", function () {
  if (this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  if (this.hex) {
    this.code = this.hex;
  }
});

if (mongoose.models.Color) {
  delete mongoose.models.Color;
}

const Color = mongoose.model("Color", colorSchema);
export default Color;
