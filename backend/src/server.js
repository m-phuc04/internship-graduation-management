import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import errorMiddleware from "./middlewares/errorMiddleware.js";
import connectDatabase from "./config/database.js";
import env from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import lecturerRoutes from "./routes/lecturerRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import internshipRoutes from "./routes/internshipRoutes.js";
import internshipReportRoutes from "./routes/internshipReportRoutes.js";
import internshipDocumentRoutes from "./routes/internshipDocumentRoutes.js";
import evaluationRoutes from "./routes/evaluationRoutes.js";
import thesisRoutes from "./routes/thesisRoutes.js";
import thesisProgressRoutes from "./routes/thesisProgressRoutes.js";
import thesisDocumentRoutes from "./routes/thesisDocumentRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import academicTermRoutes from "./routes/academicTermRoutes.js";
import academicTermService from "./services/academicTermService.js";
import newsRoutes from "./routes/newsRoutes.js";
import councilRoutes from "./routes/councilRoutes.js";
import researchFieldRoutes from "./routes/researchFieldRoutes.js";
import { initSocketServer } from "./socket/socketHandler.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

// ====================
// Cấu hình Middleware
// ====================

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Cung cấp tệp tĩnh (Static files)
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Tuyến đường dữ liệu danh mục & hệ thống
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/lecturers", lecturerRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/academic-terms", academicTermRoutes);

// Tuyến đường Thực tập, Khóa luận, Báo cáo & Đánh giá
app.use("/api/internships", internshipRoutes);
app.use("/api/internship-reports", internshipReportRoutes);
app.use("/api/internship-documents", internshipDocumentRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/theses", thesisRoutes);
app.use("/api/thesis-progress", thesisProgressRoutes);
app.use("/api/thesis-documents", thesisDocumentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/councils", councilRoutes);
app.use("/api/fields", researchFieldRoutes);

// ====================
// Kiểm tra trạng thái máy chủ (Health Check)
// ====================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

// ====================
// Xử lý tuyến đường không tồn tại (404 Handler)
// ====================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ====================
// Xử lý lỗi tập trung (Error Handler)
// ====================

app.use(errorMiddleware);

// ====================
// Khởi chạy máy chủ (Start Server)
// ====================

const startServer = async () => {
  try {
    await connectDatabase();

    // Khởi tạo học kỳ mặc định và đồng bộ dữ liệu
    await academicTermService.ensureDefaultActiveTerm();

    // Đồng bộ số lượng sinh viên tối đa của giảng viên để đảm bảo tính nhất quán dữ liệu
    try {
      const Lecturer = (await import("./models/Lecturer.js")).default;
      const allLecs = await Lecturer.find({});
      for (const lec of allLecs) {
        const val =
          lec.maxSupervisedStudents !== undefined && lec.maxSupervisedStudents !== null
            ? lec.maxSupervisedStudents
            : (lec.maxStudents !== undefined && lec.maxStudents !== null ? lec.maxStudents : 10);
        if (lec.maxSupervisedStudents !== val || lec.maxStudents !== val) {
          lec.maxSupervisedStudents = val;
          lec.maxStudents = val;
          await lec.save();
        }
      }
    } catch (err) {
      console.error("Lecturer capacity startup sync notice:", err.message);
    }

    // Khởi tạo máy chủ Socket.IO
    initSocketServer(httpServer);

    httpServer.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
      console.log(`http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);

    process.exit(1);
  }
};

startServer();
