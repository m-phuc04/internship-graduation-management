import React, { useState } from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import StudentInternshipDiaryModal from '../reports/StudentInternshipDiaryModal';
import {
  GraduationCap,
  Building2,
  Calendar,
  UserCheck,
  Info,
  BookOpen,
} from 'lucide-react';

const LecturerInternshipDetailModal = ({ isOpen, onClose, internship }) => {
  const [diaryModalOpen, setDiaryModalOpen] = useState(false);

  if (!internship) return null;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDurationInWeeks = (start, end) => {
    if (!start || !end) return null;
    const diff = new Date(end) - new Date(start);
    const weeks = Math.round(diff / (1000 * 60 * 60 * 24 * 7));
    return weeks > 0 ? weeks : 1;
  };

  const durationWeeks = getDurationInWeeks(
    internship.startDate,
    internship.endDate,
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Chi tiết Hồ sơ Thực tập Sinh viên"
        maxWidth="max-w-3xl"
      >
      <div className="space-y-6 text-xs">
        {/* Thẻ tóm tắt thông tin sinh viên */}
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 text-[#102d7d] font-bold text-lg flex items-center justify-center shadow-2xs">
              {internship.studentId?.userId?.fullName?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base">
                  {internship.studentId?.userId?.fullName}
                </span>
                <StatusBadge status={internship.status} size="sm" />
              </div>
              <div className="text-xs text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                <span className="font-bold text-[#102d7d]">
                  MSSV: {internship.studentId?.studentCode}
                </span>
                <span>•</span>
                <span>Lớp: {internship.studentId?.className}</span>
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500">
            <div>Vị trí: <strong className="text-slate-900">{internship.position}</strong></div>
            <div>Thời gian: <strong>{formatDate(internship.startDate)} - {formatDate(internship.endDate)}</strong></div>
          </div>
        </div>

        {/* Lưới thông tin 2 cột */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Phần 1: Thông tin sinh viên */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <GraduationCap className="w-4 h-4 text-[#123891]" />
              Thông tin Sinh viên
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Email trường:</span>
                <span className="font-medium text-slate-700 truncate max-w-[180px]">
                  {internship.studentId?.userId?.email || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số điện thoại:</span>
                <span className="font-medium text-slate-700 font-mono">
                  {internship.studentId?.userId?.phone || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">GPA / Tín chỉ:</span>
                <span className="font-bold text-slate-800">
                  {Number(internship.studentId?.gpa).toFixed(2)} GPA • {internship.studentId?.accumulatedCredits} TC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Điều kiện tốt nghiệp:</span>
                <span className={`font-semibold ${internship.studentId?.prerequisiteCompleted ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {internship.studentId?.prerequisiteCompleted ? 'Đủ điều kiện' : 'Chưa đạt'}
                </span>
              </div>
            </div>
          </div>

          {/* Phần 2: Thông tin doanh nghiệp */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-[#123891]" />
              Đơn vị Thực tập
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 block mb-0.5">Tên doanh nghiệp:</span>
                <span className="font-bold text-slate-900">{internship.companyId?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Địa chỉ thực tập:</span>
                <span className="text-slate-700">{internship.companyId?.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-700">{internship.companyId?.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hotline:</span>
                <span className="text-slate-700 font-mono">{internship.companyId?.phone || '—'}</span>
              </div>
            </div>
          </div>

          {/* Phần 3: Vị trí và thời gian thực tập */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-[#123891]" />
              Kế hoạch & Thời gian
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 block mb-0.5">Vị trí đảm nhiệm:</span>
                <span className="font-bold text-slate-900 text-sm">{internship.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ngày bắt đầu:</span>
                <span className="font-semibold text-slate-800">{formatDate(internship.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ngày kết thúc:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(internship.endDate)} {durationWeeks && `(${durationWeeks} tuần)`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chu kỳ nộp nhật ký:</span>
                <span className="font-bold text-[#123891]">
                  {internship.reportCycle || 1} tuần / lần
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Trạng thái PRETEST:</span>
                {internship.pretest?.isPassed ? (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                    PASS PRETEST
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                    CHƯA PASS
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">File báo cáo thực tập:</span>
                {internship.reportFile?.fileUrl ? (
                  <a
                    href={internship.reportFile.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                  >
                    <span>{internship.reportFile.originalName || 'Xem file báo cáo'}</span>
                  </a>
                ) : (
                  <span className="text-slate-400 italic text-[11px]">Chưa nộp</span>
                )}
              </div>
              {internship.registrationNote && (
                <div className="pt-1">
                  <span className="text-slate-400 block mb-0.5">Nguyện vọng / Ghi chú đăng ký:</span>
                  <p className="p-2.5 rounded-xl bg-slate-50 text-slate-600 text-[11px] leading-relaxed">
                    {internship.registrationNote}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Phần 4: Cán bộ hướng dẫn doanh nghiệp (Người liên hệ) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <UserCheck className="w-4 h-4 text-[#123891]" />
              Người hướng dẫn tại Doanh nghiệp
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 block mb-0.5">Họ tên Mentor / Người phụ trách:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {internship.mentorName || internship.companyId?.contactPerson || 'Chưa cập nhật'}
                </span>
                {internship.mentorPosition && (
                  <span className="block text-[11px] text-slate-500 font-medium">
                    {internship.mentorPosition}
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email liên hệ:</span>
                <span className="text-slate-700">
                  {internship.mentorEmail || internship.companyId?.contactEmail || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số điện thoại:</span>
                <span className="text-slate-700 font-mono">
                  {internship.mentorPhone || internship.companyId?.phone || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Thông báo chỉ đọc */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-slate-500 text-[11px]">
          <Info className="w-4 h-4 text-[#123891] shrink-0 mt-0.5" />
          <span>
            Thông tin hồ sơ và quyết định phê duyệt do Trưởng Bộ Môn (TBM) điều phối. Giảng viên Giám sát có nhiệm vụ theo dõi tiến độ, phản hồi và hỗ trợ sinh viên hoàn thành kỳ thực tập.
          </span>
        </div>

        {/* Chân trang */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer text-center"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={() => setDiaryModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-semibold text-[#102d7d] bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition cursor-pointer shadow-2xs text-center"
            title="Xem chi tiết nhật ký thực tập của sinh viên"
          >
            <BookOpen className="w-4 h-4 text-[#102d7d]" />
            <span>Chi tiết nhật ký thực tập</span>
          </button>
        </div>
      </div>
    </Modal>

    {/* Modal chi tiết nhật ký tuần của sinh viên */}
    <StudentInternshipDiaryModal
      isOpen={diaryModalOpen}
      onClose={() => setDiaryModalOpen(false)}
      internship={internship}
    />
  </>
  );
};

export default LecturerInternshipDetailModal;
