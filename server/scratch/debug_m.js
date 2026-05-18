import mongoose from 'mongoose';
import { searchNgram, ensureHydrated, invertedIndex, documentStore } from '../services/ngram.search.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugM() {
  await mongoose.connect(process.env.MONGO_URI);
  await ensureHydrated();

  console.log('Inverted index has "m":', invertedIndex.has('m'));
  if (invertedIndex.has('m')) {
    const ids = invertedIndex.get('m');
    console.log(`Docs matching "m" in index: ${ids.size}`);
    for (const id of ids) {
      const entry = documentStore.get(id);
      console.log(`- ID: ${id}, Name: "${entry?.doc?.name}", Type: ${entry?.doc?.type}`);
    }
  }

  console.log('\n--- Running searchNgram("m") ---');
  const results = searchNgram('m');
  console.log(`Search returned ${results.length} results:`);
  results.forEach((r, i) => {
    console.log(`[${i + 1}] Name: "${r.data?.name || r.data?.name}", Score: ${r.score}`);
  });

  await mongoose.disconnect();
}

debugM();
