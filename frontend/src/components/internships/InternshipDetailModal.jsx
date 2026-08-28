import React from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import {
  Briefcase,
  Building2,
  Calendar,
  UserCheck,
  BookOpen,
  MapPin,
  Mail,
  Phone,
  Globe,
  Clock,
  User,
  GraduationCap,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const InternshipDetailModal = ({
  isOpen,
  onClose,
  internship,
  onApprove,
  onReject,
  onAssignLecturer,
}) => {
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
      title="Chi tiết Hồ sơ Thực tập Doanh nghiệp"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Header Summary Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-lg flex items-center justify-center shadow-2xs">
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
                <span className="font-bold text-indigo-600">
                  MSSV: {internship.studentId?.studentCode}
                </span>
                <span>•</span>
                <span>Lớp: {internship.studentId?.className}</span>
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500">
            <div>Ngày nộp: <strong>{formatDate(internship.createdAt)}</strong></div>
            {internship.approvedAt && (
              <div className="text-emerald-700">Duyệt: <strong>{formatDate(internship.approvedAt)}</strong></div>
            )}
          </div>
        </div>

        {/* Rejection Alert if Rejected */}
        {internship.status === 'REJECTED' && internship.rejectionReason && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <XCircle className="w-4 h-4 text-rose-600" />
              Lý do từ chối hồ sơ:
            </div>
            <p className="text-rose-800 leading-relaxed pl-5">
              {internship.rejectionReason}
            </p>
          </div>
        )}

        {/* 2-Column Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Section 1: Student Details */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              Thông tin Sinh viên
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
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
                <span className="text-slate-400">Đủ ĐK Khóa luận:</span>
                <span className={`font-semibold ${internship.studentId?.prerequisiteCompleted ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {internship.studentId?.prerequisiteCompleted ? 'Đủ điều kiện' : 'Chưa đạt'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Company Details */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Doanh nghiệp Thực tập
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 block mb-0.5">Tên công ty:</span>
                <span className="font-bold text-slate-900">{internship.companyId?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Địa chỉ:</span>
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
              <Calendar className="w-4 h-4 text-indigo-600" />
              Vị trí & Thời gian Thực tập
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 block mb-0.5">Vị trí thực tập:</span>
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
                  <span className="text-slate-400 block mb-0.5">Ghi chú của sinh viên:</span>
                  <p className="p-2.5 rounded-xl bg-slate-50 text-slate-600 text-[11px] leading-relaxed">
                    {internship.registrationNote}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Mentor & Academic Supervisor */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              Hướng dẫn & Giám sát
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 block mb-0.5">Người hướng dẫn DN (Mentor):</span>
                <span className="font-bold text-slate-900">
                  {internship.mentorName || internship.companyId?.contactPerson || 'Chưa cập nhật'}
                </span>
                {internship.mentorPosition && (
                  <span className="block text-[11px] text-slate-500 font-medium">
                    {internship.mentorPosition}
                  </span>
                )}
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {internship.mentorEmail || internship.companyId?.contactEmail || ''}
                  {internship.mentorPhone ? ` • ${internship.mentorPhone}` : ''}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block mb-0.5">Giảng viên hướng dẫn (GVHD):</span>
                {internship.lecturerId ? (
                  <div>
                    <span className="font-bold text-indigo-700">
                      {internship.lecturerId?.academicTitle} {internship.lecturerId?.userId?.fullName}
                    </span>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Mã GV: {internship.lecturerId?.lecturerCode} • {internship.lecturerId?.userId?.email}
                    </div>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                    <Clock className="w-3 h-3 text-amber-600" /> Chưa phân công GVHD
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Evaluation Summary if available */}
          {internship.evaluation && (
            <div className="md:col-span-2 p-4 rounded-2xl bg-gradient-to-r from-amber-50/80 to-emerald-50/80 border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Kết quả Đánh giá Thực tập</span>
                    <StatusBadge status={internship.status === 'COMPLETED' || internship.evaluation.status === 'CONFIRMED' ? 'COMPLETED' : internship.evaluation.status} size="sm" />
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Người đánh giá: <strong>{internship.evaluation.evaluatorInfo?.name || internship.mentorName || 'Cán bộ DN'}</strong> ({internship.evaluation.evaluatorInfo?.position || 'Quản lý'})
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-500 block">Điểm đánh giá DN:</span>
                <span className="text-base font-extrabold text-amber-800 bg-white px-3 py-0.5 rounded-lg border border-amber-300 inline-block shadow-2xs">
                  {internship.evaluation.score !== undefined ? `${internship.evaluation.score} / 10` : '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions for TBM */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {/* Assign Lecturer button - ONLY IF NOT COMPLETED */}
            {internship.status !== 'COMPLETED' && internship.evaluation?.status !== 'CONFIRMED' && (
              <button
                type="button"
                onClick={() => onAssignLecturer(internship)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{internship.lecturerId ? 'Đổi GVHD' : 'Phân công GVHD'}</span>
              </button>
            )}

            {/* Reject button (if PENDING) */}
            {internship.status === 'PENDING' && (
              <button
                type="button"
                onClick={() => onReject(internship)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Từ chối hồ sơ</span>
              </button>
            )}

            {/* Approve button (if PENDING) */}
            {internship.status === 'PENDING' && (
              <button
                type="button"
                onClick={() => onApprove(internship)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-200 transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Duyệt hồ sơ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default InternshipDetailModal;
