import crypto from "crypto";
import Cart from "../models/cart.model.js";
import User from "../models/user.model.js";
import Settings from "../models/settings.model.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import logger from "../utils/logger.js";
import { config } from "../config/config.js";
import {
  buildAbandonedCartJobId,
  buildAbandonedCartOrderUrl,
  ensureAbandonedCartQueue,
} from "../queues/abandonedCart.queue.js";
import {
  logReminderProviderResult,
  sendReminderEmail,
  sendReminderSms,
  sendReminderWhatsApp,
} from "./abandonedCart.notification.service.js";

const REMINDER_STAGES = [
  {
    stage: "first",
    delayMinutes: config.abandonedCart.firstReminderMinutes,
  },
  { stage: "second", delayMinutes: 6 * 60 },
  { stage: "third", delayMinutes: 24 * 60 },
  { stage: "final", delayMinutes: 48 * 60 },
];

const REMINDER_STAGE_TO_RECOVERY_STEP = {
  first: 1,
  second: 2,
  third: 3,
  final: 4,
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, Number(value) || min));

const normalizeContact = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

export const buildCartTrackingId = (cart, updatedAt = new Date()) => {
  const createdAt = cart?.createdAt
    ? new Date(cart.createdAt)
    : updatedAt instanceof Date
      ? updatedAt
      : new Date(updatedAt);
  const lastUpdatedAt =
    updatedAt instanceof Date ? updatedAt : new Date(updatedAt || Date.now());

  return `cart-${createdAt.getTime()}-${lastUpdatedAt.getTime()}`;
};

const getCartTrackingId = (cart, updatedAt = new Date()) =>
  cart?.cartTrackingId || buildCartTrackingId(cart, updatedAt);

const getReminderPolicy = async () => {
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

const calculateCartValue = (items = []) =>
  items.reduce((sum, item) => {
    const price =
      Number(item.discountPrice) > 0
        ? Number(item.discountPrice)
        : Number(item.price) || 0;
    return sum + price * (Number(item.quantity) || 0);
  }, 0);

const buildItemSnapshot = (item) => {
  const product = item.product || {};
  const name = product.name || item.name || "Product";
  const image =
    item.variantImage ||
    product.mainImage?.url ||
    product.images?.[0] ||
    item.image ||
    "";

  return {
    productId: product._id || item.product || null,
    name,
    image,
    variantImage: item.variantImage || null,
    price: Number(item.price) || 0,
    discountPrice: Number(item.discountPrice) || 0,
    quantity: Number(item.quantity) || 1,
    size: item.size || item.variant?.size || null,
    color: item.color || item.variant?.color || null,
    slug: product.slug || null,
  };
};

const buildCartSnapshot = (cart) => {
  const items = (cart.items || []).map(buildItemSnapshot);

  return {
    cartId: cart._id.toString(),
    trackingId: getCartTrackingId(cart, cart.updatedAt),
    userId: cart.user?._id?.toString?.() || cart.user?.toString?.() || null,
    email: cart.email || cart.user?.email || null,
    phoneNumber: cart.phoneNumber || cart.user?.phoneNumber || null,
    items,
    cartValue: calculateCartValue(items),
    itemCount: items.length,
    firstImage: items[0]?.image || null,
    firstName: cart.user?.name || cart.email || "Customer",
  };
};

const loadCartForAbandonment = async (cartId) =>
  Cart.findById(cartId)
    .populate("user", "name email phoneNumber alternativeMobileNumber")
    .populate("items.product", "name mainImage images slug")
    .lean();

const loadCartDocument = async (cartId) =>
  Cart.findById(cartId)
    .populate("user", "name email phoneNumber alternativeMobileNumber")
    .populate("items.product", "name mainImage images slug");

const buildReminderData = (
  cartSnapshot,
  stage,
  policy,
  cycleId,
  abandonedAt,
) => ({
  cartId: cartSnapshot.cartId,
  cartTrackingId: cartSnapshot.trackingId,
  userId: cartSnapshot.userId,
  cycleId,
  stage,
  recoveryStage: REMINDER_STAGE_TO_RECOVERY_STEP[stage] || null,
  abandonedAt,
  snapshot: cartSnapshot,
  discountPercent: policy.discountPercent,
  couponCode: policy.couponCode,
});

const getCartContactUpdates = async (cart, overrides = {}) => {
  let updatedEmail =
    normalizeContact(overrides.email) || normalizeContact(cart.email);
  let updatedPhone =
    normalizeContact(overrides.phoneNumber) ||
    normalizeContact(cart.phoneNumber);

  if ((!updatedEmail || !updatedPhone) && cart.user) {
    const userId = cart.user?._id || cart.user;
    const user = await User.findById(userId).lean();
    if (user) {
      updatedEmail = updatedEmail || normalizeContact(user.email);
      updatedPhone =
        updatedPhone ||
        normalizeContact(user.phoneNumber) ||
        normalizeContact(user.alternativeMobileNumber);
    }
  }

  return {
    email: updatedEmail || null,
    phoneNumber: updatedPhone || null,
  };
};

const removeQueueJob = async (jobId) => {
  if (!jobId) return;

  try {
    const queue = await ensureAbandonedCartQueue();
    if (!queue) return;
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  } catch (error) {
    logger.warn(
      { jobId, error: error.message },
      "[AbandonedCart] Failed to remove queued job",
    );
  }
};

const persistReminderAttempt = async (cartId, entry) => {
  await Cart.findByIdAndUpdate(cartId, {
    $push: { abandonmentReminderAttempts: entry },
  });
};

const sanitizeReminderAttempts = (cart) => {
  if (!Array.isArray(cart?.abandonmentReminderAttempts)) {
    return [];
  }

  return cart.abandonmentReminderAttempts.filter(
    (attempt) => attempt && typeof attempt.jobId === "string" && attempt.jobId.trim(),
  );
};

const syncCartState = async (cart, updates) => {
  cart.abandonmentReminderAttempts = sanitizeReminderAttempts(cart);
  Object.assign(cart, updates);
  await cart.save();
  return cart;
};

const getStageChannels = (stage, cartSnapshot) => {
  if (stage === "final") {
    return cartSnapshot.email ? ["email"] : [];
  }

  const channels = [];
  if (cartSnapshot.email) channels.push("email");
  if (cartSnapshot.phoneNumber) channels.push("whatsapp");
  if (stage === "third" && cartSnapshot.phoneNumber) channels.push("sms");
  return channels;
};

const runChannelSend = async ({
  channel,
  cartSnapshot,
  stage,
  ctaUrl,
  policy,
}) => {
  const cart = {
    _id: cartSnapshot.cartId,
    email: cartSnapshot.email,
    phoneNumber: cartSnapshot.phoneNumber,
    user: cartSnapshot.userId ? { name: cartSnapshot.firstName } : null,
  };

  const items = cartSnapshot.items;

  switch (channel) {
    case "email":
      return sendReminderEmail({
        cart,
        items,
        ctaUrl,
        stage,
        couponCode: policy.couponCode,
        discountPercent: policy.discountPercent,
      });
    case "whatsapp":
      return sendReminderWhatsApp({
        cart,
        items,
        ctaUrl,
        stage,
        couponCode: policy.couponCode,
        discountPercent: policy.discountPercent,
      });
    case "sms":
      return sendReminderSms({
        cart,
        items,
        ctaUrl,
        stage,
        couponCode: policy.couponCode,
        discountPercent: policy.discountPercent,
      });
    default:
      return { skipped: true, reason: "unsupported_channel" };
  }
};

export const cancelReminders = async (cartIdOrDoc, options = {}) => {
  const cart =
    typeof cartIdOrDoc === "object" && cartIdOrDoc?._id
      ? cartIdOrDoc
      : await Cart.findById(cartIdOrDoc);

  if (!cart) return null;

  const cycleId = options.cycleId || cart.abandonmentCycleId;
  if (!cycleId && !cart.abandonmentReminderJobIds) {
    return cart;
  }

  const jobIds = [];
  if (cart.abandonmentReminderJobIds) {
    Object.values(cart.abandonmentReminderJobIds).forEach((value) => {
      if (value) jobIds.push(value);
    });
  }

  if (cycleId) {
    REMINDER_STAGES.forEach(({ stage }) => {
      const jobId = buildAbandonedCartJobId(
        cart._id.toString(),
        cycleId,
        stage,
      );
      jobIds.push(jobId);
    });

    jobIds.push(buildAbandonedCartJobId(cart._id.toString(), cycleId, "mark"));
  }

  await Promise.all(jobIds.map((jobId) => removeQueueJob(jobId)));

  cart.abandonmentReminderJobIds = {};
  if (options.clearCycle !== false) {
    cart.abandonmentCycleId = null;
  }
  if (options.clearStatus) {
    cart.abandonmentStatus = options.clearStatus;
  }

  cart.abandonmentReminderAttempts = sanitizeReminderAttempts(cart);
  await cart.save();
  return cart;
};

export const scheduleReminders = async (
  cartIdOrDoc,
  { cycleId = null, abandonedAt = new Date(), snapshot = null } = {},
) => {
  const cart =
    typeof cartIdOrDoc === "object" && cartIdOrDoc?._id
      ? cartIdOrDoc
      : await Cart.findById(cartIdOrDoc);

  if (!cart) return null;

  const activeCycleId = cycleId || cart.abandonmentCycleId;
  if (!activeCycleId || cart.abandonmentStatus !== "abandoned") {
    return cart;
  }

  const policy = await getReminderPolicy();
  const cartSnapshot =
    snapshot || buildCartSnapshot(await loadCartForAbandonment(cart._id));
  const queue = await ensureAbandonedCartQueue();
  if (!queue) {
    logger.warn(
      {
        cartId: cart._id.toString(),
        cycleId: activeCycleId,
      },
      "[AbandonedCart] Redis unavailable; reminder scheduling skipped",
    );
    cart.abandonmentReminderJobIds = {};
    await cart.save();
    return cart;
  }
  const jobIds = {};

  for (const reminder of REMINDER_STAGES) {
    const availableChannels = getStageChannels(reminder.stage, cartSnapshot);

    if (availableChannels.length === 0) {
      continue;
    }

    const jobId = buildAbandonedCartJobId(
      cart._id.toString(),
      activeCycleId,
      reminder.stage,
    );

    const delay = reminder.delayMinutes * 60 * 1000;

    try {
      await queue.add(
        "send-reminder",
        buildReminderData(
          cartSnapshot,
          reminder.stage,
          policy,
          activeCycleId,
          abandonedAt,
        ),
        {
          jobId,
          delay,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      jobIds[reminder.stage] = jobId;
    } catch (error) {
      logger.error(
        {
          cartId: cart._id.toString(),
          cycleId: activeCycleId,
          stage: reminder.stage,
          error: error.message,
        },
        "[AbandonedCart] Failed to schedule reminder job",
      );
    }
  }

  cart.abandonmentReminderJobIds = jobIds;
  cart.abandonmentReminderAttempts = sanitizeReminderAttempts(cart);
  await cart.save();
  return cart;
};

export const markCartAsAbandoned = async (
  cartIdOrDoc,
  {
    cycleId = null,
    reason = "inactivity",
    triggeredAt = new Date(),
    checkoutExitedAt = null,
  } = {},
) => {
  const cart =
    typeof cartIdOrDoc === "object" && cartIdOrDoc?._id
      ? cartIdOrDoc
      : await loadCartDocument(cartIdOrDoc);

  if (!cart) {
    throw new ErrorResponse("Cart not found", 404);
  }

  if (cart.abandonmentStatus === "completed") {
    return cart;
  }

  if (
    cycleId &&
    cart.abandonmentCycleId &&
    cart.abandonmentCycleId !== cycleId
  ) {
    return cart;
  }

  if (!cart.items || cart.items.length === 0) {
    return cart;
  }

  const finalCycleId =
    cycleId || cart.abandonmentCycleId || crypto.randomUUID();
  if (
    cart.abandonmentStatus === "abandoned" &&
    cart.abandonmentCycleId === finalCycleId &&
    cart.abandonedAt
  ) {
    return cart;
  }

  const contact = await getCartContactUpdates(cart);
  const trackingId = cart.items?.length ? getCartTrackingId(cart, triggeredAt) : null;

  await syncCartState(cart, {
    email: contact.email,
    phoneNumber: contact.phoneNumber,
    cartTrackingId: trackingId,
    abandonmentStatus: "abandoned",
    abandonedAt: triggeredAt,
    checkoutExitedAt:
      reason === "checkout_exit" ? checkoutExitedAt || triggeredAt : null,
    completedAt: null,
    abandonmentReason: reason,
    abandonmentCycleId: finalCycleId,
    lastActivityAt: cart.lastActivityAt || triggeredAt,
  });

  await scheduleReminders(cart, {
    cycleId: finalCycleId,
    abandonedAt: triggeredAt,
    snapshot: buildCartSnapshot(cart),
  });

  logger.info(
    {
      cartId: cart._id.toString(),
      cartTrackingId: cart.cartTrackingId || null,
      userId: cart.user?._id?.toString?.() || cart.user?.toString?.() || null,
      reason,
      cycleId: finalCycleId,
    },
    "[AbandonedCart] Cart marked as abandoned",
  );

  return cart;
};

export const sendReminder = async ({
  cartId,
  cycleId,
  stage,
  jobId,
  snapshot: snapshotFromJob = null,
  ctaUrl: ctaUrlFromJob = null,
  discountPercent: discountFromJob = null,
  couponCode: couponFromJob = null,
  abandonedAt = null,
}) => {
  const cart = await loadCartForAbandonment(cartId);
  if (!cart) {
    return { status: "skipped", reason: "cart_not_found" };
  }

  if (cart.abandonmentStatus === "completed") {
    return { status: "skipped", reason: "cart_completed" };
  }

  if (
    cart.abandonmentCycleId &&
    cycleId &&
    cart.abandonmentCycleId !== cycleId
  ) {
    return { status: "skipped", reason: "cycle_mismatch" };
  }

  const alreadyProcessed = cart.abandonmentReminderAttempts?.some(
    (attempt) =>
      attempt.jobId === jobId ||
      (attempt.cycleId === cycleId && attempt.stage === stage),
  );
  if (alreadyProcessed) {
    return { status: "skipped", reason: "duplicate_job" };
  }

  const policy = await getReminderPolicy();
  const cartSnapshot = snapshotFromJob || buildCartSnapshot(cart);
  const ctaUrl = ctaUrlFromJob || buildAbandonedCartOrderUrl(cartSnapshot.cartId);
  const couponCode = couponFromJob || policy.couponCode;
  const discountPercent = discountFromJob || policy.discountPercent;
  const channels = getStageChannels(stage, cartSnapshot);

  if (channels.length === 0) {
    const skippedEntry = {
      cycleId,
      stage,
      jobId,
      status: "skipped",
      channels: [],
      attemptedAt: new Date(),
      completedAt: new Date(),
      error: null,
      metadata: {
        reason: "no_available_channels",
        cartTrackingId: cartSnapshot.trackingId,
      },
    };

    await persistReminderAttempt(cart._id, skippedEntry);
    return { status: "skipped", reason: "no_available_channels" };
  }

  const results = await Promise.allSettled(
    channels.map((channel) =>
      runChannelSend({
        channel,
        cartSnapshot,
        stage,
        ctaUrl: buildAbandonedCartOrderUrl(cartSnapshot.cartId, {
          source: channel,
          stage: REMINDER_STAGE_TO_RECOVERY_STEP[stage] || null,
          cycleId,
        }),
        policy: { couponCode, discountPercent },
      }).then((result) => {
        logReminderProviderResult(channel, result);
        return { channel, result };
      }),
    ),
  );

  const channelStatuses = results.map((result, index) => {
    const channel = channels[index];
    if (result.status === "fulfilled") {
      return { channel, ...result.value.result };
    }
    return {
      channel,
      failed: true,
      error: result.reason?.message || "Channel send failed",
    };
  });

  const failures = channelStatuses.filter((entry) => entry.failed);
  const successes = channelStatuses.filter(
    (entry) => !entry.failed && !entry.skipped,
  );
  const skipped = channelStatuses.filter((entry) => entry.skipped);
  const overallStatus =
    failures.length > 0
      ? "failure"
      : successes.length > 0
        ? "success"
        : "skipped";
  const attemptEntry = {
    cycleId,
    stage,
    recoveryStage: REMINDER_STAGE_TO_RECOVERY_STEP[stage] || null,
    jobId,
    status: overallStatus,
    channels,
    attemptedAt: new Date(),
    completedAt: new Date(),
    error: failures[0]?.error || null,
    metadata: {
      cartTrackingId: cartSnapshot.trackingId,
      cartValue: cartSnapshot.cartValue,
      itemCount: cartSnapshot.itemCount,
      ctaUrl,
      abandonedAt,
      channels: channelStatuses,
      skipped,
    },
  };

  await persistReminderAttempt(cart._id, attemptEntry);

  if (overallStatus === "failure") {
  logger.error(
    {
      cartId: cart._id.toString(),
      cartTrackingId: cart.cartTrackingId || null,
      cycleId,
      stage,
      jobId,
        channels: channelStatuses,
      },
      "[AbandonedCart] Reminder dispatch failed",
    );
    return { status: "failure", channels: channelStatuses };
  }

  logger.info(
    {
      cartId: cart._id.toString(),
      cartTrackingId: cart.cartTrackingId || null,
      cycleId,
      stage,
      jobId,
      channels: channelStatuses,
    },
    "[AbandonedCart] Reminder dispatched",
  );

  return { status: "success", channels: channelStatuses };
};

export const handleUserActivity = async ({
  userId = null,
  cartId = null,
  email = null,
  phoneNumber = null,
  source = "cart",
  checkoutExited = false,
} = {}) => {
  const filter = cartId ? { _id: cartId } : { user: userId };
  const cart = await Cart.findOne(filter).populate(
    "user",
    "name email phoneNumber alternativeMobileNumber",
  );

  if (!cart) {
    return null;
  }

  if (cart.abandonmentStatus === "completed") {
    if (!cart.items?.length) {
      return cart;
    }

    await syncCartState(cart, {
      abandonmentStatus: "active",
      abandonedAt: null,
      checkoutExitedAt: null,
      completedAt: null,
      abandonmentReason: null,
      abandonmentCycleId: null,
      abandonmentReminderJobIds: {},
      cartTrackingId: null,
    });
  }

  const contact = await getCartContactUpdates(cart, {
    email,
    phoneNumber,
  });

  const previousCycleId = cart.abandonmentCycleId;
  if (previousCycleId) {
    await cancelReminders(cart, {
      cycleId: previousCycleId,
      clearCycle: false,
    });
  }

  const nextCycleId = crypto.randomUUID();
  const now = new Date();
  const nextTrackingId = cart.items?.length ? getCartTrackingId(cart, now) : null;
  const nextState = {
    email: contact.email,
    phoneNumber: contact.phoneNumber,
    cartTrackingId: nextTrackingId,
    lastActivityAt: now,
    abandonmentStatus: "active",
    abandonedAt: null,
    checkoutExitedAt: checkoutExited ? now : null,
    completedAt: null,
    abandonmentReason: null,
    abandonmentCycleId: cart.items?.length ? nextCycleId : null,
    abandonmentReminderJobIds: {},
  };

  await syncCartState(cart, nextState);

  if (cart.items?.length) {
    const policy = await getReminderPolicy();
    const queue = await ensureAbandonedCartQueue();
    if (!queue) {
      logger.warn(
        {
          cartId: cart._id.toString(),
          cycleId: nextCycleId,
          source,
        },
        "[AbandonedCart] Redis unavailable; abandonment timer skipped",
      );
      return cart;
    }
    const jobId = buildAbandonedCartJobId(
      cart._id.toString(),
      nextCycleId,
      "mark",
    );
    try {
      await queue.add(
        "mark-abandoned",
        {
          cartId: cart._id.toString(),
          userId: cart.user?._id?.toString?.() || userId?.toString?.() || null,
          cycleId: nextCycleId,
          inactivityMinutes: policy.inactivityMinutes,
          source,
        },
        {
          jobId,
          delay: policy.inactivityMinutes * 60 * 1000,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      cart.abandonmentReminderJobIds = {
        mark: jobId,
      };
      await cart.save();
    } catch (error) {
      logger.error(
        {
          cartId: cart._id.toString(),
          cycleId: nextCycleId,
          error: error.message,
        },
        "[AbandonedCart] Failed to schedule abandonment timer",
      );
    }
  }

  logger.info(
    {
      cartId: cart._id.toString(),
      cartTrackingId: cart.cartTrackingId || null,
      userId: cart.user?._id?.toString?.() || userId?.toString?.() || null,
      source,
      cycleId: cart.abandonmentCycleId,
    },
    "[AbandonedCart] Cart activity registered",
  );

  return cart;
};

export const handleCheckoutExit = async ({
  userId = null,
  cartId = null,
} = {}) => {
  const filter = cartId ? { _id: cartId } : { user: userId };
  const cart = await Cart.findOne(filter).populate(
    "user",
    "name email phoneNumber alternativeMobileNumber",
  );

  if (!cart) {
    return null;
  }

  if (cart.abandonmentStatus === "completed") {
    return cart;
  }

  const previousCycleId = cart.abandonmentCycleId;
  if (previousCycleId) {
    await cancelReminders(cart, {
      cycleId: previousCycleId,
      clearCycle: false,
    });
  }

  const nextCycleId = crypto.randomUUID();
  await markCartAsAbandoned(cart, {
    cycleId: nextCycleId,
    reason: "checkout_exit",
    checkoutExitedAt: new Date(),
  });

  return cart;
};

export const completeAbandonedCartFlow = async ({
  userId = null,
  cartId = null,
} = {}) => {
  const filter = cartId ? { _id: cartId } : { user: userId };
  const cart = await Cart.findOne(filter);

  if (!cart) {
    return null;
  }

  const cycleId = cart.abandonmentCycleId;
  if (cycleId) {
    await cancelReminders(cart, { cycleId, clearCycle: false });
  }

  const now = new Date();
  cart.abandonmentStatus = "completed";
  cart.completedAt = now;
  cart.abandonedAt = null;
  cart.checkoutExitedAt = null;
  cart.abandonmentReason = "order_completed";
  cart.abandonmentCycleId = null;
  cart.abandonmentReminderJobIds = {};
  cart.abandonmentReminderAttempts = sanitizeReminderAttempts(cart);
  cart.cartTrackingId = null;
  await cart.save();

  logger.info(
    {
      cartId: cart._id.toString(),
      cartTrackingId: cart.cartTrackingId || null,
      userId: cart.user?.toString?.() || userId?.toString?.() || null,
    },
    "[AbandonedCart] Flow completed and reminders cancelled",
  );

  return cart;
};

export const markCartAsAbandonedByJob = async (jobData = {}) =>
  markCartAsAbandoned(jobData.cartId, {
    cycleId: jobData.cycleId,
    reason: "inactivity",
    triggeredAt: new Date(),
  });

export const sendReminderByJob = async (jobData = {}) => sendReminder(jobData);
