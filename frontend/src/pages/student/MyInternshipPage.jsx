import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import internshipApi from '../../api/internshipApi';
import dashboardApi from '../../api/dashboardApi';
import evaluationApi from '../../api/evaluationApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import InternshipConfirmationDoc from '../../components/documents/InternshipConfirmationDoc';
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
  const { showToast } = useToast();

  const fetchMyInternship = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try fetching with currentTerm filter
      let res = await internshipApi.getMyInternship({
        academicTermId: currentTerm?._id || '',
      });

      // 2. Fallback to fetching without term constraint
      if ((!res?.success || !res?.data?.internship) && currentTerm?._id) {
        const fallbackRes = await internshipApi.getMyInternship();
        if (fallbackRes?.success && fallbackRes?.data?.internship) {
          res = fallbackRes;
        }
      }

      // 3. Fallback to student dashboard API
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

      // Fetch evaluation request / grading data
      try {
        let evalRes = await evaluationApi.getStudentEvaluationRequest({
          academicTermId: currentTerm?._id || '',
        });

        if (!evalRes?.success || !evalRes?.data?.hasInternship || !evalRes?.data?.evaluation) {
          const evalFallback = await evaluationApi.getStudentEvaluationRequest();
          if (evalFallback?.success && (evalFallback.data?.hasInternship || evalFallback.data?.evaluation)) {
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
      showToast(err.message || 'Không thể tải thông tin thực tập của bạn', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTerm?._id, showToast]);

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

  // Active evaluation data
  const activeEvaluation = evalData?.evaluation ||
    (typeof internship?.evaluation === 'object' && internship?.evaluation?._id ? internship.evaluation : null);

  const isScorePublished = Boolean(
    evalData?.isScorePublished ?? internship?.isScorePublished ?? activeEvaluation?.isScorePublished
  );

  const rawHasScore = Boolean(
    (activeEvaluation?.score !== undefined && activeEvaluation?.score !== null && !isNaN(activeEvaluation?.score)) ||
    (internship?.finalScore !== undefined && internship?.finalScore !== null) ||
    (internship?.score !== undefined && internship?.score !== null)
  );

  // Student ONLY sees score if isScorePublished is true!
  const hasPublishedScore = Boolean(isScorePublished && rawHasScore);

  // Lecturer has graded, but TBM has not published yet
  const isGradedPendingPublish = Boolean(
    !isScorePublished && (
      evalData?.hasGraded ||
      activeEvaluation?.hasGraded ||
      rawHasScore ||
      internship?.status === 'COMPLETED' ||
      activeEvaluation?.status === 'SUBMITTED' ||
      activeEvaluation?.status === 'CONFIRMED'
    )
  );

  const finalScoreValue = activeEvaluation?.score ?? internship?.finalScore ?? internship?.score;

  const isCompleted = Boolean(
    internship?.status === 'COMPLETED' ||
    activeEvaluation?.status === 'CONFIRMED' ||
    activeEvaluation?.status === 'COMPLETED'
  );

  // Time window for grading
  const termInternshipCfg = evalData?.term?.internship || currentTerm?.internship || {};
  const gradingStartRaw = termInternshipCfg.gradingStart;
  const gradingEndRaw = termInternshipCfg.gradingEnd;

  const gradingStartDate = gradingStartRaw ? new Date(gradingStartRaw) : null;
  const gradingEndDate = gradingEndRaw ? new Date(gradingEndRaw) : null;

  const now = new Date();
  const isGradingNotOpen = Boolean(gradingStartDate && now < gradingStartDate);
  const isGradingExpired = Boolean(gradingEndDate && now > new Date(gradingEndDate.getTime() + 24 * 60 * 60 * 1000 - 1));

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const hasAssignedLecturer = Boolean(
    internship?.lecturerId ||
    internship?.supervisorId ||
    (typeof internship?.lecturerId === 'object' && internship?.lecturerId?._id)
  );

  const lecturerObj =
    typeof internship?.lecturerId === 'object'
      ? internship.lecturerId
      : typeof internship?.supervisorId === 'object'
      ? internship.supervisorId
      : null;

  const lecturerName =
    lecturerObj?.userId?.fullName ||
    lecturerObj?.fullName ||
    internship?.lecturerName ||
    'Chưa phân công';

  const docData = {
    lecturer: {
      fullName: lecturerName,
      academicTitle: lecturerObj?.academicTitle || 'ThS',
      lecturerCode: lecturerObj?.lecturerCode || '—',
      faculty: 'Khoa Công Nghệ Thông Tin',
      email: lecturerObj?.userId?.email || lecturerObj?.email || '—',
    },
    company: {
      name: internship?.companyId?.name || internship?.companyId?.companyName || 'Doanh nghiệp tiếp nhận',
      address: internship?.companyId?.address || '—',
      contactPerson: internship?.mentorName || internship?.companyId?.contactPerson || 'Bộ phận Nhân sự / Tuyển dụng',
    },
    startDate: internship?.startDate,
    endDate: internship?.endDate,
    totalWeeks: 10,
    totalStudents: 1,
    students: student
      ? [
          {
            studentCode: student.studentCode,
            fullName: student.userId?.fullName || 'Sinh viên',
            className: student.className || 'DHKTPM18A',
            position: internship?.position || 'Thực tập sinh',
          },
        ]
      : [],
  };

  if (!hasActiveInternship) {
    return (
      <div className="space-y-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200/80 shadow-2xs text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#123891] flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            Bạn chưa đăng ký hồ sơ Thực tập Doanh nghiệp
          </h3>
          <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
            Hãy nộp đơn đăng ký thực tập để được Trưởng Bộ Môn xét duyệt và phân công Giảng viên Giám sát trong kỳ này.
          </p>

          <Link
            to="/student/register-internship"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#123891] hover:bg-[#102d7d] text-white font-bold text-sm rounded-2xl shadow-sm transition"
          >
            <span>Đăng ký Thực tập ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0">
            <Briefcase className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Hồ Sơ Thực Tập Doanh Nghiệp
              </h1>
              <StatusBadge status={internship.status} size="md" />
            </div>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
              <span>Học kỳ: <strong>{internship.academicTermId?.termName || internship.academicTermId?.code || currentTerm?.termName || 'Học kỳ hiện tại'}</strong></span>
              <span>•</span>
              <span>Vị trí: <strong className="text-slate-700">{internship.position || 'Thực tập sinh'}</strong></span>
            </p>
          </div>
        </div>

      </div>

      {/* Main Grid: Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Student & Company Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Student & Position */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <UserCheck className="w-5 h-5 text-[#123891]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Thông tin sinh viên thực tập
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Họ và tên:</span>
                <strong className="text-slate-900 text-sm">{student?.userId?.fullName || 'Sinh viên'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Mã số sinh viên (MSSV):</span>
                <strong className="text-slate-900 font-mono text-sm">{student?.studentCode || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Lớp danh nghĩa:</span>
                <span className="text-slate-700">{student?.className || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Email liên hệ:</span>
                <span className="text-slate-700 font-mono">{student?.userId?.email || '—'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#123891]" />
                <span>Thời gian thực tập dự kiến:</span>
              </div>
              <div className="flex items-center gap-4 text-slate-600">
                <span>Từ ngày: <strong>{formatDate(internship.startDate)}</strong></span>
                <span>đến ngày: <strong>{formatDate(internship.endDate)}</strong></span>
              </div>
            </div>
          </div>

          {/* Section 2: Company Information */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 className="w-5 h-5 text-[#123891]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Doanh nghiệp tiếp nhận thực tập
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1">
                <div className="text-base font-bold text-slate-900">
                  {internship.companyId?.name || internship.companyId?.companyName || 'Doanh nghiệp tiếp nhận'}
                </div>
                {(internship.companyId?.code || internship.companyId?.companyCode) && (
                  <div className="text-xs text-slate-500 font-mono">
                    Mã DN: {internship.companyId?.code || internship.companyId?.companyCode}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-slate-700">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{internship.companyId?.address || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono">{internship.companyId?.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono">{internship.companyId?.phone || '—'}</span>
                </div>
                {internship.companyId?.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                    <a
                      href={internship.companyId.website.startsWith('http') ? internship.companyId.website : `https://${internship.companyId.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#123891] hover:underline truncate"
                    >
                      {internship.companyId.website}
                    </a>
                  </div>
                )}
              </div>

              {/* Vị trí & Thời gian thực tập tiếp nhận */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#123891]" />
                  <span>Vị trí &amp; Thời gian thực tập:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Vị trí thực tập:</span>
                    <strong className="text-slate-900">{internship.position || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Thời gian thực tập:</span>
                    <span className="text-slate-800">
                      Từ <strong>{formatDate(internship.startDate)}</strong> đến <strong>{formatDate(internship.endDate)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Thông tin người đánh giá tại Doanh nghiệp */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#123891]" />
                  <span>Người đánh giá tại Doanh nghiệp:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Họ và tên:</span>
                    <strong className="text-slate-900">
                      {internship.mentorName || internship.companyId?.contactPerson || '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Chức vụ / Bộ phận:</span>
                    <span className="text-slate-800">{internship.mentorPosition || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Email người đánh giá:</span>
                    <span className="font-mono text-slate-800">
                      {internship.mentorEmail || internship.companyId?.contactEmail || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Số điện thoại:</span>
                    <span className="font-mono text-slate-800">
                      {internship.mentorPhone || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ghi chú đăng ký (nếu có) */}
              {internship.registrationNote && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 block mb-0.5 font-semibold">Ghi chú đăng ký:</span>
                  <p className="text-slate-700 leading-relaxed italic">
                    "{internship.registrationNote}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Supervisor Lecturer & Evaluation Outcome */}
        <div className="space-y-6">
          {/* Section 3: Giảng viên Giám sát (GVGS) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <BookOpen className="w-5 h-5 text-[#123891]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Giảng viên Giám sát (GVGS)
              </h3>
            </div>

            {hasAssignedLecturer ? (
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Giảng viên Giám sát</span>
                    <span className="text-sm font-bold text-slate-900">
                      {lecturerObj?.academicTitle || 'ThS.'} {lecturerName}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] text-slate-600 pt-1">
                  
                  <div>
                    Khoa: <span className="font-semibold text-slate-800">{lecturerObj?.faculty || 'Khoa CNTT'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    Email: <span className="font-mono text-[#102d7d]">{lecturerObj?.userId?.email || lecturerObj?.email || '—'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#123891]/5 border border-[#123891]/20 text-[#123891] text-xs leading-relaxed">
                <div className="font-bold mb-0.5 flex items-center gap-1.5 text-[#123891]">
                  <Clock className="w-4 h-4 text-[#123891]" />
                  Chờ phân công GVGS
                </div>
                <p className="text-slate-700">
                  Trưởng Bộ Môn sẽ chỉ định Giảng viên Giám sát sau khi phê duyệt hồ sơ thực tập của bạn.
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Evaluation Outcome by Giảng viên Giám sát */}
          <div id="evaluation-section" className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#123891]" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Kết Quả Đánh Giá (GVGS)
                </h3>
              </div>

              {hasPublishedScore ? (
                <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ĐÃ CÔNG BỐ ĐIỂM</span>
                </span>
              ) : isGradingNotOpen ? (
                <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Chưa mở chấm điểm</span>
                </span>
              ) : null}
            </div>

            {/* Condition A: Internship PENDING */}
            {internship.status === 'PENDING' && (
              <div className="p-4 rounded-2xl bg-[#123891]/5 border border-[#123891]/20 text-[#123891] text-xs leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[#123891]">
                  <Clock className="w-4 h-4 text-[#123891]" />
                  Hồ sơ thực tập đang chờ xét duyệt
                </div>
                <p className="text-slate-700 leading-relaxed">
                  Hồ sơ đăng ký thực tập của bạn đang ở trạng thái <strong className="text-[#123891]">Chờ Trưởng Bộ Môn xét duyệt</strong>.
                </p>
              </div>
            )}

            {/* Condition B1: Has Published Score */}
            {hasPublishedScore && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 text-emerald-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Kết quả đánh giá chính thức</h4>
                      <p className="text-[11.5px] text-slate-500 mt-0.5">
                        Giảng viên Giám sát: <strong>{lecturerName}</strong>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-emerald-700 bg-white px-3.5 py-1 rounded-xl border border-emerald-300 inline-flex items-baseline gap-1 shadow-2xs">
                        <span className="text-lg">
                          {Number(finalScoreValue) % 1 === 0 ? Number(finalScoreValue).toFixed(1) : finalScoreValue}
                        </span>
                        <span className="text-xs font-semibold text-emerald-800">/ 10 điểm</span>
                      </div>
                    </div>
                  </div>

                  {/* Comments from GVGS */}
                  {activeEvaluation?.comments && (
                    <div className="p-3 rounded-xl bg-white/80 border border-emerald-200/60 text-slate-700 space-y-1">
                      <div className="font-bold text-slate-800 text-[11px] uppercase">Nhận xét của Giảng viên:</div>
                      <p className="italic leading-relaxed">{activeEvaluation.comments}</p>
                    </div>
                  )}


                </div>
              </div>
            )}

            {/* Condition C: Approved / Interning, awaiting lecturer grading */}
            {internship.status !== 'PENDING' && !hasPublishedScore && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#123891]" />
                  <span>Chờ Giảng viên Giám sát chấm điểm</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Đợt thực tập của bạn đang được Giảng viên Giám sát theo dõi. Giảng viên sẽ thực hiện chấm điểm và công bố kết quả tại đây.
                </p>

                {(gradingStartDate || gradingEndDate) && (
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-[#123891] space-y-0.5">
                    <div className="font-bold">Thời gian Giảng viên Giám sát chấm điểm:</div>
                    <div>
                      📅 {gradingStartDate ? formatDate(gradingStartDate) : 'Mở'} — {gradingEndDate ? formatDate(gradingEndDate) : 'Không giới hạn'}
                    </div>
                  </div>
                )}
              </div>
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

      {/* Document Viewer Modal */}
      {docModalOpen && (
        <DocumentViewerModal
          isOpen={docModalOpen}
          onClose={() => setDocModalOpen(false)}
          title="Giấy Xác Nhận Giám Sát Thực Tập Doanh Nghiệp"
        >
          <InternshipConfirmationDoc docData={docData} />
        </DocumentViewerModal>
      )}
    </div>
  );
};

export default MyInternshipPage;
