import mongoose from "mongoose";
import env from "./env.js";

const connectDatabase = async () => {
  try {
    await mongoose.connect(env.mongodbUri);

    console.log("MongoDB connected successfully");

    // Drop legacy unique index on studentId if exists
    try {
      await mongoose.connection.collection("internships").dropIndex("studentId_1");
    } catch {
      // Ignore if index doesn't exist
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDatabase;
