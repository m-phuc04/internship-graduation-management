import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import internshipApi from '../../api/internshipApi';
import dashboardApi from '../../api/dashboardApi';
import evaluationApi from '../../api/evaluationApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import InternshipEvaluationDoc from '../../components/documents/InternshipEvaluationDoc';
import DocumentViewerModal from '../../components/documents/DocumentViewerModal';
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
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileText,
  Printer,
  Award,
} from 'lucide-react';

const MyInternshipPage = () => {
  const { currentTerm } = useAcademicTerm();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [evalData, setEvalData] = useState(null);
  const [createLinkModalOpen, setCreateLinkModalOpen] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchMyInternship = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try fetching with currentTerm filter
      let res = await internshipApi.getMyInternship({
        academicTermId: currentTerm?._id || '',
      });

      // 2. If no internship found under currentTerm, fallback to fetching without term constraint
      if ((!res?.success || !res?.data?.internship) && currentTerm?._id) {
        const fallbackRes = await internshipApi.getMyInternship();
        if (fallbackRes?.success && fallbackRes?.data?.internship) {
          res = fallbackRes;
        }
      }

      // 3. Fallback to student dashboard API to guarantee sync across modules
      let resolvedInternship = res?.data?.internship || (res?.data?._id ? res.data : null);
      let resolvedStudent = res?.data?.student || resolvedInternship?.studentId;

      if (!resolvedInternship) {
        try {
          const dashRes = await dashboardApi.getStudentDashboard();
          if (dashRes?.success && dashRes.data?.internship) {
            resolvedInternship = dashRes.data.internship;
            resolvedStudent = dashRes.data.student || resolvedStudent;
          }
        } catch {
          // ignore
        }
      }

      if (res?.success && res.data) {
        setData({
          ...res.data,
          student: resolvedStudent || res.data.student,
          internship: resolvedInternship,
        });
      } else if (resolvedInternship) {
        setData({
          student: resolvedStudent,
          internship: resolvedInternship,
          hasActiveInternship: true,
          canRegisterNew: false,
        });
      }

      // Fetch evaluation request state with fallback
      try {
        let evalRes = await evaluationApi.getStudentEvaluationRequest({
          academicTermId: currentTerm?._id || '',
        });

        // If currentTerm didn't return an evaluation or request, try without term constraint
        if (!evalRes?.success || !evalRes?.data?.hasInternship || (!evalRes?.data?.request && !evalRes?.data?.evaluation)) {
          const evalFallback = await evaluationApi.getStudentEvaluationRequest();
          if (evalFallback?.success && (evalFallback.data?.hasInternship || evalFallback.data?.evaluation || evalFallback.data?.request)) {
            evalRes = evalFallback;
          }
        }

        if (evalRes?.success && evalRes.data) {
          setEvalData(evalRes.data);
        }
      } catch {
        // Safe ignore
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải thông tin hồ sơ thực tập', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTerm?._id, showToast]);

  const handleCreateEvaluationLink = async () => {
    setCreatingLink(true);
    try {
      const termId = internship?.academicTermId?._id || internship?.academicTermId || '';
      let res;
      try {
        res = await evaluationApi.createStudentEvaluationLink({
          academicTermId: termId,
        });
      } catch (err) {
        // If failed with term constraint, retry with empty academicTermId
        if (termId) {
          res = await evaluationApi.createStudentEvaluationLink({});
        } else {
          throw err;
        }
      }

      if (res?.success) {
        showToast(res.message || 'Tạo link đánh giá thành công!', 'success');
        setCreateLinkModalOpen(false);
        // Refresh eval data
        try {
          const evalRes = await evaluationApi.getStudentEvaluationRequest({
            academicTermId: termId,
          });
          if (evalRes?.success) {
            setEvalData(evalRes.data);
          } else {
            const evalFallback = await evaluationApi.getStudentEvaluationRequest();
            if (evalFallback?.success) {
              setEvalData(evalFallback.data);
            }
          }
        } catch {
          // ignore
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể tạo link đánh giá', 'error');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    showToast('Đã sao chép link đánh giá vào clipboard.', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  useEffect(() => {
    fetchMyInternship();
  }, [fetchMyInternship]);

  // Smooth scroll to evaluation section when ?view=evaluation is present
  useEffect(() => {
    if (location.search.includes('view=evaluation')) {
      const el = document.getElementById('evaluation-section');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 250);
      }
    }
  }, [location.search, data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-2xs">
          <LoadingSkeleton rows={4} cols={4} />
        </div>
      </div>
    );
  }

  const rawInternship = data?.internship !== undefined ? data.internship : (data?._id ? data : null);
  const student = data?.student || rawInternship?.studentId;
  const internship = rawInternship;
  
  const isRejected = internship?.status === 'REJECTED';
  const hasActiveInternship = Boolean(
    internship && !isRejected && internship.status !== 'INACTIVE'
  );
  const canRegisterNew = !hasActiveInternship;

  // Resolve evaluation data from all available sources
  const activeEvaluation =
    evalData?.evaluation ||
    (typeof internship?.evaluation === 'object' && internship?.evaluation?._id ? internship.evaluation : null);
  const activeRequest = evalData?.request;
  const isEvaluated = Boolean(
    activeEvaluation ||
    activeRequest?.status === 'SUBMITTED' ||
    internship?.status === 'COMPLETED'
  );
  const isPendingEvaluation = Boolean(activeRequest?.status === 'PENDING' && !isEvaluated);

  // If no internship registered yet
  if (!internship) {
    return (
      <div className="space-y-6">
        {/* Welcome & Student Info Banner */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xl flex items-center justify-center shadow-2xs shrink-0">
              {student?.userId?.fullName?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Xin chào, {student?.userId?.fullName || 'Sinh viên'}!
              </h2>
              <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2">
                <span>MSSV: <strong>{student?.studentCode || '—'}</strong></span>
                <span>•</span>
                <span>Lớp: <strong>{student?.className || '—'}</strong></span>
                <span>•</span>
                <span>GPA: <strong>{student?.gpa !== undefined ? Number(student.gpa).toFixed(2) : '—'}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Chưa có hồ sơ thực tập
            </span>
          </div>
        </div>

        {/* Empty State Card */}
        <div className="p-12 bg-white rounded-3xl border border-slate-200/80 shadow-2xs text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-5 shadow-sm">
            <Briefcase className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Bạn chưa đăng ký hồ sơ Thực tập Doanh nghiệp
          </h3>
          <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
            Hãy nộp đơn đăng ký thực tập để được Trưởng Bộ Môn xét duyệt và phân công Giảng viên hướng dẫn trong kỳ này.
          </p>

          <Link
            to="/student/internship/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-200 transition duration-200"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Đăng ký thực tập ngay</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    );
  }

  // Format dates
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

  const durationWeeks = getDurationInWeeks(internship.startDate, internship.endDate);

  return (
    <div className="space-y-6">
      {/* Top Banner with Status */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  {internship.position}
                </h2>
                <StatusBadge status={internship.status} size="md" />
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-2">
                <span>Doanh nghiệp: <strong className="text-slate-800">{internship.companyId?.name || internship.companyId?.companyName || '—'}</strong></span>
                <span>•</span>
                <span>Mã hồ sơ: <strong className="font-mono text-indigo-600">{internship._id}</strong></span>
              </div>
            </div>
          </div>

          {/* Action button if rejected/completed or info banner */}
          <div className="flex items-center gap-2">
            {isEvaluated && (
              <button
                onClick={() => setDocModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                title="In phiếu đánh giá kết quả thực tập từ Doanh nghiệp"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu đánh giá</span>
              </button>
            )}

            {canRegisterNew ? (
              <Link
                to="/student/internship/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Đăng ký hồ sơ mới</span>
              </Link>
            ) : (
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Hồ sơ đang ở trạng thái hoạt động</span>
              </div>
            )}
          </div>
        </div>

        {/* Status explanation alert - Only rendered when there is actual explanation content */}
        {(() => {
          let content = null;
          let isDanger = false;

          if (internship.status === 'PENDING') {
            content = (
              <span>
                Hồ sơ của bạn đã được tiếp nhận và đang ở trạng thái <strong>PENDING (Chờ xét duyệt)</strong>. Trưởng Bộ Môn (TBM) sẽ kiểm tra thông tin và phân công Giảng viên hướng dẫn.
              </span>
            );
          } else if (internship.status === 'APPROVED') {
            content = (
              <span>
                Hồ sơ thực tập của bạn đã được <strong>PHÊ DUYỆT (APPROVED)</strong> thành công. Vui lòng liên hệ Giảng viên hướng dẫn để bắt đầu quá trình thực tập.
              </span>
            );
          } else if (internship.status === 'INTERNING') {
            content = (
              <span>
                Bạn đang trong quá trình <strong>THỰC TẬP (INTERNING)</strong> tại doanh nghiệp. Nhớ nộp báo cáo định kỳ đầy đủ.
              </span>
            );
          } else if (internship.status === 'REJECTED') {
            isDanger = true;
            content = (
              <div className="space-y-2">
                <div className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
                  <span>Hồ sơ thực tập đã bị TỪ CHỐI (REJECTED)</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-rose-200 text-rose-900 shadow-2xs">
                  <span className="font-bold text-rose-800 block mb-1">Lý do từ chối:</span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                    {internship.rejectionReason?.trim() ||
                      internship.rejectReason?.trim() ||
                      internship.reason?.trim() ||
                      'Chưa có thông tin lý do từ chối.'}
                  </p>
                </div>
                <p className="text-[11.5px] text-rose-700">
                  Bạn có thể nhấn nút <strong>"Đăng ký hồ sơ mới"</strong> ở trên để cập nhật thông tin và nộp lại hồ sơ.
                </p>
              </div>
            );
          } else if (internship.status === 'COMPLETED') {
            content = (
              <span>
                Chúc mừng bạn đã <strong>HOÀN THÀNH (COMPLETED)</strong> kỳ thực tập doanh nghiệp!
              </span>
            );
          }

          if (!content) return null;

          return (
            <div
              className={`mt-5 p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
                isDanger
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : 'bg-indigo-50/60 border-indigo-100 text-indigo-900'
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isDanger ? 'text-rose-600' : 'text-indigo-600'
                }`}
              />
              <div className="flex-1">{content}</div>
            </div>
          );
        })()}
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Company & Internship Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Thông tin Doanh nghiệp Thực tập
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Tên công ty / Doanh nghiệp</span>
                <span className="font-bold text-slate-900 text-sm">{internship.companyId?.name || internship.companyId?.companyName || '—'}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Mã công ty (Code)</span>
                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {internship.companyId?.code || 'Chưa đặt mã'}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 block mb-0.5">Địa chỉ thực tập</span>
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{internship.companyId?.address}</span>
                </div>
              </div>

              {internship.companyId?.email && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Email doanh nghiệp</span>
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{internship.companyId?.email}</span>
                  </div>
                </div>
              )}

              {internship.companyId?.phone && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Hotline công ty</span>
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{internship.companyId?.phone}</span>
                  </div>
                </div>
              )}

              {internship.companyId?.website && (
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block mb-0.5">Website</span>
                  <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a href={internship.companyId?.website} target="_blank" rel="noreferrer" className="hover:underline">
                      {internship.companyId?.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Internship Timeline & Position Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Vị trí & Thời gian Thực tập
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block mb-1">Vị trí thực tập</span>
                <span className="font-bold text-slate-900 text-sm">{internship.position}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block mb-1">Ngày bắt đầu</span>
                <span className="font-bold text-slate-900 text-sm">{formatDate(internship.startDate)}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block mb-1">Ngày kết thúc</span>
                <span className="font-bold text-slate-900 text-sm">{formatDate(internship.endDate)}</span>
                {durationWeeks && (
                  <span className="block text-[11px] text-indigo-600 font-medium mt-0.5">
                    (Khoảng {durationWeeks} tuần)
                  </span>
                )}
              </div>
            </div>

            {internship.registrationNote && (
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Ghi chú đăng ký của sinh viên:</span>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                  {internship.registrationNote}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Mentors & Supervision Card */}
        <div className="space-y-6">
          {/* Company Mentor */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Người hướng dẫn tại Doanh nghiệp
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Họ tên Mentor / Người phụ trách</span>
                <span className="font-bold text-slate-900 text-sm">
                  {internship.mentorName || internship.companyId?.contactPerson || 'Chưa cập nhật'}
                </span>
                {internship.mentorPosition && (
                  <span className="block text-[11px] text-slate-500 font-medium">
                    {internship.mentorPosition}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Email liên hệ</span>
                <span className="font-medium text-slate-700">
                  {internship.mentorEmail || internship.companyId?.contactEmail || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Số điện thoại liên hệ</span>
                <span className="font-medium text-slate-700 font-mono">
                  {internship.mentorPhone || internship.companyId?.phone || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Supervisor (GVHD) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Giảng viên Hướng dẫn (GVHD)
              </h3>
            </div>

            {internship.lecturerId ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">Giảng viên phụ trách</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {internship.lecturerId?.academicTitle ? `${internship.lecturerId.academicTitle} ` : ''}
                      {internship.lecturerId?.userId?.fullName}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Đã phân công GVHD
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Mã giảng viên</span>
                    <span className="font-mono font-bold text-indigo-600">
                      {internship.lecturerId?.lecturerCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Email trao đổi</span>
                    <span className="font-medium text-slate-700">
                      {internship.lecturerId?.userId?.email}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
                <div className="font-bold mb-0.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Chờ phân công GVHD
                </div>
                Trưởng Bộ Môn sẽ chỉ định Giảng viên hướng dẫn sau khi phê duyệt hồ sơ thực tập của bạn.
              </div>
            )}
          </div>

          {/* Evaluation Request & Company Evaluation Card */}
          <div id="evaluation-section" className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Đánh Giá Thực Tập Doanh Nghiệp
                </h3>
              </div>
              {isEvaluated ? (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Doanh nghiệp đã đánh giá
                </span>
              ) : isPendingEvaluation ? (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Đã tạo link — Chờ DN đánh giá
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                  {['PENDING_SUPERVISOR_ACCEPTANCE', 'APPROVED', 'INTERNING', 'COMPLETED'].includes(internship.status) ? 'Chưa tạo link' : 'Chưa đủ điều kiện'}
                </span>
              )}
            </div>

            {/* Condition 1: Internship is PENDING / Awaiting approval */}
            {internship.status === 'PENDING' && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Hồ sơ thực tập đang chờ xét duyệt
                </div>
                <p>
                  Hồ sơ đăng ký thực tập của bạn đang ở trạng thái <strong>Chờ Trưởng Bộ Môn xét duyệt</strong>. Bạn sẽ có thể tạo link đánh giá gửi Doanh nghiệp sau khi hồ sơ được phê duyệt chính thức.
                </p>
              </div>
            )}

            {/* Condition 2: Internship is REJECTED */}
            {internship.status === 'REJECTED' && (
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-rose-900 text-xs leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Hồ sơ thực tập không được phê duyệt
                </div>
                <p>
                  Hồ sơ thực tập của bạn đã bị từ chối. Lý do: <em>{internship.rejectionReason || 'Chưa đạt yêu cầu'}</em>. Bạn không thể tạo link đánh giá cho đợt này.
                </p>
              </div>
            )}

            {/* Condition 3: Approved / Assigned GVHD / Interning / Completed */}
            {['PENDING_SUPERVISOR_ACCEPTANCE', 'APPROVED', 'INTERNING', 'COMPLETED'].includes(internship.status) && (
              <>
                {/* Case 1: No Evaluation Request Created Yet */}
                {!isEvaluated && !isPendingEvaluation && (
                  <div className="py-4 text-center space-y-3">
                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-left text-xs text-indigo-900 space-y-1">
                      <div className="font-bold">Quy trình đánh giá thực tập:</div>
                      <div>1. Sinh viên nhấn nút <strong>[Tạo link đánh giá]</strong> để nhận liên kết đánh giá an toàn.</div>
                      <div>2. Gửi liên kết cho Người phụ trách / Mentor tại Doanh nghiệp để họ điền phiếu online không cần đăng nhập.</div>
                      <div>3. <strong>Lưu ý:</strong> Mỗi sinh viên chỉ được tạo 01 link duy nhất cho đợt thực tập này.</div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setCreateLinkModalOpen(true)}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition inline-flex items-center gap-2 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Tạo Link Đánh Giá Cho Doanh Nghiệp</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Case 2: Link Created (Pending Submission) */}
                {isPendingEvaluation && activeRequest?.token && (
                  <div className="space-y-3 text-xs">
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5 text-amber-950">
                      <div className="font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Link đánh giá thực tập của bạn đã sẵn sàng:</span>
                      </div>

                      <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-amber-200">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/company-evaluation/${activeRequest.token}`}
                          className="flex-1 bg-transparent font-mono text-xs text-slate-700 outline-none select-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyLink(`${window.location.origin}/company-evaluation/${activeRequest.token}`)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition shrink-0 cursor-pointer"
                        >
                          {copied ? 'Đã sao chép!' : 'Sao chép link'}
                        </button>
                        <a
                          href={`${window.location.origin}/company-evaluation/${activeRequest.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition shrink-0 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Xem link</span>
                        </a>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <div>• Bạn hãy gửi link trên cho Cán bộ quản lý / Mentor tại Doanh nghiệp qua Email, Zalo, Teams.</div>
                        <div>• Doanh nghiệp mở link để đánh giá trực tiếp mà <strong>không cần tài khoản / đăng nhập</strong>.</div>
                        <div className="text-amber-800 font-medium pt-1">
                          ⚠️ Mỗi sinh viên chỉ được tạo 1 link duy nhất. Nếu cần tạo lại link, vui lòng liên hệ Trưởng Bộ Môn.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Case 3: Submitted Evaluation Result */}
                {isEvaluated && (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-emerald-950 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>Kết quả đánh giá từ Doanh nghiệp</span>
                        </div>
                        <div className="text-lg font-black text-emerald-700 font-mono">
                          {activeEvaluation?.score !== undefined && activeEvaluation?.score !== null
                            ? `${Number(activeEvaluation.score) % 1 === 0 ? Number(activeEvaluation.score).toFixed(1) : activeEvaluation.score} / 10 điểm`
                            : '— / 10 điểm'}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] pt-1 text-slate-700">
                        <div>Doanh nghiệp: <strong className="text-slate-900">{internship.companyId?.name || internship.companyId?.companyName || 'TDSOUTH'}</strong></div>
                        <div>Người đánh giá: <strong>{activeEvaluation?.evaluatorInfo?.name || internship.mentorName || 'Cán bộ DN'}</strong></div>
                        <div>Chức vụ: <strong>{activeEvaluation?.evaluatorInfo?.position || internship.mentorPosition || '—'}</strong></div>
                        <div>Ngày nộp: <strong>{formatDate(activeEvaluation?.submittedAt || activeRequest?.submittedAt || activeEvaluation?.createdAt)}</strong></div>
                      </div>

                      {activeEvaluation?.comments && (
                        <div className="pt-2 border-t border-emerald-200/60 text-slate-700">
                          <span className="font-bold block mb-0.5">Nhận xét của Doanh nghiệp:</span>
                          <p className="whitespace-pre-line leading-relaxed italic bg-white/70 p-2.5 rounded-xl border border-emerald-100 font-medium">
                            "{activeEvaluation.comments}"
                          </p>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setDocModalOpen(true)}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>In phiếu đánh giá (Print / PDF)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Application Metadata */}
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 space-y-2">
            <div className="flex justify-between">
              <span>Ngày gửi đăng ký:</span>
              <strong className="text-slate-800">{formatDate(internship.createdAt)}</strong>
            </div>
            {internship.approvedAt && (
              <div className="flex justify-between">
                <span>Ngày phê duyệt:</span>
                <strong className="text-slate-800">{formatDate(internship.approvedAt)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal to Create Evaluation Link */}
      {createLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-slate-900 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Xác nhận tạo link đánh giá</h3>
                <p className="text-xs text-slate-500">Đánh giá kết quả Thực tập Doanh nghiệp (TTDN)</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Đợt thực tập tại:</span>
                <strong className="text-slate-900 text-right">{internship?.companyId?.companyName || internship?.companyId?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sinh viên:</span>
                <strong className="text-slate-900">{student?.userId?.fullName || 'Sinh viên'} ({student?.studentCode})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Học kỳ:</span>
                <strong className="text-indigo-700">{internship?.academicTermId?.termName || internship?.academicTermId?.code || currentTerm?.termName || currentTerm?.code || 'Học kỳ hiện tại'}</strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-[11px] leading-relaxed border border-amber-200/70">
              <strong>Lưu ý:</strong> Mỗi sinh viên chỉ được tạo 01 link đánh giá cho 01 đợt thực tập. Vui lòng gửi link cho Người phụ trách / Mentor tại doanh nghiệp tiếp nhận.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCreateLinkModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={creatingLink}
                onClick={handleCreateEvaluationLink}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
              >
                {creatingLink ? 'Đang tạo...' : 'Xác nhận tạo link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document B Viewer Modal */}
      <DocumentViewerModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="Phiếu Đánh Giá Kết Quả Thực Tập Doanh Nghiệp"
      >
        <InternshipEvaluationDoc
          internship={internship}
          evaluation={activeEvaluation || evalData?.evaluation || internship?.evaluation}
        />
      </DocumentViewerModal>
    </div>
  );
};

export default MyInternshipPage;

