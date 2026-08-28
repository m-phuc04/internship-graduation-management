import React from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import {
  GraduationCap,
  Building2,
  Calendar,
  UserCheck,
  MapPin,
  Mail,
  Phone,
  Globe,
  FileText,
  Info,
} from 'lucide-react';

const LecturerInternshipDetailModal = ({ isOpen, onClose, internship }) => {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chi tiết Hồ sơ Thực tập Sinh viên"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 text-xs">
        {/* Student Summary Card */}
        <div className="p-4 rounded-2xl bg-violet-50/60 border border-violet-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 border border-violet-200 text-violet-700 font-bold text-lg flex items-center justify-center shadow-2xs">
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
                <span className="font-bold text-violet-700">
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

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Section 1: Student Information */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <GraduationCap className="w-4 h-4 text-violet-600" />
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

          {/* Section 2: Company Information */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-violet-600" />
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

          {/* Section 3: Internship Position & Time */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-violet-600" />
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

          {/* Section 4: Company Mentor (Contact Person) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <UserCheck className="w-4 h-4 text-violet-600" />
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

        {/* Read-Only Notice */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-slate-500 text-[11px]">
          <Info className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
          <span>
            Thông tin hồ sơ và quyết định phê duyệt do Trưởng Bộ Môn (TBM) điều phối. Giảng viên hướng dẫn có nhiệm vụ theo dõi tiến độ, phản hồi và hỗ trợ sinh viên hoàn thành kỳ thực tập.
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LecturerInternshipDetailModal;
