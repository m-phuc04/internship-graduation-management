import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import InternshipDocument from "../models/InternshipDocument.js";
import AppError from "../utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAllDocuments = async ({ academicTermId = null, search = "" } = {}) => {
  const query = {};

  if (academicTermId && academicTermId !== "ALL") {
    query.$or = [{ academicTermId }, { academicTermId: null }];
  }

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    query.$and = [
      ...(query.$or ? [{ $or: query.$or }] : []),
      {
        $or: [
          { fileName: searchRegex },
          { title: searchRegex },
          { description: searchRegex },
        ],
      },
    ];
    delete query.$or;
  }

  const documents = await InternshipDocument.find(query)
    .populate("uploadedBy", "fullName email")
    .populate("academicTermId", "termName code")
    .sort({ createdAt: -1 });

  return documents;
};

export const createDocument = async ({
  file,
  description = "",
  academicTermId = null,
  userId = null,
}) => {
  if (!file) {
    throw new AppError("Vui lòng chọn tệp tài liệu để tải lên", 400);
  }

  const fileUrl = `/uploads/internship-documents/${file.filename}`;

  const doc = await InternshipDocument.create({
    academicTermId: academicTermId || null,
    title: file.originalname,
    fileName: file.originalname,
    fileUrl,
    fileSize: file.size,
    fileType: file.mimetype,
    description: description ? description.trim() : "",
    uploadedBy: userId || null,
  });

  return doc;
};

export const deleteDocument = async (id, userId = null) => {
  const doc = await InternshipDocument.findById(id);
  if (!doc) {
    throw new AppError("Không tìm thấy tệp tài liệu để xóa", 404);
  }

  // Remove physical file from disk if exists
  try {
    const diskPath = path.join(
      __dirname,
      "../../public",
      doc.fileUrl.startsWith("/") ? doc.fileUrl : `/${doc.fileUrl}`,
    );
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
  } catch (err) {
    console.warn("Could not remove file from disk:", err.message);
  }

  await InternshipDocument.findByIdAndDelete(id);

  return { success: true, message: "Đã xóa tài liệu thực tập thành công" };
};

export default {
  getAllDocuments,
  createDocument,
  deleteDocument,
};

