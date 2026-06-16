import { verifyToken } from "../utils/jwt.js";
import User from "../models/user.model.js";

/**
 * Optional authentication middleware.
 * Sets req.user if a valid token is present, otherwise continues as guest.
 */
export const optionalAuth = async (req, res, next) => {
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

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = await User.findById(decoded.id).select("-password");
      }
    }

    next();
  } catch {
    // Ignore auth errors for optional auth — treat as guest
    next();
  }
};
