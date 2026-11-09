import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import InternshipDocument from "../models/InternshipDocument.js";
import Internship from "../models/Internship.js";
import Lecturer from "../models/Lecturer.js";
import Student from "../models/Student.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import InternshipReport from "../models/InternshipReport.js";
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

// ==========================================
// 1. Phía Trưởng Bộ Môn (TBM / Quản trị)
// ==========================================

export const getAllDocuments = async ({ academicTermId = null, search = "" } = {}) => {
  const query = {
    documentType: { $in: ["DEPARTMENT", null] },
  };

  if (academicTermId && academicTermId !== "ALL") {
    query.$or = [{ academicTermId }, { academicTermId: null }];
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

  const documents = await InternshipDocument.find(query)
    .populate("uploadedBy", "fullName email")
    .populate("academicTermId", "termName code")
    .sort({ createdAt: -1 });

  return documents;
};

export const createDocument = async ({
  file,
  title = "",
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
    documentType: "DEPARTMENT",
    title: typeof title === "string" && title.trim() ? title.trim() : file.originalname,
    fileName: file.originalname,
    fileUrl,
    fileSize: file.size,
    fileType: file.mimetype,
    description: typeof description === "string" ? description.trim() : "",
    uploadedBy: userId || null,
  });

  return doc;
};

export const deleteDocument = async (id, userId = null) => {
  const doc = await InternshipDocument.findById(id);
  if (!doc) {
    throw new AppError("Không tìm thấy tệp tài liệu để xóa", 404);
  }

  unlinkFileSafe(doc.fileUrl);
  await InternshipDocument.findByIdAndDelete(id);

  return { success: true, message: "Đã xóa tài liệu thực tập thành công" };
};

// ==========================================
// 2. Phía Giảng viên Giám sát (GVGS)
// ==========================================

// 2.1 Lấy danh sách hồ sơ thực tập đang giám sát (dùng cho dropdown chọn sinh viên/hồ sơ)
export const getLecturerSupervisedInternships = async (userId, academicTermId = null) => {
  if (!userId) return [];
  const lecturer = await Lecturer.findOne({ userId });
  if (!lecturer) {
    return [];
  }

  const query = {
    lecturerId: lecturer._id,
    status: { $nin: ["CANCELLED"] },
  };

  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
  }

  const internships = await Internship.find(query)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
      select: "studentCode className userId",
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
      select: "studentCode className userId",
    })
    .populate("companyId", "name code")
    .sort({ createdAt: -1 });

  return internships.map((i) => {
    const s1Name = i.studentId?.userId?.fullName || "Sinh viên";
    const s1Code = i.studentId?.studentCode || "";
    const s2Name = i.secondStudentId?.userId?.fullName;
    const s2Code = i.secondStudentId?.studentCode;

    let studentLabel = s1Code ? `${s1Name} (${s1Code})` : s1Name;
    if (s2Name) {
      studentLabel += ` & ${s2Code ? `${s2Name} (${s2Code})` : s2Name}`;
    }

    return {
      _id: i._id,
      studentId: i.studentId?._id,
      studentLabel,
      companyName: i.companyId?.name || "Chưa có doanh nghiệp",
      position: i.position || "Thực tập sinh",
      academicTermId: i.academicTermId,
    };
  });
};

// 2.2 Lấy danh sách tài liệu hướng dẫn do giảng viên tải lên
export const getLecturerGuides = async (
  userId,
  { academicTermId = null, search = "", internshipId = null } = {},
) => {
  if (!userId) return [];
  let lecturer = await Lecturer.findOne({ userId });
  if (!lecturer) {
    const user = await User.findById(userId);
    if (user && user.email) {
      lecturer = await Lecturer.findOne({ email: user.email.toLowerCase() });
    }
  }

  const guideTypeFilter = {
    documentType: { $in: ["GUIDE", "DEPARTMENT", null] },
  };

  const queryConditions = [guideTypeFilter];

  if (lecturer) {
    if (internshipId && internshipId !== "ALL") {
      queryConditions.push({
        supervisorId: lecturer._id,
        internshipId,
      });
    } else {
      queryConditions.push({
        $or: [
          { supervisorId: lecturer._id },
          { uploadedBy: userId },
          { scope: "ALL" },
          { supervisorId: null },
          { documentType: "DEPARTMENT" },
        ],
      });
    }
  } else {
    // Admin or TBM
    queryConditions.push({
      $or: [
        { scope: "ALL" },
        { supervisorId: null },
        { documentType: "DEPARTMENT" },
        { uploadedBy: userId },
      ],
    });
  }

  if (academicTermId && academicTermId !== "ALL") {
    queryConditions.push({
      $or: [{ academicTermId }, { academicTermId: null }],
    });
  }

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    queryConditions.push({
      $or: [
        { fileName: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
      ],
    });
  }

  const docs = await InternshipDocument.find({ $and: queryConditions })
    .populate({
      path: "internshipId",
      populate: [
        {
          path: "studentId",
          populate: { path: "userId", select: "fullName" },
          select: "studentCode userId",
        },
        { path: "companyId", select: "name" },
      ],
      select: "position studentId companyId",
    })
    .populate("academicTermId", "termName code")
    .sort({ createdAt: -1 });

  return docs;
};

// 2.3 Thêm mới tài liệu hướng dẫn
export const createLecturerGuide = async ({
  userId,
  file,
  title = "",
  description = "",
  scope = "ALL",
  internshipId = null,
  category = "Tài liệu hướng dẫn",
  academicTermId = null,
}) => {
  let lecturer = await Lecturer.findOne({ userId }).populate("userId", "fullName");
  if (!lecturer) {
    const user = await User.findById(userId);
    if (user) {
      if (user.email) {
        lecturer = await Lecturer.findOne({ email: user.email.toLowerCase() }).populate("userId", "fullName");
      }
      if (!lecturer && (user.role === "ADMIN" || user.role === "TBM")) {
        lecturer = await Lecturer.findOne().populate("userId", "fullName");
      }
    }
  }
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên của bạn", 404);
  }

  if (!file) {
    throw new AppError("Vui lòng chọn tệp tài liệu để tải lên", 400);
  }

  let targetTermId = academicTermId;
  if (!targetTermId || targetTermId === "ALL") {
    try {
      const activeTerm = await academicTermService.getCurrentAcademicTerm();
      targetTermId = activeTerm?._id || null;
    } catch {}
  }

  const normalizedScope = scope === "SPECIFIC" ? "SPECIFIC" : "ALL";
  let targetInternshipId = null;

  if (normalizedScope === "SPECIFIC") {
    if (!internshipId) {
      throw new AppError("Vui lòng chọn sinh viên / hồ sơ thực tập cụ thể", 400);
    }
    const internship = await Internship.findOne({
      _id: internshipId,
      lecturerId: lecturer._id,
    });
    if (!internship) {
      throw new AppError("Không tìm thấy hồ sơ thực tập do bạn hướng dẫn", 404);
    }
    targetInternshipId = internship._id;
  }

  const fileUrl = `/uploads/internship-documents/${file.filename}`;

  const doc = await InternshipDocument.create({
    academicTermId: targetTermId || null,
    supervisorId: lecturer._id,
    internshipId: targetInternshipId,
    documentType: "GUIDE",
    scope: normalizedScope,
    category: typeof category === "string" && category.trim() ? category.trim() : "Tài liệu hướng dẫn",
    title: typeof title === "string" && title.trim() ? title.trim() : file.originalname,
    fileName: file.originalname,
    fileUrl,
    fileSize: file.size,
    fileType: file.mimetype,
    description: typeof description === "string" ? description.trim() : "",
    uploadedBy: userId,
  });

  // Gửi thông báo đến sinh viên
  try {
    const lecturerName = lecturer.userId?.fullName || "Giảng viên giám sát";
    const notifTitle = `GVGS ${lecturerName} đã đăng 1 tài liệu`;
    const notifMessage = `Giảng viên giám sát đã đăng tài liệu mới: "${file.originalname}".`;
    const recipientUserIds = new Set();

    if (normalizedScope === "SPECIFIC" && targetInternshipId) {
      const specificInternship = await Internship.findById(targetInternshipId)
        .populate({ path: "studentId", select: "userId" })
        .populate({ path: "secondStudentId", select: "userId" });

      if (specificInternship?.studentId?.userId) {
        recipientUserIds.add(specificInternship.studentId.userId.toString());
      }
      if (specificInternship?.secondStudentId?.userId) {
        recipientUserIds.add(specificInternship.secondStudentId.userId.toString());
      }
    } else {
      const queryInternships = {
        lecturerId: lecturer._id,
        status: { $nin: ["CANCELLED"] },
      };
      if (academicTermId && academicTermId !== "ALL") {
        queryInternships.academicTermId = academicTermId;
      }
      const supervisedList = await Internship.find(queryInternships)
        .populate({ path: "studentId", select: "userId" })
        .populate({ path: "secondStudentId", select: "userId" });

      for (const i of supervisedList) {
        if (i.studentId?.userId) {
          recipientUserIds.add(i.studentId.userId.toString());
        }
        if (i.secondStudentId?.userId) {
          recipientUserIds.add(i.secondStudentId.userId.toString());
        }
      }
    }

    for (const recipientId of recipientUserIds) {
      await notificationService.createNotification({
        recipientId,
        type: "INTERNSHIP",
        title: notifTitle,
        message: notifMessage,
        referenceId: doc._id,
        referenceModel: "Internship",
        link: "/student/internship/documents",
      });
    }
  } catch (notifErr) {
    console.warn("[InternshipDocument] Notification error to students:", notifErr.message);
  }

  return doc;
};

// 2.4 Chỉnh sửa tài liệu hướng dẫn
export const updateLecturerGuide = async (
  id,
  userId,
  { title, description, scope, internshipId, category, file = null } = {},
) => {
  let lecturer = await Lecturer.findOne({ userId });
  const user = await User.findById(userId);
  if (!lecturer && user && user.email) {
    lecturer = await Lecturer.findOne({ email: user.email.toLowerCase() });
  }

  const doc = await InternshipDocument.findById(id);
  if (!doc) {
    throw new AppError("Không tìm thấy tài liệu cần cập nhật", 404);
  }

  const isOwner =
    (lecturer && doc.supervisorId?.toString() === lecturer._id.toString()) ||
    (doc.uploadedBy && doc.uploadedBy.toString() === userId.toString()) ||
    (user && (user.role === "ADMIN" || user.role === "TBM"));

  if (!isOwner) {
    throw new AppError("Bạn không có quyền chỉnh sửa tài liệu này", 403);
  }

  if (typeof title === "string" && title.trim()) {
    doc.title = title.trim();
  }
  if (typeof description === "string") {
    doc.description = description.trim();
  }
  if (typeof category === "string" && category.trim()) {
    doc.category = category.trim();
  }

  if (scope !== undefined) {
    const normalizedScope = scope === "SPECIFIC" ? "SPECIFIC" : "ALL";
    doc.scope = normalizedScope;
    if (normalizedScope === "SPECIFIC") {
      if (internshipId) {
        const internship = await Internship.findOne({
          _id: internshipId,
          lecturerId: lecturer?._id || doc.supervisorId,
        });
        if (!internship) {
          throw new AppError("Không tìm thấy hồ sơ thực tập do bạn hướng dẫn", 404);
        }
        doc.internshipId = internship._id;
      }
    } else {
      doc.internshipId = null;
    }
  }

  // Nếu có tải lên file mới thay thế
  if (file) {
    unlinkFileSafe(doc.fileUrl);
    doc.fileUrl = `/uploads/internship-documents/${file.filename}`;
    doc.fileName = file.originalname;
    doc.fileSize = file.size;
    doc.fileType = file.mimetype;
    if (!title || !title.trim()) {
      doc.title = file.originalname;
    }
  }

  await doc.save();
  return doc;
};

// 2.5 Xóa tài liệu hướng dẫn
export const deleteLecturerGuide = async (id, userId) => {
  let lecturer = await Lecturer.findOne({ userId });
  const user = await User.findById(userId);
  if (!lecturer && user && user.email) {
    lecturer = await Lecturer.findOne({ email: user.email.toLowerCase() });
  }

  const doc = await InternshipDocument.findById(id);
  if (!doc) {
    throw new AppError("Không tìm thấy tài liệu cần xóa", 404);
  }

  const isOwner =
    (lecturer && doc.supervisorId?.toString() === lecturer._id.toString()) ||
    (doc.uploadedBy && doc.uploadedBy.toString() === userId.toString()) ||
    (user && (user.role === "ADMIN" || user.role === "TBM"));

  if (!isOwner) {
    throw new AppError("Bạn không có quyền xóa tài liệu này", 403);
  }

  unlinkFileSafe(doc.fileUrl);
  await InternshipDocument.findByIdAndDelete(id);

  return { success: true, message: "Đã xóa tài liệu hướng dẫn thành công" };
};

// 2.6 Xem danh sách file do sinh viên nộp lên (với thống kê nộp/chưa nộp)
export const getLecturerSubmissions = async (
  userId,
  { academicTermId = null, search = "", internshipId = null } = {},
) => {
  if (!userId) return { submissions: [], stats: { totalStudents: 0, submittedCount: 0, notSubmittedCount: 0 }, studentsStatus: [] };
  const lecturer = await Lecturer.findOne({ userId });
  if (!lecturer) {
    return { submissions: [], stats: { totalStudents: 0, submittedCount: 0, notSubmittedCount: 0 }, studentsStatus: [] };
  }

  // 1. Lấy toàn bộ danh sách sinh viên đang giám sát
  const internshipQuery = {
    lecturerId: lecturer._id,
    status: { $nin: ["CANCELLED"] },
  };
  if (academicTermId && academicTermId !== "ALL") {
    internshipQuery.academicTermId = academicTermId;
  }

  const supervisedInternships = await Internship.find(internshipQuery)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
      select: "studentCode className userId",
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
      select: "studentCode className userId",
    })
    .populate("companyId", "name code")
    .sort({ createdAt: -1 });

  // 2. Lấy danh sách submissions
  const submissionQuery = {
    supervisorId: lecturer._id,
    documentType: "SUBMISSION",
  };

  if (academicTermId && academicTermId !== "ALL") {
    submissionQuery.$or = [{ academicTermId }, { academicTermId: null }];
  }

  if (internshipId && internshipId !== "ALL") {
    submissionQuery.internshipId = internshipId;
  }

  let submissions = await InternshipDocument.find(submissionQuery)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
      select: "studentCode className userId",
    })
    .populate({
      path: "internshipId",
      populate: { path: "companyId", select: "name" },
      select: "position companyId",
    })
    .populate("uploadedBy", "fullName email")
    .populate("academicTermId", "termName code")
    .sort({ createdAt: -1 });

  // Đồng bộ hai chiều: Đảm bảo các hồ sơ thực tập đã có file báo cáo (reportFile) xuất hiện đầy đủ trong submissions
  for (const i of supervisedInternships) {
    if (i.reportFile?.fileUrl) {
      const alreadyInDocs = submissions.some(
        (s) =>
          (s.internshipId?._id && s.internshipId._id.toString() === i._id.toString()) ||
          (s.studentId?._id && i.studentId?._id && s.studentId._id.toString() === i.studentId._id.toString())
      );

      if (!alreadyInDocs) {
        try {
          const newDoc = await InternshipDocument.create({
            academicTermId: i.academicTermId || null,
            supervisorId: lecturer._id,
            internshipId: i._id,
            studentId: i.studentId?._id || null,
            documentType: "SUBMISSION",
            scope: "SPECIFIC",
            title: i.reportFile.originalName || "Báo cáo thực tập",
            fileName: i.reportFile.fileName || i.reportFile.originalName || "bao_cao_thuc_tap.docx",
            fileUrl: i.reportFile.fileUrl,
            fileSize: i.reportFile.fileSize || 0,
            fileType: i.reportFile.fileType || "application/octet-stream",
            category: "Báo cáo thực tập",
            description: "File báo cáo thực tập đồng bộ từ hồ sơ thực tập",
            status: "SUBMITTED",
            uploadedBy: i.studentId?.userId?._id || null,
            createdAt: i.reportFile.uploadedAt || new Date(),
          });

          const populatedNewDoc = await InternshipDocument.findById(newDoc._id)
            .populate({
              path: "studentId",
              populate: { path: "userId", select: "fullName email phone" },
              select: "studentCode className userId",
            })
            .populate({
              path: "internshipId",
              populate: { path: "companyId", select: "name" },
              select: "position companyId",
            })
            .populate("uploadedBy", "fullName email")
            .populate("academicTermId", "termName code");

          if (populatedNewDoc) {
            submissions.unshift(populatedNewDoc);
          }
        } catch (syncErr) {
          console.warn("[getLecturerSubmissions] Auto-sync doc error:", syncErr.message);
        }
      }
    }
  }

  // Lọc bỏ các bản ghi báo cáo đã bị gỡ
  const noReportInternshipIds = new Set(
    supervisedInternships
      .filter((i) => !i.reportFile || !i.reportFile.fileUrl)
      .map((i) => i._id.toString()),
  );
  submissions = submissions.filter((s) => {
    const iId = s.internshipId?._id ? s.internshipId._id.toString() : s.internshipId?.toString();
    if (iId && noReportInternshipIds.has(iId) && /báo cáo/i.test(s.category || "")) {
      return false;
    }
    return true;
  });

  // Khử trùng lặp file báo cáo cho cùng 1 sinh viên (chỉ giữ bản mới nhất đang có hiệu lực)
  const seenReportByStudent = new Set();
  submissions = submissions.filter((s) => {
    if (/báo cáo/i.test(s.category || "")) {
      const sId = s.studentId?._id ? s.studentId._id.toString() : s.studentId?.toString();
      if (sId) {
        if (seenReportByStudent.has(sId)) return false;
        seenReportByStudent.add(sId);
      }
    }
    return true;
  });

  // Lọc theo search (nếu có)
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    submissions = submissions.filter((sub) => {
      const fileNameMatch = sub.fileName?.toLowerCase().includes(q);
      const titleMatch = sub.title?.toLowerCase().includes(q);
      const descMatch = sub.description?.toLowerCase().includes(q);
      const categoryMatch = sub.category?.toLowerCase().includes(q);
      const studentNameMatch = sub.studentId?.userId?.fullName?.toLowerCase().includes(q);
      const studentCodeMatch = sub.studentId?.studentCode?.toLowerCase().includes(q);
      const companyMatch = sub.internshipId?.companyId?.name?.toLowerCase().includes(q);
      return fileNameMatch || titleMatch || descMatch || categoryMatch || studentNameMatch || studentCodeMatch || companyMatch;
    });
  }

  // 3. Tính toán thống kê ai đã nộp và ai chưa nộp
  const submittedStudentIdSet = new Set();
  const submissionCountByStudent = {};

  for (const s of submissions) {
    if (s.studentId?._id) {
      const sId = s.studentId._id.toString();
      submittedStudentIdSet.add(sId);
      submissionCountByStudent[sId] = (submissionCountByStudent[sId] || 0) + 1;
    }
  }

  const studentsStatus = [];
  for (const i of supervisedInternships) {
    if (i.studentId) {
      const sId = i.studentId._id.toString();
      const count = submissionCountByStudent[sId] || 0;
      studentsStatus.push({
        internshipId: i._id,
        studentId: sId,
        studentName: i.studentId.userId?.fullName || "Sinh viên",
        studentCode: i.studentId.studentCode || "",
        className: i.studentId.className || "",
        companyName: i.companyId?.name || "Chưa có",
        position: i.position || "",
        submissionCount: count,
        hasSubmitted: count > 0,
      });
    }
    if (i.secondStudentId) {
      const sId = i.secondStudentId._id.toString();
      const count = submissionCountByStudent[sId] || 0;
      studentsStatus.push({
        internshipId: i._id,
        studentId: sId,
        studentName: i.secondStudentId.userId?.fullName || "Sinh viên 2",
        studentCode: i.secondStudentId.studentCode || "",
        className: i.secondStudentId.className || "",
        companyName: i.companyId?.name || "Chưa có",
        position: i.position || "",
        submissionCount: count,
        hasSubmitted: count > 0,
      });
    }
  }

  const totalStudents = studentsStatus.length;
  const submittedCount = studentsStatus.filter((s) => s.hasSubmitted).length;
  const notSubmittedCount = totalStudents - submittedCount;

  return {
    submissions,
    stats: {
      totalStudents,
      submittedCount,
      notSubmittedCount,
    },
    studentsStatus,
  };
};

// ==========================================
// 3. Phía Sinh viên (Student)
// ==========================================

// 3.1 Lấy danh sách tài liệu từ giảng viên giám sát & tài liệu hướng dẫn chung
export const getStudentGuides = async (
  userId,
  { academicTermId = null, search = "" } = {},
) => {
  if (!userId) {
    return {
      hasInternship: false,
      internship: null,
      supervisor: null,
      documents: [],
      canSubmit: false,
      submitBlockReason: "Vui lòng đăng nhập để thực hiện",
    };
  }

  const student = await Student.findOne({ userId });
  if (!student) {
    return {
      hasInternship: false,
      internship: null,
      supervisor: null,
      documents: [],
      canSubmit: false,
      submitBlockReason: "Không tìm thấy thông tin sinh viên",
    };
  }

  let targetTermId = academicTermId;
  if (!targetTermId || targetTermId === "ALL") {
    try {
      const activeTerm = await academicTermService.getCurrentAcademicTerm();
      targetTermId = activeTerm?._id || null;
    } catch {}
  }

  // Tìm hồ sơ thực tập của sinh viên (ưu tiên hồ sơ theo kỳ nếu có, hoặc mới nhất)
  const internshipQuery = {
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
  };

  if (targetTermId && targetTermId !== "ALL") {
    internshipQuery.academicTermId = targetTermId;
  }

  const populateSupervisor = {
    path: "lecturerId",
    populate: { path: "userId", select: "fullName email phone" },
    select: "academicTitle userId lecturerCode",
  };

  let internship = await Internship.findOne(internshipQuery)
    .populate(populateSupervisor)
    .populate("companyId", "name code address")
    .sort({ createdAt: -1 });

  if (!internship && targetTermId) {
    internship = await Internship.findOne({
      $or: [{ studentId: student._id }, { secondStudentId: student._id }],
    })
      .populate(populateSupervisor)
      .populate("companyId", "name code address")
      .sort({ createdAt: -1 });
  }

  const hasInternship = Boolean(internship);
  const isApproved =
    hasInternship &&
    (Boolean(internship.approvedAt) ||
      ["APPROVED", "INTERNING", "COMPLETED"].includes(internship.status)) &&
    internship.status !== "CANCELLED" &&
    internship.status !== "REJECTED" &&
    !internship.rejectedAt;
  const isPending = hasInternship && !isApproved && (
    internship.status === "PENDING" ||
    internship.status === "PENDING_SUPERVISOR_ACCEPTANCE"
  );
  const hasSupervisor = Boolean(isApproved && internship?.lecturerId);

  let submitBlockReason = "";
  if (!hasInternship) {
    submitBlockReason = "Bạn chưa đăng ký thực tập doanh nghiệp. Vui lòng đăng ký thực tập trước.";
  } else if (!isApproved) {
    if (isPending) {
      submitBlockReason = "Hồ sơ thực tập của bạn đang chờ phê duyệt. Bạn chỉ có thể nộp tài liệu sau khi hồ sơ được duyệt.";
    } else {
      submitBlockReason = "Hồ sơ thực tập của bạn không ở trạng thái hợp lệ để nộp tài liệu.";
    }
  } else if (!internship?.lecturerId) {
    submitBlockReason = "Hồ sơ thực tập của bạn chưa được phân công Giảng viên giám sát.";
  }

  // Xây dựng điều kiện truy vấn tài liệu:
  // 1. Phải là tài liệu hướng dẫn / biểu mẫu chung hoặc riêng (không lấy file nộp bài SUBMISSION)
  const guideTypeFilter = {
    documentType: { $in: ["GUIDE", "DEPARTMENT", null] },
  };

  // 2. Phân quyền hiển thị theo phạm vi:
  // - Tài liệu chung (scope: ALL, hoặc supervisorId null, hoặc documentType DEPARTMENT) -> sinh viên nào thuộc kỳ cũng xem được
  // - Tài liệu riêng do GVGS tải lên -> sinh viên được GVGS đó hướng dẫn xem được
  let scopeFilter;
  if (hasSupervisor) {
    scopeFilter = {
      $or: [
        { scope: "ALL" },
        { supervisorId: null },
        { documentType: "DEPARTMENT" },
        { supervisorId: internship.lecturerId._id, internshipId: internship._id },
        { supervisorId: internship.lecturerId._id, scope: "ALL" },
      ],
    };
  } else {
    scopeFilter = {
      $or: [
        { scope: "ALL" },
        { supervisorId: null },
        { documentType: "DEPARTMENT" },
      ],
    };
  }

  const queryConditions = [guideTypeFilter, scopeFilter];

  // 3. Lọc theo học kỳ (nếu có, hoặc tài liệu dùng chung toàn trường không gắn kỳ)
  if (targetTermId && targetTermId !== "ALL") {
    queryConditions.push({
      $or: [{ academicTermId: targetTermId }, { academicTermId: null }],
    });
  }

  // 4. Tìm kiếm từ khóa nếu người dùng nhập
  if (typeof search === "string" && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    queryConditions.push({
      $or: [
        { fileName: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
      ],
    });
  }

  const docs = await InternshipDocument.find({ $and: queryConditions })
    .populate({
      path: "supervisorId",
      populate: { path: "userId", select: "fullName email" },
      select: "academicTitle userId lecturerCode",
    })
    .populate("academicTermId", "termName code")
    .sort({ createdAt: -1 });

  return {
    hasInternship,
    internship: internship
      ? {
          _id: internship._id,
          companyName: internship.companyId?.name || "Chưa có",
          position: internship.position || "Thực tập sinh",
          status: internship.status,
        }
      : null,
    supervisor: internship?.lecturerId || null,
    documents: docs,
    canSubmit: hasSupervisor,
    submitBlockReason,
  };
};

// 3.2 Lấy danh sách file sinh viên đã nộp
export const getStudentSubmissions = async (userId, { academicTermId = null } = {}) => {
  if (!userId) return [];
  const student = await Student.findOne({ userId });
  if (!student) {
    return [];
  }

  // 1. Tìm hồ sơ thực tập đang hoạt động (không bị hủy hoặc từ chối)
  const internshipQuery = {
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
    status: { $nin: ["CANCELLED", "REJECTED"] },
  };

  if (academicTermId && academicTermId !== "ALL") {
    internshipQuery.academicTermId = academicTermId;
  }

  let internship = await Internship.findOne(internshipQuery).sort({ createdAt: -1 });
  if (!internship && academicTermId && academicTermId !== "ALL") {
    internship = await Internship.findOne({
      $or: [{ studentId: student._id }, { secondStudentId: student._id }],
      status: { $nin: ["CANCELLED", "REJECTED"] },
    }).sort({ createdAt: -1 });
  }

  // 2. Truy vấn danh sách tài liệu sinh viên đã nộp
  const docConditions = [{ studentId: student._id }, { uploadedBy: userId }];
  if (internship) {
    docConditions.push({ internshipId: internship._id });
  }

  const docQuery = {
    documentType: "SUBMISSION",
    $or: docConditions,
  };

  let submissions = await InternshipDocument.find(docQuery)
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email" },
      select: "studentCode className userId",
    })
    .populate("uploadedBy", "fullName email")
    .sort({ createdAt: -1 });

  // 3. Tự động đồng bộ: nếu hồ sơ thực tập đã có file báo cáo nhưng chưa có trong danh sách tài liệu nộp
  if (internship?.reportFile?.fileUrl) {
    const hasReportDoc = submissions.some(
      (s) =>
        /báo cáo/i.test(s.category || "") ||
        /báo cáo/i.test(s.title || "") ||
        s.fileUrl === internship.reportFile.fileUrl,
    );
    if (!hasReportDoc) {
      try {
        const newDoc = await InternshipDocument.create({
          academicTermId: internship.academicTermId || null,
          supervisorId: internship.lecturerId || null,
          internshipId: internship._id,
          studentId: student._id,
          documentType: "SUBMISSION",
          scope: "SPECIFIC",
          title: internship.reportFile.originalName || "Báo cáo thực tập",
          fileName: internship.reportFile.fileName || internship.reportFile.originalName || "bao_cao_thuc_tap.docx",
          fileUrl: internship.reportFile.fileUrl,
          fileSize: internship.reportFile.fileSize || 0,
          fileType: internship.reportFile.fileType || "application/octet-stream",
          category: "Báo cáo thực tập",
          description: "File báo cáo thực tập đồng bộ từ hồ sơ thực tập",
          status: "SUBMITTED",
          uploadedBy: userId,
          createdAt: internship.reportFile.uploadedAt || new Date(),
        });
        const populated = await InternshipDocument.findById(newDoc._id)
          .populate({
            path: "studentId",
            populate: { path: "userId", select: "fullName email" },
            select: "studentCode className userId",
          })
          .populate("uploadedBy", "fullName email");
        if (populated) submissions.unshift(populated);
      } catch (e) {
        console.warn("[getStudentSubmissions] Auto-sync doc error:", e.message);
      }
    }
  }

  // 4. Nếu file báo cáo đã bị gỡ khỏi internship (reportFile rỗng), loại bỏ tài liệu báo cáo cũ để không hiển thị sai
  if (internship && (!internship.reportFile || !internship.reportFile.fileUrl)) {
    submissions = submissions.filter((s) => !/báo cáo/i.test(s.category || ""));
  }

  // 5. Khử trùng lặp file báo cáo (chỉ giữ bản mới nhất)
  const seenReportUrls = new Set();
  submissions = submissions.filter((s) => {
    if (/báo cáo/i.test(s.category || "")) {
      if (seenReportUrls.has(s.fileUrl)) return false;
      seenReportUrls.add(s.fileUrl);
    }
    return true;
  });

  return submissions;
};

// 3.3 Sinh viên nộp file cho giảng viên giám sát
export const createStudentSubmission = async ({
  userId,
  file,
  title,
  description,
  category,
}) => {
  const student = await Student.findOne({ userId }).populate("userId", "fullName");
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  if (!file) {
    throw new AppError("Vui lòng chọn tệp tài liệu để nộp", 400);
  }

  // 1. Kiểm tra điều kiện bắt buộc: Phải có hồ sơ thực tập hợp lệ đã được duyệt
  const anyInternship = await Internship.findOne({
    $or: [{ studentId: student._id }, { secondStudentId: student._id }],
  }).sort({ createdAt: -1 });

  if (!anyInternship) {
    throw new AppError(
      "Bạn chưa đăng ký thực tập doanh nghiệp. Vui lòng đăng ký thực tập trước khi nộp file tài liệu.",
      403,
    );
  }

  const isApproved =
    (Boolean(anyInternship.approvedAt) ||
      ["APPROVED", "INTERNING", "COMPLETED"].includes(anyInternship.status)) &&
    anyInternship.status !== "CANCELLED" &&
    anyInternship.status !== "REJECTED" &&
    !anyInternship.rejectedAt;

  if (!isApproved) {
    if (
      anyInternship.status === "PENDING" ||
      anyInternship.status === "PENDING_SUPERVISOR_ACCEPTANCE"
    ) {
      throw new AppError(
        "Hồ sơ thực tập của bạn đang chờ phê duyệt. Bạn chỉ có thể nộp tài liệu sau khi hồ sơ được duyệt thành công.",
        403,
      );
    }
    throw new AppError(
      "Hồ sơ thực tập của bạn không ở trạng thái hợp lệ để nộp file tài liệu.",
      403,
    );
  }

  const internship = anyInternship;

  // 2. Xử lý an toàn dữ liệu đầu vào (không gọi .trim() trực tiếp nếu chưa kiểm tra type)
  const safeTitle =
    typeof title === "string" && title.trim() ? title.trim() : file.originalname;

  const safeCategory =
    typeof category === "string" && category.trim()
      ? category.trim()
      : "Báo cáo thực tập";

  const safeDescription =
    typeof description === "string" ? description.trim() : "";

  const isReportCategory = /báo cáo/i.test(safeCategory);
  if (isReportCategory) {
    const existingDoc = await InternshipDocument.findOne({
      internshipId: internship._id,
      documentType: "SUBMISSION",
      category: { $regex: /báo cáo/i },
    });
    if (internship.reportFile?.fileUrl || existingDoc) {
      if (file.filename) {
        unlinkFileSafe(`/uploads/internship-documents/${file.filename}`);
      }
      throw new AppError(
        "Hồ sơ thực tập đã có file báo cáo đang có hiệu lực. Vui lòng gỡ file cũ trước khi nộp file mới.",
        400,
      );
    }
  }

  const fileUrl = `/uploads/internship-documents/${file.filename}`;

  const doc = await InternshipDocument.create({
    academicTermId: internship.academicTermId || null,
    supervisorId: internship.lecturerId || null,
    internshipId: internship._id,
    studentId: student._id,
    documentType: "SUBMISSION",
    scope: "SPECIFIC",
    title: safeTitle,
    fileName: file.originalname,
    fileUrl,
    fileSize: file.size,
    fileType: file.mimetype,
    category: safeCategory,
    description: safeDescription,
    status: "SUBMITTED",
    uploadedBy: userId,
  });

  // Đồng bộ sang Internship.reportFile và InternshipReport (FINAL) nếu tài liệu thuộc loại Báo cáo thực tập
  if (isReportCategory) {
    try {
      internship.reportFile = {
        originalName: file.originalname,
        fileName: file.filename,
        fileUrl,
        fileSize: file.size,
        fileType: file.mimetype,
        uploadedAt: new Date(),
      };
      await internship.save();

      let finalReport = await InternshipReport.findOne({
        internshipId: internship._id,
        reportType: "FINAL",
      });
      if (finalReport) {
        finalReport.file = {
          originalName: file.originalname,
          fileName: file.filename,
          fileUrl,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        };
        finalReport.status = "SUBMITTED";
        finalReport.submittedAt = new Date();
        await finalReport.save();
      } else {
        await InternshipReport.create({
          internshipId: internship._id,
          studentId: student._id,
          reportType: "FINAL",
          title: "Báo cáo thực tập doanh nghiệp (Bản chính thức)",
          content: "File báo cáo tổng kết thực tập doanh nghiệp đã nộp bởi sinh viên",
          file: {
            originalName: file.originalname,
            fileName: file.filename,
            fileUrl,
            mimeType: file.mimetype,
            size: file.size,
            uploadedAt: new Date(),
          },
          status: "SUBMITTED",
          submittedAt: new Date(),
        });
      }
    } catch (syncErr) {
      console.warn("[createStudentSubmission] Sync reportFile error:", syncErr.message);
    }
  }

  // Gửi thông báo đến Giảng viên giám sát
  try {
    if (internship.lecturerId) {
      const supervisor = await Lecturer.findById(internship.lecturerId).populate("userId", "fullName");
      if (supervisor?.userId?._id) {
        const studentName = student.userId?.fullName || "Sinh viên";
        const studentCode = student.studentCode ? ` (${student.studentCode})` : "";
        const notifTitle = `Sinh viên ${studentName} đã nộp 1 tài liệu`;
        const notifMessage = `Sinh viên ${studentName}${studentCode} đã nộp file tài liệu thực tập: "${file.originalname}".`;

        const targetLink = `/lecturer/internship-documents?tab=submissions&studentId=${student._id}&internshipId=${internship._id}&docId=${doc._id}&search=${student.studentCode || ""}`;

        await notificationService.createNotification({
          recipientId: supervisor.userId._id,
          senderId: userId,
          type: "INTERNSHIP",
          title: notifTitle,
          message: notifMessage,
          referenceId: doc._id,
          referenceModel: "InternshipDocument",
          link: targetLink,
          metadata: {
            studentId: student._id,
            studentCode: student.studentCode,
            studentName,
            internshipId: internship._id,
            fileId: doc._id,
            docId: doc._id,
            fileName: file.originalname,
            submittedAt: new Date(),
          },
        });
      }
    }
  } catch (notifErr) {
    console.warn("[InternshipDocument] Notification error to supervisor:", notifErr.message);
  }

  return doc;
};

// 3.4 Sinh viên gỡ / xóa file đã nộp
export const deleteStudentSubmission = async (id, userId) => {
  const student = await Student.findOne({ userId });
  if (!student) {
    throw new AppError("Không tìm thấy thông tin sinh viên", 404);
  }

  const doc = await InternshipDocument.findById(id);
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
    throw new AppError("Bạn không có quyền xóa file do sinh viên khác nộp", 403);
  }

  const deletedCategory = doc.category;
  const targetInternshipId = doc.internshipId;

  unlinkFileSafe(doc.fileUrl);
  await InternshipDocument.findByIdAndDelete(id);

  // Nếu file bị xóa là Báo cáo thực tập, đồng bộ lại Internship.reportFile
  if (/báo cáo/i.test(deletedCategory || "") && targetInternshipId) {
    try {
      const internship = await Internship.findById(targetInternshipId);
      if (internship) {
        const remainingReportDoc = await InternshipDocument.findOne({
          internshipId: targetInternshipId,
          documentType: "SUBMISSION",
          category: { $regex: /báo cáo/i },
        }).sort({ createdAt: -1 });

        if (remainingReportDoc) {
          internship.reportFile = {
            originalName: remainingReportDoc.title || remainingReportDoc.fileName,
            fileName: remainingReportDoc.fileName,
            fileUrl: remainingReportDoc.fileUrl,
            fileSize: remainingReportDoc.fileSize || 0,
            fileType: remainingReportDoc.fileType || null,
            uploadedAt: remainingReportDoc.createdAt || new Date(),
          };
        } else {
          internship.reportFile = {
            originalName: null,
            fileName: null,
            fileUrl: null,
            fileSize: 0,
            fileType: null,
            uploadedAt: null,
          };
          await InternshipReport.deleteMany({
            internshipId: targetInternshipId,
            reportType: "FINAL",
          });
        }
        await internship.save();
      }
    } catch (syncErr) {
      console.warn("[deleteStudentSubmission] Sync reportFile error:", syncErr.message);
    }
  }

  return { success: true, message: "Đã gỡ file tài liệu nộp thành công" };
};

export default {
  getAllDocuments,
  createDocument,
  deleteDocument,
  getLecturerSupervisedInternships,
  getLecturerGuides,
  createLecturerGuide,
  updateLecturerGuide,
  deleteLecturerGuide,
  getLecturerSubmissions,
  getStudentGuides,
  getStudentSubmissions,
  createStudentSubmission,
  deleteStudentSubmission,
};
