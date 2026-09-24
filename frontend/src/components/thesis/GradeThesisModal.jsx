import React, { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import thesisApi from '../../api/thesisApi';
import thesisProgressApi from '../../api/thesisProgressApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import UserNameClickable from '../common/UserNameClickable';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  User,
  Users,
  Percent,
  Lock,
  Eye,
  CheckSquare,
  Square,
  Clock,
  Calendar,
  AlertTriangle,
  Sparkles,
  FileText,
  Download,
  Code,
  ExternalLink,
  Check,
  X,
  FileCheck,
  FolderGit2,
} from 'lucide-react';

const GradeThesisModal = ({
  isOpen,
  onClose,
  thesis,
  currentLecturerId,
  defaultRoleType = null,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTabSection, setActiveTabSection] = useState('CRITERIA'); // 'REPORTS', 'CRITERIA', 'GRADE', 'INFO'
  const [activeRoleTab, setActiveRoleTab] = useState('SUPERVISOR');
  const [student1Score, setStudent1Score] = useState('');
  const [student2Score, setStudent2Score] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingCriteriaOnly, setSavingCriteriaOnly] = useState(false);
  const [error, setError] = useState('');

  // Progress Reports & Code State
  const [progressData, setProgressData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Criteria & Grading Period State
  const [criteriaList, setCriteriaList] = useState([]);
  const [checkedCriteriaIds, setCheckedCriteriaIds] = useState([]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [gradingPeriodInfo, setGradingPeriodInfo] = useState({
    hasPeriods: false,
    isActive: true,
    statusText: '',
    period: null,
  });

  const input1Ref = useRef(null);
  const input2Ref = useRef(null);
  const commentRef = useRef(null);

  const isCompleted = thesis?.status === 'COMPLETED';
  const isRejected = thesis?.status === 'REJECTED';
  const isTwoStudents = thesis?.studentCount === 2 && thesis?.secondStudentId;

  // Determine current lecturer's role on this thesis
  const lecIdStr =
    currentLecturerId?.toString() ||
    user?._id?.toString() ||
    '';

  const isSupervisor =
    thesis?.supervisorId?._id?.toString() === lecIdStr ||
    thesis?.supervisorId?.toString() === lecIdStr;

  const isReviewer1 =
    thesis?.reviewer1Id?._id?.toString() === lecIdStr ||
    thesis?.reviewer1Id?.toString() === lecIdStr ||
    (Array.isArray(thesis?.reviewers) &&
      thesis.reviewers.some(
        (r) =>
          (r.lecturerId?._id?.toString() || r.lecturerId?.toString()) ===
            lecIdStr && r.isPrivateReviewer,
      ));

  const isReviewer2 =
    thesis?.reviewer2Id?._id?.toString() === lecIdStr ||
    thesis?.reviewer2Id?.toString() === lecIdStr ||
    (Array.isArray(thesis?.reviewers) &&
      thesis.reviewers.some(
        (r) =>
          (r.lecturerId?._id?.toString() || r.lecturerId?.toString()) ===
            lecIdStr && r.isCouncilReviewer,
      ));

  const isBothReviewers = isReviewer1 && isReviewer2;

  // Fetch student submitted progress reports and files
  const fetchProgressData = async () => {
    if (!thesis?._id) return;
    setLoadingProgress(true);
    try {
      const res = await thesisProgressApi.getByThesisId(thesis._id);
      if (res.success) {
        setProgressData(res.data);
      }
    } catch (err) {
      console.warn('Cannot load thesis progress:', err.message);
    } finally {
      setLoadingProgress(false);
    }
  };

  // Fetch criteria and grading periods
  const fetchCriteriaAndPeriods = async () => {
    if (!thesis) return;
    setLoadingCriteria(true);
    try {
      const termId = thesis.academicTermId?._id || thesis.academicTermId || '';
      const [critRes, periodRes] = await Promise.all([
        thesisApi.getCriteria({ academicTermId: termId }),
        thesisApi.getGradingPeriods({ academicTermId: termId }),
      ]);

      if (critRes.success) {
        const fetchedCriteria = critRes.data || [];
        setCriteriaList(fetchedCriteria);

        // Pre-populate checked criteria from thesis if available
        if (Array.isArray(thesis.criteriaEvaluations) && thesis.criteriaEvaluations.length > 0) {
          const passedIds = thesis.criteriaEvaluations
            .filter((ce) => ce.isPassed)
            .map((ce) => (ce.criteriaId?._id || ce.criteriaId)?.toString());
          setCheckedCriteriaIds(passedIds);
        } else if (thesis.isCriteriaPassed) {
          setCheckedCriteriaIds(fetchedCriteria.map((c) => c._id.toString()));
        } else {
          setCheckedCriteriaIds([]);
        }
      }

      if (periodRes.success) {
        const periods = periodRes.data || [];
        if (periods.length === 0) {
          setGradingPeriodInfo({
            hasPeriods: false,
            isActive: true,
            statusText: '',
            period: null,
          });
        } else {
          const active = periods.find((p) => p.computedStatus === 'ACTIVE');
          const upcoming = periods.find((p) => p.computedStatus === 'UPCOMING');
          const expired = periods.filter((p) => p.computedStatus === 'EXPIRED');

          if (active) {
            setGradingPeriodInfo({
              hasPeriods: true,
              isActive: true,
              statusText: `Đợt nhập điểm "${active.name}" đang mở (đến ${new Date(active.endDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })})`,
              period: active,
            });
          } else if (upcoming) {
            setGradingPeriodInfo({
              hasPeriods: true,
              isActive: false,
              statusText: `Đợt nhập điểm "${upcoming.name}" chưa bắt đầu (bắt đầu lúc ${new Date(upcoming.startDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })})`,
              period: upcoming,
            });
          } else if (expired.length > 0) {
            setGradingPeriodInfo({
              hasPeriods: true,
              isActive: false,
              statusText: 'Đã hết thời gian nhập điểm.',
              period: expired[0],
            });
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching criteria or grading periods:', err.message);
    } finally {
      setLoadingCriteria(false);
    }
  };

  useEffect(() => {
    if (isOpen && thesis) {
      setError('');
      let initialTab = 'SUPERVISOR';
      if (defaultRoleType) {
        initialTab = defaultRoleType;
      } else if (isReviewer1 && !isSupervisor) {
        initialTab = 'REVIEWER1';
      } else if (isReviewer2 && !isSupervisor) {
        initialTab = 'REVIEWER2';
      } else if (isSupervisor) {
        initialTab = 'SUPERVISOR';
      }
      setActiveRoleTab(initialTab);
      loadRoleData(initialTab);
      fetchCriteriaAndPeriods();
      fetchProgressData();

      // If criteria not passed yet, default tab to CRITERIA; otherwise default to REPORTS or GRADE
      if (!thesis.isCriteriaPassed && initialTab === 'SUPERVISOR') {
        setActiveTabSection('CRITERIA');
      } else {
        setActiveTabSection('REPORTS');
      }
    }
  }, [isOpen, thesis, defaultRoleType, isSupervisor, isReviewer1, isReviewer2]);

  const isRoleScoreLocked =
    (activeRoleTab === 'SUPERVISOR' && thesis?.scores?.isSupervisorScoreLocked) ||
    (activeRoleTab === 'REVIEWER1' && thesis?.scores?.isReviewer1ScoreLocked) ||
    (activeRoleTab === 'REVIEWER2' && thesis?.scores?.isReviewer2ScoreLocked);

  // Criteria validation: Check if all required active criteria are checked
  const requiredCriteria = criteriaList.filter((c) => c.isRequired !== false);
  const allRequiredChecked =
    requiredCriteria.length === 0 ||
    requiredCriteria.every((rc) => checkedCriteriaIds.includes(rc._id.toString()));

  // Period validation: If supervisor and periods exist but none active -> window closed
  const isPeriodClosedForSupervisor =
    activeRoleTab === 'SUPERVISOR' &&
    gradingPeriodInfo.hasPeriods &&
    !gradingPeriodInfo.isActive;

  // Criteria incomplete for supervisor
  const isCriteriaIncompleteForSupervisor =
    activeRoleTab === 'SUPERVISOR' && !allRequiredChecked;

  const isFormLocked =
    isCompleted ||
    isRejected ||
    isRoleScoreLocked ||
    (activeRoleTab === 'SUPERVISOR' && (isPeriodClosedForSupervisor || isCriteriaIncompleteForSupervisor));

  const loadRoleData = (role) => {
    const isTwo = thesis?.studentCount === 2 && thesis?.secondStudentId;
    if (role === 'SUPERVISOR') {
      const s1 = thesis?.scores?.student1SupervisorScore ?? (!isTwo ? thesis?.scores?.supervisorScore : null);
      const s2 = thesis?.scores?.student2SupervisorScore;
      setStudent1Score(s1 != null ? String(s1) : '');
      setStudent2Score(s2 != null ? String(s2) : '');
      setComment(thesis?.supervisorComment || '');
    } else if (role === 'REVIEWER1') {
      const s1 = thesis?.scores?.student1Reviewer1Score ?? (!isTwo ? thesis?.scores?.reviewer1Score : null);
      const s2 = thesis?.scores?.student2Reviewer1Score;
      setStudent1Score(s1 != null ? String(s1) : '');
      setStudent2Score(s2 != null ? String(s2) : '');
      setComment(thesis?.reviewer1Comment || '');
    } else if (role === 'REVIEWER2') {
      const s1 = thesis?.scores?.student1Reviewer2Score ?? (!isTwo ? thesis?.scores?.reviewer2Score : null);
      const s2 = thesis?.scores?.student2Reviewer2Score;
      setStudent1Score(s1 != null ? String(s1) : '');
      setStudent2Score(s2 != null ? String(s2) : '');
      setComment(thesis?.reviewer2Comment || '');
    }
  };

  const handleTabChange = (role) => {
    setActiveRoleTab(role);
    setError('');
    loadRoleData(role);
  };

  // Toggle single criteria checkbox
  const handleToggleCriteria = (criteriaId) => {
    if (isCompleted || isRejected || (activeRoleTab === 'SUPERVISOR' && isPeriodClosedForSupervisor)) {
      return;
    }
    const idStr = criteriaId.toString();
    setCheckedCriteriaIds((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr],
    );
  };

  // Check all criteria button
  const handleCheckAllCriteria = () => {
    if (isCompleted || isRejected || (activeRoleTab === 'SUPERVISOR' && isPeriodClosedForSupervisor)) {
      return;
    }
    setCheckedCriteriaIds(criteriaList.map((c) => c._id.toString()));
  };

  // Uncheck all criteria button
  const handleUncheckAllCriteria = () => {
    if (isCompleted || isRejected || (activeRoleTab === 'SUPERVISOR' && isPeriodClosedForSupervisor)) {
      return;
    }
    setCheckedCriteriaIds([]);
  };

  // Save criteria evaluations directly
  const handleSaveCriteriaOnly = async () => {
    if (!thesis?._id) return;
    setSavingCriteriaOnly(true);
    try {
      const res = await thesisApi.evaluateCriteria(thesis._id, {
        checkedCriteriaIds,
      });
      if (res.success) {
        showToast('Đã lưu đánh giá điều kiện thực hiện KLTN!', 'success');
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      showToast(err.message || 'Lưu đánh giá điều kiện thất bại', 'error');
    } finally {
      setSavingCriteriaOnly(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  let roleTitle = 'Giảng viên đánh giá';
  let roleWeight = '30%';

  if (activeRoleTab === 'SUPERVISOR') {
    roleTitle = 'Đánh giá của Giảng viên Hướng dẫn (GVHD)';
    roleWeight = '40%';
  } else if (activeRoleTab === 'REVIEWER1') {
    roleTitle = 'Đánh giá của Giảng viên Phản biện Kín';
    roleWeight = '30%';
  } else if (activeRoleTab === 'REVIEWER2') {
    roleTitle = 'Đánh giá của Giảng viên Phản biện Hội đồng';
    roleWeight = '30%';
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isCompleted || isRejected) return;

    setError('');

    // Backend condition checks mirrored in frontend
    if (activeRoleTab === 'SUPERVISOR') {
      if (isPeriodClosedForSupervisor) {
        setError(gradingPeriodInfo.statusText || 'Đã hết thời gian nhập điểm.');
        return;
      }

      if (!allRequiredChecked) {
        setError('Chưa đủ điều kiện nhập điểm. Vui lòng hoàn thành tất cả tiêu chí đánh giá.');
        return;
      }
    }

    if (student1Score === '' && (!isTwoStudents || student2Score === '')) {
      setError('Vui lòng nhập điểm số đánh giá');
      return;
    }

    const num1 = student1Score !== '' ? Number(student1Score) : null;
    const num2 = isTwoStudents && student2Score !== '' ? Number(student2Score) : null;

    if (num1 !== null && (isNaN(num1) || num1 < 0 || num1 > 10)) {
      setError('Điểm số Sinh viên 1 phải từ 0 đến 10');
      return;
    }
    if (num2 !== null && (isNaN(num2) || num2 < 0 || num2 > 10)) {
      setError('Điểm số Sinh viên 2 phải từ 0 đến 10');
      return;
    }

    const avg = num1 !== null && num2 !== null ? Number(((num1 + num2) / 2).toFixed(2)) : (num1 ?? num2);

    setSubmitting(true);
    try {
      const res = await thesisApi.gradeThesis(thesis._id, {
        score: avg,
        student1Score: num1,
        student2Score: num2,
        comment: comment.trim() || null,
        roleType: activeRoleTab,
        checkedCriteriaIds,
      });

      if (res.success) {
        showToast('Chấm điểm và lưu đánh giá đề tài thành công!', 'success');
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Lưu điểm đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!thesis) return null;

  const progressList = progressData?.progressList || [];
  const weeksList = progressData?.weeks || [];
  const stats = progressData?.stats || { total: 0, approved: 0, avgPercentage: 0 };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isCompleted
          ? 'Chi Tiết & Đánh Giá Đề Tài Khóa Luận (Đã hoàn thành)'
          : isRejected
          ? 'Chi Tiết & Đánh Giá Đề Tài (Đã bị từ chối / FAIL)'
          : 'Chi Tiết Báo Cáo & Đánh Giá Khóa Luận'
      }
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4 text-xs">
        {/* Thesis Summary Card */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1.5 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-[#153898] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900 text-xs leading-snug">{thesis.thesisTitle}</div>
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 pt-1">
                  <span className="font-semibold text-[#0B1E48]">
                    SV1: {thesis.studentId?.userId?.fullName} ({thesis.studentId?.studentCode})
                  </span>
                  {isTwoStudents && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-[#0B1E48]">
                        SV2: {thesis.secondStudentId?.userId?.fullName} ({thesis.secondStudentId?.studentCode})
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              {allRequiredChecked ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10.5px] border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Đủ điều kiện
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-lg text-[10.5px] border border-rose-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  Chưa đủ điều kiện
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lock Notice if COMPLETED, REJECTED, or Locked */}
        {isCompleted ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 shrink-0 text-emerald-600" />
            <div>
              <div className="font-bold">Đánh giá đã hoàn thành (COMPLETED)</div>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Đề tài khóa luận này đã hoàn tất nghiệm thu và đánh giá. Không được phép chỉnh sửa điểm và nhận xét.
              </p>
            </div>
          </div>
        ) : isRejected ? (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <div>
              <div className="font-bold">Đề tài đã bị dừng quy trình (FAIL / REJECTED)</div>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {thesis.rejectionReason || 'Đề tài không đủ điều kiện hoặc quá hạn đánh giá KLTN.'}
              </p>
            </div>
          </div>
        ) : isRoleScoreLocked ? (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 shrink-0 text-amber-600" />
            <div>
              <div className="font-bold">Điểm của vai trò này đang bị khóa</div>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Vui lòng mở khóa trên danh sách đề tài nếu bạn cần chỉnh sửa điểm hoặc nhận xét.
              </p>
            </div>
          </div>
        ) : null}

        {/* 4 Main Tabs Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTabSection('REPORTS')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTabSection === 'REPORTS'
                ? 'bg-white text-[#102d7d] shadow-2xs border border-blue-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Báo Cáo & Code SV</span>
            {progressList.length > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-100 text-[#0d2a75] rounded-full text-[10px] font-mono">
                {progressList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection('CRITERIA')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTabSection === 'CRITERIA'
                ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>2. Điều Kiện KLTN</span>
            {allRequiredChecked ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection('GRADE')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTabSection === 'GRADE'
                ? 'bg-white text-[#102d7d] shadow-2xs border border-blue-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>3. Nhập Điểm & Đánh Giá</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTabSection('INFO')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTabSection === 'INFO'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>4. Thông Tin Đề Tài</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: BÁO CÁO & CODE CỦA SINH VIÊN */}
        {/* ========================================================= */}
        {activeTabSection === 'REPORTS' && (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {/* Progress summary banner */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-center">
                <div className="text-[10.5px] font-bold text-[#102d7d] uppercase">Tổng báo cáo nộp</div>
                <div className="text-base font-extrabold text-[#0B1E48] font-mono mt-0.5">
                  {loadingProgress ? '...' : progressList.length}
                </div>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                <div className="text-[10.5px] font-bold text-emerald-700 uppercase">Đã duyệt (Approved)</div>
                <div className="text-base font-extrabold text-emerald-950 font-mono mt-0.5">
                  {loadingProgress ? '...' : stats.approved || 0}
                </div>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-center">
                <div className="text-[10.5px] font-bold text-[#102d7d] uppercase">Tiến độ trung bình</div>
                <div className="text-base font-extrabold text-[#0B1E48] font-mono mt-0.5">
                  {loadingProgress ? '...' : `${stats.avgPercentage || 0}%`}
                </div>
              </div>
            </div>

            {loadingProgress ? (
              <div className="py-8 text-center text-slate-400">Đang tải danh sách báo cáo & file nộp của sinh viên...</div>
            ) : progressList.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-500 space-y-1">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700 text-xs">Chưa có báo cáo tiến độ nào</div>
                <p className="text-[11px] text-slate-400">Sinh viên chưa gửi nhật ký hoặc file báo cáo tiến độ nào trên hệ thống.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {progressList.map((rep, idx) => (
                  <div
                    key={rep._id || idx}
                    className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs hover:border-blue-300 transition"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-[#102d7d] font-bold text-[10px] font-mono">
                          Tuần {rep.weekNumber || idx + 1}
                        </span>
                        <strong className="text-slate-900 text-xs">{rep.title}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          rep.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : rep.status === 'NEEDS_REVISION'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {rep.status === 'APPROVED' ? 'Đã duyệt' : rep.status === 'NEEDS_REVISION' ? 'Cần sửa' : 'Đã nộp'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#153898] bg-blue-50 px-2 py-0.5 rounded-lg">
                          {rep.completionPercentage || 0}% Hoàn thành
                        </span>
                      </div>
                    </div>

                    {rep.description && (
                      <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {rep.description}
                      </p>
                    )}

                    {/* File Attachment & Submission Details */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                      {rep.file && rep.file.fileUrl ? (
                        <a
                          href={rep.file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#102d7d] font-bold rounded-xl border border-blue-200 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">{rep.file.originalName || rep.file.fileName || 'File báo cáo'}</span>
                          <span className="text-[10px] text-blue-400 font-normal">({formatFileSize(rep.file.size)})</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">Không có file đính kèm</span>
                      )}

                      <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                        {rep.submittedAt && (
                          <span>Nộp: {new Date(rep.submittedAt).toLocaleDateString('vi-VN')}</span>
                        )}
                        {rep.lecturerScore !== null && rep.lecturerScore !== undefined && (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Điểm: {rep.lecturerScore}/10
                          </span>
                        )}
                      </div>
                    </div>

                    {rep.lecturerComment && (
                      <div className="text-[10.5px] text-slate-600 bg-amber-50/70 border border-amber-200/80 p-2 rounded-xl">
                        <strong>GVHD nhận xét:</strong> {rep.lecturerComment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Sau khi kiểm tra báo cáo & sản phẩm, chuyển sang <strong>Tab 2: Điều Kiện KLTN</strong> để đánh giá.
              </span>
              <button
                type="button"
                onClick={() => setActiveTabSection('CRITERIA')}
                className="px-4 py-1.5 bg-[#153898] hover:bg-[#102d7d] text-white font-bold rounded-xl transition cursor-pointer text-xs flex items-center gap-1"
              >
                <span>Chuyển sang Đánh giá Điều kiện</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ĐÁNH GIÁ ĐIỀU KIỆN THỰC HIỆN KLTN (TIÊU CHÍ) */}
        {/* ========================================================= */}
        {activeTabSection === 'CRITERIA' && (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                    Tiêu chí đánh giá điều kiện thực hiện KLTN <span className="text-rose-500">*</span>
                  </span>
                </div>
                {!isCompleted && !isRejected && !isPeriodClosedForSupervisor && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCheckAllCriteria}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-200 transition cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Tick tất cả</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUncheckAllCriteria}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Bỏ chọn</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Sinh viên phải đạt <strong>TẤT CẢ</strong> các tiêu chí bắt buộc dưới đây (Demo sản phẩm, Nộp đủ code, Nộp đủ báo cáo...) thì GVHD mới được phép nhập điểm đánh giá.
              </p>

              {loadingCriteria ? (
                <div className="py-4 text-center text-slate-400 text-xs">Đang tải danh sách tiêu chí...</div>
              ) : criteriaList.length === 0 ? (
                <div className="p-3 bg-slate-50 border rounded-xl text-slate-500 text-center text-xs">
                  Chưa có tiêu chí đánh giá nào được kích hoạt trong hệ thống.
                </div>
              ) : (
                <div className="space-y-2">
                  {criteriaList.map((crit) => {
                    const isChecked = checkedCriteriaIds.includes(crit._id.toString());
                    return (
                      <label
                        key={crit._id}
                        onClick={() => handleToggleCriteria(crit._id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                            : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          disabled={isCompleted || isRejected || isPeriodClosedForSupervisor}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5 pointer-events-none"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs">{crit.name}</span>
                            {crit.isRequired !== false && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                Bắt buộc
                              </span>
                            )}
                          </div>
                          {crit.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{crit.description}</div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Status banner */}
              {allRequiredChecked ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Đã đạt tất cả tiêu chí điều kiện ({checkedCriteriaIds.length}/{requiredCriteria.length}) - Đủ điều kiện nhập điểm!</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveCriteriaOnly}
                    disabled={savingCriteriaOnly}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    {savingCriteriaOnly ? 'Đang lưu...' : 'Lưu điều kiện'}
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Chưa đủ điều kiện nhập điểm ({checkedCriteriaIds.length}/{requiredCriteria.length} tiêu chí đạt).</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveCriteriaOnly}
                    disabled={savingCriteriaOnly}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    {savingCriteriaOnly ? 'Đang lưu...' : 'Lưu tạm'}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTabSection('REPORTS')}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer text-xs"
              >
                ← Xem lại Báo cáo & Code
              </button>
              <button
                type="button"
                onClick={() => setActiveTabSection('GRADE')}
                className="px-4 py-1.5 bg-[#153898] hover:bg-[#102d7d] text-white font-bold rounded-xl transition cursor-pointer text-xs flex items-center gap-1"
              >
                <span>Chuyển sang Nhập Điểm</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: NHẬP ĐIỂM & ĐÁNH GIÁ TỔNG KẾT */}
        {/* ========================================================= */}
        {activeTabSection === 'GRADE' && (
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {/* Role Switching Tabs (If lecturer has multiple roles on this thesis) */}
            {isBothReviewers && (
              <div className="p-1.5 bg-slate-100 rounded-2xl flex items-center gap-1.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleTabChange('REVIEWER1')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
                    activeRoleTab === 'REVIEWER1'
                      ? 'bg-white text-[#102d7d] shadow-2xs border border-blue-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1. Phản biện kín (30%)
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('REVIEWER2')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
                    activeRoleTab === 'REVIEWER2'
                      ? 'bg-white text-amber-700 shadow-2xs border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2. Phản biện Hội đồng (30%)
                </button>
              </div>
            )}

            {/* Current Role Banner & Grading Period Notice */}
            <div className="space-y-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#153898]" />
                  <span className="font-bold text-slate-800 text-xs">{roleTitle}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#102d7d] font-mono font-bold text-[11px] border border-blue-100 shadow-2xs">
                  Trọng số: {roleWeight}
                </span>
              </div>

              {/* Grading Period Banner for Supervisor */}
              {activeRoleTab === 'SUPERVISOR' && gradingPeriodInfo.hasPeriods && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 border ${
                    gradingPeriodInfo.isActive
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0 text-blue-600" />
                  <div className="flex-1 font-medium">{gradingPeriodInfo.statusText}</div>
                </div>
              )}
            </div>

            {/* Warning if criteria not passed yet */}
            {activeRoleTab === 'SUPERVISOR' && !allRequiredChecked && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Chưa đạt đủ tiêu chí điều kiện ({checkedCriteriaIds.length}/{requiredCriteria.length}). Các ô nhập điểm đang bị khóa.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTabSection('CRITERIA')}
                  className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700 transition shrink-0 cursor-pointer"
                >
                  Tick tiêu chí ngay →
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Score Inputs (Student 1 and Student 2) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nhập Điểm Đánh Giá <span className="text-rose-500">*</span> (Thang điểm 10)
                </label>
                {!isFormLocked && (
                  <span className="text-[11px] text-slate-400 font-normal">
                    Nhấn <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-700 font-mono font-bold">Enter</kbd> để chuyển ô
                  </span>
                )}
              </div>

              <div className={`grid ${isTwoStudents ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {/* Student 1 Box */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-300 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0B1E48] text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#153898]" />
                      SV 1: {thesis.studentId?.userId?.fullName}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {thesis.studentId?.studentCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      ref={input1Ref}
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={student1Score}
                      onChange={(e) => {
                        if (!isFormLocked) {
                          setStudent1Score(e.target.value);
                          setError('');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (isTwoStudents && input2Ref.current) {
                            input2Ref.current.focus();
                            input2Ref.current.select();
                          } else {
                            commentRef.current?.focus();
                          }
                        }
                      }}
                      placeholder={isFormLocked ? '—' : '0.0'}
                      disabled={submitting || isFormLocked}
                      readOnly={isFormLocked}
                      className={`w-20 h-12 text-center border-2 rounded-xl text-lg font-mono font-extrabold transition ${
                        isFormLocked
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-50/40 border-blue-200 text-[#0B1E48] focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-[#153898]'
                      }`}
                      required
                    />
                    <div className="text-[11px] text-slate-500">
                      Điểm số / 10
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {isFormLocked
                          ? isCriteriaIncompleteForSupervisor
                            ? 'Khóa: Chưa đạt đủ tiêu chí'
                            : isPeriodClosedForSupervisor
                            ? 'Khóa: Hết thời gian nhập điểm'
                            : 'Không thể chỉnh sửa'
                          : isTwoStudents
                          ? 'Nhập điểm SV1 rồi ấn Enter qua SV2'
                          : 'Nhập điểm rồi ấn Enter'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Student 2 Box (if applicable) */}
                {isTwoStudents && (
                  <div className="p-3.5 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-300 transition space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0B1E48] text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#153898]" />
                        SV 2: {thesis.secondStudentId?.userId?.fullName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {thesis.secondStudentId?.studentCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        ref={input2Ref}
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={student2Score}
                        onChange={(e) => {
                          if (!isFormLocked) {
                            setStudent2Score(e.target.value);
                            setError('');
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (commentRef.current) {
                              commentRef.current.focus();
                            } else {
                              handleSubmit(e);
                            }
                          }
                        }}
                        placeholder={isFormLocked ? '—' : '0.0'}
                        disabled={submitting || isFormLocked}
                        readOnly={isFormLocked}
                        className={`w-20 h-12 text-center border-2 rounded-xl text-lg font-mono font-extrabold transition ${
                          isFormLocked
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-50/40 border-blue-200 text-[#0B1E48] focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100 focus:border-[#153898]'
                        }`}
                      />
                      <div className="text-[11px] text-slate-500">
                        Điểm số / 10
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {isFormLocked
                            ? isCriteriaIncompleteForSupervisor
                              ? 'Khóa: Chưa đạt đủ tiêu chí'
                              : isPeriodClosedForSupervisor
                              ? 'Khóa: Hết thời gian nhập điểm'
                              : 'Không thể chỉnh sửa'
                            : 'Nhập điểm SV2 rồi ấn Enter để lưu'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comment Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nhận xét & Đánh giá chi tiết <span className="text-slate-400 font-normal">{isFormLocked ? '' : '(Tùy chọn)'}</span>
              </label>
              <textarea
                ref={commentRef}
                rows={3}
                value={comment}
                onChange={(e) => {
                  if (!isFormLocked) setComment(e.target.value);
                }}
                placeholder={
                  isFormLocked
                    ? 'Chưa có nhận xét.'
                    : 'Nhập nhận xét về tính đúng đắn, phương pháp nghiên cứu, ưu điểm và hạn chế của đề tài...'
                }
                disabled={submitting || isFormLocked}
                readOnly={isFormLocked}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition resize-none ${
                  isFormLocked
                    ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153898]/20 focus:border-[#153898]'
                }`}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                {isFormLocked ? 'Đóng' : 'Hủy'}
              </button>
              {!isFormLocked && (
                <button
                  type="submit"
                  disabled={submitting || isFormLocked}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#153898] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Đang lưu...' : 'Lưu kết quả đánh giá (Enter)'}</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 4: THÔNG TIN ĐỀ TÀI & NHÓM SINH VIÊN */}
        {/* ========================================================= */}
        {activeTabSection === 'INFO' && (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {/* Topic details */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-3">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tên đề tài</label>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{thesis.thesisTitle}</div>
              </div>

              {thesis.description && (
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mô tả tóm tắt</label>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed whitespace-pre-line">
                    {thesis.description}
                  </p>
                </div>
              )}

              {thesis.objectives && (
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mục tiêu đề tài</label>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed whitespace-pre-line">
                    {thesis.objectives}
                  </p>
                </div>
              )}
            </div>

            {/* Students Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2 text-xs">
                <div className="font-bold text-[#0B1E48] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#153898]" />
                    <span>Sinh viên 1 (Trưởng nhóm)</span>
                  </div>
                  <UserNameClickable
                    user={thesis.studentId}
                    name="Hồ sơ ↗"
                    showAvatar={false}
                    className="text-[11px] font-bold text-[#153898] hover:underline"
                  />
                </div>
                <div><strong>Họ tên:</strong> {thesis.studentId?.userId?.fullName}</div>
                <div><strong>MSSV:</strong> {thesis.studentId?.studentCode}</div>
                <div><strong>Lớp:</strong> {thesis.studentId?.className || '—'}</div>
                <div><strong>GPA:</strong> {thesis.studentId?.gpa ?? '—'} • <strong>Tín chỉ:</strong> {thesis.studentId?.creditsAccumulated ?? '—'}</div>
                <div><strong>Email:</strong> {thesis.studentId?.userId?.email || '—'}</div>
              </div>

              {thesis.secondStudentId ? (
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2 text-xs">
                  <div className="font-bold text-[#0B1E48] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#153898]" />
                      <span>Sinh viên 2</span>
                    </div>
                    <UserNameClickable
                      user={thesis.secondStudentId}
                      name="Hồ sơ ↗"
                      showAvatar={false}
                      className="text-[11px] font-bold text-[#153898] hover:underline"
                    />
                  </div>
                  <div><strong>Họ tên:</strong> {thesis.secondStudentId?.userId?.fullName}</div>
                  <div><strong>MSSV:</strong> {thesis.secondStudentId?.studentCode}</div>
                  <div><strong>Lớp:</strong> {thesis.secondStudentId?.className || '—'}</div>
                  <div><strong>GPA:</strong> {thesis.secondStudentId?.gpa ?? '—'} • <strong>Tín chỉ:</strong> {thesis.secondStudentId?.creditsAccumulated ?? '—'}</div>
                  <div><strong>Email:</strong> {thesis.secondStudentId?.userId?.email || '—'}</div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs flex items-center justify-center text-slate-400">
                  Đề tài thực hiện cá nhân (1 sinh viên)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default GradeThesisModal;
