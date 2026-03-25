import multer from "multer";
import path from "path";
import fs from "fs";
import multerS3 from "multer-s3";
import s3 from "../config/s3.js";
import { config } from "../config/config.js";
import ErrorResponse from "../utils/ErrorResponse.js";

export const uploadTo = (folderName) => {
  const isTemp = folderName.startsWith("temp");

  let storage;

  if (isTemp) {
    // Local storage for temp files (e.g., Excel imports)
    storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = `uploads/${folderName}`;
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(
          null,
          `${folderName.replace(/\//g, "-")}-${uniqueSuffix}${path.extname(file.originalname)}`,
        );
      },
    });
  } else {
    // S3 storage for assets
    storage = multerS3({
      s3: s3,
      bucket: config.aws.bucketName,
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const fileName = `${folderName}/${folderName}-${uniqueSuffix}${path.extname(file.originalname)}`;
        cb(null, fileName);
      },
      contentType: multerS3.AUTO_CONTENT_TYPE,
    });
  }

  const fileFilter = (req, file, cb) => {
    // Basic filter - allow images, videos, and excel for specific routes
    const allowedTypes = /jpeg|jpg|png|webp|mp4|webm|mov|xlsx|xls|csv/;
    // You might want to be more specific based on folderName if needed
    // For now, this generic check or the one below is fine.

    // Check extension
    const extname = path.extname(file.originalname).toLowerCase();

    // For temp/excel, allow spreadsheet extensions only
    if (folderName === 'temp/excel') {
      if (['.xlsx', '.xls', '.csv'].includes(extname)) {
        return cb(null, true);
      }
      return cb(ErrorResponse("Only Excel/CSV files are allowed for this route.", 400), false);
    }

    // For temp/bulk, allow spreadsheet, images, and variant videos.
    if (folderName === 'temp/bulk') {
      const isSpreadsheet = ['.xlsx', '.xls', '.csv'].includes(extname);
      const isImage = /\.(jpeg|jpg|png|webp|gif|svg|heic)$/i.test(extname) &&
        (/image/i.test(file.mimetype || "") ||
          file.mimetype === 'application/octet-stream' ||
          !file.mimetype ||
          extname === '.heic');
      const isVideo = /\.(mp4|webm|mov|mkv)$/i.test(extname) &&
        (/video/i.test(file.mimetype || "") ||
          file.mimetype === 'application/octet-stream' ||
          !file.mimetype);

      if (isSpreadsheet || isImage || isVideo) {
        return cb(null, true);
      }
      return cb(ErrorResponse("Only Excel/CSV files, images, and videos are allowed for bulk import.", 400), false);
    }

    const isExtValid = /\.(jpeg|jpg|png|webp|mp4|webm|mov|mkv)$/i.test(extname);
    const isMimeValid = /image|video/.test(file.mimetype || "") ||
      file.mimetype === 'application/octet-stream' ||
      !file.mimetype;

    if (isExtValid && isMimeValid) {
      cb(null, true);
    } else {
      cb(ErrorResponse("Only images and videos are allowed.", 400), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 55 * 1024 * 1024,
    },
  });
};
