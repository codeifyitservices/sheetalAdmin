import mongoose from 'mongoose';
import Product from '../models/product.model.js';
import { searchService } from '../services/search.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function testSearch(query) {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  console.log(`Searching for: ${query}`);
  
  const results = await searchService({ query, limit: 10, page: 1 });
  const productIds = results.filter(r => r.type === 'product').map(r => r.data._id);
  console.log(`Found ${productIds.length} products`);
  console.log('Product IDs:', productIds.join(', '));
  results.forEach(r => {
    if (r.type === 'product') {
      console.log(`  - ${r.data.name} (${r.data._id})`);
    }
  });

  await mongoose.disconnect();
}

// Test cases from failing test report
const queries = ['blue printed straight shirt', 'test product name', 'red', 'Festive', 'Saree', 'Straight Cut', 'Anarkali set', 'long', 'shrt', 'linen', 'zya'];

async function runTests() {
  for (const q of queries) {
    await testSearch(q);
    console.log('---');
  }
}

runTests();
