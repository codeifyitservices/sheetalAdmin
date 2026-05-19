import About from "../models/about.model.js";
import Page from "../models/page.model.js";
import { deleteS3File } from "../utils/fileHelper.js";

// @desc    Get About Page Data
// @route   GET /api/v1/pages/about
// @access  Public
export const getAboutPage = async (req, res, next) => {
    try {
        let about = await About.findOne();

        if (!about) {
            // Return empty structure if not found
            return res.status(200).json({
                success: true,
                page: {},
            });
        }

        res.status(200).json({
            success: true,
            page: about,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update About Page
// @route   POST /api/v1/pages/about
// @access  Private/Admin
export const updateAboutPage = async (req, res, next) => {
    try {
        let about = await About.findOne();

        if (!about) {
            about = new About({});
        }

        // Image Helper
        const handleFile = (section, fieldName) => {
            if (req.files && req.files[fieldName]) {
                if (!about[section]) about[section] = {};
                about[section].image = req.files[fieldName][0].location; // S3 URL
            }
        }

        // Update Banner
        if (req.body.bannerTitle) {
            if (!about.banner) about.banner = {};
            about.banner.title = req.body.bannerTitle;
        }
        handleFile("banner", "bannerImage");

        // Update Journey
        if (req.body.journeyTitle) {
            if (!about.journey) about.journey = {};
            about.journey.title = req.body.journeyTitle;
            about.journey.description = req.body.journeyDescription;
        }
        handleFile("journey", "founderImage");

        // Update Mission
        if (req.body.missionTitle) {
            if (!about.mission) about.mission = {};
            about.mission.title = req.body.missionTitle;
            about.mission.description = req.body.missionDescription;
        }
        handleFile("mission", "missionImage");

        // Update Craft
        if (req.body.craftTitle) {
            if (!about.craft) about.craft = {};
            about.craft.title = req.body.craftTitle;
            about.craft.description = req.body.craftDescription;
        }
        handleFile("craft", "craftImage");

        if (req.user) {
            about.updatedBy = req.user._id;
        }

        await about.save();

        res.status(200).json({
            success: true,
            message: "About page updated successfully",
            page: about,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Page Content by Slug
// @route   GET /api/v1/pages/slug/:slug
// @access  Public
export const getPageBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        let page = await Page.findOne({ slug });

        if (!page) {
            let defaultTitle = slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
            let defaultContent = "";

            if (slug === "terms-and-conditions") {
                defaultContent = `
                    <h1>Terms and Conditions</h1>
                    <p>Welcome to Studio By Sheetal. These terms and conditions outline the rules and regulations for the use of our website and services.</p>
                    <h2>1. Introduction</h2>
                    <p>By accessing this website, we assume you accept these terms and conditions. Do not continue to use Studio By Sheetal if you do not agree to take all of the terms and conditions stated on this page.</p>
                    <h2>2. Intellectual Property Rights</h2>
                    <p>Other than the content you own, under these Terms, Studio By Sheetal and/or its licensors own all the intellectual property rights and materials contained in this Website. You are granted a limited license only for purposes of viewing the material contained on this Website.</p>
                    <h2>3. Restrictions</h2>
                    <p>You are specifically restricted from all of the following:</p>
                    <ul>
                        <li>Publishing any Website material in any other media without permission;</li>
                        <li>Selling, sublicensing, and/or otherwise commercializing any Website material;</li>
                        <li>Publicly performing and/or showing any Website material;</li>
                        <li>Using this Website in any way that is or may be damaging to this Website.</li>
                    </ul>
                    <h2>4. Governing Law</h2>
                    <p>These Terms will be governed by and interpreted in accordance with the laws of the State, and you submit to the non-exclusive jurisdiction of the state and federal courts located in the country for the resolution of any disputes.</p>
                `.trim();
            } else if (slug === "privacy-policy") {
                defaultContent = `
                    <h1>Privacy Policy</h1>
                    <p>Your privacy is important to us. It is Studio By Sheetal's policy to respect your privacy regarding any information we may collect from you across our website.</p>
                    <h2>1. Information We Collect</h2>
                    <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>
                    <h2>2. Use of Information</h2>
                    <p>We use your personal data to:</p>
                    <ul>
                        <li>Process your orders, payments, and deliveries;</li>
                        <li>Communicate with you regarding updates, offers, and promotions;</li>
                        <li>Improve and customize our services and shopping experience.</li>
                    </ul>
                    <h2>3. Data Protection</h2>
                    <p>We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.</p>
                    <h2>4. Cookies</h2>
                    <p>We use cookies to understand site usage and to improve the content and offerings on our sites. You can choose to disable cookies through your individual browser options.</p>
                `.trim();
            } else {
                defaultContent = `<h1>${defaultTitle}</h1><p>Please edit this page content from the admin dashboard.</p>`;
            }

            page = await Page.create({
                title: defaultTitle,
                slug,
                content: defaultContent,
            });
        }

        res.status(200).json({
            success: true,
            page,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update Page Content by Slug
// @route   POST /api/v1/pages/slug/:slug
// @access  Private/Admin
export const updatePageBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { title, content } = req.body;

        let page = await Page.findOne({ slug });

        if (!page) {
            page = new Page({ slug });
        }

        if (title !== undefined) page.title = title;
        if (content !== undefined) page.content = content;

        if (req.user) {
            page.updatedBy = req.user._id;
        }

        await page.save();

        res.status(200).json({
            success: true,
            message: `${page.title} updated successfully`,
            page,
        });
    } catch (error) {
        next(error);
    }
};
