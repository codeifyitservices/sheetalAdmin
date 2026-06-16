import sanitizeHtml from "sanitize-html";
import { sanitizeProductHtml } from "../utils/productHtmlSanitizer.js";

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    const isProductRoute = req.originalUrl?.startsWith(
      "/api/v1/products/admin",
    );

    for (const key in req.body) {
      if (typeof req.body[key] === "string") {
        if (
          isProductRoute &&
          (key === "description" || key === "materialCare")
        ) {
          req.body[key] = sanitizeProductHtml(req.body[key]);
        } else {
          req.body[key] = sanitizeHtml(req.body[key], {
            allowedTags: [],
            allowedAttributes: {},
          });
        }
      }
    }
  }
  next();
};

export default sanitizeBody;
