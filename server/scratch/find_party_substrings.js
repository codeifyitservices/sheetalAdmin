import mongoose from 'mongoose';
import Product from '../models/product.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function findPartySubstrings() {
  await mongoose.connect(process.env.MONGO_URI);

  const products = await Product.find({}).lean();
  console.log(`Total products in database: ${products.length}`);

  console.log(`\nScanning all products for subcategory or tags containing "party":`);
  let count = 0;
  products.forEach(p => {
    const subCat = (p.subCategory || '').toLowerCase();
    const tags = (p.tags || []).map(t => t.toLowerCase());

    const subCatMatch = subCat.includes('party');
    const tagsMatch = tags.some(t => t.includes('party'));

    if (subCatMatch || tagsMatch) {
      count++;
      console.log(`[${count}] Name: "${p.name}" (Status: ${p.status})`);
      console.log(`    SubCategory: "${p.subCategory}" (matches: ${subCatMatch})`);
      console.log(`    Tags:`, p.tags, `(matches: ${tagsMatch})`);
    }
  });

  await mongoose.disconnect();
}

findPartySubstrings();
