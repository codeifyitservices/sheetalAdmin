import app from "./main.js";
import { config } from "./config/config.js";
import connectDB from "./config/db.js";
import { seedAdmin } from "./scripts/seedAdmin.js";
import initializeFirebase from "./config/firebase.js";
import { initializeAbandonedCartWorker } from "./workers/abandonedCart.worker.js";
import { hasRedisConfiguration, isRedisReachable } from "./config/redis.js";

const startServer = async () => {
  try {
    initializeFirebase();
    await connectDB();
    await seedAdmin();
    if (hasRedisConfiguration() && (await isRedisReachable())) {
      initializeAbandonedCartWorker();
    } else {
      console.warn(
        "[AbandonedCart] Redis unavailable; worker not started",
      );
    }
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }

  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
  });
};

startServer();
