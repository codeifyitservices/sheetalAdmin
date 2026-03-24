import logger from "../utils/logger.js";
import sendEmail from "../utils/sendEmail.js";
import { config } from "../config/config.js";
import Cart from "../models/cart.model.js";
import User from "../models/user.model.js";
import AbandonedCartCycle from "../models/abandonedCartCycle.model.js";
import AbandonedCartReminderJob from "../models/abandonedCartReminderJob.model.js";

const REMINDER_DELAYS = {
  first: 30 * 60 * 1000,
  second: 6 * 60 * 60 * 1000,
  third: 24 * 60 * 60 * 1000,
  final: 48 * 60 * 60 * 1000,
};

const REMINDER_ORDER = ["first", "second", "third", "final"];
const CHANNEL_PRIORITY = {
  first: ["email", "whatsapp"],
  second: ["email", "whatsapp"],
  third: ["email", "whatsapp", "sms"],
  final: ["email"],
};

const schedulerState = {
  started: false,
  timer: null,
  instanceId: `abandoned-cart-${process.pid}`,
};

function normalizeEmail(email) {
  return email ? String(email).trim().toLowerCase() : null;
}

function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).trim();
  return cleaned || null;
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
}

function getFrontendCartUrl() {
  return `${config.frontendDomain.replace(/\/$/, "")}/cart`;
}

function getCouponCode(cycle) {
  return cycle?.couponCode || config.abandonedCart.couponCode || "SAVE10";
}

function getDiscountPercent(cycle) {
  return cycle?.discountPercent || config.abandonedCart.discountPercent || 10;
}

function buildItemSnapshot(item) {
  const product = item?.product || {};
  const image =
    item?.variantImage ||
    product?.mainImage?.url ||
    product?.images?.[0] ||
    "";

  return {
    product: product?._id || item?.product || null,
    productName: product?.name || "Product",
    image,
    price: Number(item?.price || 0),
    discountPrice: Number(item?.discountPrice || 0),
    quantity: Number(item?.quantity || 1),
    size: item?.size || "",
    color: item?.color || "",
    variantImage: item?.variantImage || "",
  };
}

function getItemPrice(item) {
  const discountPrice = Number(item?.discountPrice || 0);
  if (discountPrice > 0) return discountPrice;
  return Number(item?.price || 0);
}

function buildCartValue(items = []) {
  return items.reduce((sum, item) => sum + getItemPrice(item) * Number(item.quantity || 1), 0);
}

function buildPublicSnapshot(cycle) {
  const items = cycle?.itemsSnapshot || [];
  return {
    firstName: (cycle?.userName || cycle?.email || "there").split(" ")[0],
    cartValue: cycle?.cartValue || buildCartValue(items),
    items,
    couponCode: getCouponCode(cycle),
    discountPercent: getDiscountPercent(cycle),
    ctaUrl: getFrontendCartUrl(),
  };
}

function getReminderChannels(reminderType, contacts) {
  const allowed = CHANNEL_PRIORITY[reminderType] || [];
  const channels = [];

  if (allowed.includes("email") && contacts.email) {
    channels.push({ channel: "email", address: contacts.email });
  }

  if (allowed.includes("whatsapp") && contacts.phoneNumber) {
    channels.push({ channel: "whatsapp", address: contacts.phoneNumber });
  }

  if (allowed.includes("sms") && contacts.phoneNumber) {
    channels.push({ channel: "sms", address: contacts.phoneNumber });
  }

  return channels;
}

function buildReminderCopy(reminderType, cycle) {
  const snapshot = buildPublicSnapshot(cycle);
  const firstItem = snapshot.items[0] || {};
  const productName = firstItem.productName || "your item";
  const productImage = firstItem.image || "";
  const productPrice = money(
    firstItem.discountPrice > 0 ? firstItem.discountPrice : firstItem.price,
  );
  const itemCount = snapshot.items.reduce(
    (sum, item) => sum + Number(item.quantity || 1),
    0,
  );
  const discountPercent = getDiscountPercent(cycle);
  const couponCode = getCouponCode(cycle);
  const cartUrl = snapshot.ctaUrl;
  const cartValue = snapshot.cartValue;

  if (reminderType === "first") {
    return {
      subject: "You left something behind",
      title: "You left something behind",
      body:
        "Your cart is still waiting. Complete your order before the items disappear.",
      cta: "Complete your order",
      cartUrl,
      cartValue,
      text: `You left something behind. ${productName} is still waiting for you. Price: ₹${productPrice}. Complete your order here: ${cartUrl}`,
      productImage,
      productName,
      productPrice,
    };
  }

  if (reminderType === "second") {
    return {
      subject: "Your cart is about to expire",
      title: "Your cart is about to expire",
      body:
        "Free delivery and limited stock can disappear quickly. Checkout now before the cart expires.",
      cta: "Checkout now",
      cartUrl,
      cartValue,
      text: `Your cart is about to expire. Free delivery and limited stock may end soon. Checkout now: ${cartUrl}`,
      productImage,
      productName,
      productPrice,
    };
  }

  if (reminderType === "third") {
    return {
      subject: `Claim your ${discountPercent}% discount`,
      title: `Claim your ${discountPercent}% discount`,
      body: `Use coupon code ${couponCode} to save ${discountPercent}% on the items in your cart.`,
      cta: "Claim the offer",
      cartUrl,
      cartValue,
      text: `Claim your ${discountPercent}% discount with coupon code ${couponCode}. Checkout now: ${cartUrl}`,
      productImage,
      productName,
      productPrice,
      couponCode,
      discountPercent,
      itemCount,
    };
  }

  return {
    subject: "Last chance to grab your items",
    title: "Last chance to grab your items",
    body: "Your items may still be available, but not for long. Shop now before they are gone.",
    cta: "Shop now",
    cartUrl,
    cartValue,
    text: `Last chance to grab your items. Shop now: ${cartUrl}`,
    productImage,
    productName,
    productPrice,
  };
}

function buildEmailHtml(reminderType, cycle) {
  const copy = buildReminderCopy(reminderType, cycle);
  const items = (cycle?.itemsSnapshot || []).slice(0, 3);
  const firstItem = items[0] || {};

  const itemRows = items
    .map((item) => {
      const image = item.image || "";
      const price = money(item.discountPrice > 0 ? item.discountPrice : item.price);
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #ece8e1;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${
                  image
                    ? `<td width="72" style="padding-right:14px;"><img src="${sanitizeText(image)}" alt="${sanitizeText(item.productName)}" width="72" height="72" style="display:block;border-radius:12px;object-fit:cover;background:#f7f3ed;" /></td>`
                    : ""
                }
                <td valign="middle">
                  <div style="font-size:14px;font-weight:700;color:#1f2937;line-height:1.4;">${sanitizeText(item.productName)}</div>
                  <div style="font-size:12px;color:#6b7280;margin-top:4px;">
                    Qty ${Number(item.quantity || 1)} · ₹${price}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f6f1ea;font-family:Arial,sans-serif;color:#111827;">
        <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
          <div style="background:linear-gradient(180deg,#fff 0%,#fff8f1 100%);border:1px solid #eadfce;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.06);">
            <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#1f2937,#111827);color:#fff;">
              <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;color:#fbbf24;">Abandoned cart reminder</div>
              <h1 style="margin:14px 0 8px;font-size:30px;line-height:1.15;">${sanitizeText(copy.title)}</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#d1d5db;">${sanitizeText(copy.body)}</p>
            </div>

            <div style="padding:24px 28px;">
              ${
                firstItem.image
                  ? `<div style="margin-bottom:20px;"><img src="${sanitizeText(firstItem.image)}" alt="${sanitizeText(firstItem.productName)}" style="width:100%;max-height:300px;object-fit:cover;border-radius:18px;background:#f3f4f6;" /></div>`
                  : ""
              }

              <div style="display:flex;gap:16px;align-items:stretch;flex-wrap:wrap;margin-bottom:22px;">
                <div style="flex:1;min-width:180px;background:#fff;border:1px solid #eadfce;border-radius:18px;padding:18px;">
                  <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;font-weight:700;">Cart total</div>
                  <div style="font-size:28px;font-weight:800;margin-top:8px;">₹${money(copy.cartValue)}</div>
                </div>
                <div style="flex:1;min-width:180px;background:#fff;border:1px solid #eadfce;border-radius:18px;padding:18px;">
                  <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;font-weight:700;">Reminder</div>
                  <div style="font-size:18px;font-weight:800;margin-top:8px;">${sanitizeText(copy.title)}</div>
                </div>
              </div>

              ${
                reminderType === "third"
                  ? `<div style="margin-bottom:20px;padding:16px 18px;background:#fff7ed;border:1px solid #fdba74;border-radius:16px;color:#9a3412;font-size:14px;line-height:1.6;"><strong>${sanitizeText(copy.discountPercent)}% off</strong> with coupon code <strong>${sanitizeText(copy.couponCode)}</strong>.</div>`
                  : ""
              }

              <div style="margin-bottom:20px;border:1px solid #eadfce;border-radius:18px;overflow:hidden;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;">
                  ${itemRows || ""}
                </table>
              </div>

              <a href="${sanitizeText(copy.cartUrl)}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:999px;font-size:15px;">${sanitizeText(copy.cta)}</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildChannelPayload(channel, reminderType, cycle) {
  const copy = buildReminderCopy(reminderType, cycle);
  const base = `${copy.title}. ${copy.text}`;

  if (channel === "email") {
    return {
      subject: copy.subject,
      html: buildEmailHtml(reminderType, cycle),
      message: base,
    };
  }

  if (channel === "whatsapp") {
    return {
      message: `${copy.title}: ${copy.text}`,
    };
  }

  return {
    message: `${copy.title}. ${copy.text}`,
  };
}

async function mockSendWhatsAppMessage({ to, message }) {
  logger.warn(
    `[AbandonedCart][WhatsApp] Mock send attempted for ${to}: ${message.slice(0, 180)}`,
  );
  return {
    success: false,
    delivered: false,
    channel: "whatsapp",
    to,
    reason: "WhatsApp integration is mocked; no outbound delivery occurred",
  };
}

async function mockSendSmsMessage({ to, message }) {
  logger.warn(`[AbandonedCart][SMS] Mock send attempted for ${to}: ${message.slice(0, 160)}`);
  return {
    success: false,
    delivered: false,
    channel: "sms",
    to,
    reason: "SMS integration is mocked; no outbound delivery occurred",
  };
}

async function sendChannelMessage(channel, reminderType, cycle) {
  const payload = buildChannelPayload(channel.channel, reminderType, cycle);

  if (channel.channel === "email") {
    if (!channel.address) {
      throw new Error("Missing email address");
    }

    await sendEmail({
      email: channel.address,
      subject: payload.subject,
      html: payload.html,
      message: payload.message,
    });

    return { success: true, channel: "email" };
  }

  if (channel.channel === "whatsapp") {
    if (!channel.address) {
      throw new Error("Missing phone number for WhatsApp");
    }

    const result = await mockSendWhatsAppMessage({
      to: channel.address,
      message: payload.message,
    });

    if (!result?.success || result?.delivered === false) {
      throw new Error(result?.reason || "WhatsApp message was not delivered");
    }

    return result;
  }

  if (channel.channel === "sms") {
    if (!channel.address) {
      throw new Error("Missing phone number for SMS");
    }

    const result = await mockSendSmsMessage({
      to: channel.address,
      message: payload.message,
    });

    if (!result?.success || result?.delivered === false) {
      throw new Error(result?.reason || "SMS message was not delivered");
    }

    return result;
  }

  throw new Error(`Unsupported channel: ${channel.channel}`);
}

async function getCartWithUser(userId) {
  const cart = await Cart.findOne({ user: userId })
    .populate("items.product", "name mainImage images")
    .lean();
  const user = await User.findById(userId)
    .select("name email phoneNumber alternativeMobileNumber")
    .lean();

  return { cart, user };
}

async function cancelCycleJobs(cycleIds, { status = "cancelled", reason = null } = {}) {
  if (!Array.isArray(cycleIds) || cycleIds.length === 0) return;

  await AbandonedCartReminderJob.updateMany(
    { cycle: { $in: cycleIds }, status: { $in: ["queued", "processing", "failed"] } },
    {
      $set: {
        status,
        lastError: reason,
        lockedAt: null,
        lockedBy: null,
        retryAt: null,
      },
    },
  );
}

async function getMutableCycles(filter) {
  return AbandonedCartCycle.find({
    ...filter,
    status: { $in: ["active", "abandoned"] },
  }).lean();
}

async function upsertReminderJobs(cycle) {
  const baseRunAt = new Date(cycle.abandonedAt);
  const jobs = REMINDER_ORDER.map((type) => ({
    cycle: cycle._id,
    cart: cycle.cart,
    user: cycle.user,
    reminderType: type,
    runAt: new Date(baseRunAt.getTime() + REMINDER_DELAYS[type]),
    status: "queued",
    attempts: 0,
    maxAttempts: config.abandonedCart.maxAttempts,
  }));

  for (const job of jobs) {
    await AbandonedCartReminderJob.updateOne(
      { cycle: job.cycle, reminderType: job.reminderType },
      {
        $setOnInsert: job,
      },
      { upsert: true },
    );
  }
}

export async function scheduleReminders(cycle) {
  if (!cycle?._id) {
    throw new Error("scheduleReminders: cycle is required");
  }

  await upsertReminderJobs(cycle);
  return AbandonedCartReminderJob.find({ cycle: cycle._id }).lean();
}

export async function markCartAsAbandoned({
  userId,
  cartId = null,
  reason = "checkout_exit",
  source = "checkout_exit",
} = {}) {
  if (!userId) {
    throw new Error("markCartAsAbandoned: userId is required");
  }

  const { cart, user } = await getCartWithUser(userId);
  const targetCart = cartId ? await Cart.findById(cartId).populate("items.product", "name mainImage images").lean() : cart;

  if (!targetCart || !Array.isArray(targetCart.items) || targetCart.items.length === 0) {
    return null;
  }

  const contacts = {
    email: normalizeEmail(user?.email),
    phoneNumber: normalizePhone(user?.phoneNumber || user?.alternativeMobileNumber),
  };

  const existingCycles = await getMutableCycles({ cart: targetCart._id });
  if (existingCycles.length > 0) {
    await AbandonedCartCycle.updateMany(
      { _id: { $in: existingCycles.map((cycle) => cycle._id) } },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          reason: "user_activity",
        },
      },
    );
    await cancelCycleJobs(
      existingCycles.map((cycle) => cycle._id),
      { status: "cancelled", reason: "Replaced by a new abandonment cycle" },
    );
  }

  const itemsSnapshot = targetCart.items.map(buildItemSnapshot);
  const cartValue = buildCartValue(itemsSnapshot);
  const abandonedAt = new Date();

  let cycle;
  try {
    cycle = await AbandonedCartCycle.create({
      cart: targetCart._id,
      user: userId,
      email: contacts.email,
      phoneNumber: contacts.phoneNumber,
      abandonedAt,
      lastActivityAt: targetCart.updatedAt || abandonedAt,
      status: "abandoned",
      reason,
      inactivityMinutes: config.abandonedCart.inactivityMinutes,
      cartValue,
      couponCode: config.abandonedCart.couponCode,
      discountPercent: config.abandonedCart.discountPercent,
      itemsSnapshot,
      source,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await AbandonedCartCycle.findOne({
        cart: targetCart._id,
        status: { $in: ["active", "abandoned"] },
      })
        .sort({ abandonedAt: -1 })
        .lean();

      if (existing) {
        return existing;
      }
    }
    throw error;
  }

  await scheduleReminders(cycle);

  logger.info(
    `[AbandonedCart] Cycle created for cart ${targetCart._id} (${reason})`,
  );

  return cycle.toObject();
}

export async function cancelReminders({
  userId = null,
  cartId = null,
  permanent = false,
  reason = "cancelled",
} = {}) {
  const filter = {};
  if (userId) filter.user = userId;
  if (cartId) filter.cart = cartId;

  const cycles = await AbandonedCartCycle.find({
    ...filter,
    status: { $in: ["active", "abandoned"] },
  });

  if (cycles.length === 0) {
    return { cancelledCycles: 0, cancelledJobs: 0 };
  }

  const cycleIds = cycles.map((cycle) => cycle._id);
  const terminalStatus = permanent ? "completed" : "cancelled";

  await AbandonedCartCycle.updateMany(
    { _id: { $in: cycleIds } },
    {
      $set: {
        status: terminalStatus,
        cancelledAt: permanent ? null : new Date(),
        completedAt: permanent ? new Date() : null,
        reason: permanent ? "order_completed" : reason,
      },
    },
  );

  await cancelCycleJobs(cycleIds, {
    status: permanent ? "cancelled" : "cancelled",
    reason: permanent ? "Order completed" : reason,
  });

  return {
    cancelledCycles: cycles.length,
    cancelledJobs: await AbandonedCartReminderJob.countDocuments({
      cycle: { $in: cycleIds },
      status: "cancelled",
    }),
  };
}

export async function handleUserActivity({ userId, cartId = null } = {}) {
  if (!userId) {
    throw new Error("handleUserActivity: userId is required");
  }

  const cart = cartId ? await Cart.findById(cartId).lean() : await Cart.findOne({ user: userId }).lean();
  const result = await cancelReminders({
    userId,
    cartId: cart?._id || cartId,
    permanent: false,
    reason: "user_activity",
  });

  logger.info(
    `[AbandonedCart] User activity reset cart ${cart?._id || cartId || userId}`,
  );

  return result;
}

export async function handleOrderCompletion({ userId, cartId = null } = {}) {
  if (!userId) {
    throw new Error("handleOrderCompletion: userId is required");
  }

  const cart = cartId ? await Cart.findById(cartId).lean() : await Cart.findOne({ user: userId }).lean();
  const result = await cancelReminders({
    userId,
    cartId: cart?._id || cartId,
    permanent: true,
    reason: "order_completed",
  });

  logger.info(
    `[AbandonedCart] Order completion finalized for cart ${cart?._id || cartId || userId}`,
  );

  return result;
}

export async function sendReminder(reminderJobOrId) {
  const job =
    typeof reminderJobOrId === "string"
      ? await AbandonedCartReminderJob.findById(reminderJobOrId)
      : reminderJobOrId;

  if (!job) {
    throw new Error("sendReminder: reminder job not found");
  }

  if (["sent", "cancelled", "skipped"].includes(job.status)) {
    return job;
  }

  const cycle = await AbandonedCartCycle.findById(job.cycle);
  if (!cycle) {
    await AbandonedCartReminderJob.findByIdAndUpdate(job._id, {
      $set: { status: "cancelled", lastError: "Missing abandoned cart cycle" },
    });
    return null;
  }

  if (["cancelled", "completed"].includes(cycle.status)) {
    await AbandonedCartReminderJob.findByIdAndUpdate(job._id, {
      $set: {
        status: "cancelled",
        lastError: `Cycle ${cycle.status}`,
      },
    });
    return null;
  }

  const user = await User.findById(cycle.user)
    .select("name email phoneNumber alternativeMobileNumber")
    .lean();

  const contacts = {
    email: normalizeEmail(user?.email || cycle.email),
    phoneNumber: normalizePhone(
      user?.phoneNumber || user?.alternativeMobileNumber || cycle.phoneNumber,
    ),
  };

  const applicableChannels = getReminderChannels(job.reminderType, contacts);
  const alreadySent = new Set(
    (job.sentChannels || [])
      .filter((item) => ["sent", "success"].includes(item.status))
      .map((item) => item.channel),
  );
  const channelsToSend = applicableChannels.filter(
    (channel) => !alreadySent.has(channel.channel),
  );

  if (channelsToSend.length === 0) {
    const nextStatus = applicableChannels.length === 0 ? "skipped" : "sent";
    await AbandonedCartReminderJob.findByIdAndUpdate(job._id, {
      $set: {
        status: nextStatus,
        sentAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: applicableChannels.length === 0 ? "No delivery channels available" : null,
      },
      $push: {
        attemptLogs: {
          attemptedAt: new Date(),
          outcome: "skipped",
          message:
            applicableChannels.length === 0
              ? "No email, WhatsApp, or SMS channel available"
              : "Reminder already delivered",
          channels: applicableChannels.map((channel) => channel.channel),
        },
      },
    });
    return job;
  }

  const sentChannels = [];
  const failedChannels = [];
  const attemptTime = new Date();

  for (const channel of channelsToSend) {
    try {
      await sendChannelMessage(channel, job.reminderType, cycle);
      sentChannels.push({
        channel: channel.channel,
        status: "sent",
        attemptedAt: attemptTime,
        error: null,
      });
      logger.info(
        `[AbandonedCart] Sent ${job.reminderType} reminder via ${channel.channel} for cycle ${cycle._id}`,
      );
    } catch (error) {
      failedChannels.push({
        channel: channel.channel,
        status: "failed",
        attemptedAt: attemptTime,
        error: error.message,
      });
      logger.error(
        `[AbandonedCart] Failed ${job.reminderType} reminder via ${channel.channel} for cycle ${cycle._id}: ${error.message}`,
      );
    }
  }

  const anyFailure = failedChannels.length > 0;
  const allSucceeded = failedChannels.length === 0;
  const attempts = Number(job.attempts || 0) + 1;
  const shouldRetry =
    anyFailure && attempts < Number(job.maxAttempts || config.abandonedCart.maxAttempts);

  const update = {
    attempts,
    lockedAt: null,
    lockedBy: null,
    lastRecoveredAt: allSucceeded ? new Date() : null,
    sentChannels: [...(job.sentChannels || []), ...sentChannels, ...failedChannels],
  };

  if (allSucceeded) {
    update.status = "sent";
    update.sentAt = new Date();
    update.lastError = null;
    update.retryAt = null;
  } else if (shouldRetry) {
    update.status = "queued";
    update.lastError = failedChannels.map((item) => item.error).join(" | ");
    update.retryAt = new Date(
      Date.now() + config.abandonedCart.retryDelayMinutes * 60 * 1000,
    );
    update.runAt = update.retryAt;
  } else {
    update.status = "failed";
    update.lastError = failedChannels.map((item) => item.error).join(" | ");
  }

  await AbandonedCartReminderJob.findByIdAndUpdate(job._id, { $set: update });

  await AbandonedCartReminderJob.findByIdAndUpdate(job._id, {
    $push: {
      attemptLogs: {
        attemptedAt: attemptTime,
        outcome: allSucceeded ? "success" : shouldRetry ? "failure" : "failure",
        message: allSucceeded
          ? "Reminder delivered"
          : failedChannels.map((item) => item.error).join(" | "),
        channels: channelsToSend.map((channel) => channel.channel),
      },
    },
  });

  return {
    ...job.toObject(),
    status: allSucceeded ? "sent" : shouldRetry ? "queued" : "failed",
  };
}

async function processDueJobs() {
  const now = new Date();

  while (true) {
    const job = await AbandonedCartReminderJob.findOneAndUpdate(
      {
        status: "queued",
        runAt: { $lte: now },
      },
      {
        $set: {
          status: "processing",
          lockedAt: new Date(),
          lockedBy: schedulerState.instanceId,
        },
      },
      {
        sort: { runAt: 1 },
        new: true,
      },
    );

    if (!job) break;

    try {
      await sendReminder(job);
    } catch (error) {
      logger.error(
        `[AbandonedCart] Unexpected job failure for ${job._id}: ${error.message}`,
      );

      const attempts = Number(job.attempts || 0) + 1;
      const shouldRetry =
        attempts < Number(job.maxAttempts || config.abandonedCart.maxAttempts);

      await AbandonedCartReminderJob.findByIdAndUpdate(job._id, {
        $set: {
          attempts,
          status: shouldRetry ? "queued" : "failed",
          lastError: error.message,
          lockedAt: null,
          lockedBy: null,
          runAt: shouldRetry
            ? new Date(
                Date.now() +
                  config.abandonedCart.retryDelayMinutes * 60 * 1000,
              )
            : job.runAt,
        },
        $push: {
          attemptLogs: {
            attemptedAt: new Date(),
            outcome: "failure",
            message: error.message,
            channels: [],
          },
        },
      });
    }
  }
}

async function recoverStuckJobs() {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  await AbandonedCartReminderJob.updateMany(
    { status: "processing", lockedAt: { $lt: staleBefore } },
    {
      $set: {
        status: "queued",
        lockedAt: null,
        lockedBy: null,
      },
    },
  );
}

async function createMissingAbandonedCycles() {
  const cutoff = new Date(
    Date.now() - config.abandonedCart.inactivityMinutes * 60 * 1000,
  );

  const carts = await Cart.find({
    updatedAt: { $lte: cutoff },
    "items.0": { $exists: true },
  }).select("_id user updatedAt items").lean();

  for (const cart of carts) {
    const existingCycle = await AbandonedCartCycle.findOne({
      cart: cart._id,
      status: { $in: ["active", "abandoned"] },
    }).lean();

    if (existingCycle) continue;

    try {
      await markCartAsAbandoned({
        userId: cart.user,
        cartId: cart._id,
        reason: "inactivity",
        source: "scanner",
      });
    } catch (error) {
      logger.error(
        `[AbandonedCart] Failed to create cycle for cart ${cart._id}: ${error.message}`,
      );
    }
  }
}

async function reconcileAbandonedCycles() {
  const cycles = await AbandonedCartCycle.find({ status: "abandoned" }).lean();

  for (const cycle of cycles) {
    const jobsCount = await AbandonedCartReminderJob.countDocuments({
      cycle: cycle._id,
    });

    if (jobsCount === 0) {
      await upsertReminderJobs(cycle);
    }
  }
}

export async function runAbandonedCartSchedulerTick() {
  await recoverStuckJobs();
  await reconcileAbandonedCycles();
  await createMissingAbandonedCycles();
  await processDueJobs();
}

export async function startAbandonedCartScheduler() {
  if (schedulerState.started) return schedulerState;

  schedulerState.started = true;
  schedulerState.timer = setInterval(() => {
    runAbandonedCartSchedulerTick().catch((error) => {
      logger.error(
        `[AbandonedCart] Scheduler tick failed: ${error.message}`,
      );
    });
  }, config.abandonedCart.scanIntervalSeconds * 1000);

  if (typeof schedulerState.timer.unref === "function") {
    schedulerState.timer.unref();
  }

  runAbandonedCartSchedulerTick().catch((error) => {
    logger.error(
      `[AbandonedCart] Scheduler warm-up failed: ${error.message}`,
    );
  });

  logger.info(
    `[AbandonedCart] Scheduler started with ${config.abandonedCart.scanIntervalSeconds}s interval`,
  );

  return schedulerState;
}

export async function stopAbandonedCartScheduler() {
  if (schedulerState.timer) {
    clearInterval(schedulerState.timer);
    schedulerState.timer = null;
  }
  schedulerState.started = false;
}

export async function sendAbandonedCartRecoveryByEmail(email) {
  const user = await User.findOne({ email: normalizeEmail(email) }).lean();
  if (!user) {
    throw new Error("User not found");
  }

  const cycle = await AbandonedCartCycle.findOne({
    user: user._id,
    status: "abandoned",
  }).sort({ abandonedAt: -1 });

  if (!cycle) {
    throw new Error("No abandoned cart cycle found");
  }

  const firstReminder = await AbandonedCartReminderJob.findOne({
    cycle: cycle._id,
    reminderType: "first",
  });

  if (firstReminder && firstReminder.status === "sent") {
    return firstReminder;
  }

  if (firstReminder && firstReminder.status === "queued") {
    firstReminder.runAt = new Date();
    firstReminder.status = "queued";
    await firstReminder.save();
    return await sendReminder(firstReminder);
  }

  const job = await AbandonedCartReminderJob.findOneAndUpdate(
    { cycle: cycle._id, reminderType: "first" },
    {
      $set: {
        runAt: new Date(),
        status: "queued",
        lockedAt: null,
        lockedBy: null,
      },
    },
    { upsert: true, new: true },
  );

  return await sendReminder(job);
}

export async function sendAbandonedCartEmail({ email }) {
  return await sendAbandonedCartRecoveryByEmail(email);
}
