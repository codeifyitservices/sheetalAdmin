import * as blogService from "../services/blog.service.js";
import successResponse from "../utils/successResponse.js";
import { deleteFile, deleteS3File } from "../utils/fileHelper.js";

const cleanupFiles = async (files) => {
  if (!files) return;
  const fileArray = Object.values(files).flat();
  for (const file of fileArray) {
    if (file.key) {
      await deleteS3File(file.key);
    } else if (file.path) {
      await deleteFile(file.path);
    }
  }
};

export const createBlog = async (req, res, next) => {
  try {
    const result = await blogService.createBlogService(
      req.body,
      req.files,
      req.user._id,
    );
    if (!result.success) {
      await cleanupFiles(req.files);
      return res.status(400).json(result);
    }
    successResponse(res, 201, result.data, "Blog post created successfully");
  } catch (error) {
    await cleanupFiles(req.files);
    next(error);
  }
};

export const getBlogs = async (req, res, next) => {
  try {
    const isAdmin = req.user && req.user.role === "admin";
    const result = await blogService.getAllBlogsService({
      ...req.query,
      isAdmin,
    });
    if (!result.success) return res.status(400).json(result);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getSingleBlog = async (req, res, next) => {
  try {
    const incrementViews = req.query.incrementView !== "false";
    const result = await blogService.getBlogBySlugService(
      req.params.slug,
      incrementViews,
    );
    if (!result.success) return res.status(404).json(result);
    successResponse(res, 200, result.data, "Blog post retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const updateBlog = async (req, res, next) => {
  try {
    const result = await blogService.updateBlogService(
      req.params.id,
      req.body,
      req.files,
    );
    if (!result.success) {
      await cleanupFiles(req.files);
      return res.status(400).json(result);
    }
    successResponse(res, 200, result.data, "Blog post updated successfully");
  } catch (error) {
    await cleanupFiles(req.files);
    next(error);
  }
};

export const deleteBlog = async (req, res, next) => {
  try {
    const result = await blogService.deleteBlogService(req.params.id);
    if (!result.success) return res.status(404).json(result);
    successResponse(res, 200, null, "Blog post deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getBlogStats = async (req, res, next) => {
  try {
    const result = await blogService.getBlogStatsService();
    if (!result.success) return res.status(400).json(result);
    successResponse(
      res,
      200,
      result.data,
      "Blog statistics retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};
