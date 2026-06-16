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

const createLeanQuery = (value) => ({
  lean() {
    return Promise.resolve(value);
  },
});

test("cart add and COD order creation tolerate malformed legacy cart and product state", async () => {
  setBaseEnv();

  const [
    { default: Cart },
    { default: Product },
    { default: User },
    { default: Order },
    cartService,
    orderService,
  ] = await Promise.all([
    import("../models/cart.model.js"),
    import("../models/product.model.js"),
    import("../models/user.model.js"),
    import("../models/order.model.js"),
    import("../services/cart.service.js?checkout-flow-test=1"),
    import("../services/order.service.js?checkout-flow-test=1"),
  ]);

  const userId = "507f1f77bcf86cd799439011";
  const productId = "507f1f77bcf86cd799439012";
  const cartId = "507f1f77bcf86cd799439013";

  let findOneCalls = 0;
  let savedCartSnapshot = null;
  let capturedInventoryUpdate = null;
  let capturedInventoryOptions = null;
  let createdOrderPayload = null;

  const cartDoc = {
    _id: cartId,
    user: userId,
    items: [],
    abandonmentReminderAttempts: [
      { stage: "first" },
      { stage: "second", jobId: "job-2" },
      { stage: "third", jobId: "job-3", status: "success" },
    ],
    async save() {
      savedCartSnapshot = {
        items: this.items.map((item) => ({ ...item })),
        abandonmentReminderAttempts: [...this.abandonmentReminderAttempts],
      };
      return this;
    },
  };

  const mockedMethods = [
    mock.method(Cart, "findOne", (filter) => {
      findOneCalls += 1;

      if (findOneCalls === 1) {
        assert.deepEqual(filter, { user: userId });
        return Promise.resolve(cartDoc);
      }

      return createLeanQuery({ user: userId, appliedAbandonedCoupon: null });
    }),
    mock.method(Product, "findById", async (id) => {
      assert.equal(id, productId);
      return {
        _id: productId,
        name: "Legacy Product",
      };
    }),
    mock.method(
      Product,
      "findOneAndUpdate",
      async (filter, update, options) => {
        capturedInventoryUpdate = update;
        capturedInventoryOptions = options;

        assert.equal(filter._id, productId);
        assert.deepEqual(filter.stock, { $gte: 2 });

        return {
          _id: productId,
          stock: 8,
          orderStats: "[object Object]",
        };
      },
    ),
    mock.method(User, "findById", (id) => {
      assert.equal(id, userId);
      return createLeanQuery({
        _id: userId,
        name: "Checkout User",
        email: "checkout@example.com",
      });
    }),
    mock.method(Order, "create", async (payload) => {
      createdOrderPayload = payload;
      return {
        _id: "507f1f77bcf86cd799439014",
        ...payload,
      };
    }),
    mock.method(global, "setImmediate", () => 0),
  ];

  try {
    const addResult = await cartService.addToCartService(
      userId,
      productId,
      2,
      "M",
      "Blue",
      2500,
      1999,
      "https://example.com/image.jpg",
    );

    assert.equal(addResult.success, true);
    assert.equal(savedCartSnapshot.items.length, 1);
    assert.deepEqual(savedCartSnapshot.abandonmentReminderAttempts, [
      { stage: "third", jobId: "job-3", status: "success" },
    ]);

    const order = await orderService.createOrderService(
      {
        orderItems: [
          {
            product: productId,
            name: "Legacy Product",
            image: "https://example.com/image.jpg",
            price: 1999,
            quantity: 2,
            variant: {
              size: "M",
              color: "Blue",
              v_sku: "LEGACY-BLUE-M",
            },
          },
        ],
        shippingAddress: {
          fullName: "Checkout User",
          phoneNumber: "9999999999",
          addressLine1: "123 Test Street",
          city: "Jaipur",
          state: "Rajasthan",
          postalCode: "302001",
          country: "India",
        },
        paymentInfo: {
          method: "COD",
          status: "Pending",
        },
        itemsPrice: 3998,
        totalPrice: 3998,
      },
      { _id: userId, role: "user" },
    );

    assert.equal(order.user, userId);
    assert.equal(createdOrderPayload.inventoryAdjusted, true);
    assert.ok(Array.isArray(capturedInventoryUpdate));
    assert.equal(capturedInventoryOptions.updatePipeline, true);
  } finally {
    mockedMethods.reverse().forEach((mocked) => mocked.mock.restore());
  }
});
