import slugify from "slugify";
import Blog from "../models/blog.model.js";
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

export const createBlogService = async (data, files, userId) => {
  try {
    const {
      title,
      content,
      tags,
      relatedProducts,
      status,
      isPublished,
    } = data;

    const bannerImageFile = files?.bannerImage?.[0];

    if (!title || !content || !bannerImageFile) {
      await cleanupFiles(files);
      return {
        success: false,
        message: "Title, Content and Banner Image are required",
      };
    }

    const slug = slugify(title, { lower: true, strict: true });
    const excerpt =
      data.excerpt || content.substring(0, 160).replace(/<[^>]*>/g, "") + "...";

    const tagsArray = tags
      ? Array.isArray(tags)
        ? tags
        : tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t !== "")
      : [];
    const productsArray = relatedProducts
      ? Array.isArray(relatedProducts)
        ? relatedProducts
        : []
      : [];

    const blogData = {
      ...data,
      slug,
      excerpt,
      author: userId,
      bannerImage: {
        url: bannerImageFile.location || bannerImageFile.path,
        public_id: bannerImageFile.key || bannerImageFile.filename,
      },
      tags: tagsArray,
      relatedProducts: productsArray,
      status: status || "Active",
      isPublished: isPublished === "true" || isPublished === true,
      metaTitle: data.metaTitle || title,
    };

    if (files?.contentImage?.[0]) {
      blogData.contentImage = {
        url: files.contentImage[0].location || files.contentImage[0].path,
        public_id: files.contentImage[0].key || files.contentImage[0].filename,
      };
    }

    if (files?.ogImage?.[0]) {
      blogData.ogImage = {
        url: files.ogImage[0].location || files.ogImage[0].path,
        public_id: files.ogImage[0].key || files.ogImage[0].filename,
      };
    }

    const blog = await Blog.create(blogData);

    return { success: true, data: blog };
  } catch (err) {
    await cleanupFiles(files);
    if (err.code === 11000)
      return { success: false, message: "Blog title/slug already exists" };
    return { success: false, message: err.message };
  }
};

export const updateBlogService = async (id, data, files) => {
  try {
    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      await cleanupFiles(files);
      return { success: false, message: "Blog not found" };
    }

    let updateData = { ...data };

    if (data.title) {
      updateData.slug = slugify(data.title, { lower: true, strict: true });
    }

    if (data.tags) {
      updateData.tags =
        typeof data.tags === "string"
          ? data.tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t !== "")
          : data.tags;
    }

    if (files?.bannerImage?.[0]) {
      const file = files.bannerImage[0];
      // Delete old image
      if (existingBlog.bannerImage?.public_id) {
        if (existingBlog.bannerImage.url?.startsWith("http")) {
          await deleteS3File(existingBlog.bannerImage.public_id);
        } else {
          await deleteFile(existingBlog.bannerImage.url);
        }
      }
      updateData.bannerImage = {
        url: file.location || file.path,
        public_id: file.key || file.filename,
      };
    }

    if (files?.contentImage?.[0]) {
      const file = files.contentImage[0];
      // Delete old image
      if (existingBlog.contentImage?.public_id) {
        if (existingBlog.contentImage.url?.startsWith("http")) {
          await deleteS3File(existingBlog.contentImage.public_id);
        } else {
          await deleteFile(existingBlog.contentImage.url);
        }
      }
      updateData.contentImage = {
        url: file.location || file.path,
        public_id: file.key || file.filename,
      };
    }

    if (files?.ogImage?.[0]) {
      const file = files.ogImage[0];
      if (existingBlog.ogImage?.public_id) {
        if (existingBlog.ogImage.url?.startsWith("http")) {
          await deleteS3File(existingBlog.ogImage.public_id);
        } else {
          await deleteFile(existingBlog.ogImage.url);
        }
      }
      updateData.ogImage = {
        url: file.location || file.path,
        public_id: file.key || file.filename,
      };
    }

    if (data.isPublished !== undefined) {
      updateData.isPublished =
        data.isPublished === "true" || data.isPublished === true;
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    return { success: true, data: updatedBlog };
  } catch (err) {
    await cleanupFiles(files);
    return { success: false, message: err.message };
  }
};

export const getAllBlogsService = async (query) => {
  const {
    page = 1,
    limit = 10,
    search,
    isPublished,
    status,
    isAdmin,
  } = query;
  const skip = (Number(page) - 1) * Number(limit);

  let filter = {};
  if (!isAdmin) {
    filter.status = "Active";
    filter.isPublished = true;
  } else {
    if (status && status !== "All") filter.status = status;
    if (isPublished !== undefined) filter.isPublished = isPublished === "true";
  }

  if (search) filter.$text = { $search: search };

  try {
    const blogs = await Blog.find(filter)
      .populate("author", "name")
      .populate("relatedProducts", "name price image")
      .sort(search ? { score: { $meta: "textScore" } } : "-createdAt")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const transformedBlogs = blogs.map((blog) => {
      if (blog.author) {
        return {
          ...blog,
          author: {
            ...blog.author,
            name: "Admin",
          },
        };
      }
      return blog;
    });

    const total = await Blog.countDocuments(filter);
    return {
      success: true,
      blogs: transformedBlogs,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const deleteBlogService = async (id) => {
  try {
    const blog = await Blog.findById(id);
    if (!blog) return { success: false, message: "Blog post not found" };

    if (blog.bannerImage?.public_id) {
      if (blog.bannerImage.url?.startsWith("http")) {
        await deleteS3File(blog.bannerImage.public_id);
      } else {
        await deleteFile(blog.bannerImage.url);
      }
    }
    if (blog.contentImage?.public_id) {
      if (blog.contentImage.url?.startsWith("http")) {
        await deleteS3File(blog.contentImage.public_id);
      } else {
        await deleteFile(blog.contentImage.url);
      }
    }
    if (blog.ogImage?.public_id) {
      if (blog.ogImage.url?.startsWith("http")) {
        await deleteS3File(blog.ogImage.public_id);
      } else {
        await deleteFile(blog.ogImage.url);
      }
    }

    await blog.deleteOne();
    return { success: true, message: "Blog post deleted successfully" };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const getBlogStatsService = async () => {
  try {
    const total = await Blog.countDocuments();
    const active = await Blog.countDocuments({ status: "Active" });
    const inactive = await Blog.countDocuments({ status: "Inactive" });
    const published = await Blog.countDocuments({ isPublished: true });

    return {
      success: true,
      data: { total, active, inactive, published },
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const getBlogBySlugService = async (slug, incrementViews = true) => {
  try {
    const query = { slug, status: "Active", isPublished: true };
    const blogQuery = incrementViews
      ? Blog.findOneAndUpdate(query, { $inc: { views: 1 } }, { new: true })
      : Blog.findOne(query);

    const blog = await blogQuery
      .populate("author", "name")
      .populate("relatedProducts");
    if (!blog) return { success: false, message: "Blog post not found" };

    const blogObj = blog.toObject();
    if (blogObj.author) {
      blogObj.author.name = "Admin";
    }

    return { success: true, data: blogObj };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
