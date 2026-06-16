import sendEmail from "../utils/sendEmail.js";

const formatCurrency = (value) => `₹${Number(value || 0).toFixed(2)}`;

const buildAddressLines = (address = {}) => {
  const line1 = address.addressLine1 || "";
  const line2 = [address.city, address.state].filter(Boolean).join(", ");
  const line3 = [address.postalCode, address.country || "India"]
    .filter(Boolean)
    .join(" ");

  return [line1, line2, line3].filter(Boolean);
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildItemRows = (items = []) =>
  items
    .map((item) => {
      const safeName = escapeHtml(item.name || "Product");
      const safeQty = escapeHtml(item.qty ?? "");
      const safePrice = escapeHtml(item.price ?? "");
      const safeTotal = escapeHtml(item.total ?? "");

      return `
        <tr>
          <td style="border:1px solid #ddd;font-size:14px;">${safeName}</td>
          <td style="border:1px solid #ddd;font-size:14px;">${safeQty}</td>
          <td style="border:1px solid #ddd;font-size:14px;">${safePrice}</td>
          <td style="border:1px solid #ddd;font-size:14px;">${safeTotal}</td>
        </tr>`;
    })
    .join("");

export const orderConfirmationTemplate = (data) => {
  const bannerMarkup = data.bannerUrl
    ? `<tr><td align="center" style="padding:0;"><img src="${data.bannerUrl}" alt="Studio By Sheetal" width="600" style="height:auto;display:block;border:0;"></td></tr>`
    : `<tr><td align="center" style="padding:28px 20px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;"><p style="margin:0;font-size:18px;font-weight:700;color:#111827;">Studio By Sheetal</p></td></tr>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Order Confirmation - Studio By Sheetal</title>
    <style>
      table, td, div, h1, h2, h3, p { font-family: Arial, sans-serif; }
    </style>
  </head>
  <body style="margin:20px;padding:0;background:#ffffff;">
    <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;background:#ffffff;">
      <tbody>
        <tr>
          <td align="center" style="padding:0;">
            <table role="presentation" style="width:602px;border-collapse:collapse;border:1px solid #16690094;border-spacing:0;text-align:left;">
              <tbody>
                ${bannerMarkup}
                <tr>
                  <td style="padding:36px 30px 42px 30px;">
                    <table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;">
                      <tbody>
                        <tr>
                          <td style="text-align:center;color:#9e5900;border-bottom:1px solid #9e5900;">
                            <h2 style="margin:12px 0;font-size:24px;">Order Confirmed</h2>
                          </td>
                        </tr>
                        <tr>
                          <td style="text-align:center;color:#9e5900;padding:8px 0;">&nbsp;</td>
                        </tr>
                        <tr>
                          <td style="padding:0 0 36px 0;color:#153643;">
                            <p style="margin:0 0 12px 0;font-size:20px;line-height:24px;">
                              Dear ${data.userName},
                            </p>
                            <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">
                              Thank you for your order. Here are your order details:
                            </p>
                            <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">
                              <strong>Submitted on:</strong> ${data.submittedOn}
                            </p>
                            <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">
                              <strong>Order ID:</strong> ${data.orderId}
                            </p>
                            <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">
                              <strong>Order Date:</strong> ${data.orderDate}
                            </p>
                            <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">
                              <strong>Status:</strong> ${data.orderStatus}
                            </p>
                            <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">
                              <h3 style="margin:8px 0;font-size:18px;">Products</h3>
                            </p>
                            <table cellpadding="10" cellspacing="0" style="border-collapse:collapse;width:100%;">
                              <thead style="background:#f2f2f2;">
                                <tr>
                                  <th style="border:1px solid #ddd;font-size:14px;text-align:left;">Product</th>
                                  <th style="border:1px solid #ddd;font-size:14px;text-align:left;">QTY.</th>
                                  <th style="border:1px solid #ddd;font-size:14px;text-align:left;">Price</th>
                                  <th style="border:1px solid #ddd;font-size:14px;text-align:left;">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${buildItemRows(data.items)}
                                <tr>
                                  <td colspan="4" style="padding:10px;">
                                    <h3 style="margin:8px 0;font-size:18px;">Order Summary</h3>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="border:1px solid #ddd;font-size:14px;">Subtotal:</td>
                                  <td colspan="3" style="border:1px solid #ddd;font-size:14px;text-align:right;">${data.subtotal}</td>
                                </tr>
                                <tr>
                                  <td style="border:1px solid #ddd;font-size:14px;">Shipping:</td>
                                  <td colspan="3" style="border:1px solid #ddd;font-size:14px;text-align:right;">${data.shipping}</td>
                                </tr>
                                <tr>
                                  <td style="border:1px solid #ddd;font-size:14px;"><strong>Total:</strong></td>
                                  <td colspan="3" style="border:1px solid #ddd;font-size:14px;text-align:right;"><strong>${data.total}</strong></td>
                                </tr>
                              </tbody>
                            </table>
                            <p style="margin:20px 0 12px 0;font-size:15px;line-height:24px;">
                              <strong>Shipping Address:</strong>
                            </p>
                            <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">
                              <strong>${data.shippingName}</strong><br>
                              ${data.shippingLine1}<br>
                              ${data.shippingLine2}<br>
                              ${data.shippingLine3}
                            </p>
                            <p style="margin:20px 0 12px 0;font-size:15px;line-height:24px;">
                              We will process your order once payment is confirmed. You will receive updates on your order status.
                            </p>
                            <p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">
                              <strong>Best regards,</strong><br>
                              Studio By Sheetal Team
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
};

export const sendOrderConfirmationEmail = async ({ order, user }) => {
  if (!user?.email) return { success: false, skipped: true };

  const items = (order.orderItems || []).map((item) => ({
    name: item.name || "Product",
    qty: item.quantity || 1,
    price: formatCurrency(item.price || 0),
    total: formatCurrency((item.price || 0) * (item.quantity || 1)),
  }));

  const shippingLines = buildAddressLines(order.shippingAddress);
  const bannerUrl =
    process.env.STORE_BANNER_URL || process.env.STORE_LOGO_URL || "";

  await sendEmail({
    email: user.email,
    subject: `Your order ${order._id} is confirmed`,
    html: orderConfirmationTemplate({
      userName: user.name || order.shippingAddress?.fullName || "Customer",
      submittedOn: new Date(order.createdAt || Date.now()).toLocaleString(
        "en-IN",
      ),
      orderId: order._id,
      orderDate: new Date(order.createdAt || Date.now()).toLocaleString(
        "en-IN",
      ),
      orderStatus: order.orderStatus || "Processing",
      items,
      subtotal: formatCurrency(order.itemsPrice || 0),
      shipping:
        order.shippingPrice > 0 ? formatCurrency(order.shippingPrice) : "FREE",
      total: formatCurrency(order.totalPrice || 0),
      shippingName: order.shippingAddress?.fullName || user.name || "Customer",
      shippingLine1: shippingLines[0] || "",
      shippingLine2: shippingLines[1] || "",
      shippingLine3: shippingLines[2] || "",
      bannerUrl: bannerUrl || undefined,
    }),
  });

  return { success: true };
};
