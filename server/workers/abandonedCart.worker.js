import { Worker } from "bullmq";
import logger from "../utils/logger.js";
import { ABANDONED_CART_QUEUE_NAME } from "../queues/abandonedCart.queue.js";
import { getRedisConnectionOptions } from "../config/redis.js";
import {
  markCartAsAbandonedByJob,
  sendReminderByJob,
} from "../services/abandonedCart.service.js";

let abandonedCartWorker;
let redisUnavailableLogged = false;

const describeWorkerError = (error) => {
  if (!error) return "Unknown abandoned-cart worker error";
  if (typeof error === "string")
    return error.trim() || "Unknown abandoned-cart worker error";

  const parts = [error.name, error.code, error.message, error.stack]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part.trim());

  return parts[0] || "Unknown abandoned-cart worker error";
};

export const initializeAbandonedCartWorker = () => {
  if (abandonedCartWorker) return abandonedCartWorker;

  abandonedCartWorker = new Worker(
    ABANDONED_CART_QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case "mark-abandoned":
          return markCartAsAbandonedByJob(job.data);
        case "send-reminder":
          return sendReminderByJob({
            ...job.data,
            jobId: job.id,
          });
        default:
          throw new Error(`Unsupported abandoned cart job: ${job.name}`);
      }
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 5,
    },
  );

  abandonedCartWorker.on("completed", (job) => {
    logger.info(
      {
        jobId: job.id,
        name: job.name,
      },
      "[AbandonedCart] Queue job completed",
    );
  });

  abandonedCartWorker.on("failed", (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        name: job?.name,
        error: error?.message,
      },
      "[AbandonedCart] Queue job failed",
    );
  });

  abandonedCartWorker.on("error", (error) => {
    const description = describeWorkerError(error);
    if (
      (description.includes("ECONNREFUSED") && description.includes("6379")) ||
      description === "Unknown abandoned-cart worker error"
    ) {
      if (!redisUnavailableLogged) {
        redisUnavailableLogged = true;
        logger.warn(
          {
            error: description,
          },
          "[AbandonedCart] Redis unavailable; delayed reminders are paused",
        );
      }
      return;
    }

    logger.error({ error: description }, "[AbandonedCart] Worker error");
  });

  return abandonedCartWorker;
};

export const closeAbandonedCartWorker = async () => {
  if (!abandonedCartWorker) return;
  await abandonedCartWorker.close();
  abandonedCartWorker = undefined;
};
