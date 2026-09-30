import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import thesisApi from '../../api/thesisApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import UserNameClickable from '../../components/common/UserNameClickable';

import {
  GraduationCap,
  Users,
  User,
  BookOpen,
  Calendar,
  Clock,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Award,
  RefreshCw,
  Mail,
  Phone,
  ArrowRight,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

const MyThesisPage = () => {
  const { currentTerm } = useAcademicTerm();
  const [searchParams] = useSearchParams();
  const isEvaluationView = searchParams.get('view') === 'evaluation';
  const evaluationSectionRef = useRef(null);

  const [thesis, setThesis] = useState(null);
  const [student, setStudent] = useState(null);
  const [canRegisterNew, setCanRegisterNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchMyThesis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await thesisApi.getMyThesis({
        academicTermId: currentTerm?._id || '',
      });
      if (res.success) {
        setThesis(res.data || null);
        setStudent(res.student || null);
        setCanRegisterNew(res.canRegisterNew);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải thông tin khóa luận', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTerm?._id, showToast]);

  useEffect(() => {
    fetchMyThesis();
  }, [fetchMyThesis]);

  // Scroll to evaluation section if URL has ?view=evaluation
  useEffect(() => {
    if (isEvaluationView && evaluationSectionRef.current && !loading) {
      evaluationSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isEvaluationView, loading]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatLecturerDisplay = (title, name) => {
    if (!name) return '—';
    const trimmedName = name.trim();
    if (!title) return trimmedName;
    const trimmedTitle = title.trim();
    if (trimmedName.toLowerCase().startsWith(trimmedTitle.toLowerCase())) {
      return trimmedName;
    }
    return `${trimmedTitle} ${trimmedName}`;
  };

  const [publishedVersion, setPublishedVersion] = useState(0);

  useEffect(() => {
    const handleStorageChange = () => {
      setPublishedVersion((v) => v + 1);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const isPendingApproval = ['PENDING_SUPERVISOR_APPROVAL', 'PENDING_TBM_APPROVAL', 'PENDING_SUPERVISOR_ACCEPTANCE'].includes(thesis?.status);

  // Calculations for Thesis Evaluation
  const isStudent2 =
    thesis?.studentCount === 2 &&
    student?._id &&
    thesis?.secondStudentId &&
    (thesis.secondStudentId?._id?.toString() === student._id.toString() ||
      thesis.secondStudentId?.toString() === student._id.toString());

  const supervisorScore = (() => {
    if (isStudent2 && thesis?.scores?.student2SupervisorScore !== null && thesis?.scores?.student2SupervisorScore !== undefined) {
      return Number(thesis.scores.student2SupervisorScore);
    }
    if (!isStudent2 && thesis?.scores?.student1SupervisorScore !== null && thesis?.scores?.student1SupervisorScore !== undefined) {
      return Number(thesis.scores.student1SupervisorScore);
    }
    if (thesis?.scores?.supervisorScore !== null && thesis?.scores?.supervisorScore !== undefined) {
      return Number(thesis.scores.supervisorScore);
    }
    return null;
  })();

  const reviewer1Score =
    thesis?.scores?.reviewer1Score !== null && thesis?.scores?.reviewer1Score !== undefined
      ? Number(thesis.scores.reviewer1Score)
      : null;

  const reviewer2Score =
    thesis?.scores?.reviewer2Score !== null && thesis?.scores?.reviewer2Score !== undefined
      ? Number(thesis.scores.reviewer2Score)
      : null;

  // 2. Điểm Phản biện kín (20%) = Trung bình cộng GVPB 1 và GVPB 2
  let privateReviewerScore = null;
  if (reviewer1Score !== null && reviewer2Score !== null) {
    privateReviewerScore = Number(((reviewer1Score + reviewer2Score) / 2).toFixed(2));
  } else if (thesis?.scores?.reviewerScore !== null && thesis?.scores?.reviewerScore !== undefined) {
    privateReviewerScore = Number(thesis.scores.reviewerScore);
  } else if (reviewer1Score !== null) {
    privateReviewerScore = reviewer1Score;
  } else if (reviewer2Score !== null) {
    privateReviewerScore = reviewer2Score;
  }

  // 3. Điểm Hội đồng (30%) = Trung bình cộng các GV Hội đồng
  let councilScore = null;
  if (thesis?.scores?.councilScore !== null && thesis?.scores?.councilScore !== undefined) {
    councilScore = Number(thesis.scores.councilScore);
  } else if (Array.isArray(thesis?.scores?.councilLecturerScores) && thesis.scores.councilLecturerScores.length > 0) {
    const validScores = thesis.scores.councilLecturerScores.filter((s) => s && s.score !== null && s.score !== undefined);
    if (validScores.length > 0) {
      const sum = validScores.reduce((acc, curr) => acc + Number(curr.score), 0);
      councilScore = Number((sum / validScores.length).toFixed(2));
    }
  }

  let scoredCount = 0;
  if (supervisorScore !== null) scoredCount++;
  if (privateReviewerScore !== null && (reviewer1Score !== null && reviewer2Score !== null)) scoredCount++;
  if (councilScore !== null) scoredCount++;

  const isFullGraded = supervisorScore !== null && privateReviewerScore !== null && councilScore !== null;
  let finalScore = null;
  if (isFullGraded) {
    finalScore = Number((supervisorScore * 0.5 + privateReviewerScore * 0.2 + councilScore * 0.3).toFixed(2));
  } else if (thesis?.scores?.finalScore !== null && thesis?.scores?.finalScore !== undefined) {
    finalScore = Number(thesis.scores.finalScore);
  }

  const termId = thesis?.academicTermId?._id || thesis?.academicTermId || currentTerm?._id || 'default';

  // Check publication status configured by TBM
  let isSupervisorPublished = false;
  let isReviewerPublished = false;
  let isCouncilPublished = false;
  let isFinalPublished = false;

  try {
    let globalPub = {};
    let thesisPub = {};

    // 1. Direct global published scores
    const directGlobal =
      localStorage.getItem('tbm_global_published_scores') ||
      localStorage.getItem('tbm_published_scores_global');
    if (directGlobal) {
      try {
        const parsed = JSON.parse(directGlobal);
        if (parsed && typeof parsed === 'object') {
          globalPub = { ...globalPub, ...parsed };
        }
      } catch (e) {}
    }

    // 2. Scan all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('tbm_published_scores') || k.startsWith('tbm_global_published'))) {
        try {
          const parsed = JSON.parse(localStorage.getItem(k) || '{}');
          if (parsed && typeof parsed === 'object') {
            if (parsed['GLOBAL_ALL']) {
              globalPub = { ...globalPub, ...parsed['GLOBAL_ALL'] };
            }
            if (thesis?._id && parsed[thesis._id]) {
              thesisPub = { ...thesisPub, ...parsed[thesis._id] };
            }
            if (parsed.supervisorScore !== undefined) {
              globalPub = { ...globalPub, ...parsed };
            }
          }
        } catch (e) {}
      }
    }

    // 3. From backend database thesis object
    if (thesis?.publishedScores && typeof thesis.publishedScores === 'object') {
      thesisPub = { ...thesisPub, ...thesis.publishedScores };
    }

    isSupervisorPublished = !!(globalPub.supervisorScore || thesisPub.supervisorScore);
    isReviewerPublished = !!(
      globalPub.reviewer1Score ||
      globalPub.reviewerScore ||
      globalPub.reviewer2Score ||
      thesisPub.reviewer1Score ||
      thesisPub.reviewerScore ||
      thesisPub.reviewer2Score
    );
    isCouncilPublished = !!(globalPub.councilScore || thesisPub.councilScore);
    isFinalPublished = !!(globalPub.finalScore || thesisPub.finalScore);
  } catch (e) {
    // ignore
  }

  const hasAnyPublished = isSupervisorPublished || isReviewerPublished || isCouncilPublished || isFinalPublished;
  const isAllPublished = isSupervisorPublished && isReviewerPublished && isCouncilPublished && isFinalPublished;

  // Evaluation Overview Status Text & Style
  let evalStatusBadge = {
    text: 'Chưa công bố điểm',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  if (isAllPublished && isFullGraded) {
    evalStatusBadge = {
      text: 'Đã hoàn tất đánh giá & công bố',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  } else if (hasAnyPublished) {
    evalStatusBadge = {
      text: 'Đã công bố một phần điểm',
      className: 'bg-blue-50 text-[#102d7d] border-blue-200',
    };
  }

  // Load Council info from local storage
  let assignedCouncil = null;
  try {
    const savedThesisCouncils = localStorage.getItem(`tbm_thesis_councils_${termId}`);
    const tcMap = savedThesisCouncils ? JSON.parse(savedThesisCouncils) : {};
    const councilId = thesis?._id ? tcMap[thesis._id] : null;
    if (councilId) {
      const savedCouncils = localStorage.getItem(`tbm_councils_${termId}`);
      if (savedCouncils) {
        const parsed = JSON.parse(savedCouncils);
        assignedCouncil = parsed.find((c) => (c.id || c._id) === councilId);
      }
    }
  } catch (e) {
    // ignore
  }

  const councilFormat = assignedCouncil?.type === 'ORAL' ? 'Oral' : 'Poster';
  const councilLecturers = assignedCouncil?.lecturers || [];
  const councilScores = Array.isArray(thesis?.scores?.councilLecturerScores)
    ? thesis.scores.councilLecturerScores
    : [];

  // Build dynamic evaluators list for comments
  const evaluators = [];

  if (thesis) {
    // 1. GVHD (tên)
    const gvhdName =
      formatLecturerDisplay(thesis.supervisorId?.academicTitle, thesis.supervisorId?.userId?.fullName) ||
      'Giảng viên Hướng dẫn';
    evaluators.push({
      num: 1,
      title: `1. GVHD (${gvhdName})`,
      comment: thesis.supervisorComment?.trim(),
      isPublished: isSupervisorPublished,
    });

    // 2. GVPB 1 (tên)
    const gvpb1Name =
      formatLecturerDisplay(thesis.reviewer1Id?.academicTitle, thesis.reviewer1Id?.userId?.fullName) ||
      'Giảng viên Phản biện 1';
    evaluators.push({
      num: 2,
      title: `2. GVPB 1 (${gvpb1Name})`,
      comment: thesis.reviewer1Comment?.trim(),
      isPublished: isReviewerPublished,
    });

    // 3. GVPB 2 (tên)
    const gvpb2Obj = Array.isArray(thesis.reviewers)
      ? thesis.reviewers.find(
          (r) =>
            r.isPrivateReviewer &&
            (r.lecturerId?._id?.toString() || r.lecturerId?.toString()) !==
              (thesis.reviewer1Id?._id?.toString() || thesis.reviewer1Id?.toString())
        )
      : null;

    const gvpb2Lecturer =
      gvpb2Obj?.lecturerId ||
      (thesis.reviewer2Id &&
      !councilLecturers.some(
        (l) => (l.lecturerId?._id || l.lecturerId || l.id) === (thesis.reviewer2Id._id || thesis.reviewer2Id)
      )
        ? thesis.reviewer2Id
        : null);

    const gvpb2Name = gvpb2Lecturer
      ? formatLecturerDisplay(gvpb2Lecturer.academicTitle, gvpb2Lecturer.userId?.fullName || gvpb2Lecturer.fullName)
      : 'Giảng viên Phản biện 2';
    const gvpb2Comment = (thesis.reviewer2Comment || gvpb2Obj?.comment)?.trim();

    evaluators.push({
      num: 3,
      title: `3. GVPB 2 (${gvpb2Name})`,
      comment: gvpb2Comment,
      isPublished: isReviewerPublished,
    });

    // 4. GV Hội đồng 1 - (Loại hội đồng oral/poster) (tên)
    const hđ1 = councilLecturers[0];
    const hđ1ScoreObj = councilScores[0];
    const hđ1Title = hđ1?.academicTitle || hđ1ScoreObj?.lecturerId?.academicTitle || '';
    const hđ1RawName =
      hđ1?.fullName ||
      hđ1?.name ||
      hđ1ScoreObj?.lecturerName ||
      hđ1ScoreObj?.lecturerId?.userId?.fullName ||
      '';
    const hđ1Name = hđ1RawName ? formatLecturerDisplay(hđ1Title, hđ1RawName) : 'Giảng viên Hội đồng 1';
    const hđ1Comment = hđ1ScoreObj?.comment?.trim();

    evaluators.push({
      num: 4,
      title: `4. GV Hội đồng 1 - ${councilFormat} (${hđ1Name})`,
      comment: hđ1Comment,
      isPublished: isCouncilPublished,
    });

    // 5. GV Hội đồng 2 - (Loại hội đồng oral/poster) (tên)
    const hđ2 = councilLecturers[1];
    const hđ2ScoreObj = councilScores[1];
    const hđ2Title = hđ2?.academicTitle || hđ2ScoreObj?.lecturerId?.academicTitle || '';
    const hđ2RawName =
      hđ2?.fullName ||
      hđ2?.name ||
      hđ2ScoreObj?.lecturerName ||
      hđ2ScoreObj?.lecturerId?.userId?.fullName ||
      '';
    const hđ2Name = hđ2RawName ? formatLecturerDisplay(hđ2Title, hđ2RawName) : 'Giảng viên Hội đồng 2';
    const hđ2Comment = hđ2ScoreObj?.comment?.trim();

    evaluators.push({
      num: 5,
      title: `5. GV Hội đồng 2 - ${councilFormat} (${hđ2Name})`,
      comment: hđ2Comment,
      isPublished: isCouncilPublished,
    });
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSkeleton rows={5} cols={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  {thesis ? thesis.thesisTitle : 'Hồ Sơ Khóa Luận Tốt Nghiệp (KLTN)'}
                </h2>
                {thesis && <StatusBadge status={thesis.status} size="md" />}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-2">
                <span>Học kỳ 1 — Năm học 2026 - 2027</span>
                <span>•</span>
                <span>Khoa Công nghệ Thông tin (IUH)</span>
                {thesis && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-[#102d7d]">
                      {thesis.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMyThesis}
              className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {canRegisterNew && (
              <Link
                to="/student/thesis/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Đăng ký đề tài mới</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Pending Approval Notice Banner */}
      {thesis && isPendingApproval && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-3 shadow-2xs">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <div className="font-bold text-sm text-amber-900">
              Đang chờ Giảng viên hướng dẫn duyệt đăng ký
            </div>
            <div className="mt-0.5 leading-relaxed text-slate-700">
              Đề tài <strong>"{thesis.thesisTitle}"</strong> vừa được gửi đăng ký thành công và đang chờ{' '}
              <strong>
                {formatLecturerDisplay(
                  thesis.supervisorId?.academicTitle,
                  thesis.supervisorId?.userId?.fullName,
                )}
              </strong>{' '}
              xác nhận tiếp nhận hướng dẫn. Các chức năng nộp báo cáo tiến độ và chấm điểm sẽ mở sau khi Giảng viên duyệt.
            </div>
          </div>
        </div>
      )}

      {!thesis ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs">
          <EmptyState
            title="Bạn chưa đăng ký đề tài Khóa luận tốt nghiệp"
            description="Hãy nhấn nút 'Đăng ký đề tài mới' để chọn hình thức thực hiện (cá nhân hoặc nhóm 2 người) và chọn Giảng viên hướng dẫn."
          />
          <div className="text-center mt-4">
            <Link
              to="/student/thesis/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-200 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Đăng ký đề tài Khóa luận ngay</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Main Thesis Info & Evaluation Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Description & Objectives */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <BookOpen className="w-4 h-4 text-[#123891]" />
                <span>Nội dung đề tài nghiên cứu</span>
              </div>

              <div>
                <span className="text-slate-400 block text-xs font-medium mb-1">Mô tả tóm tắt:</span>
                <p className="text-slate-800 text-xs leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                  {thesis.description || 'Chưa cập nhật mô tả chi tiết.'}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block text-xs font-medium mb-1">Mục tiêu & Sản phẩm dự kiến:</span>
                <p className="text-slate-800 text-xs leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                  {thesis.objectives || 'Chưa cập nhật mục tiêu cụ thể.'}
                </p>
              </div>
            </div>

            {/* 2. COMPREHENSIVE EVALUATION & RESULTS SECTION */}
            <div
              ref={evaluationSectionRef}
              className={`p-6 rounded-3xl bg-white border shadow-2xs space-y-6 transition-all duration-300 ${
                isEvaluationView
                  ? 'border-[#123891]/60 ring-2 ring-indigo-500/20 shadow-indigo-100/50'
                  : 'border-slate-200/80'
              }`}
            >
              {/* Header with Title & Overall Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#123891] flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      KẾT QUẢ ĐÁNH GIÁ & ĐIỂM SỐ KHÓA LUẬN
                    </h3>
                  </div>
                </div>

                <div className="self-start sm:self-auto">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border shadow-2xs ${evalStatusBadge.className}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{evalStatusBadge.text}</span>
                  </span>
                </div>
              </div>

              {isPendingApproval ? (
                <div className="p-6 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs space-y-1.5">
                  <Clock className="w-7 h-7 text-amber-500 mx-auto" />
                  <div className="font-bold text-slate-800 text-sm">Chưa bắt đầu giai đoạn chấm điểm</div>
                  <p className="max-w-md mx-auto text-slate-600">
                    Đề tài đang ở trạng thái <strong>Chờ GVHD duyệt</strong>. Bảng điểm và kết quả đánh giá sẽ mở sau khi GVHD duyệt tiếp nhận và đến các mốc báo cáo, phản biện.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* 1. Điểm GVHD (50%) */}
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1 text-center relative flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-[#102d7d] uppercase tracking-wider">
                          1. Điểm GVHD (50%)
                        </div>
                      </div>

                      <div className="py-2">
                        {!isSupervisorPublished ? (
                          <div className="text-xs font-semibold text-slate-400 py-1 flex items-center justify-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>Chưa công bố</span>
                          </div>
                        ) : supervisorScore !== null ? (
                          <div className="font-mono text-2xl font-black text-[#123891]">
                            {supervisorScore.toFixed(1)}{' '}
                            <span className="text-xs font-normal text-slate-400">/ 10</span>
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-slate-400 italic py-1">
                            — Chưa có điểm
                          </div>
                        )}
                      </div>

                      <div className="text-[10.5px] text-slate-500 pt-1 border-t border-blue-100/70">
                        {!isSupervisorPublished ? (
                          <span className="text-slate-400">—</span>
                        ) : supervisorScore !== null ? (
                          <span className="text-emerald-600 font-medium">Đã công bố điểm</span>
                        ) : (
                          <span>Chờ GVHD chấm</span>
                        )}
                      </div>
                    </div>

                    {/* 2. Điểm PB Kín (20%) */}
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1 text-center relative flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-[#102d7d] uppercase tracking-wider">
                          2. Điểm PB Kín (20%)
                        </div>
                      </div>

                      <div className="py-2">
                        {!isReviewerPublished ? (
                          <div className="text-xs font-semibold text-slate-400 py-1 flex items-center justify-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>Chưa công bố</span>
                          </div>
                        ) : privateReviewerScore !== null ? (
                          <div className="font-mono text-2xl font-black text-[#123891]">
                            {privateReviewerScore.toFixed(1)}{' '}
                            <span className="text-xs font-normal text-slate-400">/ 10</span>
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-slate-400 italic py-1">
                            — Chưa có điểm
                          </div>
                        )}
                      </div>

                      <div className="text-[10.5px] text-slate-500 pt-1 border-t border-blue-100/70">
                        {!isReviewerPublished ? (
                          <span className="text-slate-400">—</span>
                        ) : reviewer1Score !== null && reviewer2Score !== null ? (
                          <span>GVPB 1: {reviewer1Score.toFixed(1)} | GVPB 2: {reviewer2Score.toFixed(1)}</span>
                        ) : reviewer1Score !== null ? (
                          <span>GVPB 1: {reviewer1Score.toFixed(1)} (Chờ GVPB 2)</span>
                        ) : reviewer2Score !== null ? (
                          <span>GVPB 2: {reviewer2Score.toFixed(1)} (Chờ GVPB 1)</span>
                        ) : (
                          <span>Chờ 2 GVPB chấm</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Điểm PB Hội đồng (30%) */}
                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1 text-center relative flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                          3. Điểm PB Hội đồng (30%)
                        </div>
                      </div>

                      <div className="py-2">
                        {!isCouncilPublished ? (
                          <div className="text-xs font-semibold text-slate-400 py-1 flex items-center justify-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>Chưa công bố</span>
                          </div>
                        ) : councilScore !== null ? (
                          <div className="font-mono text-2xl font-black text-amber-950">
                            {councilScore.toFixed(1)}{' '}
                            <span className="text-xs font-normal text-slate-400">/ 10</span>
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-slate-400 italic py-1">
                            — Chưa có điểm
                          </div>
                        )}
                      </div>

                      <div className="text-[10.5px] text-slate-500 pt-1 border-t border-amber-100/70">
                        {!isCouncilPublished ? (
                          <span className="text-slate-400">—</span>
                        ) : councilScores.length >= 2 && councilScores[0]?.score !== null && councilScores[1]?.score !== null ? (
                          <span>GVHĐ 1: {Number(councilScores[0].score).toFixed(1)} | GVHĐ 2: {Number(councilScores[1].score).toFixed(1)}</span>
                        ) : councilScore !== null ? (
                          <span className="text-emerald-600 font-medium">Đã công bố điểm</span>
                        ) : (
                          <span>Chờ Hội đồng chấm</span>
                        )}
                      </div>
                    </div>

                    {/* 4. Điểm Tổng Kết */}
                    <div
                      className={`p-4 rounded-2xl border space-y-1 text-center relative flex flex-col justify-between ${
                        isFinalPublished && isFullGraded && finalScore !== null
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div>
                        <div
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            isFinalPublished && isFullGraded && finalScore !== null ? 'text-emerald-100' : 'text-slate-600'
                          }`}
                        >
                          ĐIỂM TỔNG KẾT
                        </div>
                      </div>

                      <div className="py-2">
                        {!isFinalPublished ? (
                          <div className="text-xs font-semibold text-slate-400 py-1 flex items-center justify-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>Chưa công bố</span>
                          </div>
                        ) : isFullGraded && finalScore !== null ? (
                          <div className="font-mono text-2xl font-black text-white">
                            {finalScore.toFixed(2)}{' '}
                            <span className="text-xs font-normal text-emerald-200">/ 10</span>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-slate-500 py-1">
                            Chưa có điểm tổng kết
                          </div>
                        )}
                      </div>

                      <div
                        className={`text-[10.5px] pt-1 border-t ${
                          isFinalPublished && isFullGraded && finalScore !== null
                            ? 'border-emerald-500/60 text-emerald-100 font-medium'
                            : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        {!isFinalPublished ? (
                          <span className="text-slate-400">—</span>
                        ) : isFullGraded && finalScore !== null ? (
                          <span>{finalScore >= 8.5 ? 'Xuất sắc' : finalScore >= 8.0 ? 'Giỏi' : finalScore >= 7.0 ? 'Khá' : 'Đạt'}</span>
                        ) : (
                          <span>Chưa hoàn tất các cột điểm</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Feedback & Comments from Each Lecturer */}
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#123891]" />
                      <span>Chi tiết đánh giá & nhận xét của Giảng viên</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5">
                      {evaluators.map((ev, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
                        >
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                            <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#102d7d] font-bold text-[11px] flex items-center justify-center shrink-0">
                              {ev.num}
                            </div>
                            <strong className="text-xs font-bold text-slate-900">
                              {ev.title}
                            </strong>
                          </div>

                          <div>
                            <span className="text-slate-400 text-[11px] font-medium block mb-1">
                              Nhận xét:
                            </span>
                            <p className="text-slate-800 text-xs leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60 whitespace-pre-wrap">
                              {!ev.isPublished ? (
                                <span className="text-slate-400 italic">Nhận xét sẽ hiển thị khi điểm được công bố.</span>
                              ) : (
                                ev.comment || <span className="text-slate-400 italic">Chưa có nhận xét.</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Col: Supervisor & Members */}
          <div className="space-y-6">
            {/* Supervisor Lecturer Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <span>Giảng viên Hướng dẫn (GVHD)</span>
                {thesis.supervisorId && (
                  <UserNameClickable
                    user={thesis.supervisorId}
                    name="Xem hồ sơ ↗"
                    showAvatar={false}
                    className="text-[11px] font-bold text-[#123891] hover:underline"
                  />
                )}
              </div>

              {thesis.supervisorId ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Họ và tên:</span>
                    <strong className="text-slate-900 text-sm">
                      {formatLecturerDisplay(thesis.supervisorId.academicTitle, thesis.supervisorId.userId?.fullName)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Mã giảng viên:</span>
                    <span className="font-mono text-[#102d7d] font-bold">{thesis.supervisorId.lecturerCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email liên hệ:</span>
                    <span className="text-slate-700">{thesis.supervisorId.userId?.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                    <span className="text-slate-700">{thesis.supervisorId.userId?.phone || '—'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-600">Chưa chỉ định GVHD</div>
              )}
            </div>

            {/* Members Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                Thành viên thực hiện ({thesis.studentCount || 1} Sinh viên)
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Member 1 */}
                <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
                  <div className="flex justify-between items-center mb-1">
                    <UserNameClickable
                      user={thesis.studentId}
                      name={`1. ${thesis.studentId?.userId?.fullName || 'Sinh viên 1'}`}
                      showAvatar={false}
                      className="text-[#123891] font-bold hover:underline"
                    />
                    <span className="text-[10px] font-bold text-[#102d7d] bg-blue-100 px-1.5 py-0.5 rounded">
                      Trưởng nhóm
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">MSSV: {thesis.studentId?.studentCode}</div>
                  <div className="text-[11px] text-slate-500">{thesis.studentId?.userId?.email}</div>
                </div>

                {/* Member 2 if any */}
                {thesis.studentCount === 2 && thesis.secondStudentId && (
                  <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
                    <div className="flex justify-between items-center mb-1">
                      <UserNameClickable
                        user={thesis.secondStudentId}
                        name={`2. ${thesis.secondStudentId?.userId?.fullName || 'Sinh viên 2'}`}
                        showAvatar={false}
                        className="text-[#123891] font-bold hover:underline"
                      />
                      <span className="text-[10px] font-bold text-[#102d7d] bg-blue-100 px-1.5 py-0.5 rounded">
                        Thành viên
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      MSSV: {thesis.secondStudentId?.studentCode} • {thesis.secondStudentId?.className || ''}
                    </div>
                    <div className="text-[11px] text-slate-500">{thesis.secondStudentId?.userId?.email}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyThesisPage;
