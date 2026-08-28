import React, { useState } from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import IUHLogo from '../common/IUHLogo';
import InternshipEvaluationDoc from '../documents/InternshipEvaluationDoc';
import {
  Building2,
  GraduationCap,
  Award,
  Calendar,
  CheckCircle2,
  FileCheck,
  Users,
  Printer,
  FileText,
  Briefcase,
  User,
  Trash2,
} from 'lucide-react';

const EvaluationDetailModal = ({ isOpen, onClose, internship, onDeleteEvaluation }) => {
  const [showPrintDoc, setShowPrintDoc] = useState(false);

  if (!internship) return null;
  const ev = internship.evaluation;
  const isCompleted = internship?.status === 'COMPLETED' || ev?.status === 'CONFIRMED' || ev?.status === 'COMPLETED';

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setShowPrintDoc(false);
        onClose();
      }}
      title="Chi tiết Phiếu Đánh giá Thực tập Doanh nghiệp (Khoa CNTT - IUH)"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 text-xs max-h-[78vh] overflow-y-auto pr-1">
        {/* Toggle between interactive detail and printable preview */}
        {showPrintDoc ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50 border border-indigo-100">
              <span className="text-xs font-bold text-indigo-900">
                Bản xem trước biểu mẫu in chính thức (A4 Chuẩn Khoa CNTT)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In / Lưu PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintDoc(false)}
                  className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Quay lại xem chi tiết
                </button>
              </div>
            </div>

            <div className="border border-slate-300 rounded-2xl p-4 bg-white shadow-xs">
              <InternshipEvaluationDoc internship={internship} />
            </div>
          </div>
        ) : (
          <>
            {/* Banner Summary */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <IUHLogo className="h-10 w-auto object-contain" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">
                      {internship.studentId?.userId?.fullName}
                    </span>
                    <StatusBadge status={ev?.status || 'UNASSESSED'} size="sm" />
                  </div>
                  <div className="text-xs text-slate-600 font-mono mt-0.5">
                    MSSV: <strong>{internship.studentId?.studentCode}</strong> • Lớp: <strong>{internship.studentId?.className}</strong> • Vị trí: <strong>{internship.position}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Doanh nghiệp: <strong>{internship.companyId?.name || internship.companyId?.companyName}</strong>
                  </div>
                </div>
              </div>

              {ev && (
                <div className="text-right shrink-0">
                  <div className="text-xl font-extrabold text-indigo-700 bg-indigo-100 px-3.5 py-1 rounded-xl border border-indigo-300/60 inline-block">
                    {Number(ev.score) % 1 === 0 ? Number(ev.score).toFixed(1) : ev.score} / 10 <span className="text-xs font-semibold">điểm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Ngày gửi: {formatDate(ev.submittedAt || ev.createdAt)}
                  </div>
                </div>
              )}
            </div>

            {!ev ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Sinh viên này chưa có phiếu đánh giá từ Doanh nghiệp tiếp nhận.
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Thông tin chung */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
                  <div className="font-bold text-slate-900 uppercase text-[11px] pb-1 border-b border-slate-100 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>I. Thông Tin Chung & Quy Mô Doanh Nghiệp</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                    <div>Lĩnh vực hoạt động: <strong>{ev.companyInfo?.businessField || 'Công nghệ thông tin'}</strong></div>
                    <div>Quy mô Doanh nghiệp: <strong>{ev.companyInfo?.companySize || 'Từ 50 đến 100 người'}</strong></div>
                    <div>Địa chỉ: <span>{internship.companyId?.address || '—'}</span></div>
                    <div>Thời gian thực tập: <strong>{formatDate(internship.startDate)} — {formatDate(internship.endDate)}</strong></div>
                  </div>
                </div>

                {/* 2. Mảng công việc */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
                  <div className="font-bold text-slate-900 uppercase text-[11px] pb-1 border-b border-slate-100 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span>1. Công việc thực tập hiện tại của sinh viên</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ev.workFields?.map((wf) => (
                      <span key={wf} className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-900 font-bold text-xs border border-indigo-100">
                        {wf}
                      </span>
                    ))}
                    {ev.workFieldOther && (
                      <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-900 font-bold text-xs border border-amber-200">
                        Khác: {ev.workFieldOther}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Yêu cầu người dùng & Lãnh đạo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-2xs">
                    <div className="font-bold text-slate-900 uppercase text-[11px] pb-1 border-b border-slate-100 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>2. Yêu cầu của người sử dụng (End User)</span>
                    </div>
                    <p className="p-3 rounded-xl bg-slate-50 text-slate-700 leading-relaxed text-xs italic">
                      {ev.requirements?.endUserRequirements || '—'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-2xs">
                    <div className="font-bold text-slate-900 uppercase text-[11px] pb-1 border-b border-slate-100 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>3. Yêu cầu của lãnh đạo trực tiếp</span>
                    </div>
                    <p className="p-3 rounded-xl bg-slate-50 text-slate-700 leading-relaxed text-xs italic">
                      {ev.requirements?.leaderRequirements || '—'}
                    </p>
                  </div>
                </div>

                {/* 4. Mục tiêu PEO */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs">
                  <div className="font-bold text-slate-900 uppercase text-[11px] pb-1 border-b border-slate-100 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>4. Đánh giá Mục tiêu Chương trình Đào tạo CNTT (PEO)</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="font-bold text-slate-900 text-[11px]">
                        <span className="text-indigo-700 mr-1">PEO 1:</span>
                        Kiến thức lý thuyết & thực hành CNTT trong quản trị, bảo mật và phát triển hệ thống
                      </div>
                      <p className="text-slate-700 text-xs italic pl-2 border-l-2 border-indigo-400">
                        {ev.requirements?.peo1 || '—'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="font-bold text-slate-900 text-[11px]">
                        <span className="text-indigo-700 mr-1">PEO 2:</span>
                        Khả năng làm việc hiệu quả (thành viên / lãnh đạo nhóm đa quốc gia)
                      </div>
                      <p className="text-slate-700 text-xs italic pl-2 border-l-2 border-indigo-400">
                        {ev.requirements?.peo2 || '—'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="font-bold text-slate-900 text-[11px]">
                        <span className="text-indigo-700 mr-1">PEO 3:</span>
                        Năng lực học tập suốt đời & đạo đức nghề nghiệp
                      </div>
                      <p className="text-slate-700 text-xs italic pl-2 border-l-2 border-indigo-400">
                        {ev.requirements?.peo3 || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5. Teamwork & Điểm số */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-2xs">
                    <div className="font-bold text-slate-900 uppercase text-[11px] pb-1 border-b border-slate-100 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>5. Đánh giá làm việc nhóm</span>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                      <span className="text-sm font-bold text-indigo-900">
                        {ev.teamworkEvaluation}
                      </span>
                      {ev.teamworkOther && (
                        <div className="text-xs text-slate-600 italic mt-1">
                          (Ý kiến khác: {ev.teamworkOther})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-2xs">
                    <div className="font-bold text-slate-900 uppercase text-[11px] pb-1 border-b border-slate-100 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>Nhận xét & Kiến nghị tổng quát</span>
                    </div>
                    <p className="p-3 rounded-xl bg-slate-50 text-slate-700 leading-relaxed text-xs italic">
                      "{ev.comments || 'Không có nhận xét bổ sung.'}"
                    </p>
                  </div>
                </div>

                {/* 6. Người đánh giá */}
                {ev.evaluatorInfo && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                    <div className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Thông tin Người Đánh Giá</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-slate-700">
                      <div>Họ tên: <strong className="text-slate-900">{ev.evaluatorInfo.name || '—'}</strong></div>
                      <div>Chức vụ: <strong className="text-slate-900">{ev.evaluatorInfo.position || '—'}</strong></div>
                      <div>Email: <span className="font-mono text-indigo-700">{ev.evaluatorInfo.email || '—'}</span></div>
                      <div>SĐT: <span className="font-mono">{ev.evaluatorInfo.phone || '—'}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {ev && !showPrintDoc && (
              <button
                type="button"
                onClick={() => setShowPrintDoc(true)}
                className="px-4 py-2 font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Xem biểu mẫu in chính thức</span>
              </button>
            )}

            {!isCompleted && ev && onDeleteEvaluation && (
              <button
                type="button"
                onClick={() => {
                  onDeleteEvaluation(internship);
                }}
                className="px-3.5 py-2 font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer text-xs"
                title="Xóa kết quả đánh giá của sinh viên này"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa kết quả</span>
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowPrintDoc(false);
                onClose();
              }}
              className="px-5 py-2 font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition text-xs cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EvaluationDetailModal;
