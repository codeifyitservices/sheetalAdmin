import mongoose from "mongoose";
import { searchNgram } from "../services/ngram.search.service.js";
import dotenv from "dotenv";

dotenv.config();

async function testNgramM() {
  await mongoose.connect(process.env.MONGO_URI);

  const res = await searchNgram("m", { limit: 100, page: 1 });
  console.log(`\nsearchNgram returned ${res.hits.length} hits:`);
  res.hits.forEach((h, i) => {
    console.log(`[${i + 1}] Type: ${h.type}, Name: ${h.name} (ID: ${h.id})`);
  });

  await mongoose.disconnect();
}

testNgramM();
