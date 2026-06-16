import {
  sendOtp as sendOtpService,
  verifyFirebaseIdToken as verifyFirebaseIdTokenService,
  sendEmailOtp as sendEmailOtpService,
  verifyEmailOtp as verifyEmailOtpService,
} from "../services/client.auth.service.js";
import { verifyToken } from "../utils/jwt.js";

const sendOtp = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const result = await sendOtpService(phoneNumber);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const sendEmailOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await sendEmailOtpService(email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = verifyToken(token);
        currentUserId = decoded.id;
      } catch (e) {
        console.error("Invalid token in email verification:", e.message);
      }
    }
    const result = await verifyEmailOtpService(email, otp, currentUserId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const verifyFirebaseIdTokenController = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization?.split(" ")[1];
    if (!idToken) {
      return res
        .status(401)
        .json({ success: false, message: "Authorization token not found." });
    }

    const sessionToken = req.headers["x-session-token"];
    let currentUserId = null;
    if (sessionToken) {
      try {
        const decoded = verifyToken(sessionToken);
        currentUserId = decoded.id;
      } catch (e) {
        console.error("Invalid session token in verification:", e.message);
      }
    }

    const result = await verifyFirebaseIdTokenService(idToken, currentUserId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (
      typeof error?.message === "string" &&
      (error.message.includes("Firebase ID token") ||
        error.message.includes("verifyIdToken"))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase token. Please sign in again with Google.",
      });
    }
    next(error);
  }
};

export {
  sendOtp,
  verifyFirebaseIdTokenController,
  sendEmailOtp,
  verifyEmailOtp,
};
