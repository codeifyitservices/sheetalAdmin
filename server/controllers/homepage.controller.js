import Homepage from "../models/homepage.model.js";

const applyNoStoreHeaders = (res) => {
    res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
    });
};

const defaultTopInfoConfig = {
    mode: "coupon",
    customText: "",
    customCtaLabel: "Shop Now",
    customCtaHref: "/product-list",
};

// @desc    Get homepage visibility settings
// @route   GET /api/v1/homepage/sections
// @access  Public
export const getSections = async (req, res, next) => {
    try {
        applyNoStoreHeaders(res);
        let homepage = await Homepage.findOne();

        // Create default if doesn't exist
        if (!homepage) {
            homepage = await Homepage.create({});
        }

        res.status(200).json({
            success: true,
            sections: homepage.sections,
            topInfoConfig: {
                ...defaultTopInfoConfig,
                ...(homepage.topInfoConfig?.toObject?.() || homepage.topInfoConfig || {}),
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update homepage visibility settings
// @route   PATCH /api/v1/homepage/sections
// @access  Private/Admin
export const updateSections = async (req, res, next) => {
    try {
        applyNoStoreHeaders(res);
        const { sections } = req.body;
        const { topInfoConfig } = req.body;

        let homepage = await Homepage.findOne();

        if (!homepage) {
            homepage = await Homepage.create({ sections, topInfoConfig });
        } else {
            homepage.sections = {
                ...homepage.sections.toObject(),
                ...(sections || {}),
            };
            homepage.topInfoConfig = {
                ...defaultTopInfoConfig,
                ...(homepage.topInfoConfig?.toObject?.() || homepage.topInfoConfig || {}),
                ...(topInfoConfig || {}),
            };
            await homepage.save();
        }

        res.status(200).json({
            success: true,
            sections: homepage.sections,
            topInfoConfig: {
                ...defaultTopInfoConfig,
                ...(homepage.topInfoConfig?.toObject?.() || homepage.topInfoConfig || {}),
            },
        });
    } catch (error) {
        next(error);
    }
};
