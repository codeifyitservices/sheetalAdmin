import mongoose from "mongoose";
import dotenv from "dotenv";
import { getAllProductsService } from "../services/product.service.js";
import Category from "../models/category.model.js";
import Color from "../models/color.model.js";
import SizeChart from "../models/sizeChart.model.js";

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const testIds = ["6a31448a3caeafdc01ab22ea", "69af16f719c6e200a9789980"];
    console.log("Fetching products with IDs:", testIds);

    const result = await getAllProductsService({
      ids: testIds.join(","),
      status: "Active"
    });

    console.log("Fetch success:", result.success);
    console.log("Number of products fetched:", result.products.length);
    result.products.forEach((p) => {
      console.log(`- ${p.name} (ID: ${p._id}, Slug: ${p.slug})`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
