import ResearchField from "../models/ResearchField.js";
import FieldChangeRequest from "../models/FieldChangeRequest.js";
import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import notificationService from "./notificationService.js";
import AppError from "../utils/AppError.js";

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const DEFAULT_FIELDS = [
  "Trí tuệ nhân tạo (AI)",
  "Khoa học dữ liệu (Data Science)",
  "Phát triển Web",
  "Phát triển Ứng dụng Di động",
  "Điện toán đám mây (Cloud Computing)",
  "An toàn thông tin & Bảo mật",
  "Hệ thống nhúng & IoT",
  "Mạng máy tính & Viễn thông",
  "Thị giác máy tính (Computer Vision)",
  "Xử lý ngôn ngữ tự nhiên (NLP)",
  "Công nghệ phần mềm",
  "Học máy & Deep Learning",
];

// Seed default fields if empty
const seedInitialFields = async () => {
  try {
    const count = await ResearchField.countDocuments();
    if (count === 0) {
      const docs = DEFAULT_FIELDS.map((name) => ({ name }));
      await ResearchField.insertMany(docs, { ordered: false });
    }
  } catch (err) {
    console.warn("Error seeding initial research fields:", err.message);
  }
};

// 1. Get all active fields
const getAllFields = async () => {
  await seedInitialFields();
  return await ResearchField.find({ isActive: true }).sort({ name: 1 }).lean();
};

// 2. Create a new field tag (TBM/Admin)
const createField = async ({ name, description = "", userId = null }) => {
  if (!name || !name.trim()) {
    throw new AppError("Tên lĩnh vực không được để trống", 400);
  }
  const cleanName = name.trim();
  const existing = await ResearchField.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, "i") },
  });
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
      return existing;
    }
    throw new AppError("Lĩnh vực này đã tồn tại trong hệ thống", 400);
  }
  const field = await ResearchField.create({
    name: cleanName,
    description: description ? description.trim() : "",
    createdBy: userId,
  });
  return field;
};

// 3. Delete a field tag (TBM/Admin)
const deleteField = async (id) => {
  const field = await ResearchField.findById(id);
  if (!field) {
    throw new AppError("Không tìm thấy lĩnh vực", 404);
  }
  await ResearchField.findByIdAndDelete(id);
  return { message: "Xóa lĩnh vực thành công" };
};

// 4. Get all lecturers with fields (TBM/Admin)
const getLecturersWithFields = async () => {
  const lecturers = await Lecturer.find()
    .populate({
      path: "userId",
      select: "fullName email phone role avatar",
    })
    .sort({ createdAt: 1 })
    .lean();

  return lecturers.map((lec) => ({
    _id: lec._id,
    userId: lec.userId,
    lecturerCode: lec.lecturerCode,
    academicTitle: lec.academicTitle,
    specialization: lec.specialization,
    fields: Array.isArray(lec.fields) ? lec.fields : [],
  }));
};

// 5. Assign fields to 1 or many lecturers (TBM/Admin)
const assignFieldsToLecturers = async ({ lecturerIds = [], fields = [], updatedByUserId = null }) => {
  if (!Array.isArray(lecturerIds) || lecturerIds.length === 0) {
    throw new AppError("Vui lòng chọn ít nhất một giảng viên", 400);
  }

  const cleanFields = Array.from(
    new Set((fields || []).map((f) => (typeof f === "string" ? f.trim() : "")).filter(Boolean))
  );

  const updatedLecturers = [];

  for (const lecId of lecturerIds) {
    const lec = await Lecturer.findById(lecId).populate("userId");
    if (!lec) continue;

    lec.fields = cleanFields;
    await lec.save();
    updatedLecturers.push(lec);

    // Send notification to each lecturer
    if (lec.userId?._id) {
      const fieldListStr = cleanFields.length > 0 ? cleanFields.join(", ") : "Chưa có";
      await notificationService.createNotification({
        recipientId: lec.userId._id,
        senderId: updatedByUserId,
        type: "SYSTEM",
        title: "Cập nhật Lĩnh vực nghiên cứu",
        message: `Trưởng bộ môn đã cập nhật lĩnh vực của bạn: ${fieldListStr}`,
        link: "/lecturer/dashboard",
        priority: "NORMAL",
      });
    }
  }

  return {
    success: true,
    updatedCount: updatedLecturers.length,
    fields: cleanFields,
  };
};

// 6. Lecturer checks current pending request
const getMyPendingRequest = async (userId) => {
  const lecturer = await Lecturer.findOne({ userId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const pendingRequest = await FieldChangeRequest.findOne({
    lecturerId: lecturer._id,
    status: "PENDING",
  }).sort({ createdAt: -1 });

  return {
    hasPending: Boolean(pendingRequest),
    request: pendingRequest || null,
    currentFields: Array.isArray(lecturer.fields) ? lecturer.fields : [],
  };
};

// 7. Lecturer creates/updates field change request
const createFieldChangeRequest = async ({ userId, requestedFields = [], proposedNewTags = [] }) => {
  const lecturer = await Lecturer.findOne({ userId }).populate("userId");
  if (!lecturer) {
    throw new AppError("Không tìm thấy thông tin giảng viên", 404);
  }

  const cleanRequested = Array.from(
    new Set((requestedFields || []).map((f) => f.trim()).filter(Boolean))
  );
  const cleanProposed = Array.from(
    new Set((proposedNewTags || []).map((f) => f.trim()).filter(Boolean))
  );

  if (cleanRequested.length === 0) {
    throw new AppError("Vui lòng chọn hoặc đề xuất ít nhất một lĩnh vực", 400);
  }

  let request = await FieldChangeRequest.findOne({
    lecturerId: lecturer._id,
    status: "PENDING",
  });

  if (request) {
    request.requestedFields = cleanRequested;
    request.proposedNewTags = cleanProposed;
    request.currentFields = Array.isArray(lecturer.fields) ? lecturer.fields : [];
    await request.save();
  } else {
    request = await FieldChangeRequest.create({
      lecturerId: lecturer._id,
      userId: lecturer.userId?._id || userId,
      currentFields: Array.isArray(lecturer.fields) ? lecturer.fields : [],
      requestedFields: cleanRequested,
      proposedNewTags: cleanProposed,
      status: "PENDING",
    });
  }

  // Notify TBM users
  try {
    const tbmUsers = await User.find({ role: "TBM", isActive: true });
    const lecName = `${lecturer.academicTitle ? `${lecturer.academicTitle} ` : ""}${lecturer.userId?.fullName || "Giảng viên"}`;
    for (const tbm of tbmUsers) {
      await notificationService.createNotification({
        recipientId: tbm._id,
        senderId: userId,
        type: "SYSTEM",
        title: "Yêu cầu thay đổi lĩnh vực",
        message: `Giảng viên ${lecName} đã gửi yêu cầu thay đổi lĩnh vực nghiên cứu. Vui lòng xem xét và duyệt.`,
        link: "/tbm/fields",
        priority: "HIGH",
      });
    }
  } catch (err) {
    console.warn("Error notifying TBM about field change request:", err.message);
  }

  return request;
};

// 8. TBM gets all change requests
const getAllRequests = async () => {
  return await FieldChangeRequest.find({ status: "PENDING" })
    .populate({
      path: "lecturerId",
      populate: {
        path: "userId",
        select: "fullName email phone role avatar",
      },
    })
    .sort({ createdAt: -1 })
    .lean();
};

// 9. TBM approves request
const approveRequest = async (requestId, tbmUserId) => {
  const request = await FieldChangeRequest.findById(requestId).populate("lecturerId");
  if (!request) {
    throw new AppError("Không tìm thấy yêu cầu", 404);
  }
  if (request.status !== "PENDING") {
    throw new AppError("Yêu cầu này đã được xử lý", 400);
  }

  const lecturer = await Lecturer.findById(request.lecturerId._id || request.lecturerId);
  if (!lecturer) {
    throw new AppError("Không tìm thấy giảng viên tương ứng", 404);
  }

  // 1. Overwrite lecturer fields
  lecturer.fields = request.requestedFields;
  await lecturer.save();

  // 2. Auto add any newly proposed tags into system ResearchField
  for (const tag of request.requestedFields) {
    const cleanTag = tag.trim();
    if (!cleanTag) continue;
    const exists = await ResearchField.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(cleanTag)}$`, "i") },
    });
    if (!exists) {
      try {
        await ResearchField.create({
          name: cleanTag,
          createdBy: tbmUserId,
        });
      } catch (e) {
        // Ignore duplicate index race
      }
    }
  }

  // 3. Mark request APPROVED
  request.status = "APPROVED";
  request.reviewedBy = tbmUserId;
  request.reviewedAt = new Date();
  await request.save();

  // 4. Send notification to lecturer
  try {
    const targetUserId = lecturer.userId?._id || lecturer.userId || request.userId;
    if (targetUserId) {
      await notificationService.createNotification({
        recipientId: targetUserId,
        senderId: tbmUserId,
        type: "SYSTEM",
        title: "Yêu cầu thay đổi lĩnh vực đã được duyệt",
        message: `Trưởng bộ môn đã phê duyệt yêu cầu thay đổi lĩnh vực nghiên cứu của bạn. Lĩnh vực mới: ${request.requestedFields.join(", ")}`,
        link: "/lecturer/dashboard",
        priority: "HIGH",
      });
    }
  } catch (err) {
    console.warn("Error notifying lecturer about approved field request:", err.message);
  }

  return {
    success: true,
    message: "Đã duyệt yêu cầu thay đổi lĩnh vực",
    request,
    fields: lecturer.fields,
  };
};

// 10. TBM rejects request
const rejectRequest = async (requestId, tbmUserId) => {
  const request = await FieldChangeRequest.findById(requestId).populate("lecturerId");
  if (!request) {
    throw new AppError("Không tìm thấy yêu cầu", 404);
  }
  if (request.status !== "PENDING") {
    throw new AppError("Yêu cầu này đã được xử lý", 400);
  }

  request.status = "REJECTED";
  request.reviewedBy = tbmUserId;
  request.reviewedAt = new Date();
  await request.save();

  try {
    const targetUserId = request.lecturerId?.userId || request.userId;
    if (targetUserId) {
      await notificationService.createNotification({
        recipientId: targetUserId,
        senderId: tbmUserId,
        type: "SYSTEM",
        title: "Yêu cầu thay đổi lĩnh vực không được duyệt",
        message: "Trưởng bộ môn đã từ chối yêu cầu thay đổi lĩnh vực nghiên cứu của bạn.",
        link: "/lecturer/dashboard",
        priority: "NORMAL",
      });
    }
  } catch (err) {
    console.warn("Error notifying lecturer about rejected field request:", err.message);
  }

  return {
    success: true,
    message: "Đã từ chối yêu cầu",
    request,
  };
};

export default {
  getAllFields,
  createField,
  deleteField,
  getLecturersWithFields,
  assignFieldsToLecturers,
  getMyPendingRequest,
  createFieldChangeRequest,
  getAllRequests,
  approveRequest,
  rejectRequest,
};
