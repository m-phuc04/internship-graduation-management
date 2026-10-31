import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ThesisDocument from "../models/ThesisDocument.js";
import Thesis from "../models/Thesis.js";
import Lecturer from "../models/Lecturer.js";
import Student from "../models/Student.js";
import ThesisTopic from "../models/ThesisTopic.js";
import notificationService from "./notificationService.js";
import AppError from "../utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to remove physical file
const unlinkFileSafe = (fileUrl) => {
  if (!fileUrl) return;
  try {
    const diskPath = path.join(
      __dirname,
      "../../public",
      fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`,
    );
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }
  } catch (err) {
    console.warn("Could not remove file from disk:", err.message);
  }
};

// 1. Get list of theses supervised by lecturer (for selection dropdown)
export const getLecturerSupervisedTheses = async (userId, academicTermId = null) => {
  if (!userId) return [];
  const lecturer = await Lecturer.findOne({ userId });
  if (!lecturer) {
    return [];
  }

  const query = {
    supervisorId: lecturer._id,
    status: { $nin: ["REJECTED", "CANCELLED"] },
  };

  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  const theses = await Thesis.find(query)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email" },
    })
    .populate("topicId", "title")
    .sort({ createdAt: -1 });

  return theses.map((t) => {
    const s1Name = t.studentId?.userId?.fullName || "SV 1";
    const s2Name = t.secondStudentId?.userId?.fullName;
    const studentLabel = s2Name ? `${s1Name} & ${s2Name}` : s1Name;
    return {
      _id: t._id,
      thesisTitle: t.thesisTitle || t.topicId?.title || "Đề tài khóa luận",
      studentLabel,
      academicTermId: t.academicTermId,
    };
  });
};

// 2. Lecturer: Get guidance documents uploaded by lecturer
export const getLecturerGuides = async (
  userId,
  { academicTermId = null, search = "", thesisId = null } = {},
) => {
  if (!userId) return [];
  const lecturer = await Lecturer.findOne({ userId });
  if (!lecturer) {
    return [];
  }

  const query = {
    supervisorId: lecturer._id,
    documentType: "GUIDE",
  };

  if (academicTermId && academicTermId !== "ALL") {
    query.$or = [{ academicTermId }, { academicTermId: null }];
  }

  if (thesisId && thesisId !== "ALL") {
    query.thesisId = thesisId;
  }

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    const textFilter = {
      $or: [
        { fileName: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
      ],
    };
    if (query.$or) {
      query.$and = [{ $or: query.$or }, textFilter];
      delete query.$or;
    } else {
      query.$or = textFilter.$or;
    }
  }

  const docs = await ThesisDocument.find(query)
    .populate("thesisId", "thesisTitle")
    .populate("academicTermId", "termName code")
    .sort({ createdAt: -1 });

  return docs;
};

// 3. Lecturer: Create new guidance document
export const createLecturerGuide = async ({
  userId,
  file,
  description = "",
  scope = "ALL",
  thesisId = null,
  academicTermId = null,
}) => {
  const lecturer = await Lecturer.findOne({ userId }).populate("userId", "fullName");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin hồ sơ giảng viên của bạn", 404);
  }

  if (!file) {
    throw new AppError("Vui lòng chọn tệp tài liệu để tải lên", 400);
  }

  const normalizedScope = scope === "SPECIFIC" ? "SPECIFIC" : "ALL";
  let targetThesisId = null;

  if (normalizedScope === "SPECIFIC") {
    if (!thesisId) {
      throw new AppError(
        "Vui lòng chọn đề tài cụ thể khi chọn phạm vi áp dụng riêng",
        400,
      );
    }
    const thesis = await Thesis.findById(thesisId);
    if (!thesis) {
      throw new AppError("Không tìm thấy đề tài khóa luận được chọn", 404);
    }
    targetThesisId = thesis._id;
  }

  const fileUrl = `/uploads/thesis-documents/${file.filename}`;

  const doc = await ThesisDocument.create({
    academicTermId: academicTermId || null,
    supervisorId: lecturer._id,
    thesisId: targetThesisId,
    documentType: "GUIDE",
    scope: normalizedScope,
    title: file.originalname,
    fileName: file.originalname,
    fileUrl,
    fileSize: file.size,
    fileType: file.mimetype,
    description: description ? description.trim() : "",
    uploadedBy: userId,
  });

  // Gửi thông báo đến sinh viên
  // Định dạng: "GVHD [Tên Giảng Viên] đã đăng 1 tài liệu"
  // Ràng buộc: Chỉ những sinh viên thuộc nhóm/đề tài nằm trong phạm vi áp dụng mới nhìn thấy thông báo này.
  try {
    const lecturerName = lecturer.userId?.fullName || "Giảng viên hướng dẫn";
    const notifTitle = `GVHD ${lecturerName} đã đăng 1 tài liệu`;
    const notifMessage = `Giảng viên hướng dẫn đã đăng tài liệu mới: "${file.originalname}".`;
    const recipientUserIds = new Set();

    if (normalizedScope === "SPECIFIC" && targetThesisId) {
      const specificThesis = await Thesis.findById(targetThesisId)
        .populate({ path: "studentId", select: "userId" })
        .populate({ path: "secondStudentId", select: "userId" });

      if (specificThesis?.studentId?.userId) {
        recipientUserIds.add(specificThesis.studentId.userId.toString());
      }
      if (specificThesis?.secondStudentId?.userId) {
        recipientUserIds.add(specificThesis.secondStudentId.userId.toString());
      }
    } else {
      // Scope ALL: Tất cả sinh viên các nhóm do giảng viên này hướng dẫn
      const queryTheses = {
        supervisorId: lecturer._id,
        status: { $nin: ["REJECTED", "CANCELLED"] },
      };
      if (academicTermId && academicTermId !== "ALL") {
        queryTheses.academicTermId = academicTermId;
      }
      const supervisedTheses = await Thesis.find(queryTheses)
        .populate({ path: "studentId", select: "userId" })
        .populate({ path: "secondStudentId", select: "userId" });

      for (const t of supervisedTheses) {
        if (t.studentId?.userId) {
          recipientUserIds.add(t.studentId.userId.toString());
        }
        if (t.secondStudentId?.userId) {
          recipientUserIds.add(t.secondStudentId.userId.toString());
        }
      }
    }

    for (const recipientId of recipientUserIds) {
      await notificationService.createNotification({
        recipientId,
        type: "THESIS",
        title: notifTitle,
        message: notifMessage,
        referenceId: doc._id,
        referenceModel: "Thesis",
        link: "/student/thesis/documents",
      });
    }
  } catch (notifErr) {
    console.warn("[ThesisDocument] Notification error to students:", notifErr.message);
  }

  return doc;
};

// 4. Lecturer: Delete guidance document
export const deleteLecturerGuide = async (id, userId) => {
  const lecturer = await Lecturer.findOne({ userId });
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const doc = await ThesisDocument.findById(id);
  if (!doc) {
    throw new AppError("Không tìm thấy tài liệu cần xóa", 404);
  }

  if (doc.supervisorId?.toString() !== lecturer._id.toString()) {
    throw new AppError("Bạn không có quyền xóa tài liệu của giảng viên khác", 403);
  }

  unlinkFileSafe(doc.fileUrl);
  await ThesisDocument.findByIdAndDelete(id);

  return { success: true, message: "Đã xóa tài liệu khóa luận thành công" };
};

// 5. Lecturer: Get student submissions for supervised theses
export const getLecturerSubmissions = async (
  userId,
  { academicTermId = null, search = "", thesisId = null } = {},
) => {
  if (!userId) return [];
  const lecturer = await Lecturer.findOne({ userId });
  if (!lecturer) {
    return [];
  }

  const query = {
    supervisorId: lecturer._id,
    documentType: "SUBMISSION",
  };

  if (academicTermId && academicTermId !== "ALL") {
    query.$or = [{ academicTermId }, { academicTermId: null }];
  }

  if (thesisId && thesisId !== "ALL") {
    query.thesisId = thesisId;
  }

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    const textFilter = {
      $or: [
        { fileName: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
      ],
    };
    if (query.$or) {
      query.$and = [{ $or: query.$or }, textFilter];
      delete query.$or;
    } else {
      query.$or = textFilter.$or;
    }
  }

  const submissions = await ThesisDocument.find(query)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email" },
      select: "studentCode className userId",
    })
    .populate("thesisId", "thesisTitle")
    .populate("uploadedBy", "fullName email")
    .populate("academicTermId", "termName code")
    .sort({ createdAt: -1 });

  return submissions;
};

// 6. Student: Get guidance documents from their supervisor
export const getStudentGuides = async (
  userId,
  { academicTermId = null, search = "" } = {},
) => {
  if (!userId) {
    return { hasThesis: false, supervisor: null, thesis: null, documents: [] };
  }
  const student = await Student.findOne({ userId });
  if (!student) {
    return {
      hasThesis: false,
      supervisor: null,
      thesis: null,
      documents: [],
    };
  }

  // Find student's thesis
  const thesisQuery = {
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
    status: { $nin: ["REJECTED", "CANCELLED"] },
  };

  if (academicTermId && academicTermId !== "ALL") {
    thesisQuery.academicTermId = academicTermId;
  }

  const populateSupervisor = {
    path: "supervisorId",
    populate: { path: "userId", select: "fullName email phone" },
    select: "academicTitle userId",
  };

  let thesis = await Thesis.findOne(thesisQuery).populate(populateSupervisor);
  if (!thesis && academicTermId) {
    // Fallback without term constraint
    thesis = await Thesis.findOne({
      $or: [{ studentId: student._id }, { secondStudentId: student._id }],
      status: { $nin: ["REJECTED", "CANCELLED"] },
    }).populate(populateSupervisor);
  }

  if (!thesis || !thesis.supervisorId) {
    return {
      hasThesis: false,
      supervisor: null,
      thesis: null,
      documents: [],
    };
  }

  const query = {
    supervisorId: thesis.supervisorId,
    documentType: "GUIDE",
    $or: [{ scope: "ALL" }, { thesisId: thesis._id }],
  };

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    query.$and = [
      { $or: query.$or },
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

  const docs = await ThesisDocument.find(query)
    .populate({
      path: "supervisorId",
      populate: { path: "userId", select: "fullName email" },
      select: "academicTitle userId",
    })
    .populate("thesisId", "thesisTitle")
    .populate("academicTermId", "termName code")
    .sort({ createdAt: -1 });

  return {
    hasThesis: true,
    thesis: {
      _id: thesis._id,
      thesisTitle: thesis.thesisTitle,
    },
    supervisor: thesis.supervisorId,
    documents: docs,
  };
};

// 7. Student: Get submissions made by the student / group
export const getStudentSubmissions = async (userId, { academicTermId = null } = {}) => {
  if (!userId) return [];
  const student = await Student.findOne({ userId });
  if (!student) {
    return [];
  }

  const thesisQuery = {
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
    status: { $nin: ["REJECTED", "CANCELLED"] },
  };

  if (academicTermId && academicTermId !== "ALL") {
    thesisQuery.academicTermId = academicTermId;
  }

  let thesis = await Thesis.findOne(thesisQuery);
  if (!thesis && academicTermId) {
    thesis = await Thesis.findOne({
      $or: [{ studentId: student._id }, { secondStudentId: student._id }],
      status: { $nin: ["REJECTED", "CANCELLED"] },
    });
  }

  if (!thesis) {
    return [];
  }

  const submissions = await ThesisDocument.find({
    thesisId: thesis._id,
    documentType: "SUBMISSION",
  })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email" },
      select: "studentCode className userId",
    })
    .populate("uploadedBy", "fullName email")
    .sort({ createdAt: -1 });

  return submissions;
};

// 8. Student: Upload / Submit file for supervisor
export const createStudentSubmission = async ({
  userId,
  file,
  description = "",
}) => {
  const student = await Student.findOne({ userId }).populate("userId", "fullName");
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  if (!file) {
    throw new AppError("Vui lòng chọn tệp tài liệu để nộp", 400);
  }

  const thesis = await Thesis.findOne({
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
    status: { $nin: ["REJECTED", "CANCELLED"] },
  })
    .populate({ path: "studentId", populate: { path: "userId", select: "fullName" } })
    .populate({ path: "secondStudentId", populate: { path: "userId", select: "fullName" } });

  if (!thesis) {
    throw new AppError("Bạn chưa có đề tài khóa luận được duyệt để nộp file", 400);
  }

  const fileUrl = `/uploads/thesis-documents/${file.filename}`;

  const doc = await ThesisDocument.create({
    academicTermId: thesis.academicTermId || null,
    supervisorId: thesis.supervisorId || null,
    thesisId: thesis._id,
    studentId: student._id,
    documentType: "SUBMISSION",
    scope: "SPECIFIC",
    title: file.originalname,
    fileName: file.originalname,
    fileUrl,
    fileSize: file.size,
    fileType: file.mimetype,
    description: description ? description.trim() : "",
    uploadedBy: userId,
  });

  // Gửi thông báo đến Giảng viên hướng dẫn
  // Định dạng: "Nhóm [Tên Nhóm] đã đăng 1 tài liệu"
  try {
    if (thesis.supervisorId) {
      const supervisor = await Lecturer.findById(thesis.supervisorId).populate("userId", "fullName");
      if (supervisor?.userId?._id) {
        // Resolve [Tên Nhóm]: Check if groupOrder exists in topic's registeredGroups
        let groupName = "";
        if (thesis.topicId) {
          const topic = await ThesisTopic.findById(thesis.topicId).lean();
          const regGroup = topic?.registeredGroups?.find(
            (g) =>
              g.thesisId?.toString() === thesis._id.toString() ||
              g.studentId?.toString() === student._id.toString() ||
              g.secondStudentId?.toString() === student._id.toString()
          );
          if (regGroup?.groupOrder) {
            groupName = `${regGroup.groupOrder}`;
          }
        }

        // If no groupOrder, use student's full name
        if (!groupName) {
          groupName = thesis.studentId?.userId?.fullName || student.userId?.fullName || "Sinh viên";
        }

        const notifTitle = `Nhóm ${groupName} đã đăng 1 tài liệu`;
        const notifMessage = `Nhóm sinh viên thuộc đề tài "${thesis.thesisTitle}" đã nộp tệp tài liệu: "${file.originalname}".`;

        await notificationService.createNotification({
          recipientId: supervisor.userId._id,
          type: "THESIS",
          title: notifTitle,
          message: notifMessage,
          referenceId: doc._id,
          referenceModel: "Thesis",
          link: "/lecturer/theses/documents",
        });
      }
    }
  } catch (notifErr) {
    console.warn("[ThesisDocument] Notification error to supervisor:", notifErr.message);
  }

  return doc;
};

// 9. Student: Delete their submitted file
export const deleteStudentSubmission = async (id, userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const doc = await ThesisDocument.findById(id);
  if (!doc) {
    throw new AppError("Không tìm thấy tệp tài liệu để xóa", 404);
  }

  if (doc.documentType !== "SUBMISSION") {
    throw new AppError("Không thể xóa tài liệu này", 400);
  }

  const isOwner =
    doc.studentId?.toString() === student._id.toString() ||
    doc.uploadedBy?.toString() === userId.toString();

  if (!isOwner) {
    throw new AppError("Bạn không có quyền xóa file do thành viên khác nộp", 403);
  }

  unlinkFileSafe(doc.fileUrl);
  await ThesisDocument.findByIdAndDelete(id);

  return { success: true, message: "Đã gỡ file tài liệu nộp thành công" };
};

export default {
  getLecturerSupervisedTheses,
  getLecturerGuides,
  createLecturerGuide,
  deleteLecturerGuide,
  getLecturerSubmissions,
  getStudentGuides,
  getStudentSubmissions,
  createStudentSubmission,
  deleteStudentSubmission,
};
