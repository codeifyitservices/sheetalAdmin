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
    process.env.ABANDONED_CART_INACTIVITY_MINUTES || "20";
  process.env.ABANDONED_CART_FIRST_REMINDER_MINUTES =
    process.env.ABANDONED_CART_FIRST_REMINDER_MINUTES || "30";
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
      couponCode: "SAVE10",
    }),
    "http://localhost:3001/checkout?cartId=cart-1&recoverySource=email&recoveryStage=1&recoveryCycleId=cycle-9&couponCode=SAVE10",
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

  assert.equal(buildCartTrackingId(cart, updatedAt), expected);
});

test("abandoned-cart coupon discount follows the current cart total without a cap", async () => {
  setBaseEnv();

  const { default: AbandonedCartCoupon } =
    await import("../models/abandonedcartcoupon.model.js?discount-no-cap-test=1");

  const coupon = new AbandonedCartCoupon({
    code: "SAVE10",
    userId: "user-1",
    cartId: "cart-1",
    cycleId: "cycle-1",
    discountPercent: 10,
    snapshotTotal: 1000,
    currentDiscount: 100,
    status: "issued",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  assert.equal(coupon.computeDiscount(2500), 250);
  assert.equal(coupon.computeDiscount(99.99), 10);
});

test("eligible abandoned-cart coupon lookup returns only a still-valid user coupon", async () => {
  setBaseEnv();

  const { getValidAbandonedCartCouponForUser } =
    await import("../services/abandonedcartcoupon.service.js?lookup-test=1");
  const { default: AbandonedCartCoupon } =
    await import("../models/abandonedcartcoupon.model.js?lookup-test=1");

  const originalCouponFindOne = AbandonedCartCoupon.findOne;
  const couponRecord = {
    _id: "coupon-lookup-1",
    code: "SAVE10",
    discountPercent: 10,
    currentDiscount: 120,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    cartId: { toString: () => "cart-lookup-1" },
    cycleId: "cycle-lookup-1",
    status: "issued",
    isUsable: () => true,
  };

  AbandonedCartCoupon.findOne = () => ({
    sort: async () => couponRecord,
  });

  try {
    const result = await getValidAbandonedCartCouponForUser({
      userId: "user-lookup-1",
    });

    assert.equal(result.code, "SAVE10");
    assert.equal(result.currentDiscount, 120);
  } finally {
    AbandonedCartCoupon.findOne = originalCouponFindOne;
  }
});

test("abandoned-cart recovered revenue excludes cancelled and returned orders", async () => {
  setBaseEnv();

  const { default: Cart } =
    await import("../models/cart.model.js?recovery-status-test=1");
  const { default: Order } =
    await import("../models/order.model.js?recovery-status-test=1");
  const { getAbandonedCarts } =
    await import("../controllers/sales.controller.js?recovery-status-test=1");

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
  const mockedAggregate = mock.method(
    orderProto,
    "aggregate",
    async (pipeline) => {
      capturedPipeline = pipeline;
      return [
        {
          _id: { source: "email", stage: 1 },
          totalRecoveredAmount: 1200,
          recoveredOrders: 1,
        },
      ];
    },
  );

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

test("abandoned-cart coupon applies only for the matching authenticated user and cart", async () => {
  setBaseEnv();

  const { validateAndApplyAbandonedCartCoupon } =
    await import("../services/abandonedcartcoupon.service.js?apply-match-test=1");
  const { default: AbandonedCartCoupon } =
    await import("../models/abandonedcartcoupon.model.js?apply-match-test=1");
  const { default: Cart } =
    await import("../models/cart.model.js?apply-match-test=1");

  const couponRecord = {
    _id: "coupon-1",
    code: "SAVE10",
    userId: "user-1",
    cartId: {
      toString: () => "cart-1",
    },
    cycleId: "cycle-1",
    discountPercent: 10,
    currentDiscount: 100,
    isUsable: () => true,
    computeDiscount: (currentCartTotal) => currentCartTotal * 0.1,
    save: async function save() {
      return this;
    },
  };

  const cartDoc = {
    _id: "cart-1",
    user: "user-1",
    abandonmentStatus: "abandoned",
    abandonmentCycleId: "cycle-1",
    items: [{ price: 500, quantity: 1 }],
    appliedAbandonedCoupon: null,
    save: async function save() {
      return this;
    },
  };

  const otherCartDoc = {
    _id: "cart-2",
    user: "user-1",
    abandonmentStatus: "abandoned",
    abandonmentCycleId: "cycle-1",
    items: [{ price: 500, quantity: 1 }],
    appliedAbandonedCoupon: null,
    save: async function save() {
      return this;
    },
  };

  const originalCouponFindOne = AbandonedCartCoupon.findOne;
  const originalCartFindOne = Cart.findOne;

  AbandonedCartCoupon.findOne = (query = {}) => ({
    sort: async () =>
      query.code === "SAVE10" &&
      query.userId === "user-1" &&
      query.status?.$in?.includes("issued")
        ? couponRecord
        : null,
  });
  Cart.findOne = (filter = {}) => {
    if (String(filter?._id || "") === "cart-1") {
      return cartDoc;
    }

    if (String(filter?._id || "") === "cart-2") {
      return otherCartDoc;
    }

    return null;
  };

  try {
    const success = await validateAndApplyAbandonedCartCoupon({
      code: "SAVE10",
      userId: "user-1",
      cartId: "cart-1",
    });

    assert.equal(success.success, true);
    assert.equal(success.discount, 50);
    assert.equal(cartDoc.appliedAbandonedCoupon.code, "SAVE10");

    const wrongUser = await validateAndApplyAbandonedCartCoupon({
      code: "SAVE10",
      userId: "user-2",
      cartId: "cart-1",
    });

    assert.equal(wrongUser.success, false);
    assert.equal(
      wrongUser.message,
      "This coupon is not valid for your account",
    );

    const wrongCart = await validateAndApplyAbandonedCartCoupon({
      code: "SAVE10",
      userId: "user-1",
      cartId: "cart-2",
    });

    assert.equal(wrongCart.success, false);
    assert.equal(
      wrongCart.message,
      "This coupon is not valid for your current cart",
    );
  } finally {
    AbandonedCartCoupon.findOne = originalCouponFindOne;
    Cart.findOne = originalCartFindOne;
  }
});

test("generic coupon lookup is skipped for abandoned-cart code without ownership", async () => {
  setBaseEnv();

  const { applyCouponService } =
    await import("../services/coupon.service.js?skip-fallback-test=1");
  const { default: AbandonedCartCoupon } =
    await import("../models/abandonedcartcoupon.model.js?skip-fallback-test=1");
  const { default: Cart } =
    await import("../models/cart.model.js?skip-fallback-test=1");
  const { default: Coupon } =
    await import("../models/coupon.model.js?skip-fallback-test=1");

  const originalCouponFindOne = AbandonedCartCoupon.findOne;
  const originalCartFindOne = Cart.findOne;
  const originalGenericCouponFindOne = Coupon.findOne;

  AbandonedCartCoupon.findOne = () => ({
    sort: async () => null,
  });
  Cart.findOne = () => null;
  Coupon.findOne = () => {
    throw new Error("generic coupon lookup should not be reached");
  };

  try {
    const result = await applyCouponService({
      code: "SAVE10",
      userId: "user-99",
      orderAmount: 1000,
      cartItems: [],
      cartId: "cart-99",
    });

    assert.equal(result.success, false);
    assert.equal(result.statusCode, 400);
    assert.equal(result.message, "This coupon is not valid for your account");
  } finally {
    AbandonedCartCoupon.findOne = originalCouponFindOne;
    Cart.findOne = originalCartFindOne;
    Coupon.findOne = originalGenericCouponFindOne;
  }
});

test("completed abandoned carts reject coupon application", async () => {
  setBaseEnv();

  const { validateAndApplyAbandonedCartCoupon } =
    await import("../services/abandonedcartcoupon.service.js?completed-cart-test=1");
  const { default: AbandonedCartCoupon } =
    await import("../models/abandonedcartcoupon.model.js?completed-cart-test=1");
  const { default: Cart } =
    await import("../models/cart.model.js?completed-cart-test=1");

  const originalCouponFindOne = AbandonedCartCoupon.findOne;
  const originalCartFindOne = Cart.findOne;

  AbandonedCartCoupon.findOne = () => ({
    sort: async () => ({
      _id: "coupon-2",
      code: "SAVE10",
      userId: "user-1",
      cartId: { toString: () => "cart-2" },
      cycleId: "cycle-2",
      isUsable: () => true,
      computeDiscount: () => 50,
      save: async function save() {
        return this;
      },
    }),
  });
  Cart.findOne = () => ({
    _id: "cart-2",
    user: "user-1",
    abandonmentStatus: "completed",
    abandonmentCycleId: "cycle-2",
    items: [{ price: 500, quantity: 1 }],
    save: async function save() {
      return this;
    },
  });

  try {
    const result = await validateAndApplyAbandonedCartCoupon({
      code: "SAVE10",
      userId: "user-1",
      cartId: "cart-2",
    });

    assert.equal(result.success, false);
    assert.equal(result.message, "Your cart has already been checked out");
  } finally {
    AbandonedCartCoupon.findOne = originalCouponFindOne;
    Cart.findOne = originalCartFindOne;
  }
});
