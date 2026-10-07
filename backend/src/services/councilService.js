import mongoose from "mongoose";
import Council from "../models/Council.js";
import Thesis from "../models/Thesis.js";
import Lecturer from "../models/Lecturer.js";
import User from "../models/User.js";
import AcademicTerm from "../models/AcademicTerm.js";
import Notification from "../models/Notification.js";
import AppError from "../utils/AppError.js";
import notificationService from "./notificationService.js";

/**
 * Check if the report time / defense time of a Council room has expired (ended)
 */
const isCouncilReportTimeExpired = (council) => {
  if (!council) return false;
  try {
    const now = new Date();

    // 1. If reportDate is set
    if (council.reportDate) {
      const dateObj = new Date(council.reportDate);
      if (!isNaN(dateObj.getTime())) {
        let endHour = 23;
        let endMinute = 59;
        if (council.reportEndTime && typeof council.reportEndTime === "string") {
          const [h, m] = council.reportEndTime.split(":").map(Number);
          if (!isNaN(h)) endHour = h;
          if (!isNaN(m)) endMinute = m;
        }
        dateObj.setHours(endHour, endMinute, 59, 999);
        return now > dateObj;
      }
    }

    // 2. Parse from reportTime string (e.g. "08:00 - 11:30, 07/10/2026")
    if (council.reportTime && typeof council.reportTime === "string") {
      const dateMatchVN = council.reportTime.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const dateMatchISO = council.reportTime.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      const timeRangeMatch = council.reportTime.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);

      let year, month, day;
      if (dateMatchVN) {
        day = parseInt(dateMatchVN[1], 10);
        month = parseInt(dateMatchVN[2], 10) - 1;
        year = parseInt(dateMatchVN[3], 10);
      } else if (dateMatchISO) {
        year = parseInt(dateMatchISO[1], 10);
        month = parseInt(dateMatchISO[2], 10) - 1;
        day = parseInt(dateMatchISO[3], 10);
      }

      if (year !== undefined && month !== undefined && day !== undefined) {
        let endHour = 23;
        let endMinute = 59;
        if (timeRangeMatch && timeRangeMatch[2]) {
          const [h, m] = timeRangeMatch[2].split(":").map(Number);
          if (!isNaN(h)) endHour = h;
          if (!isNaN(m)) endMinute = m;
        }
        const endDateTime = new Date(year, month, day, endHour, endMinute, 59, 999);
        return now > endDateTime;
      }
    }
  } catch (err) {
    console.warn("Error checking council expiry on server:", err);
  }
  return false;
};

// ====================
// 1. Get Councils List
// ====================
const getCouncils = async ({ academicTermId, search } = {}) => {
  const query = {};

  if (
    academicTermId &&
    academicTermId !== "ALL" &&
    academicTermId !== "default" &&
    mongoose.Types.ObjectId.isValid(academicTermId)
  ) {
    query.academicTermId = academicTermId;
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [{ name: regex }, { room: regex }, { description: regex }];
  }

  const councils = await Council.find(query)
    .sort({ createdAt: 1 })
    .populate({
      path: "lecturers.lecturerId",
      populate: {
        path: "userId",
        select: "fullName email phone avatar",
      },
    })
    .populate("academicTermId", "termName academicYear isCurrent")
    .lean();

  return councils;
};

// ====================
// 2. Get Council by ID
// ====================
const getCouncilById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("ID phòng hội đồng không hợp lệ", 400);
  }

  const council = await Council.findById(id)
    .populate({
      path: "lecturers.lecturerId",
      populate: {
        path: "userId",
        select: "fullName email phone avatar",
      },
    })
    .populate("academicTermId")
    .lean();

  if (!council) {
    throw new AppError("Không tìm thấy phòng hội đồng", 404);
  }

  return council;
};

// ====================
// 3. Create Council
// ====================
const createCouncil = async (data, userId) => {
  const {
    name,
    room,
    type,
    academicTermId,
    reportDate,
    reportStartTime,
    reportEndTime,
    reportTime,
    description,
    lecturers = [],
  } = data;

  if (!name || !name.trim()) {
    throw new AppError("Tên phòng hội đồng là bắt buộc", 400);
  }

  const formattedLecturers = (lecturers || [])
    .map((l) => ({
      lecturerId: l.lecturerId || l._id || l.id,
      role: l.role || "",
      score: l.score ?? null,
    }))
    .filter((l) => Boolean(l.lecturerId) && mongoose.Types.ObjectId.isValid(l.lecturerId));

  const validTermId =
    academicTermId &&
    academicTermId !== "default" &&
    academicTermId !== "ALL" &&
    mongoose.Types.ObjectId.isValid(academicTermId)
      ? academicTermId
      : null;

  let parsedReportDate = null;
  if (reportDate) {
    const d = new Date(reportDate);
    if (!isNaN(d.getTime())) {
      parsedReportDate = d;
    }
  }

  const council = await Council.create({
    name: name.trim(),
    room: (room || "").trim(),
    type: type || "ORAL",
    academicTermId: validTermId,
    reportDate: parsedReportDate,
    reportStartTime: reportStartTime || "",
    reportEndTime: reportEndTime || "",
    reportTime: reportTime || "",
    description: (description || "").trim(),
    lecturers: formattedLecturers,
    createdBy: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : null,
  });

  // Notify newly assigned lecturers
  if (formattedLecturers.length > 0) {
    for (const l of formattedLecturers) {
      try {
        const lec = await Lecturer.findById(l.lecturerId).populate("userId");
        if (lec?.userId?._id) {
          await notificationService.createNotification({
            recipientId: lec.userId._id,
            senderId: userId || null,
            type: "THESIS",
            title: "Phân công Hội đồng đánh giá Khóa luận",
            message: `Bạn đã được phân công vào ${council.name}${council.room ? ` (Phòng ${council.room})` : ""}.`,
            referenceId: council._id,
            referenceModel: "Thesis",
            link: "/lecturer/theses?tab=council",
            priority: "HIGH",
          });
        }
      } catch (err) {
        console.warn("Error notifying council lecturer:", err.message);
      }
    }
  }

  return getCouncilById(council._id);
};

// ====================
// 4. Update Council & Lecturers
// ====================
const updateCouncil = async (id, data, userId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("ID phòng hội đồng không hợp lệ", 400);
  }

  const council = await Council.findById(id);
  if (!council) {
    throw new AppError("Không tìm thấy phòng hội đồng", 404);
  }

  if (isCouncilReportTimeExpired(council)) {
    throw new AppError("Phòng hội đồng đã kết thúc thời gian báo cáo, không thể chỉnh sửa hoặc thay đổi phân công", 400);
  }

  const oldLecturerIds = (council.lecturers || []).map((l) => String(l.lecturerId));

  if (data.name !== undefined) council.name = data.name.trim();
  if (data.room !== undefined) council.room = (data.room || "").trim();
  if (data.type !== undefined) council.type = data.type;
  if (data.academicTermId !== undefined) {
    council.academicTermId =
      data.academicTermId &&
      data.academicTermId !== "default" &&
      data.academicTermId !== "ALL" &&
      mongoose.Types.ObjectId.isValid(data.academicTermId)
        ? data.academicTermId
        : null;
  }
  if (data.reportDate !== undefined) {
    if (data.reportDate) {
      const d = new Date(data.reportDate);
      council.reportDate = !isNaN(d.getTime()) ? d : null;
    } else {
      council.reportDate = null;
    }
  }
  if (data.reportStartTime !== undefined) council.reportStartTime = data.reportStartTime || "";
  if (data.reportEndTime !== undefined) council.reportEndTime = data.reportEndTime || "";
  if (data.reportTime !== undefined) council.reportTime = data.reportTime || "";
  if (data.description !== undefined) council.description = (data.description || "").trim();

  if (Array.isArray(data.lecturers)) {
    const formattedLecturers = data.lecturers
      .map((l) => ({
        lecturerId: l.lecturerId || l._id || l.id,
        role: l.role || "",
        score: l.score ?? null,
      }))
      .filter((l) => Boolean(l.lecturerId) && mongoose.Types.ObjectId.isValid(l.lecturerId));

    council.lecturers = formattedLecturers;

    const currentLecturerIds = formattedLecturers.map((l) => String(l.lecturerId));

    // 1. Detect removed lecturers to delete old assignment notifications
    const removedLecturerIds = oldLecturerIds.filter((lId) => !currentLecturerIds.includes(lId));
    for (const lId of removedLecturerIds) {
      try {
        const lec = await Lecturer.findById(lId).populate("userId");
        if (lec?.userId?._id) {
          const escapedName = council.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          await Notification.deleteMany({
            recipientId: lec.userId._id,
            $or: [
              { referenceId: council._id },
              {
                title: "Phân công Hội đồng đánh giá Khóa luận",
                message: { $regex: escapedName, $options: "i" },
              },
            ],
          });
        }
      } catch (err) {
        console.warn("Error removing old council notification:", err.message);
      }
    }

    // 2. Detect newly added lecturers to notify them
    const newLecturerIds = currentLecturerIds.filter((lId) => !oldLecturerIds.includes(lId));
    for (const lId of newLecturerIds) {
      try {
        const lec = await Lecturer.findById(lId).populate("userId");
        if (lec?.userId?._id) {
          await notificationService.createNotification({
            recipientId: lec.userId._id,
            senderId: userId || null,
            type: "THESIS",
            title: "Phân công Hội đồng đánh giá Khóa luận",
            message: `Bạn đã được phân công vào ${council.name}${council.room ? ` (Phòng ${council.room})` : ""}.`,
            referenceId: council._id,
            referenceModel: "Thesis",
            link: "/lecturer/theses?tab=council",
            priority: "HIGH",
          });
        }
      } catch (err) {
        console.warn("Error notifying updated council lecturer:", err.message);
      }
    }
  }

  await council.save();
  return getCouncilById(council._id);
};

// ====================
// 5. Delete Council
// ====================
const deleteCouncil = async (id) => {
  const council = await Council.findById(id);
  if (!council) {
    throw new AppError("Không tìm thấy phòng hội đồng", 404);
  }

  if (isCouncilReportTimeExpired(council)) {
    throw new AppError("Phòng hội đồng đã kết thúc thời gian báo cáo, không thể xóa", 400);
  }

  const escapedName = council.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Delete all notifications for this council
  await Notification.deleteMany({
    $or: [
      { referenceId: council._id },
      {
        title: "Phân công Hội đồng đánh giá Khóa luận",
        message: { $regex: escapedName, $options: "i" },
      },
    ],
  });

  await Council.findByIdAndDelete(id);

  // Unset councilId on any theses pointing to this council
  await Thesis.updateMany({ councilId: id }, { $set: { councilId: null } });

  return { message: "Xóa phòng hội đồng thành công" };
};

// ====================
// 6. Assign Council to Thesis
// ====================
const assignCouncilToThesis = async ({ thesisId, councilId }) => {
  const thesis = await Thesis.findById(thesisId);
  if (!thesis) {
    throw new AppError("Không tìm thấy đề tài khóa luận", 404);
  }

  if (thesis.councilId) {
    const currentCouncil = await Council.findById(thesis.councilId);
    if (isCouncilReportTimeExpired(currentCouncil)) {
      throw new AppError("Phòng hội đồng hiện tại đã kết thúc thời gian báo cáo, không thể thay đổi phân công", 400);
    }
  }

  if (councilId) {
    const council = await Council.findById(councilId);
    if (!council) {
      throw new AppError("Không tìm thấy phòng hội đồng để gán", 404);
    }
    if (isCouncilReportTimeExpired(council)) {
      throw new AppError("Phòng hội đồng đã kết thúc thời gian báo cáo, không thể phân công đề tài", 400);
    }

    const scoreHD = thesis.scores?.supervisorScore ?? thesis.scores?.student1SupervisorScore;
    if (scoreHD !== null && scoreHD !== undefined && !isNaN(scoreHD) && Number(scoreHD) < 4.0) {
      throw new AppError("Đề tài có điểm GVHD < 4.0 (Không đạt), không thể phân công vào hội đồng.", 400);
    }

    const s1 = thesis.scores?.reviewer1Score ?? thesis.scores?.student1Reviewer1Score;
    const s2 = thesis.scores?.reviewer2Score ?? thesis.scores?.student1Reviewer2Score;
    const hasS1 = s1 !== null && s1 !== undefined && !isNaN(s1);
    const hasS2 = s2 !== null && s2 !== undefined && !isNaN(s2);
    let avgPB = null;
    if (hasS1 && hasS2) avgPB = (Number(s1) + Number(s2)) / 2;
    else if (hasS1) avgPB = Number(s1);
    else if (hasS2) avgPB = Number(s2);
    else if (thesis.scores?.reviewerScore !== null && thesis.scores?.reviewerScore !== undefined) {
      avgPB = Number(thesis.scores.reviewerScore);
    }

    if (avgPB !== null && Number(avgPB) === 0) {
      throw new AppError("Đề tài có điểm phản biện kín bằng 0 (Không đạt), không thể phân công vào hội đồng.", 400);
    }

    thesis.councilId = council._id;
  } else {
    thesis.councilId = null;
  }

  await thesis.save();
  return thesis;
};

// ====================
// 7. Clear All Councils (Term / Global)
// ====================
const clearAllCouncils = async ({ academicTermId } = {}) => {
  const query = {};
  if (academicTermId && academicTermId !== "ALL" && academicTermId !== "default") {
    query.academicTermId = academicTermId;
  }

  const councilIds = await Council.find(query).distinct("_id");

  // Delete all council notifications
  await Notification.deleteMany({
    $or: [
      { referenceId: { $in: councilIds } },
      { title: "Phân công Hội đồng đánh giá Khóa luận" },
    ],
  });

  await Council.deleteMany(query);
  await Thesis.updateMany(
    { councilId: { $in: councilIds } },
    { $set: { councilId: null } }
  );

  return { message: "Đã xóa toàn bộ dữ liệu phòng hội đồng thành công" };
};

export default {
  getCouncils,
  getCouncilById,
  createCouncil,
  updateCouncil,
  deleteCouncil,
  assignCouncilToThesis,
  clearAllCouncils,
};
