import dotenv from "dotenv";
dotenv.config();

const { PORT, MONGO_URI, JWT_SECRET, JWT_EXPIRE, NODE_ENV } = process.env;

if (!MONGO_URI || !JWT_SECRET) {
  throw new Error("ERROR: MONGO_URI and JWT_SECRET are missing in .env!");
}

export const config = Object.freeze({
  port: PORT || 5000,
  mongoUri: MONGO_URI,
  mode: process.env.NODE_ENV,
  jwtSecret: JWT_SECRET,
  jwtExpire: JWT_EXPIRE || "7d",
  nodeEnv: NODE_ENV || "development",
  adminName: process.env.ADMIN_NAME || "Admin",
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD,
  frontendDomain: process.env.FRONTEND_URL || "http://localhost:3000",
  baseUrl: process.env.BACKEND_URL || "http://localhost:8000",
  abandonedCart: {
    inactivityMinutes: Math.min(
      30,
      Math.max(15, parseInt(process.env.ABANDONED_CART_INACTIVITY_MINUTES || "20", 10) || 20),
    ),
    scanIntervalSeconds: Math.max(
      15,
      parseInt(process.env.ABANDONED_CART_SCAN_INTERVAL_SECONDS || "60", 10) || 60,
    ),
    retryDelayMinutes: Math.max(
      5,
      parseInt(process.env.ABANDONED_CART_RETRY_DELAY_MINUTES || "15", 10) || 15,
    ),
    maxAttempts: Math.max(
      1,
      parseInt(process.env.ABANDONED_CART_MAX_ATTEMPTS || "3", 10) || 3,
    ),
    discountPercent: Math.max(
      1,
      Math.min(
        parseInt(process.env.ABANDONED_CART_DISCOUNT_PERCENT || "10", 10) || 10,
        100,
      ),
    ),
    couponCode: process.env.ABANDONED_CART_COUPON_CODE || "SAVE10",
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.AWS_BUCKET_NAME,
  },
});
