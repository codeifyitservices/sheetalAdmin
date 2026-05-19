import * as orderService from "../services/order.service.js";
import successResponse from "../utils/successResponse.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { createShiprocketOrder, assignAwbService } from "../services/shiprocket.service.js";

// --- 1. CREATE ORDER ---
export const createOrder = async (req, res, next) => {
  try {
    const data = await orderService.createOrderService(req.body, req.user);
    return successResponse(res, 201, data, "Order place ho gaya successfully!");
  } catch (error) {
    next(error);
  }
};

// --- 2. GET MY ORDERS (Paginated) ---
export const getMyOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrdersService(
      req.query,
      req.user._id,
    );

    // Yahan 'result' mein orders aur pagination dono hain
    // Hum pura result hi bhej denge taaki frontend ko page numbers mil sakein
    return successResponse(
      res,
      200,
      result,
      "Your orders fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

// --- 3. GET SINGLE ORDER (User — must own the order) ---
export const getSingleOrder = async (req, res, next) => {
  try {
    const data = await orderService.getSingleOrderService(
      req.params.id,
      req.user._id,
    );
    return successResponse(res, 200, data, "Order fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const adminGetSingleOrder = async (req, res, next) => {
  try {
    const data = await orderService.getSingleOrderAdminService(req.params.id);
    return successResponse(res, 200, data, "Order fetched successfully");
  } catch (error) {
    next(error);
  }
};

// --- 4. ADMIN: GET ALL ORDERS (Paginated + Filters) ---
export const adminGetAllOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrdersService(req.query);
    return successResponse(res, 200, result, "All orders fetched for admin");
  } catch (error) {
    next(error);
  }
};

// --- 4. UPDATE ORDER STATUS (Admin) ---
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const trackingId = req.body.trackingId || req.body.shippingInfo?.trackingId;
    const courierPartner = req.body.courierPartner || req.body.shippingInfo?.carrier || req.body.shippingInfo?.courierPartner;
    const data = await orderService.updateOrderStatusService(
      req.params.id,
      status,
      { trackingId, courierPartner },
    );
    return successResponse(res, 200, data, `Order status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

export const updateOrderItemStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const data = await orderService.updateOrderItemStatusService(
      req.params.id,
      req.params.itemId,
      status,
    );
    return successResponse(
      res,
      200,
      data,
      `Order item status updated to ${status}`,
    );
  } catch (error) {
    next(error);
  }
};
// --- 5. ADMIN: Manually Push Order to Shiprocket ---
/**
 * POST /api/v1/orders/admin/push-to-shiprocket/:orderId
 *
 * Manually pushes an existing order to Shiprocket.
 * Useful for:
 *  - Testing the Shiprocket integration without ngrok
 *  - Re-pushing orders that failed to sync automatically
 *  - Forcing a sync for Online orders before webhook is configured
 *
 * @returns Shiprocket order ID, shipment ID, and order details
 */
export const pushToShiprocket = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Warn if already on Shiprocket but still allow re-push (for testing)
    if (order.shiprocketOrderId) {
      console.warn(
        `[Admin] Order ${order._id} already has SR ID: ${order.shiprocketOrderId}. Re-pushing...`
      );
    }

    const user = await User.findById(order.user).lean();
    const { shiprocketOrderId, shipmentId } = await createShiprocketOrder(order, user);

    // Save Shiprocket IDs back to the order
    await Order.findByIdAndUpdate(order._id, { shiprocketOrderId, shipmentId });

    return successResponse(res, 200, {
      orderId: order._id,
      shiprocketOrderId,
      shipmentId,
    }, `Order successfully pushed to Shiprocket`);
  } catch (error) {
    next(error);
  }
};

// --- 6. ADMIN: Assign AWB to a Shiprocket Shipment ---
/**
 * POST /api/v1/orders/admin/assign-awb/:orderId
 *
 * Calls Shiprocket's /courier/assign/awb endpoint for a given order.
 * The order must already have a shipmentId (from pushToShiprocket).
 * Optionally accepts a courierId in the request body; if omitted,
 * Shiprocket auto-selects the best courier for the route.
 *
 * On success, saves awbCode + courierPartner back to our Order.
 *
 * @returns Updated awbCode and courierPartner
 */
export const assignAwb = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!order.shipmentId) {
      return res.status(400).json({
        success: false,
        message: "Order has no Shiprocket shipment ID. Push to Shiprocket first.",
      });
    }

    if (order.awbCode) {
      console.warn(`[Admin] Order ${order._id} already has AWB: ${order.awbCode}. Re-assigning...`);
    }

    const { courierId } = req.body; // optional
    const { awbCode, courierName } = await assignAwbService(order.shipmentId, courierId);

    // Persist AWB details onto the Order document
    await Order.findByIdAndUpdate(order._id, {
      awbCode,
      courierPartner: courierName || order.courierPartner,
    });

    return successResponse(res, 200, {
      orderId: order._id,
      awbCode,
      courierName,
    }, `AWB assigned successfully: ${awbCode}`);
  } catch (error) {
    next(error);
  }
};

// --- 7. ADMIN: GET ORDER STATS (Server-side aggregation) ---
export const adminGetOrderStats = async (req, res, next) => {
  try {
    const dateFilter = {};

    if (req.query.startDate || req.query.endDate) {
      if (req.query.startDate) {
        const start = new Date(req.query.startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.$gte = start;
      }

      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
    }

    const createdAtMatch =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [totalOrders, processing, shipped, delivered, revenueResult] =
      await Promise.all([
        Order.countDocuments(createdAtMatch),
        Order.countDocuments({ ...createdAtMatch, orderStatus: "Processing" }),
        Order.countDocuments({ ...createdAtMatch, orderStatus: "Shipped" }),
        Order.countDocuments({ ...createdAtMatch, orderStatus: "Delivered" }),
        Order.aggregate([
          {
            $match: {
              ...createdAtMatch,
              orderStatus: { $nin: ["Cancelled", "Returned"] },
            },
          },
          { $group: { _id: null, total: { $sum: "$totalPrice" } } },
        ]),
      ]);

    return successResponse(res, 200, {
      totalOrders,
      processing,
      shipped,
      delivered,
      totalRevenue: revenueResult[0]?.total || 0,
    }, "Order stats fetched");
  } catch (error) {
    next(error);
  }
};
