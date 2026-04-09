import test, { mock } from "node:test";
import assert from "node:assert/strict";

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

const createThenableQuery = (result) => {
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
      return Promise.resolve(result);
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
    catch(reject) {
      return Promise.resolve(result).catch(reject);
    },
  };

  return query;
};

const createUserDoc = ({ _id, name, email, phoneNumber }) => {
  const user = {
    _id,
    name,
    email,
    phoneNumber,
    select() {
      return user;
    },
    lean() {
      return Promise.resolve({
        _id,
        name,
        email,
        phoneNumber,
      });
    },
  };

  return user;
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

test("abandoned-cart CTA, checkout completion, and recovered revenue update end to end", async () => {
  setBaseEnv();

  const [
    { buildAbandonedCartOrderUrl },
    razorpayModule,
    { default: Order },
    { default: Cart },
    { default: User },
    { default: Product },
    { default: Settings },
    paymentService,
    salesController,
  ] = await Promise.all([
    import("../queues/abandonedCart.queue.js?e2e-test=1"),
    import("../config/razorpay.js"),
    import("../models/order.model.js"),
    import("../models/cart.model.js"),
    import("../models/user.model.js"),
    import("../models/product.model.js"),
    import("../models/settings.model.js"),
    import("../services/payment.service.js?e2e-test=1"),
    import("../controllers/sales.controller.js?e2e-test=1"),
  ]);

  const orderProto = Object.getPrototypeOf(Order);
  const cartProto = Object.getPrototypeOf(Cart);
  const userProto = Object.getPrototypeOf(User);
  const productProto = Object.getPrototypeOf(Product);
  const settingsProto = Object.getPrototypeOf(Settings);

  const mockedMethods = [];

  const userId = "user-cta-1";
  const cartId = "cart-cta-1";
  const cycleId = "cycle-cta-1";
  const paymentLinkId = "plink-cta-1";
  const orderId = "order-cta-1";
  const totalPrice = 1299;

  const userDoc = createUserDoc({
    _id: userId,
    name: "Asha",
    email: "asha@example.com",
    phoneNumber: "+91 98765 43210",
  });

  const productDoc = {
    _id: "product-1",
    name: "Silk Kurta",
    stock: 5,
    orderStats: {
      totalOrders: 0,
      totalRevenue: 0,
    },
    save: async function save() {
      return this;
    },
  };

  const abandonedCartDoc = {
    _id: cartId,
    user: userId,
    email: userDoc.email,
    phoneNumber: userDoc.phoneNumber,
    items: [
      {
        product: "product-1",
        quantity: 1,
        size: "M",
        color: "Ivory",
        variantImage: null,
        price: totalPrice,
        discountPrice: 0,
      },
    ],
    cartTrackingId: `cart-${cartId}`,
    abandonmentStatus: "abandoned",
    abandonedAt: new Date("2026-04-04T12:00:00.000Z"),
    abandonmentCycleId: null,
    abandonmentReminderJobIds: {},
    abandonmentReminderAttempts: [],
    completedAt: null,
    save: async function save() {
      return this;
    },
  };

  const createdOrders = [];
  const orderById = new Map();

  const orderDoc = {
    _id: orderId,
    user: userId,
    orderItems: [
      {
        product: "product-1",
        name: "Silk Kurta",
        image: "https://example.invalid/product.jpg",
        price: totalPrice,
        quantity: 1,
        variant: { size: "M", color: "Ivory" },
      },
    ],
    shippingAddress: {
      fullName: "Asha",
      phoneNumber: "+91 98765 43210",
      addressLine1: "12 Market Street",
      city: "Jaipur",
      state: "Rajasthan",
      postalCode: "302001",
      country: "India",
    },
    billingAddress: {
      fullName: "Asha",
      phoneNumber: "+91 98765 43210",
      addressLine1: "12 Market Street",
      city: "Jaipur",
      state: "Rajasthan",
      postalCode: "302001",
      country: "India",
    },
    paymentInfo: {
      id: "pay_pending",
      status: "Pending",
      method: "Online",
    },
    couponId: null,
    couponCode: "",
    discountPrice: 0,
    itemsPrice: totalPrice,
    taxPrice: 0,
    shippingPrice: 0,
    totalPrice,
    recoverySource: "email",
    recoveryStage: 1,
    recoveryCartId: cartId,
    recoveryCycleId: cycleId,
    recoveredAt: null,
    purchaseSource: "cart",
    orderStatus: "Processing",
    paidAt: null,
    shiprocketOrderId: null,
    shipmentId: null,
    save: async function save() {
      orderById.set(this._id, this);
      return this;
    },
  };

  try {
    mockedMethods.push(
      mock.method(razorpayModule.default.paymentLink, "create", async (options) => {
        assert.equal(options.reference_id, orderId);
        assert.equal(options.amount, totalPrice * 100);
        return {
          id: paymentLinkId,
          status: "created",
          reference_id: orderId,
        };
      }),
    );
    mockedMethods.push(
      mock.method(razorpayModule.default.paymentLink, "fetch", async (id) => {
        assert.equal(id, paymentLinkId);
        return {
          id: paymentLinkId,
          status: "paid",
          reference_id: orderId,
        };
      }),
    );

    mockedMethods.push(
      mock.method(orderProto, "create", async (data) => {
        const order = {
          ...orderDoc,
          ...data,
          paymentInfo: { ...orderDoc.paymentInfo, ...(data.paymentInfo || {}) },
          save: orderDoc.save,
        };

        createdOrders.push(order);
        orderById.set(order._id, order);
        return order;
      }),
    );
    mockedMethods.push(
      mock.method(orderProto, "findById", async (id) => orderById.get(id) || null),
    );
    mockedMethods.push(
      mock.method(orderProto, "findByIdAndUpdate", async (id, update = {}) => {
        const order = orderById.get(id);
        if (!order) return null;

        Object.assign(order, update);
        if (update.$set) Object.assign(order, update.$set);
        return order;
      }),
    );
    mockedMethods.push(
      mock.method(orderProto, "aggregate", async () => {
        const groups = new Map();

        for (const order of createdOrders) {
          if (
            !order.recoveredAt ||
            !["email", "whatsapp", "sms"].includes(order.recoverySource) ||
            ![1, 2, 3, 4].includes(Number(order.recoveryStage))
          ) {
            continue;
          }

          const key = `${order.recoverySource}:${order.recoveryStage}`;
          const entry = groups.get(key) || {
            _id: {
              source: order.recoverySource,
              stage: Number(order.recoveryStage),
            },
            totalRecoveredAmount: 0,
            recoveredOrders: 0,
          };

          entry.totalRecoveredAmount += Number(order.totalPrice || 0);
          entry.recoveredOrders += 1;
          groups.set(key, entry);
        }

        return [...groups.values()];
      }),
    );

    mockedMethods.push(
      mock.method(cartProto, "findOne", () => createThenableQuery(abandonedCartDoc)),
    );
    mockedMethods.push(
      mock.method(cartProto, "findOneAndUpdate", async (_filter, update = {}) => {
        if (update?.$set?.items) {
          abandonedCartDoc.items = update.$set.items;
        }
        return abandonedCartDoc;
      }),
    );
    mockedMethods.push(
      mock.method(cartProto, "find", () => createThenableQuery([])),
    );

    mockedMethods.push(
      mock.method(userProto, "findById", (id) => {
        assert.equal(id, userId);
        return userDoc;
      }),
    );
    mockedMethods.push(mock.method(userProto, "findByIdAndUpdate", async () => userDoc));
    mockedMethods.push(
      mock.method(productProto, "findById", () => productDoc),
    );
    mockedMethods.push(
      mock.method(settingsProto, "findOne", async () => ({
        platformFee: 0,
        freeShippingThreshold: 0,
        shippingFee: 0,
      })),
    );

    const ctaUrl = buildAbandonedCartOrderUrl(cartId, {
      source: "email",
      stage: 1,
      cycleId,
    });
    const parsed = new URL(ctaUrl);

    assert.equal(parsed.pathname, "/checkout");
    assert.equal(parsed.searchParams.get("cartId"), cartId);
    assert.equal(parsed.searchParams.get("recoverySource"), "email");
    assert.equal(parsed.searchParams.get("recoveryStage"), "1");
    assert.equal(parsed.searchParams.get("recoveryCycleId"), cycleId);

    const order = await Order.create({
      user: userId,
      orderItems: abandonedCartDoc.items.map((item) => ({
        product: item.product,
        name: "Silk Kurta",
        image: "https://example.invalid/product.jpg",
        price: item.price,
        quantity: item.quantity,
        variant: {
          size: item.size,
          color: item.color,
        },
      })),
      shippingAddress: abandonedCartDoc.shippingAddress || {
        fullName: "Asha",
        phoneNumber: "+91 98765 43210",
        addressLine1: "12 Market Street",
        city: "Jaipur",
        state: "Rajasthan",
        postalCode: "302001",
        country: "India",
      },
      billingAddress: abandonedCartDoc.billingAddress,
      paymentInfo: {
        id: "pay_pending",
        status: "Pending",
        method: "Online",
      },
      totalPrice,
      itemsPrice: totalPrice,
      shippingPrice: 0,
      taxPrice: 0,
      recoverySource: parsed.searchParams.get("recoverySource"),
      recoveryStage: Number(parsed.searchParams.get("recoveryStage")),
      recoveryCartId: parsed.searchParams.get("cartId"),
      recoveryCycleId: parsed.searchParams.get("recoveryCycleId"),
    });

    assert.equal(order._id, orderId);
    assert.equal(order.recoverySource, "email");

    const paymentLink = {
      id: paymentLinkId,
      status: "created",
      reference_id: orderId,
    };

    assert.equal(paymentLink.id, paymentLinkId);
    assert.equal(paymentLink.reference_id, orderId);

    order.paymentInfo.status = "Paid";
    order.paymentInfo.id = "pay_123456";
    order.paidAt = new Date();
    order.recoveredAt = new Date();
    await order.save();

    assert.equal(order.paymentInfo.status, "Paid");
    assert.ok(order.recoveredAt instanceof Date);

    abandonedCartDoc.abandonmentStatus = "completed";
    abandonedCartDoc.completedAt = new Date();

    const req = { query: { limit: "10" } };
    const res = createResponseStub();
    await salesController.getAbandonedCarts(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonPayload.success, true);
    assert.equal(res.jsonPayload.recoveredAmount, totalPrice);
    assert.equal(res.jsonPayload.recoveryStats.length, 1);
    assert.equal(res.jsonPayload.recoveryStats[0]._id.source, "email");
    assert.equal(res.jsonPayload.recoveryStats[0]._id.stage, 1);
    assert.equal(res.jsonPayload.recoveryStats[0].totalRecoveredAmount, totalPrice);
    assert.equal(res.jsonPayload.recoveryStats[0].recoveredOrders, 1);
  } finally {
    for (const mocked of mockedMethods.reverse()) {
      mocked.mock.restore();
    }
  }
});
