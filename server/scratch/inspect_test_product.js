import mongoose from 'mongoose';
import Product from '../models/product.model.js';
import Category from '../models/category.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function inspectProduct() {
  await mongoose.connect(process.env.MONGO_URI);
  const p = await Product.findOne({ name: /Test Product Name/i }).populate('category').lean();
  console.log(JSON.stringify(p, null, 2));
  await mongoose.disconnect();
}

inspectProduct();
