import InstaCard from "../models/instagram.model.js";
import { deleteS3File } from "../utils/fileHelper.js";

// @desc    Get all insta cards
// @route   GET /api/v1/instacards
// @access  Public
export const getInstaCards = async (req, res, next) => {
  try {
    const cards = await InstaCard.find().sort({ order: 1, createdAt: 1 });
    res.status(200).json({ success: true, cards });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new insta card
// @route   POST /api/v1/instacards
// @access  Private/Admin
export const addInstaCard = async (req, res, next) => {
  try {
    const { link } = req.body;
    const file = req.file;

    if (!file)
      return res
        .status(400)
        .json({ success: false, message: "Image is required" });
    if (!link)
      return res
        .status(400)
        .json({ success: false, message: "Link is required" });

    const count = await InstaCard.countDocuments();

    const card = await InstaCard.create({
      url: file.location,
      key: file.key,
      alt: file.originalname,
      link,
      order: count,
    });

    res.status(201).json({ success: true, card });
  } catch (error) {
    next(error);
  }
};

// @desc    Update link of an insta card
// @route   PATCH /api/v1/instacards/:id
// @access  Private/Admin
export const updateInstaCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { link } = req.body;

    const card = await InstaCard.findById(id);
    if (!card)
      return res
        .status(404)
        .json({ success: false, message: "Card not found" });

    if (link !== undefined) card.link = link;

    // If a new image is uploaded, swap it
    if (req.file) {
      deleteS3File(card.key);
      card.url = req.file.location;
      card.key = req.file.key;
      card.alt = req.file.originalname;
    }

    await card.save();
    res.status(200).json({ success: true, card });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an insta card
// @route   DELETE /api/v1/instacards/:id
// @access  Private/Admin
export const deleteInstaCard = async (req, res, next) => {
  try {
    const { id } = req.params;

    const card = await InstaCard.findById(id);
    if (!card)
      return res
        .status(404)
        .json({ success: false, message: "Card not found" });

    deleteS3File(card.key);
    await card.deleteOne();

    res.status(200).json({ success: true, message: "Card deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder insta cards
// @route   PATCH /api/v1/instacards/reorder
// @access  Private/Admin
export const reorderInstaCards = async (req, res, next) => {
  try {
    // expects body: { order: ["id1", "id2", "id3", ...] }
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res
        .status(400)
        .json({ success: false, message: "order must be an array of IDs" });
    }

    await Promise.all(
      order.map((id, index) =>
        InstaCard.findByIdAndUpdate(id, { order: index }),
      ),
    );

    res.status(200).json({ success: true, message: "Cards reordered" });
  } catch (error) {
    next(error);
  }
};
