import Cart from "../models/cart.model.js";
import Settings from "../models/settings.model.js";
import { config } from "../config/config.js";
import logger from "../utils/logger.js";
import {
  markCartAsAbandonedByJob,
  sendReminderByJob,
} from "./abandonedCart.service.js";

const POLL_INTERVAL_MS = 30_000;

const REMINDER_STAGES = [
  { stage: "first", delayMinutes: config.abandonedCart.firstReminderMinutes },
  { stage: "second", delayMinutes: 6 * 60 },
  { stage: "third", delayMinutes: 24 * 60 },
  { stage: "final", delayMinutes: 48 * 60 },
];

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, Number(value) || min));

let timerHandle;
let schedulerRunning = false;

const loadReminderPolicy = async () => {
  const settings = await Settings.findOne().lean();

  return {
    inactivityMinutes: clamp(
      settings?.abandonedCartInactivityMinutes ??
        config.abandonedCart.inactivityMinutes,
      1,
      30,
    ),
    discountPercent: clamp(
      settings?.abandonedCartDiscountPercent ??
        config.abandonedCart.discountPercent,
      5,
      10,
    ),
    couponCode:
      settings?.abandonedCartCouponCode || config.abandonedCart.couponCode,
  };
};

const buildAbandonedCartJobId = (cartId, cycleId, stage) =>
  `abandoned-cart-${cartId}-${cycleId || "no-cycle"}-${stage}`;

const stageAlreadyHandled = (cart, cycleId, stage) =>
  Array.isArray(cart?.abandonmentReminderAttempts) &&
  cart.abandonmentReminderAttempts.some(
    (attempt) => attempt?.cycleId === cycleId && attempt?.stage === stage,
  );

const processDueAbandonedCarts = async () => {
  if (schedulerRunning) {
    return;
  }

  schedulerRunning = true;

  try {
    const policy = await loadReminderPolicy();
    const now = new Date();

    const activeCutoff = new Date(
      now.getTime() - policy.inactivityMinutes * 60 * 1000,
    );

    const dueActiveCarts = await Cart.find({
      abandonmentStatus: "active",
      "items.0": { $exists: true },
      lastActivityAt: { $lte: activeCutoff },
    })
      .select("_id abandonmentCycleId")
      .lean();

    for (const cart of dueActiveCarts) {
      await markCartAsAbandonedByJob({
        cartId: cart._id.toString(),
        cycleId: cart.abandonmentCycleId || null,
      });
    }

    const dueAbandonedCarts = await Cart.find({
      abandonmentStatus: "abandoned",
      "items.0": { $exists: true },
      abandonedAt: { $ne: null },
    })
      .select("_id abandonmentCycleId abandonedAt abandonmentReminderAttempts")
      .lean();

    for (const cart of dueAbandonedCarts) {
      const cycleId = cart.abandonmentCycleId || null;
      if (!cart.abandonedAt) continue;

      const abandonedAt = new Date(cart.abandonedAt);

      for (const reminder of REMINDER_STAGES) {
        const dueAt = new Date(
          abandonedAt.getTime() + reminder.delayMinutes * 60 * 1000,
        );

        if (now < dueAt) {
          continue;
        }

        if (stageAlreadyHandled(cart, cycleId, reminder.stage)) {
          continue;
        }

        const jobId = buildAbandonedCartJobId(
          cart._id.toString(),
          cycleId,
          reminder.stage,
        );

        await sendReminderByJob({
          cartId: cart._id.toString(),
          cycleId,
          stage: reminder.stage,
          jobId,
          abandonedAt,
        });

        cart.abandonmentReminderAttempts = [
          ...(cart.abandonmentReminderAttempts || []),
          { cycleId, stage: reminder.stage },
        ];
      }
    }
  } catch (error) {
    logger.error(
      { error: error?.message || String(error) },
      "[AbandonedCart] Scheduler run failed",
    );
  } finally {
    schedulerRunning = false;
  }
};

export const initializeAbandonedCartScheduler = () => {
  if (timerHandle) {
    return timerHandle;
  }

  timerHandle = setInterval(() => {
    void processDueAbandonedCarts();
  }, POLL_INTERVAL_MS);

  if (typeof timerHandle.unref === "function") {
    timerHandle.unref();
  }

  void processDueAbandonedCarts();
  return timerHandle;
};

export const closeAbandonedCartScheduler = async () => {
  if (!timerHandle) return;
  clearInterval(timerHandle);
  timerHandle = undefined;
};
