import dotenv from "dotenv";

dotenv.config();

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/internship-graduation-management",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "internship_access_secret_2026",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "internship_refresh_secret_2026",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
};

export default env;
