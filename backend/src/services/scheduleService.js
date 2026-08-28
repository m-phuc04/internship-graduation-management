import Schedule from "../models/Schedule.js";
import AppError from "../utils/AppError.js";

// ====================
// 1. Get All Schedules (Public to Authenticated Users)
// ====================
const getAllSchedules = async ({ type, status } = {}) => {
  const query = {};
  if (type) query.type = type;
  if (status) query.status = status;

  let schedules = await Schedule.find(query)
    .sort({ startTime: 1 })
    .populate("createdBy", "fullName email role")
    .lean();

  // If empty, auto-seed default semester milestones
  if (schedules.length === 0 && !type && !status) {
    const currentYear = new Date().getFullYear();
    const defaultMilestones = [
      {
        title: "Đăng ký & Phê duyệt nguyện vọng Thực tập Doanh nghiệp (TTDN)",
        description: "Sinh viên hoàn thành nộp hồ sơ đăng ký doanh nghiệp tiếp nhận. TBM tiến hành xét duyệt và phân công Giảng viên hướng dẫn.",
        type: "INTERNSHIP",
        startTime: new Date(`${currentYear}-09-01T08:00:00.000Z`),
        endTime: new Date(`${currentYear}-09-15T17:00:00.000Z`),
        location: "Cổng trực tuyến TTDN",
        status: "SCHEDULED",
      },
      {
        title: "Bắt đầu quá trình Thực tập & Nộp báo cáo định kỳ",
        description: "Sinh viên làm việc tại doanh nghiệp và thực hiện nộp báo cáo tiến độ tuần/tháng theo hướng dẫn của GVHD.",
        type: "INTERNSHIP",
        startTime: new Date(`${currentYear}-09-16T08:00:00.000Z`),
        endTime: new Date(`${currentYear}-11-30T17:00:00.000Z`),
        location: "Doanh nghiệp tiếp nhận",
        status: "SCHEDULED",
      },
      {
        title: "Đăng ký & Xét duyệt Đề tài Khóa luận Tốt nghiệp (KLTN)",
        description: "Sinh viên nộp tên đề tài và phân công GVHD. TBM xét duyệt đề tài đủ điều kiện thực hiện.",
        type: "THESIS",
        startTime: new Date(`${currentYear}-09-05T08:00:00.000Z`),
        endTime: new Date(`${currentYear}-09-25T17:00:00.000Z`),
        location: "Cổng trực tuyến KLTN",
        status: "SCHEDULED",
      },
      {
        title: "Nộp báo cáo tiến độ KLTN định kỳ cho GVHD",
        description: "Sinh viên nộp báo cáo tiến độ theo tuần/tháng, GVHD phản hồi và đánh giá mức độ hoàn thành.",
        type: "THESIS",
        startTime: new Date(`${currentYear}-09-26T08:00:00.000Z`),
        endTime: new Date(`${currentYear}-12-10T17:00:00.000Z`),
        location: "Cổng trực tuyến KLTN",
        status: "SCHEDULED",
      },
      {
        title: "Phản biện Kín & Phản biện Hội đồng KLTN",
        description: "Các giảng viên phản biện (GVPB1 và GVPB2) tiến hành chấm điểm phản biện và đánh giá điều kiện bảo vệ.",
        type: "DEADLINE",
        startTime: new Date(`${currentYear}-12-15T08:00:00.000Z`),
        endTime: new Date(`${currentYear}-12-22T17:00:00.000Z`),
        location: "Văn phòng Bộ môn CNTT",
        status: "SCHEDULED",
      },
      {
        title: "Lễ Bảo vệ Khóa luận Tốt nghiệp trước Hội đồng",
        description: "Sinh viên thuyết trình và bảo vệ sản phẩm khóa luận trước Hội đồng chấm điểm.",
        type: "DEFENSE",
        startTime: new Date(`${currentYear}-12-25T08:00:00.000Z`),
        endTime: new Date(`${currentYear}-12-28T17:00:00.000Z`),
        location: "Hội trường A4 / Phòng bảo vệ KLTN",
        status: "SCHEDULED",
      },
    ];

    // Find any admin or TBM to assign createdBy
    const ScheduleModel = (await import("../models/Schedule.js")).default;
    const UserModel = (await import("../models/User.js")).default;
    const author = await UserModel.findOne({ role: { $in: ["ADMIN", "TBM"] } });
    if (author) {
      const createdItems = await Promise.all(
        defaultMilestones.map((m) =>
          ScheduleModel.create({
            ...m,
            createdBy: author._id,
          }),
        ),
      );
      schedules = createdItems.map((item) => item.toObject());
    }
  }

  return schedules;
};

// ====================
// 2. Create Schedule (TBM & ADMIN only)
// ====================
const createSchedule = async (data, userId) => {
  const { title, description, type, startTime, endTime, location, status } = data;

  if (!title || !title.trim()) {
    throw new AppError("Tiêu đề lịch trình là bắt buộc", 400);
  }

  if (!type) {
    throw new AppError("Loại lịch trình là bắt buộc (INTERNSHIP, THESIS, MEETING, DEADLINE, DEFENSE, OTHER)", 400);
  }

  if (!startTime) {
    throw new AppError("Thời gian bắt đầu là bắt buộc", 400);
  }

  const schedule = await Schedule.create({
    title: title.trim(),
    description: description ? description.trim() : null,
    type,
    startTime: new Date(startTime),
    endTime: endTime ? new Date(endTime) : null,
    location: location ? location.trim() : null,
    status: status || "SCHEDULED",
    createdBy: userId,
  });

  return await Schedule.findById(schedule._id).populate("createdBy", "fullName email role");
};

// ====================
// 3. Update Schedule (TBM & ADMIN only)
// ====================
const updateSchedule = async (id, data, userId) => {
  const schedule = await Schedule.findById(id);
  if (!schedule) {
    throw new AppError("Không tìm thấy thông tin lịch trình", 404);
  }

  const { title, description, type, startTime, endTime, location, status } = data;

  if (title !== undefined) schedule.title = title.trim();
  if (description !== undefined) schedule.description = description ? description.trim() : null;
  if (type !== undefined) schedule.type = type;
  if (startTime !== undefined) schedule.startTime = new Date(startTime);
  if (endTime !== undefined) schedule.endTime = endTime ? new Date(endTime) : null;
  if (location !== undefined) schedule.location = location ? location.trim() : null;
  if (status !== undefined) schedule.status = status;

  await schedule.save();

  return await Schedule.findById(schedule._id).populate("createdBy", "fullName email role");
};

// ====================
// 4. Delete Schedule (TBM & ADMIN only)
// ====================
const deleteSchedule = async (id, userId) => {
  const schedule = await Schedule.findById(id);
  if (!schedule) {
    throw new AppError("Không tìm thấy thông tin lịch trình", 404);
  }

  await Schedule.findByIdAndDelete(id);
  return { message: "Xóa lịch trình thành công" };
};

export default {
  getAllSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
