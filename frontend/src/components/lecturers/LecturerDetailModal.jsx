import React from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { User, BookOpen, Briefcase, Award, CheckCircle2, XCircle, Users } from 'lucide-react';

const LecturerDetailModal = ({ isOpen, onClose, lecturer }) => {
  if (!lecturer) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chi tiết Hồ sơ Giảng viên"
      subtitle={`Mã GV: ${lecturer.lecturerCode} • Học vị: ${lecturer.academicTitle || 'ThS.'}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header Summary Banner */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/80">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            {lecturer.userId?.fullName?.charAt(0).toUpperCase() || 'L'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-slate-900 truncate">
                {lecturer.userId?.fullName}
              </h4>
              <StatusBadge
                status={lecturer.isAvailable ? 'ACTIVE' : 'INACTIVE'}
                label={lecturer.isAvailable ? 'Nhận hướng dẫn' : 'Tạm ngưng'}
                size="sm"
              />
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
              <span>Email: <strong className="text-slate-700">{lecturer.userId?.email}</strong></span>
              {lecturer.userId?.phone && (
                <span>SĐT: <strong className="text-slate-700">{lecturer.userId?.phone}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Workload Stats Grid */}
        <div>
          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-500" /> Tải Hướng dẫn & Đánh giá
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <div className="text-xs text-slate-500 mb-0.5">Số lượng tối đa</div>
              <div className="text-sm font-bold text-slate-900">
                {lecturer.maxSupervisedStudents ?? lecturer.maxStudents ?? 5} SV
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <div className="text-xs text-slate-500 mb-0.5">Hướng dẫn TTDN</div>
              <div className="text-sm font-bold text-indigo-600">
                {lecturer.activeInternshipsCount || lecturer.assignedInternships?.length || 0} SV
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <div className="text-xs text-slate-500 mb-0.5">GVHD Khóa luận</div>
              <div className="text-sm font-bold text-indigo-600">
                {lecturer.activeThesesSupervisorCount || lecturer.supervisingTheses?.length || 0} Đề tài
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <div className="text-xs text-slate-500 mb-0.5">Phản biện KLTN</div>
              <div className="text-sm font-bold text-slate-700">
                {lecturer.activeThesesReviewerCount || lecturer.reviewingTheses?.length || 0} Đề tài
              </div>
            </div>
          </div>
        </div>

        {/* Academic Profile Details */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Mã giảng viên:</span>
            <span className="font-bold text-slate-800 font-mono">{lecturer.lecturerCode}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Học hàm / Học vị:</span>
            <span className="font-semibold text-slate-800">{lecturer.academicTitle || 'Thạc sĩ'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Chuyên môn chính:</span>
            <span className="font-semibold text-slate-800">{lecturer.specialization || 'Chưa cập nhật'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Trạng thái tài khoản:</span>
            <span className="font-semibold text-slate-800">
              {lecturer.userId?.isActive ? 'Đang hoạt động' : 'Đã khóa'}
            </span>
          </div>
        </div>

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

export default LecturerDetailModal;
