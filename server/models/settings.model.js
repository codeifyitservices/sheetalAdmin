import mongoose from "mongoose";

const navbarItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    href: { type: String },
    hidden: { type: Boolean, default: false },
    itemType: {
      type: String,
      enum: ["link", "category", "static", "custom"],
      default: "link",
    },
    categoryId: { type: String },
    categorySlug: { type: String },
    type: {
      type: String,
      enum: ["link", "category", "custom"],
      default: "link",
    },
    isDroppable: { type: Boolean, default: false },
    children: [mongoose.Schema.Types.Mixed],
  },
  { _id: false },
);

const footerLinkSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    href: { type: String, required: true },
    hidden: { type: Boolean, default: false },
  },
  { _id: false },
);

const footerSubColumnSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    hidden: { type: Boolean, default: false },
    links: { type: [footerLinkSchema], default: [] },
  },
  { _id: false },
);

const settingsSchema = new mongoose.Schema(
  {
    platformFee: { type: Number, default: 0 },
    platformFeeKnowMore: {
      type: String,
      default:
        "This fee helps us run our platform and provide a better experience.",
    },
    shippingFee: { type: Number, default: 0 },
    freeShippingThreshold: { type: Number, default: 0 },
    taxPercentage: { type: Number, default: 0 },
    globalHsnCode: { type: String, trim: true, default: "" },
    abandonedCartInactivityMinutes: { type: Number, default: 20 },
    abandonedCartDiscountPercent: { type: Number, default: 10 },
    abandonedCartCouponCode: { type: String, default: "SAVE10" },
    prepaidShippingCharge: { type: String, default: "Free Shipping" },
    codShippingCharge: { type: String, default: "Free Shipping" },
    returnPolicyContent: {
      type: String,
      default:
        "Your satisfaction is our top priority. If you're not completely satisfied with the product, we offer a hassle-free, no questions asked 7 days return and refund.",
    },
    deliveryPoint2: { type: String, default: "Pay on delivery available" },
    deliveryPoint3: {
      type: String,
      default: "Easy 7 days return & exchange available",
    },
    supportEmail: { type: String, default: "info@studiobysheetal.com" },
    supportWhatsapp: { type: String, default: "919958813913" },
    appointmentEmailTemplate: {
      type: String,
      default: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmed</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap');

    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }

    .header {
      padding: 24px 32px;
      background-color: #ffffff;
      display: table;
      width: 100%;
      border-bottom: 1px solid #f1f5f9;
      box-sizing: border-box;
    }

    .header-left {
      display: table-cell;
      vertical-align: middle;
    }

    .header-right {
      display: table-cell;
      vertical-align: middle;
      text-align: right;
    }

    .status-badge {
      background-color: #ecfdf5;
      color: #059669;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: inline-block;
    }

    .hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 64px 32px;
      text-align: center;
      color: #ffffff;
    }

    .hero-icon {
      width: 64px;
      height: 64px;
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      font-size: 32px;
    }

    .hero h1 {
      font-family: 'DM Serif Display', serif;
      font-size: 42px;
      margin: 0;
      line-height: 1.1;
      font-weight: 400;
    }

    .hero p {
      font-size: 17px;
      opacity: 0.8;
      margin: 16px 0 0;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.6;
    }

    .content {
      padding: 48px 32px;
    }

    .details-grid {
      width: 100%;
      margin-bottom: 40px;
      border-spacing: 12px;
      margin-left: -12px;
      margin-right: -12px;
    }

    .grid-card {
      padding: 24px;
      background-color: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 20px;
      width: 50%;
    }

    .label {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }

    .value {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .profile-card {
      padding: 24px;
      background-color: #ffffff;
      border: 1px solid #f1f5f9;
      border-radius: 20px;
      display: table;
      width: 100%;
      margin-bottom: 40px;
      box-sizing: border-box;
    }

    .avatar {
      display: table-cell;
      width: 64px;
      vertical-align: middle;
    }

    .avatar-img {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background-color: #f1f5f9;
    }

    .profile-info {
      display: table-cell;
      vertical-align: middle;
      padding-left: 20px;
    }

    .profile-name {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .profile-title {
      font-size: 14px;
      color: #64748b;
      margin: 2px 0 0;
    }

    .rating-badge {
      display: inline-block;
      margin-top: 8px;
      font-size: 10px;
      font-weight: 800;
      color: #92400e;
      background-color: #fef3c7;
      padding: 2px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .section-title {
      font-family: 'DM Serif Display', serif;
      font-size: 28px;
      margin: 0 0 24px;
      color: #0f172a;
      font-weight: 400;
    }

    .instruction-step {
      display: table;
      width: 100%;
      margin-bottom: 24px;
    }

    .step-number {
      display: table-cell;
      width: 32px;
      vertical-align: top;
    }

    .step-circle {
      width: 28px;
      height: 28px;
      background-color: #f1f5f9;
      color: #0f172a;
      border-radius: 50%;
      text-align: center;
      line-height: 28px;
      font-size: 13px;
      font-weight: 700;
    }

    .step-content {
      display: table-cell;
      vertical-align: top;
      padding-left: 16px;
    }

    .step-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px;
    }

    .step-desc {
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
      margin: 0;
    }

    .actions {
      display: table;
      width: 100%;
      border-spacing: 12px 0;
      margin: 40px -12px;
    }

    .action-cell {
      display: table-cell;
      width: 50%;
    }

    .btn {
      display: block;
      padding: 18px 24px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
    }

    .btn-secondary {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      color: #0f172a;
    }

    .location-card {
      background-color: #f8fafc;
      border-radius: 20px;
      padding: 32px;
      margin-top: 48px;
    }

    .map-placeholder {
      height: 160px;
      background-color: #e2e8f0;
      border-radius: 12px;
      margin-top: 20px;
      text-align: center;
      line-height: 160px;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .footer {
      background-color: #0f172a;
      padding: 64px 32px;
      text-align: center;
    }

    .footer-logo {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 24px;
      letter-spacing: -0.02em;
    }

    .footer-nav {
      margin-bottom: 32px;
    }

    .footer-nav a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 13px;
      margin: 0 12px;
      font-weight: 500;
    }

    .social-links {
      margin-bottom: 40px;
    }

    .social-links img {
      width: 20px;
      margin: 0 10px;
      opacity: 0.5;
    }

    .legal {
      font-size: 12px;
      color: #475569;
      line-height: 1.8;
    }

    .legal a {
      color: #64748b;
      text-decoration: underline;
    }

    @media only screen and (max-width: 580px) {
      .container { margin: 0; border-radius: 0; }
      .grid-card { display: block; width: 100%; box-sizing: border-box; margin-bottom: 12px; }
      .action-cell { display: block; width: 100%; margin-bottom: 12px; }
      .actions { border-spacing: 0; margin: 32px 0; }
      .hero h1 { font-size: 32px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        {{bannerMarkup}}
      </div>
      <div class="header-right">
        <div class="status-badge">Confirmed</div>
      </div>
    </div>

    <div class="hero">
      <div class="hero-icon">✓</div>
      <h1>Ready for your session?</h1>
      <p>Hello {{name}}, your appointment with Studio By Sheetal has been successfully confirmed. We've reserved this time exclusively for you.</p>
    </div>

    <div class="content">
      <table class="details-grid">
        <tr>
          <td class="grid-card">
            <div class="label">Date</div>
            <div class="value">{{date}}</div>
          </td>
          <td class="grid-card">
            <div class="label">Time</div>
            <div class="value">{{time}}</div>
          </td>
        </tr>
        <tr>
          <td class="grid-card">
            <div class="label">Reference ID</div>
            <div class="value">#{{id}}</div>
          </td>
          <td class="grid-card">
            <div class="label">Service Type</div>
            <div class="value">Studio Consultation</div>
          </td>
        </tr>
      </table>

      <div class="profile-card">
        <div class="avatar">
          <img src="https://ui-avatars.com/api/?name=Studio+Team&background=f1f5f9&color=0f172a&bold=true" class="avatar-img" alt="Agent">
        </div>
        <div class="profile-info">
          <p class="profile-name">Studio By Sheetal Team</p>
          <p class="profile-title">Lead Design Consultant</p>
          <div class="rating-badge">★ 4.9 Top Rated</div>
        </div>
      </div>

      <h2 class="section-title">What to expect</h2>
      
      <div class="instruction-step">
        <div class="step-number"><div class="step-circle">1</div></div>
        <div class="step-content">
          <p class="step-title">Review Your Requirements</p>
          <p class="step-desc">Our team has reviewed your request: <i style="color: #0f172a;">"{{requirements}}"</i>. We'll have everything ready to discuss this during our session.</p>
        </div>
      </div>

      <div class="instruction-step">
        <div class="step-number"><div class="step-circle">2</div></div>
        <div class="step-content">
          <p class="step-title">Arrive Early</p>
          <p class="step-desc">Please try to arrive 10-15 minutes before your scheduled slot. We'll have a refreshment waiting for you as you settle in.</p>
        </div>
      </div>

      <div class="instruction-step" style="margin-bottom: 0;">
        <div class="step-number"><div class="step-circle">3</div></div>
        <div class="step-content">
          <p class="step-title">Bring Inspiration</p>
          <p class="step-desc">Feel free to bring along any reference images or fabric swatches that inspire your vision for the perfect ensemble.</p>
        </div>
      </div>

      <div class="actions">
        <div class="action-cell">
          <a href="#" class="btn btn-primary">Add to Calendar</a>
        </div>
        <div class="action-cell">
          <a href="mailto:info@studiobysheetal.com" class="btn btn-secondary">Contact Team</a>
        </div>
      </div>

      <div class="location-card">
        <div class="label">Studio Location</div>
        <div class="value" style="margin-top: 8px; line-height: 1.5;">{{address}}, {{city}}<br>{{pincode}}</div>
        <div class="map-placeholder">
          MAP PREVIEW UNAVAILABLE
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-logo">Studio By Sheetal</div>
      <div class="footer-nav">
        <a href="#">About</a>
        <a href="#">Shop</a>
        <a href="#">Support</a>
        <a href="#">Privacy</a>
      </div>
      <div class="social-links">
        <a href="#"><img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="X"></a>
        <a href="#"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="FB"></a>
        <a href="#"><img src="https://cdn-icons-png.flaticon.com/512/733/733558.png" alt="IG"></a>
      </div>
      <div class="legal">
        &copy; {{year}} Studio By Sheetal. All rights reserved.<br>
        You're receiving this because you booked an appointment.<br>
        <a href="#">Unsubscribe</a> from transactional notifications.
      </div>
    </div>
  </div>
</body>
</html>`,
    },
    contactEnquiryProgressEmailTemplate: {
      type: String,
      default: `<!DOCTYPE html>
    <html>
    <head>
    <style>
    body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #0f172a; }
    .footer { margin-top: 30px; font-size: 14px; color: #64748b; }
    </style>
    </head>
    <body>
    <div class="container">
    <div class="header">Enquiry Received</div>
    <p>Dear {{name}},</p>
    <p>Your query: "<strong>{{query}}</strong>" has been submitted and is under progress.</p>
    <p>We will get back to you shortly.</p>
    <div class="footer">
      Best regards,<br>
      Studio By Sheetal
    </div>
    </div>
    </body>
    </html>`,
    },
    contactEnquiryReplyEmailTemplate: {
      type: String,
      default: `<!DOCTYPE html>
    <html>
    <head>
    <style>
    body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #0f172a; }
    .reply-box { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0f172a; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 14px; color: #64748b; }
    </style>
    </head>
    <body>
    <div class="container">
    <div class="header">Reply to your enquiry</div>
    <p>Dear {{name}},</p>
    <p>In response to your query: "<strong>{{query}}</strong>"</p>
    <div class="reply-box">
      <strong>Our reply:</strong><br>
      {{reply}}
    </div>
    <div class="footer">
      Best regards,<br>
      Studio By Sheetal
    </div>
    </div>
    </body>
    </html>`,
    },
    notifyBackInStockEmailTemplate: {
      type: String,
      default: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    .header { background: #0f172a; color: #ffffff; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 40px; }
    .product-card { display: flex; gap: 24px; background: #f1f5f9; padding: 20px; border-radius: 16px; margin: 24px 0; }
    .product-image { width: 120px; height: 160px; object-fit: cover; border-radius: 8px; }
    .product-info { flex: 1; }
    .product-name { font-size: 18px; font-weight: bold; color: #0f172a; margin: 0 0 8px; }
    .product-size { font-size: 14px; color: #64748b; margin: 0 0 16px; }
    .btn { display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; }
    .footer { padding: 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Great News!</h1>
    </div>
    <div class="content">
      <p>Dear {{name}},</p>
      <p>The item you were looking for is now back in stock in your size!</p>
      
      <div class="product-card">
        <img src="{{productImage}}" alt="{{productName}}" class="product-image">
        <div class="product-info">
          <p class="product-name">{{productName}}</p>
          <p class="product-size">Size: <strong>{{size}}</strong></p>
          <a href="{{productUrl}}" class="btn">Shop Now</a>
        </div>
      </div>
      
      <p>Hurry up and grab yours before it sells out again!</p>
    </div>
    <div class="footer">
      &copy; Studio By Sheetal. All rights reserved.<br>
      You received this email because you asked to be notified about this product.
    </div>
  </div>
</body>
</html>`,
    },
    navbarLayout: {
 type: [navbarItemSchema], default: [] },
    footerLayout: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

const Settings =
  mongoose.models.Settings || mongoose.model("Settings", settingsSchema);
export default Settings;
