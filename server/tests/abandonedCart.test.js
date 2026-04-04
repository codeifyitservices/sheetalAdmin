import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

const setBaseEnv = () => {
  process.env.MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  process.env.FRONTEND_URL =
    process.env.FRONTEND_URL || "http://localhost:3001";
  process.env.ABANDONED_CART_INACTIVITY_MINUTES =
    process.env.ABANDONED_CART_INACTIVITY_MINUTES || "1";
  process.env.ABANDONED_CART_FIRST_REMINDER_MINUTES =
    process.env.ABANDONED_CART_FIRST_REMINDER_MINUTES || "1";
  process.env.ABANDONED_CART_DISCOUNT_PERCENT =
    process.env.ABANDONED_CART_DISCOUNT_PERCENT || "10";
  process.env.ABANDONED_CART_COUPON_CODE =
    process.env.ABANDONED_CART_COUPON_CODE || "SAVE10";
};

const createResponseStub = () => {
  const res = {
    statusCode: 200,
    jsonPayload: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.jsonPayload = payload;
      return res;
    },
  };

  return res;
};

test("config clamps abandoned cart settings into supported ranges", async () => {
  setBaseEnv();

  process.env.ABANDONED_CART_INACTIVITY_MINUTES = "0";
  process.env.ABANDONED_CART_DISCOUNT_PERCENT = "25";

  const { config } = await import("../config/config.js?config-clamp-test=1");

  assert.equal(config.abandonedCart.inactivityMinutes, 1);
  assert.equal(config.abandonedCart.discountPercent, 10);
});

test("queue helpers build stable job ids and checkout urls", async () => {
  setBaseEnv();

  const { buildAbandonedCartJobId, buildAbandonedCartOrderUrl } =
    await import("../queues/abandonedCart.queue.js?queue-helper-test=1");

  assert.equal(
    buildAbandonedCartJobId("cart-1", "cycle-9", "first"),
    "abandoned-cart-cart-1-cycle-9-first",
  );
  assert.equal(
    buildAbandonedCartOrderUrl("cart-1"),
    "http://localhost:3001/checkout?cartId=cart-1",
  );
  assert.equal(
    buildAbandonedCartOrderUrl("cart-1", {
      source: "email",
      stage: 1,
      cycleId: "cycle-9",
    }),
    "http://localhost:3001/checkout?cartId=cart-1&recoverySource=email&recoveryStage=1&recoveryCycleId=cycle-9",
  );
});

test("reminder channel selection matches cart contact availability", async () => {
  setBaseEnv();

  const { getReminderChannelAvailability } =
    await import("../services/abandonedCart.notification.service.js?channel-test=1");

  assert.deepEqual(
    getReminderChannelAvailability("first", {
      email: "customer@example.com",
      phoneNumber: "+911234567890",
    }),
    ["email", "whatsapp"],
  );
  assert.deepEqual(
    getReminderChannelAvailability("third", {
      email: "customer@example.com",
      phoneNumber: "+911234567890",
    }),
    ["email", "whatsapp", "sms"],
  );
  assert.deepEqual(
    getReminderChannelAvailability("final", {
      email: "customer@example.com",
      phoneNumber: "+911234567890",
    }),
    ["email"],
  );
  assert.deepEqual(
    getReminderChannelAvailability("first", {
      phoneNumber: "+911234567890",
    }),
    ["whatsapp"],
  );
  assert.deepEqual(
    getReminderChannelAvailability("first", {
      email: "customer@example.com",
    }),
    ["email"],
  );
});

test("reminder senders skip cleanly when contact details are missing", async () => {
  setBaseEnv();

  const { sendReminderEmail, sendReminderWhatsApp, sendReminderSms } =
    await import("../services/abandonedCart.notification.service.js?sender-test=1");

  const cart = { _id: "cart-1" };
  const items = [{ name: "Kurta", price: 1299, quantity: 1 }];
  const ctaUrl = "http://localhost:3001/checkout?cartId=cart-1";

  assert.deepEqual(
    await sendReminderEmail({
      cart,
      items,
      ctaUrl,
      stage: "first",
      couponCode: "SAVE10",
      discountPercent: 10,
    }),
    { skipped: true, reason: "missing_email" },
  );

  assert.deepEqual(
    await sendReminderWhatsApp({
      cart,
      items,
      ctaUrl,
      stage: "first",
      couponCode: "SAVE10",
      discountPercent: 10,
    }),
    { skipped: true, reason: "missing_phone_number" },
  );

  assert.deepEqual(
    await sendReminderSms({
      cart,
      items,
      ctaUrl,
      stage: "third",
      couponCode: "SAVE10",
      discountPercent: 10,
    }),
    { skipped: true, reason: "missing_phone_number" },
  );
});

test("cart tracking ids are derived from created and updated timestamps", async () => {
  setBaseEnv();

  const { buildCartTrackingId } =
    await import("../services/abandonedCart.service.js?tracking-id-test=1");

  const cart = {
    createdAt: new Date("2026-04-04T05:00:00.000Z"),
  };
  const updatedAt = new Date("2026-04-04T05:20:00.000Z");
  const expected = `cart-${Date.parse("2026-04-04T05:00:00.000Z")}-${Date.parse("2026-04-04T05:20:00.000Z")}`;

  assert.equal(
    buildCartTrackingId(cart, updatedAt),
    expected,
  );
});

test("abandoned-cart recovered revenue excludes cancelled and returned orders", async () => {
  setBaseEnv();

  const { default: Cart } = await import("../models/cart.model.js?recovery-status-test=1");
  const { default: Order } = await import("../models/order.model.js?recovery-status-test=1");
  const { getAbandonedCarts } = await import("../controllers/sales.controller.js?recovery-status-test=1");

  const cartProto = Object.getPrototypeOf(Cart);
  const orderProto = Object.getPrototypeOf(Order);

  let capturedPipeline;

  const query = {
    populate() {
      return query;
    },
    sort() {
      return query;
    },
    limit() {
      return query;
    },
    lean() {
      return Promise.resolve([]);
    },
    then(resolve, reject) {
      return Promise.resolve([]).then(resolve, reject);
    },
  };

  const mockedCartFind = mock.method(cartProto, "find", () => query);
  const mockedAggregate = mock.method(orderProto, "aggregate", async (pipeline) => {
    capturedPipeline = pipeline;
    return [
      {
        _id: { source: "email", stage: 1 },
        totalRecoveredAmount: 1200,
        recoveredOrders: 1,
      },
    ];
  });

  try {
    const req = { query: { limit: "10" } };
    const res = createResponseStub();

    await getAbandonedCarts(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonPayload.recoveredAmount, 1200);
    assert.ok(Array.isArray(capturedPipeline));

    const matchStage = capturedPipeline.find((stage) => stage.$match);
    assert.deepEqual(matchStage.$match.orderStatus, {
      $nin: ["Cancelled", "Returned"],
    });
  } finally {
    mockedAggregate.mock.restore();
    mockedCartFind.mock.restore();
  }
});
