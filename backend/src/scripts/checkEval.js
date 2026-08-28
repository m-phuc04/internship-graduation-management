import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Thesis from '../models/Thesis.js';
import thesisService from '../services/thesisService.js';
dotenv.config();

async function checkEvaluations() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected.');

  const res = await thesisService.getThesesForEvaluation();
  console.log('Total returned theses:', res.theses.length);
  console.log('Stats:', res.stats);

  const all = await Thesis.find();
  console.log('\nAll theses in DB:');
  for (const t of all) {
    console.log(`- [${t.status}] ${t.thesisTitle}`);
    console.log(`  reviewer1Id: ${t.reviewer1Id}, reviewer2Id: ${t.reviewer2Id}`);
    console.log(`  reviewers:`, t.reviewers);
  }

  await mongoose.disconnect();
}
checkEvaluations();
