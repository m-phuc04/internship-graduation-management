import ExcelJS from "exceljs";
import Internship from "../models/Internship.js";
import Thesis from "../models/Thesis.js";
import Evaluation from "../models/Evaluation.js";
import AcademicTerm from "../models/AcademicTerm.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";
import Company from "../models/Company.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

// Helper: Format Date to DD/MM/YYYY
const formatDate = (date) => {
  if (!date) return "-";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
};

// Helper: Format Score to 2 decimal places
const formatScore = (score) => {
  if (score === null || score === undefined || isNaN(score)) return "-";
  return Number(score).toFixed(2);
};

// Helper: Map Internship Status
const mapInternshipStatus = (status) => {
  switch (status) {
    case "PENDING":
      return "Chờ duyệt";
    case "PENDING_SUPERVISOR_ACCEPTANCE":
      return "Đã phân công GVHD";
    case "APPROVED":
      return "Đã duyệt";
    case "INTERNING":
      return "Đang thực tập";
    case "COMPLETED":
      return "Hoàn thành";
    case "REJECTED":
      return "Bị từ chối";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "-";
  }
};

// Helper: Map Thesis Status
const mapThesisStatus = (status) => {
  switch (status) {
    case "PENDING_SUPERVISOR_APPROVAL":
      return "Chờ GVHD duyệt";
    case "PENDING_TBM_APPROVAL":
      return "Chờ TBM duyệt";
    case "PENDING_SUPERVISOR_ACCEPTANCE":
      return "Chờ GVHD tiếp nhận";
    case "APPROVED":
      return "Đã duyệt";
    case "ASSIGNED_REVIEWERS":
      return "Đã phân công PB";
    case "IN_PROGRESS":
      return "Đang thực hiện";
    case "SUBMITTED":
      return "Đã nộp báo cáo";
    case "GRADED":
      return "Đã có điểm";
    case "COMPLETED":
      return "Hoàn tất";
    case "REJECTED":
      return "Bị từ chối";
    default:
      return status || "-";
  }
};

// ==========================================
// 1. Export Internships (TTDN)
// ==========================================
const exportInternships = async ({
  academicTermId,
  status,
  search,
  companyId,
  lecturerId,
}) => {
  const query = {};

  // 1. Filter by Academic Term
  let termInfo = null;
  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
    termInfo = await AcademicTerm.findById(academicTermId).lean();
  } else {
    // If not specified, look for active term
    const active = await AcademicTerm.findOne({ status: "ACTIVE" }).lean();
    if (active) {
      query.academicTermId = active._id;
      termInfo = active;
    }
  }

  // 2. Filter by Status
  if (status && status !== "ALL") {
    query.status = status;
  }

  // 3. Filter by Company
  if (companyId && companyId !== "ALL") {
    query.companyId = companyId;
  }

  // 4. Filter by Lecturer
  if (lecturerId && lecturerId !== "ALL") {
    query.lecturerId = lecturerId;
  }

  // 5. Filter by Search (MSSV, Student Name, Company Name)
  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    const matchingUsers = await User.find({ fullName: searchRegex }).select("_id");
    const matchingStudents = await Student.find({
      $or: [
        { studentCode: searchRegex },
        { userId: { $in: matchingUsers.map((u) => u._id) } },
      ],
    }).select("_id");

    const matchingCompanies = await Company.find({
      $or: [{ name: searchRegex }, { code: searchRegex }],
    }).select("_id");

    const searchOr = [
      { studentId: { $in: matchingStudents.map((s) => s._id) } },
      { companyId: { $in: matchingCompanies.map((c) => c._id) } },
      { position: searchRegex },
    ];

    if (query.status) {
      query.$and = [{ status: query.status }, { $or: searchOr }];
      delete query.status;
    } else {
      query.$or = searchOr;
    }
  }

  // Fetch all matching internships (without pagination)
  const internships = await Internship.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("companyId")
    .populate({
      path: "lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("academicTermId")
    .lean();

  // Fetch evaluations for final scores
  const internshipIds = internships.map((i) => i._id);
  const evaluations = await Evaluation.find({
    evaluationType: "INTERNSHIP",
    targetId: { $in: internshipIds },
  }).lean();

  const evalMap = new Map();
  evaluations.forEach((ev) => {
    evalMap.set(ev.targetId.toString(), ev);
  });

  // Create Excel Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hệ thống Quản lý Thực tập & Khóa luận Tốt nghiệp";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Danh Sách TTDN", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 5 }],
  });

  const termCode = termInfo?.code || "TOAN_BO";
  const termName = termInfo ? `${termInfo.name} - Năm học ${termInfo.academicYear}` : "Tất cả học kỳ";

  // 1. Header Information
  worksheet.mergeCells("A1:Q1");
  const titleCell1 = worksheet.getCell("A1");
  titleCell1.value = "TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP.HCM - KHOA CÔNG NGHỆ THÔNG TIN";
  titleCell1.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF334155" } };
  titleCell1.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A2:Q2");
  const titleCell2 = worksheet.getCell("A2");
  titleCell2.value = "DANH SÁCH SINH VIÊN THỰC TẬP DOANH NGHIỆP (TTDN)";
  titleCell2.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF1E3A8A" } };
  titleCell2.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A3:Q3");
  const titleCell3 = worksheet.getCell("A3");
  titleCell3.value = `Học kỳ: ${termName}  |  Ngày xuất báo cáo: ${formatDate(new Date())}  |  Tổng số: ${internships.length} sinh viên`;
  titleCell3.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };
  titleCell3.alignment = { horizontal: "center", vertical: "middle" };

  // Row 4 is empty spacer
  worksheet.addRow([]);

  // 2. Table Column Headers (Row 5)
  const columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MSSV", key: "studentCode", width: 14 },
    { header: "Họ và tên", key: "fullName", width: 26 },
    { header: "Lớp", key: "className", width: 14 },
    { header: "Email", key: "email", width: 28 },
    { header: "Số điện thoại", key: "phone", width: 16 },
    { header: "Doanh nghiệp", key: "companyName", width: 30 },
    { header: "Mã DN", key: "companyCode", width: 14 },
    { header: "Vị trí thực tập", key: "position", width: 22 },
    { header: "Ngày bắt đầu", key: "startDate", width: 14 },
    { header: "Ngày kết thúc", key: "endDate", width: 14 },
    { header: "GV hướng dẫn", key: "lecturerName", width: 24 },
    { header: "Mã GVHD", key: "lecturerCode", width: 14 },
    { header: "Trạng thái hồ sơ", key: "status", width: 18 },
    { header: "Trạng thái thực tập", key: "internshipStatus", width: 20 },
    { header: "Điểm TTDN", key: "score", width: 12 },
    { header: "Ngày đăng ký", key: "createdAt", width: 14 },
  ];

  worksheet.getRow(5).values = columns.map((c) => c.header);
  worksheet.columns = columns.map((c) => ({ key: c.key, width: c.width }));

  // Style Header Row (Row 5)
  const headerRow = worksheet.getRow(5);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Dark Navy Blue
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // 3. Populate Data Rows
  internships.forEach((item, index) => {
    const studentUser = item.studentId?.userId;
    const studentCode = item.studentId?.studentCode || "-";
    const fullName = studentUser?.fullName || "-";
    const className = item.studentId?.className || "-";
    const email = studentUser?.email || "-";
    const phone = studentUser?.phone || "-";

    const company = item.companyId;
    const companyName = company?.name || company?.companyName || "-";
    const companyCode = company?.code || "-";
    const position = item.position || "-";

    const lecturerUser = item.lecturerId?.userId;
    const lecturerName = lecturerUser?.fullName
      ? `${item.lecturerId?.academicTitle ? `${item.lecturerId.academicTitle}. ` : ""}${lecturerUser.fullName}`
      : "Chưa phân công";
    const lecturerCode = item.lecturerId?.lecturerCode || "-";

    const statusText = mapInternshipStatus(item.status);
    const ev = evalMap.get(item._id.toString());
    const scoreVal = ev?.score !== undefined ? formatScore(ev.score) : "-";

    const row = worksheet.addRow({
      stt: index + 1,
      studentCode,
      fullName,
      className,
      email,
      phone,
      companyName,
      companyCode,
      position,
      startDate: formatDate(item.startDate),
      endDate: formatDate(item.endDate),
      lecturerName,
      lecturerCode,
      status: statusText,
      internshipStatus: item.status === "COMPLETED" ? "Đã hoàn thành" : item.status === "INTERNING" ? "Đang làm việc" : "Chờ tiếp nhận",
      score: scoreVal,
      createdAt: formatDate(item.createdAt),
    });

    row.height = 22;

    // Apply borders and styling
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 9.5 };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Center specific columns: STT (1), MSSV (2), Class (4), Phone (6), CompanyCode (8), Dates (10, 11), LecturerCode (13), Score (16), CreatedAt (17)
      if ([1, 2, 4, 6, 8, 10, 11, 13, 14, 15, 16, 17].includes(colNumber)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }

      // Alternate row colors
      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `DanhSach_TTDN_${termCode}.xlsx`;

  return {
    buffer,
    filename,
    totalRecords: internships.length,
    termCode,
  };
};

// ==========================================
// 2. Export Theses (KLTN)
// ==========================================
const exportTheses = async ({
  academicTermId,
  status,
  search,
  lecturerId,
}) => {
  const query = {};

  // 1. Filter by Academic Term
  let termInfo = null;
  if (academicTermId && academicTermId !== "ALL") {
    query.academicTermId = academicTermId;
    termInfo = await AcademicTerm.findById(academicTermId).lean();
  } else {
    const active = await AcademicTerm.findOne({ status: "ACTIVE" }).lean();
    if (active) {
      query.academicTermId = active._id;
      termInfo = active;
    }
  }

  // 2. Filter by Status
  if (status && status !== "ALL") {
    query.status = status;
  }

  // 3. Filter by Lecturer (as Supervisor or Reviewer)
  if (lecturerId && lecturerId !== "ALL") {
    query.$or = [
      { supervisorId: lecturerId },
      { reviewer1Id: lecturerId },
      { reviewer2Id: lecturerId },
      { "reviewers.lecturerId": lecturerId },
    ];
  }

  // 4. Filter by Search (MSSV, Student Name, Thesis Title)
  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    const matchingUsers = await User.find({ fullName: searchRegex }).select("_id");
    const matchingStudents = await Student.find({
      $or: [
        { studentCode: searchRegex },
        { userId: { $in: matchingUsers.map((u) => u._id) } },
      ],
    }).select("_id");

    const searchCondition = [
      { studentId: { $in: matchingStudents.map((s) => s._id) } },
      { secondStudentId: { $in: matchingStudents.map((s) => s._id) } },
      { thesisTitle: searchRegex },
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchCondition }];
      delete query.$or;
    } else {
      query.$or = searchCondition;
    }
  }

  // Fetch all matching theses
  const theses = await Thesis.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: "studentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "secondStudentId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "supervisorId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "reviewer1Id",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "reviewer2Id",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate({
      path: "reviewers.lecturerId",
      populate: { path: "userId", select: "fullName email phone" },
    })
    .populate("academicTermId")
    .lean();

  // Create Excel Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hệ thống Quản lý Thực tập & Khóa luận Tốt nghiệp";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Danh Sách KLTN", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 5 }],
  });

  const termCode = termInfo?.code || "TOAN_BO";
  const termName = termInfo ? `${termInfo.name} - Năm học ${termInfo.academicYear}` : "Tất cả học kỳ";

  // 1. Header Information
  worksheet.mergeCells("A1:T1");
  const titleCell1 = worksheet.getCell("A1");
  titleCell1.value = "TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP.HCM - KHOA CÔNG NGHỆ THÔNG TIN";
  titleCell1.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF334155" } };
  titleCell1.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A2:T2");
  const titleCell2 = worksheet.getCell("A2");
  titleCell2.value = "DANH SÁCH ĐỀ TÀI KHÓA LUẬN TỐT NGHIỆP (KLTN)";
  titleCell2.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF4338CA" } };
  titleCell2.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A3:T3");
  const titleCell3 = worksheet.getCell("A3");
  titleCell3.value = `Học kỳ: ${termName}  |  Ngày xuất báo cáo: ${formatDate(new Date())}  |  Tổng số: ${theses.length} đề tài`;
  titleCell3.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };
  titleCell3.alignment = { horizontal: "center", vertical: "middle" };

  // Row 4 is empty spacer
  worksheet.addRow([]);

  // 2. Table Column Headers (Row 5)
  const columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "MSSV", key: "studentCode", width: 16 },
    { header: "Họ và tên sinh viên", key: "fullName", width: 28 },
    { header: "Lớp", key: "className", width: 14 },
    { header: "Email", key: "email", width: 28 },
    { header: "Tên đề tài", key: "thesisTitle", width: 36 },
    { header: "Loại đề tài", key: "groupType", width: 16 },
    { header: "GV hướng dẫn", key: "supervisorName", width: 24 },
    { header: "Mã GVHD", key: "supervisorCode", width: 14 },
    { header: "Phản biện kín", key: "privateReviewerName", width: 24 },
    { header: "Mã GV PB kín", key: "privateReviewerCode", width: 16 },
    { header: "Phản biện hội đồng", key: "councilReviewerName", width: 24 },
    { header: "Mã GV PB hội đồng", key: "councilReviewerCode", width: 18 },
    { header: "Trạng thái đề tài", key: "status", width: 20 },
    { header: "Điểm GVHD", key: "supervisorScore", width: 12 },
    { header: "Điểm PB kín", key: "reviewer1Score", width: 12 },
    { header: "Điểm PB HĐ", key: "reviewer2Score", width: 12 },
    { header: "Điểm tổng kết", key: "finalScore", width: 14 },
    { header: "Ngày đăng ký", key: "createdAt", width: 14 },
    { header: "Ngày TBM duyệt", key: "approvedAt", width: 14 },
  ];

  worksheet.getRow(5).values = columns.map((c) => c.header);
  worksheet.columns = columns.map((c) => ({ key: c.key, width: c.width }));

  // Style Header Row (Row 5)
  const headerRow = worksheet.getRow(5);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4338CA" }, // Indigo / Purple
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF312E81" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // 3. Populate Data Rows
  theses.forEach((item, index) => {
    // Student 1 & 2 formatting
    const s1User = item.studentId?.userId;
    const s1Code = item.studentId?.studentCode || "-";
    const s1Name = s1User?.fullName || "-";
    const s1Class = item.studentId?.className || "-";
    const s1Email = s1User?.email || "-";

    const s2User = item.secondStudentId?.userId;
    const s2Code = item.secondStudentId?.studentCode;
    const s2Name = s2User?.fullName;
    const s2Class = item.secondStudentId?.className;
    const s2Email = s2User?.email;

    let displayStudentCode = s1Code;
    let displayFullName = s1Name;
    let displayClass = s1Class;
    let displayEmail = s1Email;

    if (item.secondStudentId && s2Code) {
      displayStudentCode = `${s1Code}\n${s2Code}`;
      displayFullName = `${s1Name}\n${s2Name || ""}`;
      displayClass = s1Class === s2Class ? s1Class : `${s1Class}\n${s2Class || ""}`;
      displayEmail = `${s1Email}\n${s2Email || ""}`;
    }

    const groupType = item.studentCount === 2 || item.secondStudentId ? "Nhóm 2 SV" : "Cá nhân (1 SV)";

    // GVHD
    const supervisorUser = item.supervisorId?.userId;
    const supervisorName = supervisorUser?.fullName
      ? `${item.supervisorId?.academicTitle ? `${item.supervisorId.academicTitle}. ` : ""}${supervisorUser.fullName}`
      : "-";
    const supervisorCode = item.supervisorId?.lecturerCode || "-";

    // Phản biện Kín & Phản biện Hội đồng resolution
    const privateReviewers = [];
    const councilReviewers = [];

    if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
      item.reviewers.forEach((r) => {
        const revLec = r.lecturerId;
        const revUser = revLec?.userId;
        const nameStr = revUser?.fullName
          ? `${revLec?.academicTitle ? `${revLec.academicTitle}. ` : ""}${revUser.fullName}`
          : null;
        const codeStr = revLec?.lecturerCode || null;

        if (r.isPrivateReviewer && nameStr) {
          privateReviewers.push({ name: nameStr, code: codeStr });
        }
        if (r.isCouncilReviewer && nameStr) {
          councilReviewers.push({ name: nameStr, code: codeStr });
        }
      });
    }

    // Fallback to reviewer1Id / reviewer2Id if reviewers array empty
    if (privateReviewers.length === 0 && item.reviewer1Id) {
      const r1User = item.reviewer1Id?.userId;
      if (r1User?.fullName) {
        privateReviewers.push({
          name: `${item.reviewer1Id?.academicTitle ? `${item.reviewer1Id.academicTitle}. ` : ""}${r1User.fullName}`,
          code: item.reviewer1Id?.lecturerCode || "-",
        });
      }
    }

    if (councilReviewers.length === 0 && item.reviewer2Id) {
      const r2User = item.reviewer2Id?.userId;
      if (r2User?.fullName) {
        councilReviewers.push({
          name: `${item.reviewer2Id?.academicTitle ? `${item.reviewer2Id.academicTitle}. ` : ""}${r2User.fullName}`,
          code: item.reviewer2Id?.lecturerCode || "-",
        });
      }
    }

    const privateRevNameStr = privateReviewers.length > 0 ? privateReviewers.map((p) => p.name).join("\n") : "Chưa phân công";
    const privateRevCodeStr = privateReviewers.length > 0 ? privateReviewers.map((p) => p.code).join("\n") : "-";

    const councilRevNameStr = councilReviewers.length > 0 ? councilReviewers.map((c) => c.name).join("\n") : "Chưa phân công";
    const councilRevCodeStr = councilReviewers.length > 0 ? councilReviewers.map((c) => c.code).join("\n") : "-";

    const scores = item.scores || {};
    const statusText = mapThesisStatus(item.status);

    const row = worksheet.addRow({
      stt: index + 1,
      studentCode: displayStudentCode,
      fullName: displayFullName,
      className: displayClass,
      email: displayEmail,
      thesisTitle: item.thesisTitle || "-",
      groupType,
      supervisorName,
      supervisorCode,
      privateReviewerName: privateRevNameStr,
      privateReviewerCode: privateRevCodeStr,
      councilReviewerName: councilRevNameStr,
      councilReviewerCode: councilRevCodeStr,
      status: statusText,
      supervisorScore: formatScore(scores.supervisorScore),
      reviewer1Score: formatScore(scores.reviewer1Score),
      reviewer2Score: formatScore(scores.reviewer2Score),
      finalScore: formatScore(scores.finalScore),
      createdAt: formatDate(item.createdAt),
      approvedAt: formatDate(item.approvedAt),
    });

    row.height = item.secondStudentId ? 36 : 24;

    // Apply cell borders and alignment
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 9.5 };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Center alignment for specific columns: STT (1), MSSV (2), Class (4), GroupType (7), SupervisorCode (9), PrivRevCode (11), CouncilRevCode (13), Status (14), Scores (15, 16, 17, 18), Dates (19, 20)
      if ([1, 2, 4, 7, 9, 11, 13, 14, 15, 16, 17, 18, 19, 20].includes(colNumber)) {
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      }

      // Alternate row colors
      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `DanhSach_KLTN_${termCode}.xlsx`;

  return {
    buffer,
    filename,
    totalRecords: theses.length,
    termCode,
  };
};

export default {
  exportInternships,
  exportTheses,
};
