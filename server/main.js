import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import logger from "./utils/logger.js";
import { config } from "./config/config.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import bannerRoutes from "./routes/banner.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import orderRoutes from "./routes/order.routes.js";
import returnRoutes from "./routes/return.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import clientAuthRoutes from "./routes/client.auth.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import sizeChartRoutes from "./routes/sizeChart.routes.js";
import searchRoutes from "./routes/search.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import basicInfoRoutes from "./routes/basicInfo.routes.js";
import lookbookRoutes from "./routes/lookbook.routes.js";
import pagesRoutes from "./routes/pages.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import abandonedCartRoutes from "./routes/abandonedCart.routes.js";
import sharedCartRoutes from "./routes/sharedCart.routes.js";
import salesRouter from './routes/sales.routes.js'
import instaRouter from './routes/instagram.routes.js'
import testimonialRouter from './routes/testimonial.routes.js'
import appointmentRouter from './routes/appointment.routes.js'
import homepageRouter from './routes/homepage.routes.js'
import enquiryRouter from './routes/enquiry.routes.js'
import contactEnquiryRouter from './routes/contactEnquiry.routes.js'
import newsletterRouter from "./routes/newsletter.routes.js"

import errorHandler from "./middlewares/error.middleware.js";
import sanitizeBody from "./middlewares/sanitize.middleware.js";
const app = express();
app.set("trust proxy", 1);

const normalizeOrigin = (value = "") => String(value).trim().replace(/\/$/, "");
const configuredOrigins = [
  process.env.ALLOWED_ORIGINS,
  config.frontendDomain,
]
  .filter(Boolean)
  .flatMap((value) => value.split(","))
  .map(normalizeOrigin)
  .filter(Boolean);

const localOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:4000",
  "http://192.168.0.227:3000",
  "http://192.168.1.10:3000",
  "http://192.168.0.141:3000",
  "http://192.168.0.227:4000",
  "https://sheetal-admin.vercel.app"
].map(normalizeOrigin);

const allowedOrigins = new Set([...localOrigins, ...configuredOrigins]);

const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(sanitizeBody);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: "Auth limit reached. Try after an hour.",
  },
});

app.use("/api/v1/auth", authLimiter);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:4000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://192.168.0.227:3000",
        "http://192.168.1.10:3000",
        "http://192.168.0.141:3000",
        "http://192.168.0.227:4000",
        "https://sheetal-admin.vercel.app",
        "https://www.sheetal-admin.vercel.app",
        "https://sheetal-omega.vercel.app",
        "https://www.sheetal-omega.vercel.app",
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-Session-Token",
    ],
  }),
);

const logStream = fs.createWriteStream(
  path.join(process.cwd(), "logs/access.log"),
  { flags: "a" },
);

if (config.mode === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined", { stream: logStream }));
}

app.use(cookieParser());

// Capture raw body for webhook signature verification (MUST be before JSON parser)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/v1/webhooks")) {
    let data = [];
    req.on("data", (chunk) => data.push(chunk));
    req.on("end", () => {
      req.rawBody = Buffer.concat(data);
      next();
    });
  } else {
    next();
  }
});

// Custom middleware to conditionally parse JSON and URL-encoded data
const parseJsonAndUrlEncoded = (req, res, next) => {
  if (
    req.headers["content-type"] &&
    req.headers["content-type"].includes("multipart/form-data")
  ) {
    return next();
  }
  express.json()(req, res, (err) => {
    if (err) return next(err);
    express.urlencoded({ extended: true })(req, res, next);
  });
};

app.use(parseJsonAndUrlEncoded);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// --- Webhook routes (registered AFTER raw body capture, BEFORE other routes) ---
app.use("/api/v1/webhooks", webhookRoutes);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/banner", bannerRoutes);
app.use("/api/v1/blogs", blogRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/returns", returnRoutes);
app.use("/api/v1/client/auth", clientAuthRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/size-chart", sizeChartRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/basic-info", basicInfoRoutes);
app.use("/api/v1/lookbooks", lookbookRoutes);
app.use("/api/v1/pages", pagesRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/abandoned-cart", abandonedCartRoutes);
app.use("/api/v1/shared-cart", sharedCartRoutes);
app.use('/api/v1/sales', salesRouter)
app.use('/api/v1/instacards', instaRouter)
app.use('/api/v1/testimonials', testimonialRouter)
app.use('/api/v1/appointments', appointmentRouter)
app.use('/api/v1/homepage', homepageRouter)
app.use('/api/v1/enquiry', enquiryRouter)
app.use('/api/v1/contact-enquiries', contactEnquiryRouter)
app.use('/api/v1/newsletter', newsletterRouter)

app.get("/", (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  logger.info(`Root route accessed from IP: ${clientIp}`);
  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    localTime: new Date().toLocaleString(),
    message: "Server is running",
  });
});

// 404 Fix
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API Route Not Found" });
});

app.use(errorHandler);

export default app;
// nodemon trigger
