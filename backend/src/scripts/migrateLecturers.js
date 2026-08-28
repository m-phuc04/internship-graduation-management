import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const runMigration = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/internship-graduation-management";
  console.log("Connecting to:", uri);

  await mongoose.connect(uri);
  const collection = mongoose.connection.collection("lecturers");
  const docs = await collection.find({}).toArray();
  console.log(`Found ${docs.length} lecturer documents.`);

  for (const doc of docs) {
    let finalVal;
    if (doc.maxSupervisedStudents !== undefined && doc.maxSupervisedStudents !== null) {
      finalVal = Number(doc.maxSupervisedStudents) || 10;
    } else if (doc.maxStudents !== undefined && doc.maxStudents !== null) {
      finalVal = Number(doc.maxStudents) || 10;
    } else {
      finalVal = 10;
    }

    await collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          maxSupervisedStudents: finalVal,
          maxStudents: finalVal,
        },
      }
    );
    console.log(`[MIGRATED] Lecturer ${doc.lecturerCode}: maxSupervisedStudents = ${finalVal}, maxStudents = ${finalVal}`);
  }

  console.log("Migration complete!");
  await mongoose.disconnect();
  process.exit(0);
};

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
