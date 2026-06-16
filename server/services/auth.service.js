import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/user.model.js";
import { signToken } from "../utils/jwt.js";

// register service
export const registerService = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser)
    return {
      success: false,
      statusCode: 400,
      message: "Email already registered",
    };

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({ name, email, password: hashedPassword });
  const token = signToken({ id: user._id, role: user.role });

  return {
    success: true,
    statusCode: 201,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
};

// login service
export const loginService = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) return { success: false, message: "Invalid email or password" };

  if (user.status === "Inactive") {
    return {
      success: false,
      message:
        "This ID has been blocked by the admin due to some reasons, please contact the team for further procedures",
    };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return { success: false, message: "Invalid email or password" };

  const token = signToken({ id: user._id, role: user.role });

  return {
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

// forgot password service
export const forgotPasswordService = async (email) => {
  const user = await User.findOne({ email });
  if (!user)
    return {
      success: false,
      statusCode: 404,
      message: "User with this email does not exist",
    };

  const resetToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  return {
    success: true,
    statusCode: 200,
    resetToken,
    message: "Password reset token generated",
  };
};

// reset password service
export const resetPasswordService = async (token, password) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user)
    return {
      success: false,
      statusCode: 400,
      message: "Invalid or expired reset token",
    };

  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(password, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  return {
    success: true,
    statusCode: 200,
    message: "Password updated successfully",
  };
};
