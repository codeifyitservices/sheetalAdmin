import mongoose from 'mongoose';
import Product from './models/product.model.js';
import { searchService } from './services/search.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function testSearch() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const query = 'zya';
  console.log(`Searching for: ${query}`);
  
  const results = await searchService({ query, limit: 10, page: 1 });
  console.log('Search Results:', JSON.stringify(results, null, 2));

  await mongoose.disconnect();
}

testSearch();
