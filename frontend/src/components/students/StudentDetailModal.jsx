import React from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { User, BookOpen, Briefcase, Award, CheckCircle2, XCircle } from 'lucide-react';

const StudentDetailModal = ({ isOpen, onClose, student }) => {
  if (!student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chi tiết Hồ sơ Sinh viên"
      subtitle={`MSSV: ${student.studentCode} • Lớp: ${student.className}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header Summary Banner */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/80">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            {student.userId?.fullName?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-slate-900 truncate">
                {student.userId?.fullName}
              </h4>
              <StatusBadge
                status={student.userId?.isActive ? 'ACTIVE' : 'INACTIVE'}
                label={student.userId?.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                size="sm"
              />
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
              <span>Email: <strong className="text-slate-700">{student.userId?.email}</strong></span>
              {student.userId?.phone && (
                <span>SĐT: <strong className="text-slate-700">{student.userId?.phone}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Academic Details Grid */}
        <div>
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-500" /> Thông tin Học tập
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <div className="text-xs text-slate-500 mb-0.5">Mã sinh viên</div>
              <div className="text-sm font-bold text-slate-900 font-mono">
                {student.studentCode}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <div className="text-xs text-slate-500 mb-0.5">Lớp sinh hoạt</div>
              <div className="text-sm font-bold text-slate-900">
                {student.className}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <div className="text-xs text-slate-500 mb-0.5">Điểm GPA tích lũy</div>
              <div className="text-sm font-bold text-indigo-600">
                {Number(student.gpa).toFixed(2)} / 4.0
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <div className="text-xs text-slate-500 mb-0.5">Số tín chỉ tích lũy</div>
              <div className="text-sm font-bold text-slate-900">
                {student.accumulatedCredits} tín chỉ
              </div>
            </div>
          </div>
        </div>

        {/* Requirements and Registration Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs text-slate-500 mb-1.5">Điều kiện tiên quyết</div>
            <div className="flex items-center gap-1.5">
              {student.prerequisiteCompleted ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đủ điều kiện
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> Chưa đạt
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs text-slate-500 mb-1.5">Thực tập doanh nghiệp (TTDN)</div>
            <StatusBadge
              status={student.internshipRegistered}
              label={student.internshipRegistered ? 'Đã đăng ký TTDN' : 'Chưa đăng ký'}
              size="sm"
            />
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs text-slate-500 mb-1.5">Khóa luận tốt nghiệp (KLTN)</div>
            <StatusBadge
              status={student.thesisRegistered}
              label={student.thesisRegistered ? 'Đã đăng ký KLTN' : 'Chưa đăng ký'}
              size="sm"
            />
          </div>
        </div>

        {/* Linked Details Summary if any */}
        {(student.internshipDetails || student.thesisDetails) && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="font-semibold text-slate-800 mb-1">Thông tin liên kết hiện tại:</div>
            {student.internshipDetails && (
              <div className="flex items-center gap-2 text-slate-600">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Thực tập tại: <strong>{student.internshipDetails.companyId?.name || 'Doanh nghiệp'}</strong> (Trạng thái: <strong>{student.internshipDetails.status}</strong>)</span>
              </div>
            )}
            {student.thesisDetails && (
              <div className="flex items-center gap-2 text-slate-600">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Đề tài KLTN: <strong>{student.thesisDetails.thesisTitle}</strong> (Trạng thái: <strong>{student.thesisDetails.status}</strong>)</span>
              </div>
            )}
          </div>
        )}

        {/* Close Action */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StudentDetailModal;
