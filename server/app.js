import app from "./main.js";
import { config } from "./config/config.js";
import connectDB from "./config/db.js";
import { seedAdmin } from "./scripts/seedAdmin.js";
import initializeFirebase from "./config/firebase.js";
import { startAbandonedCartScheduler } from "./services/abandonedCart.service.js";

const startServer = async () => {
  try {
    initializeFirebase();
    await connectDB();
    await seedAdmin();
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }

  try {
    await startAbandonedCartScheduler();
  } catch (error) {
    console.error("Abandoned cart scheduler failed to start:", error);
  }

  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
  });
};

startServer();
