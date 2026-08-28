import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import AppError from "../utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const thesisProgressDir = path.join(__dirname, "../../public/uploads/thesis-progress");
if (!fs.existsSync(thesisProgressDir)) {
  fs.mkdirSync(thesisProgressDir, { recursive: true });
}

const internshipReportsDir = path.join(__dirname, "../../public/uploads/internship-reports");
if (!fs.existsSync(internshipReportsDir)) {
  fs.mkdirSync(internshipReportsDir, { recursive: true });
}

// Storage for Thesis Progress
const storageThesisProgress = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, thesisProgressDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBaseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${cleanBaseName}-${uniqueSuffix}${ext}`);
  },
});

// Storage for Internship Reports
const storageInternshipReports = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, internshipReportsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBaseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${cleanBaseName}-${uniqueSuffix}${ext}`);
  },
});

const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
  ];

  if (
    allowedExtensions.includes(ext) ||
    allowedMimeTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Chỉ chấp nhận các tệp tài liệu: .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx",
        400,
      ),
      false,
    );
  }
};

export const uploadProgressFile = multer({
  storage: storageThesisProgress,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
  fileFilter,
});

export const uploadInternshipReportFile = multer({
  storage: storageInternshipReports,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
  fileFilter,
});

export default uploadProgressFile;
