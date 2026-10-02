import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function resetCouncilData() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/internship_management';
  console.log('Connecting to MongoDB at:', uri);
  await mongoose.connect(uri);

  const Thesis = mongoose.model(
    'Thesis',
    new mongoose.Schema({}, { strict: false })
  );

  const result = await Thesis.updateMany(
    {},
    {
      $set: {
        'scores.councilScore': null,
        'scores.councilLecturerScores': [],
        'scores.student1CouncilScore': null,
        'scores.student2CouncilScore': null,
        'publishedScores.councilScore': false,
      },
      $unset: {
        councilId: '',
        council: '',
      },
    }
  );

  console.log('Reset council score fields in MongoDB. Modified count:', result.modifiedCount);
  await mongoose.disconnect();
  console.log('Done!');
}

resetCouncilData().catch((err) => {
  console.error('Error resetting council data:', err);
  process.exit(1);
});
