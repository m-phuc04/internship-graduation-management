import AcademicTerm from "../models/AcademicTerm.js";
import Internship from "../models/Internship.js";
import Thesis from "../models/Thesis.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

// ====================
// 1. Get All Academic Terms
// ====================
const getAllTerms = async ({ status = "", academicYear = "", search = "" } = {}) => {
  const query = {};

  if (status && status !== "ALL") {
    query.status = status;
  }

  if (academicYear && academicYear !== "ALL") {
    query.academicYear = academicYear;
  }

  if (search && search.trim()) {
    const term = search.trim();
    const regex = new RegExp(term, "i");
    query.$or = [{ name: regex }, { code: regex }, { academicYear: regex }];
  }

  const terms = await AcademicTerm.find(query)
    .sort({ startDate: -1, createdAt: -1 })
    .populate({ path: "createdBy", select: "fullName email role" })
    .lean();

  // Attach basic stats (count of internships & theses)
  const termIds = terms.map((t) => t._id);
  const [internshipCounts, thesisCounts] = await Promise.all([
    Internship.aggregate([
      { $match: { academicTermId: { $in: termIds } } },
      { $group: { _id: "$academicTermId", count: { $sum: 1 } } },
    ]),
    Thesis.aggregate([
      { $match: { academicTermId: { $in: termIds } } },
      { $group: { _id: "$academicTermId", count: { $sum: 1 } } },
    ]),
  ]);

  const internshipMap = {};
  internshipCounts.forEach((i) => {
    internshipMap[i._id.toString()] = i.count;
  });

  const thesisMap = {};
  thesisCounts.forEach((t) => {
    thesisMap[t._id.toString()] = t.count;
  });

  return terms.map((t) => ({
    ...t,
    internshipCount: internshipMap[t._id.toString()] || 0,
    thesisCount: thesisMap[t._id.toString()] || 0,
  }));
};

// ====================
// 2. Get Current Academic Term (Auto-match by Date or Active Status)
// ====================
const getCurrentAcademicTerm = async (targetDate = new Date()) => {
  const date = new Date(targetDate);

  // 1. Try finding term that covers the target date: startDate <= date <= endDate (non-closed)
  const dateMatchingTerms = await AcademicTerm.find({
    startDate: { $lte: date },
    endDate: { $gte: date },
    status: { $ne: "CLOSED" },
  })
    .populate({ path: "createdBy", select: "fullName email role" })
    .lean();

  if (dateMatchingTerms.length > 0) {
    const active = dateMatchingTerms.find((t) => t.status === "ACTIVE");
    if (active) return active;
    return dateMatchingTerms[0];
  }

  // 2. Fallback: Find currently ACTIVE term
  const activeTerm = await AcademicTerm.findOne({ status: "ACTIVE" })
    .populate({ path: "createdBy", select: "fullName email role" })
    .lean();

  if (activeTerm) {
    return activeTerm;
  }

  // 3. Throw clear error if out of term range
  throw new AppError(
    "Không xác định được học kỳ hiện tại. Vui lòng liên hệ quản trị viên.",
    404,
    "NO_ACTIVE_ACADEMIC_TERM"
  );
};

// ====================
// 2b. Get Active Academic Term
// ====================
const getActiveTerm = async () => {
  const activeTerm = await AcademicTerm.findOne({ status: "ACTIVE" })
    .populate({ path: "createdBy", select: "fullName email role" })
    .lean();

  return activeTerm;
};

// ====================
// 3. Get Term Details by ID
// ====================
const getTermById = async (id) => {
  const term = await AcademicTerm.findById(id)
    .populate({ path: "createdBy", select: "fullName email role" })
    .lean();

  if (!term) {
    throw new AppError("Không tìm thấy học kỳ yêu cầu", 404);
  }

  const [internshipCount, thesisCount] = await Promise.all([
    Internship.countDocuments({ academicTermId: term._id }),
    Thesis.countDocuments({ academicTermId: term._id }),
  ]);

  return {
    ...term,
    internshipCount,
    thesisCount,
  };
};

// ====================
// 4. Create Academic Term
// ====================
const createTerm = async (data, userId) => {
  const {
    name,
    academicYear,
    code,
    startDate,
    endDate,
    status = "DRAFT",
    description = null,
    internship = {},
    thesis = {},
  } = data;

  if (!name || !name.trim()) {
    throw new AppError("Tên học kỳ là bắt buộc", 400, "VALIDATION_ERROR");
  }
  if (!academicYear || !academicYear.trim()) {
    throw new AppError("Năm học là bắt buộc", 400, "VALIDATION_ERROR");
  }
  if (!code || !code.trim()) {
    throw new AppError("Mã học kỳ là bắt buộc", 400, "VALIDATION_ERROR");
  }
  if (!startDate || !endDate) {
    throw new AppError("Ngày bắt đầu và ngày kết thúc học kỳ là bắt buộc", 400, "VALIDATION_ERROR");
  }

  const startD = new Date(startDate);
  const endD = new Date(endDate);
  if (endD <= startD) {
    throw new AppError("Ngày kết thúc học kỳ phải sau ngày bắt đầu", 400, "INVALID_DATE_RANGE");
  }

  const cleanCode = code.trim().toUpperCase();

  // Check code uniqueness
  const existingCode = await AcademicTerm.findOne({ code: cleanCode });
  if (existingCode) {
    throw new AppError(`Mã học kỳ "${cleanCode}" đã tồn tại. Vui lòng sử dụng mã khác.`, 409, "ACADEMIC_TERM_CODE_EXISTS");
  }

  // Check name + academicYear uniqueness
  const existingTermNameYear = await AcademicTerm.findOne({
    name: name.trim(),
    academicYear: academicYear.trim(),
  });
  if (existingTermNameYear) {
    throw new AppError(`Học kỳ "${name.trim()}" trong năm học "${academicYear.trim()}" đã tồn tại. Vui lòng kiểm tra lại.`, 409, "ACADEMIC_TERM_EXISTS");
  }

  // Validate TTDN milestone dates if provided
  if (internship.registrationStart && internship.registrationEnd) {
    if (new Date(internship.registrationEnd) < new Date(internship.registrationStart)) {
      throw new AppError("Hạn chót đăng ký TTDN phải sau ngày bắt đầu đăng ký", 400, "INVALID_DATE_RANGE");
    }
  }
  if (internship.reportStart && internship.reportDeadline) {
    if (new Date(internship.reportDeadline) < new Date(internship.reportStart)) {
      throw new AppError("Hạn chót nộp báo cáo TTDN phải sau ngày bắt đầu nộp", 400, "INVALID_DATE_RANGE");
    }
  }

  // Validate KLTN milestone dates if provided
  if (thesis.registrationStart && thesis.registrationEnd) {
    if (new Date(thesis.registrationEnd) < new Date(thesis.registrationStart)) {
      throw new AppError("Hạn chót đăng ký KLTN phải sau ngày bắt đầu đăng ký", 400, "INVALID_DATE_RANGE");
    }
  }
  if (thesis.assignmentStart && thesis.assignmentEnd) {
    if (new Date(thesis.assignmentEnd) < new Date(thesis.assignmentStart)) {
      throw new AppError("Hạn chót phân công GVHD/PB phải sau ngày bắt đầu phân công", 400, "INVALID_DATE_RANGE");
    }
  }
  if (thesis.defenseStart && thesis.defenseEnd) {
    if (new Date(thesis.defenseEnd) < new Date(thesis.defenseStart)) {
      throw new AppError("Hạn chót bảo vệ khóa luận phải sau ngày bắt đầu bảo vệ", 400, "INVALID_DATE_RANGE");
    }
  }

  // If status is ACTIVE, close existing active term first (single active rule)
  if (status === "ACTIVE") {
    await AcademicTerm.updateMany({ status: "ACTIVE" }, { status: "CLOSED" });
  }

  const newTerm = await AcademicTerm.create({
    name: name.trim(),
    academicYear: academicYear.trim(),
    code: cleanCode,
    startDate: startD,
    endDate: endD,
    status,
    description: description ? description.trim() : null,
    internship: {
      registrationStart: internship.registrationStart ? new Date(internship.registrationStart) : null,
      registrationEnd: internship.registrationEnd ? new Date(internship.registrationEnd) : null,
      reportStart: internship.reportStart ? new Date(internship.reportStart) : null,
      reportDeadline: internship.reportDeadline ? new Date(internship.reportDeadline) : null,
    },
    thesis: {
      registrationStart: thesis.registrationStart ? new Date(thesis.registrationStart) : null,
      registrationEnd: thesis.registrationEnd ? new Date(thesis.registrationEnd) : null,
      assignmentStart: thesis.assignmentStart ? new Date(thesis.assignmentStart) : null,
      assignmentEnd: thesis.assignmentEnd ? new Date(thesis.assignmentEnd) : null,
      defenseStart: thesis.defenseStart ? new Date(thesis.defenseStart) : null,
      defenseEnd: thesis.defenseEnd ? new Date(thesis.defenseEnd) : null,
    },
    createdBy: userId || null,
  });

  return newTerm;
};

// ====================
// 5. Update Academic Term
// ====================
const updateTerm = async (id, data) => {
  const term = await AcademicTerm.findById(id);
  if (!term) {
    throw new AppError("Không tìm thấy học kỳ", 404);
  }

  const {
    name,
    academicYear,
    code,
    startDate,
    endDate,
    status,
    description,
    internship,
    thesis,
  } = data;

  if (code && code.trim()) {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode !== term.code) {
      const existing = await AcademicTerm.findOne({ code: cleanCode, _id: { $ne: term._id } });
      if (existing) {
        throw new AppError(`Mã học kỳ "${cleanCode}" đã được sử dụng bởi học kỳ khác.`, 409, "ACADEMIC_TERM_CODE_EXISTS");
      }
      term.code = cleanCode;
    }
  }

  if (name !== undefined) term.name = name.trim();
  if (academicYear !== undefined) term.academicYear = academicYear.trim();
  if (startDate !== undefined) term.startDate = new Date(startDate);
  if (endDate !== undefined) term.endDate = new Date(endDate);

  if (term.endDate <= term.startDate) {
    throw new AppError("Ngày kết thúc học kỳ phải sau ngày bắt đầu", 400, "INVALID_DATE_RANGE");
  }

  if (description !== undefined) term.description = description ? description.trim() : null;

  if (status !== undefined && status !== term.status) {
    if (status === "ACTIVE") {
      // Auto-close any other active term
      await AcademicTerm.updateMany({ _id: { $ne: term._id }, status: "ACTIVE" }, { status: "CLOSED" });
    }
    term.status = status;
  }

  if (internship) {
    term.internship = {
      registrationStart: internship.registrationStart !== undefined ? (internship.registrationStart ? new Date(internship.registrationStart) : null) : term.internship?.registrationStart,
      registrationEnd: internship.registrationEnd !== undefined ? (internship.registrationEnd ? new Date(internship.registrationEnd) : null) : term.internship?.registrationEnd,
      reportStart: internship.reportStart !== undefined ? (internship.reportStart ? new Date(internship.reportStart) : null) : term.internship?.reportStart,
      reportDeadline: internship.reportDeadline !== undefined ? (internship.reportDeadline ? new Date(internship.reportDeadline) : null) : term.internship?.reportDeadline,
    };
  }

  if (thesis) {
    term.thesis = {
      registrationStart: thesis.registrationStart !== undefined ? (thesis.registrationStart ? new Date(thesis.registrationStart) : null) : term.thesis?.registrationStart,
      registrationEnd: thesis.registrationEnd !== undefined ? (thesis.registrationEnd ? new Date(thesis.registrationEnd) : null) : term.thesis?.registrationEnd,
      assignmentStart: thesis.assignmentStart !== undefined ? (thesis.assignmentStart ? new Date(thesis.assignmentStart) : null) : term.thesis?.assignmentStart,
      assignmentEnd: thesis.assignmentEnd !== undefined ? (thesis.assignmentEnd ? new Date(thesis.assignmentEnd) : null) : term.thesis?.assignmentEnd,
      defenseStart: thesis.defenseStart !== undefined ? (thesis.defenseStart ? new Date(thesis.defenseStart) : null) : term.thesis?.defenseStart,
      defenseEnd: thesis.defenseEnd !== undefined ? (thesis.defenseEnd ? new Date(thesis.defenseEnd) : null) : term.thesis?.defenseEnd,
    };
  }

  await term.save();
  return term;
};

// ====================
// 6. Activate Academic Term
// ====================
const activateTerm = async (id) => {
  const term = await AcademicTerm.findById(id);
  if (!term) {
    throw new AppError("Không tìm thấy học kỳ", 404);
  }

  // Switch all other active terms to CLOSED
  await AcademicTerm.updateMany({ _id: { $ne: term._id }, status: "ACTIVE" }, { status: "CLOSED" });

  term.status = "ACTIVE";
  await term.save();

  return term;
};

// ====================
// 7. Close Academic Term
// ====================
const closeTerm = async (id) => {
  const term = await AcademicTerm.findById(id);
  if (!term) {
    throw new AppError("Không tìm thấy học kỳ", 404);
  }

  term.status = "CLOSED";
  await term.save();

  return term;
};

// ====================
// 8. Delete Academic Term (Safe Delete)
// ====================
const deleteTerm = async (id) => {
  const term = await AcademicTerm.findById(id);
  if (!term) {
    throw new AppError("Không tìm thấy học kỳ", 404);
  }

  // Check if any business data is attached
  const [internshipCount, thesisCount] = await Promise.all([
    Internship.countDocuments({ academicTermId: term._id }),
    Thesis.countDocuments({ academicTermId: term._id }),
  ]);

  if (internshipCount > 0 || thesisCount > 0) {
    throw new AppError(
      `Không thể xóa học kỳ đã phát sinh dữ liệu (${internshipCount} hồ sơ TTDN, ${thesisCount} đề tài KLTN). Bạn có thể chuyển sang trạng thái ĐÃ ĐÓNG (CLOSED) để bảo toàn lịch sử.`,
      400,
    );
  }

  await AcademicTerm.findByIdAndDelete(term._id);
  return { message: "Đã xóa học kỳ thành công" };
};

// ====================
// 9. Startup Seed & Safe Data Migration
// ====================
const ensureDefaultActiveTerm = async () => {
  try {
    let activeTerm = await AcademicTerm.findOne({ status: "ACTIVE" });

    if (!activeTerm) {
      // Check if any term exists
      const anyTerm = await AcademicTerm.findOne().sort({ createdAt: -1 });
      if (anyTerm) {
        anyTerm.status = "ACTIVE";
        await anyTerm.save();
        activeTerm = anyTerm;
      } else {
        // Create initial default term HK1-2026-2027
        activeTerm = await AcademicTerm.create({
          name: "Học kỳ 1",
          academicYear: "2026-2027",
          code: "HK1-2026-2027",
          startDate: new Date("2026-08-01"),
          endDate: new Date("2027-01-15"),
          status: "ACTIVE",
          description: "Học kỳ 1 năm học 2026-2027 (Mặc định hệ thống)",
          internship: {
            registrationStart: new Date("2026-08-01"),
            registrationEnd: new Date("2026-09-30"),
            reportStart: new Date("2026-10-01"),
            reportDeadline: new Date("2026-12-31"),
          },
          thesis: {
            registrationStart: new Date("2026-08-01"),
            registrationEnd: new Date("2026-09-30"),
            assignmentStart: new Date("2026-10-01"),
            assignmentEnd: new Date("2026-11-15"),
            defenseStart: new Date("2026-12-15"),
            defenseEnd: new Date("2027-01-10"),
          },
        });
        console.log("Created initial default AcademicTerm: HK1-2026-2027 (ACTIVE)");
      }
    }

    // Safe migration: Link any orphaned or unassigned internships & theses to active term
    if (activeTerm?._id) {
      const [iRes, tRes] = await Promise.all([
        Internship.updateMany(
          { $or: [{ academicTermId: null }, { academicTermId: { $exists: false } }] },
          { $set: { academicTermId: activeTerm._id } },
        ),
        Thesis.updateMany(
          { $or: [{ academicTermId: null }, { academicTermId: { $exists: false } }] },
          { $set: { academicTermId: activeTerm._id } },
        ),
      ]);

      if (iRes.modifiedCount > 0 || tRes.modifiedCount > 0) {
        console.log(
          `Safe AcademicTerm Migration: Associated ${iRes.modifiedCount} Internships & ${tRes.modifiedCount} Theses to ${activeTerm.code}`,
        );
      }
    }

    return activeTerm;
  } catch (err) {
    console.error("AcademicTerm startup sync warning:", err.message);
    return null;
  }
};

export default {
  getAllTerms,
  getCurrentAcademicTerm,
  getActiveTerm,
  getTermById,
  createTerm,
  updateTerm,
  activateTerm,
  closeTerm,
  deleteTerm,
  ensureDefaultActiveTerm,
};
