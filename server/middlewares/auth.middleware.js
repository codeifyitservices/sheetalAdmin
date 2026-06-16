import { verifyToken } from "../utils/jwt.js";
import User from "../models/user.model.js";

export const isAuthenticated = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Login required!" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (req.user.status === "Inactive") {
      return res.status(403).json({
        success: false,
        message:
          "This ID has been blocked by the admin due to some reasons, please contact the team for further procedures",
      });
    }

    next();
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Auth Error", error: error.message });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res
      .status(403)
      .json({ success: false, message: "Access denied. Admin only!" });
  }
};
