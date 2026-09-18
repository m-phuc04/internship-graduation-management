import React from 'react';
import Modal from '../common/Modal';
import { Printer, Download, BookOpen, Calendar, Building2, User, Award, CheckCircle2 } from 'lucide-react';

const ExportInternshipDiaryModal = ({
  isOpen,
  onClose,
  student,
  internship,
  weeks = [],
  reports = [],
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

  const handlePrint = () => {
    window.print();
  };

  // Map report by weekNumber
  const reportMap = {};
  reports.forEach((r) => {
    if (r.weekNumber) {
      reportMap[r.weekNumber] = r;
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Toàn Bộ Nhật Ký Thực Tập Doanh Nghiệp"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Top Print Bar */}
        <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 print:hidden">
          <div className="text-xs text-slate-600">
            Xem trước tài liệu nhật ký đầy đủ tất cả các tuần ({weeks.length} tuần).
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In / Lưu PDF</span>
          </button>
        </div>

        {/* Printable Document Container */}
        <div className="p-8 sm:p-10 bg-white border border-slate-200 rounded-2xl space-y-6 text-slate-900 font-sans shadow-xs print:border-none print:shadow-none print:p-0">
          {/* Header Title */}
          <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
            <div className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
              TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP. HỒ CHÍ MINH (HUIT)
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
              KHOA CÔNG NGHỆ THÔNG TIN
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 pt-2 tracking-wide">
              NHẬT KÝ THỰC TẬP DOANH NGHIỆP
            </h1>
            <div className="text-xs italic text-slate-500">
              (Báo cáo và theo dõi tiến độ thực tập định kỳ hàng tuần)
            </div>
          </div>

          {/* Student & Internship Info Box */}
          <div className="border border-slate-300 rounded-xl p-5 bg-slate-50/50 space-y-3 text-xs">
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              THÔNG TIN SINH VIÊN & ĐỢT THỰC TẬP
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <strong>Họ và tên SV1 (Trưởng nhóm):</strong>{' '}
                <span>{internship.studentId?.userId?.fullName || student?.userId?.fullName}</span>
              </div>
              <div>
                <strong>Mã số sinh viên (MSSV):</strong>{' '}
                <span className="font-mono">{internship.studentId?.studentCode || student?.studentCode}</span>
              </div>
              <div>
                <strong>Lớp sinh hoạt:</strong>{' '}
                <span>{internship.studentId?.className || student?.className || '—'}</span>
              </div>
              <div>
                <strong>Chuyên ngành / Ngành:</strong>{' '}
                <span>{internship.studentId?.major || student?.major || 'Công nghệ thông tin'}</span>
              </div>

              {internship.secondStudentId && (
                <>
                  <div className="col-span-1 sm:col-span-2 pt-1 border-t border-dashed border-slate-200">
                    <strong>Họ và tên SV2:</strong>{' '}
                    <span>{internship.secondStudentId?.userId?.fullName}</span> — <strong>MSSV:</strong>{' '}
                    <span className="font-mono">{internship.secondStudentId?.studentCode}</span> (Lớp: {internship.secondStudentId?.className || '—'})
                  </div>
                </>
              )}

              <div className="col-span-1 sm:col-span-2 pt-1 border-t border-dashed border-slate-200" />

              <div>
                <strong>Doanh nghiệp thực tập:</strong>{' '}
                <span>{internship.companyId?.name || '—'}</span>
              </div>
              <div>
                <strong>Vị trí thực tập:</strong>{' '}
                <span>{internship.position || '—'}</span>
              </div>
              <div>
                <strong>Giảng viên hướng dẫn:</strong>{' '}
                <span>{internship.lecturerId?.userId?.fullName || 'Chưa phân công'}</span>
              </div>
              <div>
                <strong>Người hướng dẫn tại DN (Mentor):</strong>{' '}
                <span>{internship.mentorName ? `${internship.mentorName} (${internship.mentorPosition || 'Mentor'})` : '—'}</span>
              </div>
              <div>
                <strong>Thời gian thực tập:</strong>{' '}
                <span>{formatDate(internship.startDate)} — {formatDate(internship.endDate)}</span>
              </div>
              <div>
                <strong>Tổng số tuần thực tập:</strong>{' '}
                <span className="font-bold font-mono">{weeks.length} tuần</span>
              </div>
            </div>
          </div>

          {/* Weeks Diary Content List */}
          <div className="space-y-5 pt-2">
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              NỘI DUNG NHẬT KÝ THEO TỪNG TUẦN
            </h2>

            {weeks.map((week) => {
              const report = reportMap[week.weekNumber];
              const hasReport = !!report && (!!report.content || !!report.file?.originalName);

              return (
                <div
                  key={week.weekNumber}
                  className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5 text-xs break-inside-avoid"
                >
                  {/* Week Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
                    <div className="font-extrabold text-sm text-slate-900 uppercase">
                      TUẦN {week.weekNumber}
                    </div>
                    <div className="text-slate-600 font-mono text-[11px]">
                      <strong>Thời gian:</strong> {formatDate(week.startDate)} — {formatDate(week.endDate)}
                    </div>
                  </div>

                  {/* Week Body */}
                  {hasReport ? (
                    <div className="space-y-2">
                      {report.title && (
                        <div className="font-bold text-indigo-950">
                          <strong>Tiêu đề:</strong> {report.title}
                        </div>
                      )}

                      <div className="space-y-1">
                        <strong>Nội dung:</strong>
                        <div className="p-3 bg-slate-50/70 rounded-lg text-slate-800 whitespace-pre-line leading-relaxed border border-slate-100">
                          {report.content || 'Không có mô tả văn bản (đính kèm file báo cáo).'}
                        </div>
                      </div>

                      {report.file?.originalName && (
                        <div className="text-[11px] text-slate-600">
                          <strong>File đính kèm:</strong> {report.file.originalName}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-dashed border-slate-100 flex-wrap gap-2">
                        <div>
                          <strong>Ngày nộp:</strong> {formatDate(report.submittedAt || report.createdAt)}
                          {report.student2ConfirmedAt && (
                            <span className="ml-2 text-emerald-700">
                              • <strong>SV2 xác nhận:</strong> {formatDate(report.student2ConfirmedAt)}
                            </span>
                          )}
                        </div>
                        {report.lecturerScore !== null && report.lecturerScore !== undefined && (
                          <div className="font-bold text-indigo-900">
                            Điểm GVHD: <span className="text-emerald-700 font-mono">{report.lecturerScore}/10</span>
                            {report.lecturerComment && ` (${report.lecturerComment})`}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic py-1">
                      Chưa có báo cáo
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Signature Block */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-center text-xs break-inside-avoid">
            <div className="space-y-16">
              <div className="font-bold uppercase">GIẢNG VIÊN HƯỚNG DẪN</div>
              <div className="text-slate-400 italic">(Ký và ghi rõ họ tên)</div>
            </div>
            <div className="space-y-16">
              <div className="font-bold uppercase">SINH VIÊN THỰC TẬP</div>
              <div className="text-slate-400 italic">(Ký và ghi rõ họ tên)</div>
            </div>
          </div>
        </div>

        {/* Modal Close Action */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportInternshipDiaryModal;
