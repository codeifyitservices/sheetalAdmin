import { Queue } from "bullmq";
import { config } from "../config/config.js";
import {
  getRedisConnectionOptions,
  isRedisReachable,
} from "../config/redis.js";

export const ABANDONED_CART_QUEUE_NAME = "abandoned-cart-recovery";

let abandonedCartQueue;

export const getAbandonedCartQueue = () => {
  if (abandonedCartQueue === null) {
    return null;
  }

  if (!abandonedCartQueue) {
    abandonedCartQueue = new Queue(ABANDONED_CART_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  return abandonedCartQueue;
};

export const ensureAbandonedCartQueue = async () => {
  if (abandonedCartQueue) return abandonedCartQueue;
  if (!(await isRedisReachable())) {
    abandonedCartQueue = null;
    return null;
  }

  return getAbandonedCartQueue();
};

export const buildAbandonedCartJobId = (cartId, cycleId, stage) =>
  `abandoned-cart-${cartId}-${cycleId}-${stage}`;

const RECOVERY_STAGE_MAP = {
  first: 1,
  second: 2,
  third: 3,
  final: 4,
};

export const buildAbandonedCartOrderUrl = (cartId, recoveryMeta = {}) => {
  const checkoutUrl = new URL(
    `${config.frontendDomain.replace(/\/$/, "")}/checkout`,
  );

  checkoutUrl.searchParams.set("cartId", cartId);

  if (recoveryMeta.source) {
    checkoutUrl.searchParams.set("recoverySource", recoveryMeta.source);
  }

  if (recoveryMeta.stage != null) {
    checkoutUrl.searchParams.set("recoveryStage", String(recoveryMeta.stage));
  } else if (recoveryMeta.reminderStage && RECOVERY_STAGE_MAP[recoveryMeta.reminderStage]) {
    checkoutUrl.searchParams.set(
      "recoveryStage",
      String(RECOVERY_STAGE_MAP[recoveryMeta.reminderStage]),
    );
  }

  if (recoveryMeta.cycleId) {
    checkoutUrl.searchParams.set("recoveryCycleId", recoveryMeta.cycleId);
  }

  if (recoveryMeta.couponCode) {
    checkoutUrl.searchParams.set("couponCode", recoveryMeta.couponCode);
  }

  return checkoutUrl.toString();
};

export const closeAbandonedCartQueue = async () => {
  if (!abandonedCartQueue) return;
  await abandonedCartQueue.close();
  abandonedCartQueue = undefined;
};
