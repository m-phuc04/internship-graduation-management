import mongoose from "mongoose";
import env from "./env.js";

const connectDatabase = async () => {
  try {
    await mongoose.connect(env.mongodbUri);

    console.log("MongoDB connected successfully");

    // Xóa chỉ mục duy nhất cũ trên studentId nếu tồn tại
    try {
      await mongoose.connection.collection("internships").dropIndex("studentId_1");
    } catch {
      // Bỏ qua nếu chỉ mục không tồn tại
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDatabase;
