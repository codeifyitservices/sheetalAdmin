// ─────────────────────────────────────────────────────────────────────────────
// Abandoned Cart Recovery Email
// ─────────────────────────────────────────────────────────────────────────────

import {
  SMTP_MAIL,
  createMailTransport,
  ensureEmailConfig,
} from "../utils/mailTransport.js";

const transporter = createMailTransport();

function buildAbandonedCartEmailHtml({ name, items, cartValue }) {
  const firstName = name?.split(" ")[0] || "there";
  const storeName = process.env.STORE_NAME || "Our Store";
  const logoUrl = process.env.STORE_LOGO_URL || "";

  // ── Item rows ────────────────────────────────────────────────────────────
  const itemRows = items
    .slice(0, 4) // cap at 4 so the email stays compact
    .map((item) => {
      const productName = item.product?.name || item.name || "Product";
      const price = item.discountPrice > 0 ? item.discountPrice : item.price;
      const image = item.variantImage || item.product?.images?.[0] || "";
      const qty = item.quantity || 1;

      return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #1e2029;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${
                image
                  ? `
              <td width="56" valign="top" style="padding-right:14px;">
                <img src="${image}" width="56" height="56"
                  alt="${productName}"
                  style="border-radius:8px;object-fit:cover;display:block;background:#1e2029;" />
              </td>`
                  : ""
              }
              <td valign="middle">
                <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#f1f5f9;
                           font-family:'Georgia',serif;line-height:1.4;">
                  ${productName}
                </p>
                ${item.size ? `<span style="display:inline-block;font-size:11px;color:#64748b;margin-right:8px;">Size: ${item.size}</span>` : ""}
                ${item.color ? `<span style="display:inline-block;font-size:11px;color:#64748b;">Color: ${item.color}</span>` : ""}
                <p style="margin:5px 0 0;font-size:12px;color:#94a3b8;">
                  Qty ${qty}${price ? ` &nbsp;·&nbsp; <span style="color:#f1f5f9;font-weight:600;">₹${(price * qty).toFixed(2)}</span>` : ""}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  const remaining = items.length - 4;
  const moreRow =
    remaining > 0
      ? `<tr><td style="padding:12px 0;font-size:12px;color:#64748b;text-align:center;">
        + ${remaining} more item${remaining > 1 ? "s" : ""} in your cart
       </td></tr>`
      : "";

  // ── Template ─────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>You left something behind</title>
</head>
<body style="margin:0;padding:0;background:#0a0b0f;font-family:'Helvetica Neue',Arial,sans-serif;
             -webkit-font-smoothing:antialiased;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Hey ${firstName}, your cart is patiently waiting — come back and complete your order.
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#0a0b0f;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" width="100%" style="max-width:560px;"
               cellpadding="0" cellspacing="0">

          <!-- ── Header ─────────────────────────────────────────── -->
          <tr>
            <td style="background:#0f1117;border-radius:16px 16px 0 0;
                       padding:32px 36px 28px;
                       border:1px solid #1e2029;border-bottom:none;">

              <!-- Logo / brand -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${
                      logoUrl
                        ? `<img src="${logoUrl}" height="28" alt="${storeName}"
                              style="display:block;max-width:140px;" />`
                        : `<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.12em;
                                   text-transform:uppercase;color:#64748b;">${storeName}</p>`
                    }
                  </td>
                  <td align="right">
                    <span style="display:inline-block;font-size:11px;font-weight:700;
                                 letter-spacing:0.1em;text-transform:uppercase;
                                 color:#f59e0b;background:rgba(245,158,11,0.1);
                                 border:1px solid rgba(245,158,11,0.2);
                                 border-radius:20px;padding:4px 12px;">
                      Cart Reminder
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Headline -->
              <h1 style="margin:28px 0 10px;font-size:28px;font-weight:800;
                          color:#f1f5f9;line-height:1.25;
                          font-family:'Georgia',Georgia,serif;letter-spacing:-0.5px;">
                Still thinking it over,<br />${firstName}?
              </h1>
              <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;">
                You left some great items in your cart. They're still here —
                but we can't guarantee they'll stay available forever.
              </p>

            </td>
          </tr>

          <!-- ── Items ──────────────────────────────────────────── -->
          <tr>
            <td style="background:#0f1117;padding:0 36px;
                       border-left:1px solid #1e2029;border-right:1px solid #1e2029;">

              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-top:1px solid #1e2029;">
                ${itemRows}
                ${moreRow}
              </table>

            </td>
          </tr>

          <!-- ── Totals + CTA ───────────────────────────────────── -->
          <tr>
            <td style="background:#0f1117;padding:20px 36px 32px;
                       border-left:1px solid #1e2029;border-right:1px solid #1e2029;">

              <!-- Total -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#13151c;border-radius:10px;
                             border:1px solid #1e2029;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#64748b;font-weight:600;
                                   letter-spacing:0.04em;text-transform:uppercase;">
                          Cart Total
                        </td>
                        <td align="right"
                            style="font-size:22px;font-weight:800;color:#f1f5f9;
                                   font-family:'Georgia',serif;">
                          ₹${Number(cartValue).toFixed(2)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center"
                      style="background:linear-gradient(135deg,#f59e0b,#ef4444);
                             border-radius:10px;">
                      Complete My Order &rarr;
                  </td>
                </tr>
              </table>

              <!-- Soft nudge -->
              <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#475569;
                         line-height:1.6;">
                Free shipping on orders over ₹999 &nbsp;·&nbsp;
                Easy 30-day returns &nbsp;·&nbsp; Secure checkout
              </p>

            </td>
          </tr>

          <!-- ── Divider accent ─────────────────────────────────── -->
          <tr>
            <td style="height:3px;
                       background:linear-gradient(90deg,#f59e0b,#ef4444,#8b5cf6);
                       border-left:1px solid #1e2029;border-right:1px solid #1e2029;">
            </td>
          </tr>

          <!-- ── Footer ─────────────────────────────────────────── -->
          <tr>
            <td style="background:#0a0b0f;border-radius:0 0 16px 16px;
                       padding:24px 36px;
                       border:1px solid #1e2029;border-top:none;">
              <p style="margin:0;font-size:11px;color:#334155;
                         text-align:center;line-height:1.8;">
                You're receiving this because you added items to your cart on
                <br />
                If you've already completed your purchase, please ignore this email.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends an abandoned cart recovery email.
 *
 * @param {object} opts
 * @param {string}   opts.name       - Customer's full name
 * @param {string}   opts.email      - Customer's email address
 * @param {object[]} opts.items      - Cart items (from Cart.items populated with product)
 * @param {number}   opts.cartValue  - Pre-computed cart total
 * @param {object}   transporter     - Nodemailer transporter instance
 */
export async function sendAbandonedCartEmail({
  name,
  email,
  items,
  cartValue,
}) {
  if (!email) throw new Error("sendAbandonedCartEmail: email is required");
  ensureEmailConfig();

  await transporter.sendMail({
    from: `"${process.env.STORE_NAME}" <${SMTP_MAIL}>`,
    to: email,
    subject: `${name?.split(" ")[0] || "Hey"}, your cart is waiting for you 🛒`,
    html: buildAbandonedCartEmailHtml({ name, items, cartValue }),
  });
}
