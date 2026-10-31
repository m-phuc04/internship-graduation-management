import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import LoadingSkeleton from '../common/LoadingSkeleton';
import EmptyState from '../common/EmptyState';
import StudentReportDetailModal from './StudentReportDetailModal';
import reportApi from '../../api/reportApi';
import getFileUrl from '../../utils/fileUrlHelper';
import { useToast } from '../../context/ToastContext';

import {
  BookOpen,
  Calendar,
  Building2,
  GraduationCap,
  Paperclip,
  Eye,
  RefreshCw,
  Award,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const StudentInternshipDiaryModal = ({ isOpen, onClose, internship }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const { showToast } = useToast();

  const fetchReports = useCallback(async () => {
    if (!internship?._id) return;
    setLoading(true);
    try {
      const res = await reportApi.getByInternshipId(internship._id);
      if (res.success) {
        setReports(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải nhật ký thực tập của sinh viên', 'error');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [internship?._id, showToast]);

  useEffect(() => {
    if (isOpen && internship?._id) {
      fetchReports();
    } else {
      setReports([]);
      setSelectedReport(null);
      setDetailModalOpen(false);
    }
  }, [isOpen, internship?._id, fetchReports]);

  if (!internship) return null;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const studentName = internship.studentId?.userId?.fullName || 'Sinh viên';
  const studentCode = internship.studentId?.studentCode || '—';
  const className = internship.studentId?.className || '—';
  const companyName = internship.companyId?.name || 'Doanh nghiệp';
  const position = internship.position || 'Thực tập sinh';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Chi Tiết Nhật Ký Thực Tập"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5 text-xs">
          {/* Student & Internship Info Card */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#102d7d] text-white font-bold text-lg flex items-center justify-center shadow-2xs shrink-0">
                {studentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {studentName}
                  </span>
                  <StatusBadge status={internship.status} size="sm" />
                </div>
                <div className="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="font-bold text-[#102d7d]">
                    MSSV: {studentCode}
                  </span>
                  <span>•</span>
                  <span>Lớp: {className}</span>
                  {internship.secondStudentId && (
                    <>
                      <span>•</span>
                      <span className="text-slate-600">
                        SV2: {internship.secondStudentId.userId?.fullName} ({internship.secondStudentId.studentCode})
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500 shrink-0">
              <div>Đơn vị: <strong className="text-slate-900">{companyName}</strong></div>
              <div>Vị trí: <strong className="text-slate-800">{position}</strong></div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                {formatDate(internship.startDate)} — {formatDate(internship.endDate)}
              </div>
            </div>
          </div>

          {/* Subheader & Refresh */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-[#102d7d]" />
              <span>Danh Sách Nhật Ký Từng Tuần ({reports.length} bản ghi)</span>
            </div>
            <button
              type="button"
              onClick={fetchReports}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Làm mới danh sách nhật ký"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Table or Empty State */}
          {loading ? (
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80">
              <LoadingSkeleton rows={4} cols={5} />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-10 px-6 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Chưa có nhật ký nào được ghi nhận
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Sinh viên chưa nộp nhật ký thực tập cho đợt này. Khi sinh viên hoàn thành và nộp nhật ký hàng tuần, danh sách sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 pl-5 text-center w-24">Tuần</th>
                      <th className="py-3 px-4 w-44">Thời gian</th>
                      <th className="py-3 px-4 min-w-[220px]">Nội dung nhật ký</th>
                      <th className="py-3 px-4 w-40">File đính kèm</th>
                      <th className="py-3 px-4 w-36">Trạng thái</th>
                      <th className="py-3 px-4 pr-5 text-right w-28"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {reports.map((report) => {
                      const fileName = report.file?.originalName || report.file?.fileName;
                      const fileUrl = report.file?.fileUrl ? getFileUrl(report.file.fileUrl) : '';

                      return (
                        <tr
                          key={report._id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* 1. Tuần */}
                          <td className="py-3 px-4 pl-5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center font-bold text-xs px-2.5 py-1 rounded-xl bg-[#102d7d] text-white font-mono shadow-2xs">
                              Tuần {report.weekNumber}
                            </span>
                          </td>

                          {/* 2. Thời gian */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {report.weekStartDate && report.weekEndDate
                                  ? `${formatDate(report.weekStartDate)} — ${formatDate(report.weekEndDate)}`
                                  : report.weekStartDate
                                  ? formatDate(report.weekStartDate)
                                  : '—'}
                              </span>
                            </div>
                            {report.submittedAt && (
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                Nộp: {formatDate(report.submittedAt)}
                              </div>
                            )}
                          </td>

                          {/* 3. Nội dung */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5 max-w-md">
                              <div className="font-bold text-slate-900 line-clamp-1" title={report.title}>
                                {report.title}
                              </div>
                              {report.content ? (
                                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed" title={report.content}>
                                  {report.content}
                                </p>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Không có nội dung mô tả</span>
                              )}
                              {report.lecturerComment && (
                                <div className="text-[10px] text-blue-700 bg-blue-50/70 border border-blue-200/60 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                  <strong>Nhận xét GV:</strong> {report.lecturerComment}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 4. File đính kèm */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {fileName ? (
                              fileUrl ? (
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-[#102d7d] hover:underline font-semibold max-w-[160px] truncate"
                                  title={`Xem/tải file: ${fileName}`}
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="truncate">{fileName}</span>
                                </a>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 max-w-[160px] truncate" title={fileName}>
                                  <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{fileName}</span>
                                </div>
                              )
                            ) : (
                              <span className="text-slate-300 font-mono">—</span>
                            )}
                          </td>

                          {/* 5. Trạng thái */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <StatusBadge status={report.status} size="sm" />
                              {report.lecturerScore !== null && report.lecturerScore !== undefined && (
                                <div className="text-[10px] font-bold text-emerald-700">
                                  Điểm: {Number(report.lecturerScore).toFixed(1)}/10
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 6. Thao tác */}
                          <td className="py-3 px-4 pr-5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReport(report);
                                setDetailModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#102d7d] bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                              title="Xem chi tiết nhật ký tuần này"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Chi tiết</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="text-slate-500 text-xs">
              {reports.length > 0 ? (
                <span>
                  Đã ghi nhận <strong>{reports.length}</strong> bản nhật ký thực tập.
                </span>
              ) : (
                <span>Chưa có dữ liệu nhật ký.</span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Week Report Detail Modal */}
      <StudentReportDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
      />
    </>
  );
};

export default StudentInternshipDiaryModal;
