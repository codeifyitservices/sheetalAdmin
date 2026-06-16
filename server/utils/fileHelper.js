import fs from "fs/promises";
import path from "path";
import logger from "./logger.js";
import s3 from "../config/s3.js";
import { config } from "../config/config.js";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

export const deleteFile = async (filePath) => {
  if (!filePath) return;

  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    await fs.unlink(fullPath);
    logger.info(`File successfully delete hui: ${filePath}`);
  } catch (err) {
    if (err.code !== "ENOENT") {
      logger.error(`File delete karne mein error: ${err.message}`);
    }
  }
};

export const deleteS3File = async (key) => {
  if (!key) return;

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.aws.bucketName,
      Key: key,
    });
    await s3.send(command);
    logger.info(`S3 Object successfully deleted: ${key}`);
  } catch (err) {
    logger.error(`S3 Object delete karne mein error: ${err.message}`);
  }
};

export const uploadS3File = async (filePath, folderName) => {
  try {
    const fileContent = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const key = `${folderName}/${uniqueSuffix}-${fileName}`;

    // Determine content type
    let contentType = "application/octet-stream";
    if (fileName.match(/\.(jpg|jpeg)$/i)) contentType = "image/jpeg";
    else if (fileName.match(/\.png$/i)) contentType = "image/png";
    else if (fileName.match(/\.webp$/i)) contentType = "image/webp";

    const command = new PutObjectCommand({
      Bucket: config.aws.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      // ACL: "public-read" // Adjust based on your bucket policy
    });

    await s3.send(command);

    // Construct URL (Adjust based on your region/bucket)
    const url = `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;

    return {
      url,
      key, // store key for deletion
      public_id: key,
    };
  } catch (error) {
    logger.error(`S3 Upload failed for ${filePath}: ${error.message}`);
    throw error;
  }
};
