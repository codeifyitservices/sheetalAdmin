import * as paymentService from "../services/payment.service.js";
import successResponse from "../utils/successResponse.js";
import ErrorResponse from "../utils/ErrorResponse.js";

export const createPaymentLink = async (req, res, next) => {
  try {
    const {
      addressId,
      callbackUrl,
      items,
      shippingAddress,
      billingAddress,
      buyNowItems,
      cartItems,
      couponId,
      couponCode,
      discountPrice,
      recoverySource,
      recoveryStage,
      recoveryCartId,
      recoveryCycleId,
    } = req.body;

    // Validate inputs
    if (!shippingAddress) {
      return next(ErrorResponse("Shipping address is required", 400));
    }

    if (!callbackUrl) {
      return next(ErrorResponse("Callback URL is required", 400));
    }

    // Format address if needed
    const formattedAddress = {
      ...shippingAddress,
      fullName:
        shippingAddress.fullName ||
        `${shippingAddress.firstName} ${shippingAddress.lastName}`,
    };

    const validatedMergedBillingAddress = {
      ...formattedAddress,
      ...billingAddress,
      fullName: billingAddress?.fullName || formattedAddress.fullName,
      phoneNumber:
        billingAddress?.phoneNumber ||
        formattedAddress.phoneNumber ||
        shippingAddress.phoneNumber ||
        "",
      addressLine1:
        billingAddress?.addressLine1 ||
        formattedAddress.addressLine1 ||
        shippingAddress.addressLine1 ||
        "",
      city:
        billingAddress?.city ||
        formattedAddress.city ||
        shippingAddress.city ||
        "",
      state:
        billingAddress?.state ||
        formattedAddress.state ||
        shippingAddress.state ||
        "",
      postalCode:
        billingAddress?.postalCode ||
        formattedAddress.postalCode ||
        shippingAddress.postalCode ||
        "",
      country:
        billingAddress?.country ||
        formattedAddress.country ||
        shippingAddress.country ||
        "India",
    };

    // Call service to create payment link
    const paymentLink = await paymentService.createPaymentLinkService(
      req.user._id,
      formattedAddress,
      validatedMergedBillingAddress,
      callbackUrl,
      buyNowItems,
      cartItems,
      {
        couponId,
        couponCode,
        discountPrice,
      },
      {
        recoverySource,
        recoveryStage,
        recoveryCartId,
        recoveryCycleId,
      },
    );

    return successResponse(
      res,
      200,
      paymentLink,
      "Payment link created successfully",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/payment/verify
 *
 * Called by the frontend after Razorpay redirects back to /checkout/success.
 * Verifies signature, marks order as Paid, clears cart, pushes to Shiprocket.
 * Works without webhooks — works in local dev AND production.
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const order = await paymentService.verifyOnlinePaymentService(req.body);
    return successResponse(
      res,
      200,
      order,
      "Payment verified and order confirmed",
    );
  } catch (err) {
    next(err);
  }
};
