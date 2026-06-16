/**
 * @fileoverview Shiprocket Integration Service
 *
 * Handles all communication with the Shiprocket REST API.
 * Base URL: https://apiv2.shiprocket.in/v1/external
 *
 * Token lifecycle:
 *  - Shiprocket JWT tokens are valid for 10 days (240 hours)
 *  - We cache the token in memory and auto-refresh when expired
 *  - No external lib needed — plain fetch (Node 18+)
 *
 * Exported functions:
 *  - createShiprocketOrder(order, user)  → creates order on Shiprocket
 *  - assignAwbService(shipmentId, courierId?) → assigns AWB to a shipment
 */

import dotenv from "dotenv";
dotenv.config();

const SR_BASE = "https://apiv2.shiprocket.in/v1/external";

// ---------------------------------------------------------------------------
// Token Cache — in-memory, server lifetime
// ---------------------------------------------------------------------------

let _cachedToken = null;
let _tokenExpiresAt = 0; // Unix ms timestamp

/**
 * Returns a valid Shiprocket Bearer token.
 * Auto-authenticates or re-authenticates when token is expired.
 *
 * @returns {Promise<string>} Bearer token
 */
const getToken = async () => {
  const now = Date.now();

  // Token still valid (with 1-hour safety buffer before actual expiry)
  if (_cachedToken && now < _tokenExpiresAt - 60 * 60 * 1000) {
    return _cachedToken;
  }

  // Authenticate fresh
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Shiprocket credentials missing. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in .env",
    );
  }

  const res = await fetch(`${SR_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok || !data.token) {
    throw new Error(
      `Shiprocket authentication failed: ${data.message || res.statusText}`,
    );
  }

  _cachedToken = data.token;
  // Token valid 10 days = 240 hours from now
  _tokenExpiresAt = now + 240 * 60 * 60 * 1000;

  return _cachedToken;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Makes an authenticated JSON request to the Shiprocket API.
 *
 * @param {string} path - API path (e.g. "/orders/create/adhoc")
 * @param {string} method - HTTP method
 * @param {Object} [body] - Request body
 * @returns {Promise<Object>} Parsed JSON response
 */
const srFetch = async (path, method = "GET", body = null) => {
  const token = await getToken();

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${SR_BASE}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    console.error(
      "[Shiprocket] Full error response:",
      JSON.stringify(data, null, 2),
    );
    const errMsg =
      data.message ||
      (data.errors ? JSON.stringify(data.errors) : res.statusText);
    throw new Error(`Shiprocket API error [${res.status}]: ${errMsg}`);
  }

  return data;
};

/**
 * Splits a full name string into first and last name parts.
 * Shiprocket requires them separately.
 *
 * @param {string} fullName
 * @returns {{ firstName: string, lastName: string }}
 */
const splitName = (fullName = "") => {
  const parts = fullName.trim().split(" ");
  const firstName = parts[0] || "Customer";
  const lastName = parts.slice(1).join(" ") || ".";
  return { firstName, lastName };
};

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Creates an order on Shiprocket after a successful order in our system.
 *
 * Maps our MongoDB Order + User documents into Shiprocket's required format.
 * Returns the Shiprocket order_id and shipment_id to be stored on our Order.
 *
 * @param {Object} order  - Mongoose Order document (lean or populated)
 * @param {Object} user   - Mongoose User document
 * @returns {Promise<{ shiprocketOrderId: number, shipmentId: number }>}
 */
export const createShiprocketOrder = async (order, user) => {
  const addr = order.shippingAddress;
  const { firstName, lastName } = splitName(addr.fullName);
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || "Primary";

  // Map payment method: our schema uses "COD" | "Online"
  const paymentMethod = order.paymentInfo?.method === "COD" ? "COD" : "Prepaid";

  // Build order items array for Shiprocket
  const orderItems = order.orderItems.map((item) => ({
    name: item.name,
    sku: item.variant?.v_sku || item.product?.toString() || "SKU-NA",
    units: item.quantity,
    selling_price: item.price,
    discount: 0,
    tax: 0,
    hsn: 0,
  }));

  // Format order date as yyyy-mm-dd (Shiprocket requirement)
  const orderDate = new Date(order.createdAt || Date.now())
    .toISOString()
    .split("T")[0];

  // Sanitise phone — Shiprocket requires a Number with exactly 10 digits (no +91)
  const rawPhone = String(addr.phoneNumber || "").replace(/\D/g, "");
  const billingPhone = Number(
    rawPhone.length === 12 && rawPhone.startsWith("91")
      ? rawPhone.slice(2) // strip "91" prefix → 10 digits
      : rawPhone.slice(-10), // take last 10 digits for any other format
  );

  // Sanitise pincode — Shiprocket requires a Number, not a string
  const billingPincode = Number(
    String(addr.postalCode || "").replace(/\D/g, ""),
  );

  const payload = {
    // Order identity
    order_id: order._id.toString(),
    order_date: orderDate,
    pickup_location: pickupLocation,

    // Billing address
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: addr.addressLine1,
    billing_address_2: addr.addressLine2 || "",
    billing_city: addr.city,
    billing_pincode: billingPincode,
    billing_state: addr.state,
    billing_country: addr.country || "India",
    billing_email: user?.email || "customer@sheetal.com",
    billing_phone: billingPhone,

    // Shipping same as billing (required by Shiprocket as boolean true)
    shipping_is_billing: true,
    shipping_customer_name: "",
    shipping_last_name: "",
    shipping_address: "",
    shipping_address_2: "",
    shipping_city: "",
    shipping_pincode: "",
    shipping_country: "",
    shipping_state: "",
    shipping_email: "",
    shipping_phone: "",

    // Order items
    order_items: orderItems,

    // Payment
    payment_method: paymentMethod,

    // Charges (required by API even if zero)
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: order.totalPrice,

    // Package dimensions
    length: 30, // cm
    breadth: 25, // cm
    height: 5, // cm
    weight: 0.5, // kg
  };

  const response = await srFetch("/orders/create/adhoc", "POST", payload);

  // Shiprocket returns order_id (their ID) and shipment_id
  const shiprocketOrderId = response.order_id;
  const shipmentId = response.shipment_id;

  if (!shiprocketOrderId || !shipmentId) {
    throw new Error(
      `Shiprocket order creation returned unexpected response: ${JSON.stringify(response)}`,
    );
  }

  return { shiprocketOrderId, shipmentId };
};

/**
 * Assigns an AWB (Air Waybill) number to a Shiprocket shipment.
 *
 * Must be called AFTER createShiprocketOrder so we have a valid shipmentId.
 * If courierId is not supplied, Shiprocket auto-selects the best available
 * courier for the route.
 *
 * @param {number} shipmentId  - The shipment_id returned by createShiprocketOrder
 * @param {number} [courierId] - Optional: specific Shiprocket courier company ID
 * @returns {Promise<{ awbCode: string, courierName: string }>}
 */
export const assignAwbService = async (shipmentId, courierId = null) => {
  const payload = { shipment_id: String(shipmentId) };
  if (courierId) payload.courier_id = String(courierId);

  const response = await srFetch("/courier/assign/awb", "POST", payload);

  // Shiprocket nests the result under response.response.data
  const data = response?.response?.data;

  const awbCode = data?.awb_code || response?.awb_code || null;
  const courierName = data?.courier_name || response?.courier_name || null;

  if (!awbCode) {
    console.error(
      "[Shiprocket] AWB assign response:",
      JSON.stringify(response, null, 2),
    );
    throw new Error(
      `AWB assignment failed — no awb_code in response. Shiprocket message: ${
        response?.response?.message || JSON.stringify(response)
      }`,
    );
  }

  return { awbCode, courierName };
};
