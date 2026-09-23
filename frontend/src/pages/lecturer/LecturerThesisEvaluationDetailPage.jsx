import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import thesisApi from '../../api/thesisApi';
import thesisProgressApi from '../../api/thesisProgressApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import UserNameClickable from '../../components/common/UserNameClickable';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  User,
  Users,
  Lock,
  Eye,
  CheckSquare,
  Clock,
  Calendar,
  AlertTriangle,
  FileText,
  Download,
  Code,
  Check,
  X,
  ArrowLeft,
  RefreshCw,
  FolderGit2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

const LecturerThesisEvaluationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [thesis, setThesis] = useState(null);

  const [activeTabSection, setActiveTabSection] = useState('REPORTS'); // 'REPORTS', 'CRITERIA', 'GRADE', 'INFO'
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

  // Fetch all thesis details
  const fetchThesisData = async () => {
    setLoading(true);
    try {
      const res = await thesisApi.getById(id);
      if (res.success && res.data) {
        const t = res.data;
        setThesis(t);
        loadRoleData(t, activeRoleTab);

        const termId = t.academicTermId?._id || t.academicTermId || '';

        // Fetch criteria and periods
        const [critRes, periodRes] = await Promise.all([
          thesisApi.getCriteria({ academicTermId: termId }),
          thesisApi.getGradingPeriods({ academicTermId: termId }),
        ]);

        if (critRes.success) {
          const fetchedCriteria = critRes.data || [];
          setCriteriaList(fetchedCriteria);

          if (Array.isArray(t.criteriaEvaluations) && t.criteriaEvaluations.length > 0) {
            const passedIds = t.criteriaEvaluations
              .filter((ce) => ce.isPassed)
              .map((ce) => (ce.criteriaId?._id || ce.criteriaId)?.toString());
            setCheckedCriteriaIds(passedIds);
          } else if (t.isCriteriaPassed) {
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
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải thông tin chi tiết đề tài', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProgressData = async () => {
    if (!id) return;
    setLoadingProgress(true);
    try {
      const res = await thesisProgressApi.getByThesisId(id);
      if (res.success) {
        setProgressData(res.data);
      }
    } catch (err) {
      console.warn('Cannot load thesis progress:', err.message);
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    fetchThesisData();
    fetchProgressData();
  }, [id]);

  const isCompleted = thesis?.status === 'COMPLETED';
  const isRejected = thesis?.status === 'REJECTED';
  const isTwoStudents = thesis?.studentCount === 2 && thesis?.secondStudentId;

  // Determine current lecturer's role on this thesis
  const lecIdStr = user?._id?.toString() || '';

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

  const loadRoleData = (t, role) => {
    const isTwo = t?.studentCount === 2 && t?.secondStudentId;
    if (role === 'SUPERVISOR') {
      const s1 = t?.scores?.student1SupervisorScore ?? (!isTwo ? t?.scores?.supervisorScore : null);
      const s2 = t?.scores?.student2SupervisorScore;
      setStudent1Score(s1 != null ? String(s1) : '');
      setStudent2Score(s2 != null ? String(s2) : '');
      setComment(t?.supervisorComment || '');
    } else if (role === 'REVIEWER1') {
      const s1 = t?.scores?.student1Reviewer1Score ?? (!isTwo ? t?.scores?.reviewer1Score : null);
      const s2 = t?.scores?.student2Reviewer1Score;
      setStudent1Score(s1 != null ? String(s1) : '');
      setStudent2Score(s2 != null ? String(s2) : '');
      setComment(t?.reviewer1Comment || '');
    } else if (role === 'REVIEWER2') {
      const s1 = t?.scores?.student1Reviewer2Score ?? (!isTwo ? t?.scores?.reviewer2Score : null);
      const s2 = t?.scores?.student2Reviewer2Score;
      setStudent1Score(s1 != null ? String(s1) : '');
      setStudent2Score(s2 != null ? String(s2) : '');
      setComment(t?.reviewer2Comment || '');
    }
  };

  const handleRoleTabChange = (role) => {
    setActiveRoleTab(role);
    setError('');
    loadRoleData(thesis, role);
  };

  const isRoleScoreLocked =
    (activeRoleTab === 'SUPERVISOR' && thesis?.scores?.isSupervisorScoreLocked) ||
    (activeRoleTab === 'REVIEWER1' && thesis?.scores?.isReviewer1ScoreLocked) ||
    (activeRoleTab === 'REVIEWER2' && thesis?.scores?.isReviewer2ScoreLocked);

  // Criteria validation
  const requiredCriteria = criteriaList.filter((c) => c.isRequired !== false);
  const allRequiredChecked =
    requiredCriteria.length === 0 ||
    requiredCriteria.every((rc) => checkedCriteriaIds.includes(rc._id.toString()));

  const isPeriodClosedForSupervisor =
    activeRoleTab === 'SUPERVISOR' &&
    gradingPeriodInfo.hasPeriods &&
    !gradingPeriodInfo.isActive;

  const isCriteriaIncompleteForSupervisor =
    activeRoleTab === 'SUPERVISOR' && !allRequiredChecked;

  const isFormLocked =
    isCompleted ||
    isRejected ||
    isRoleScoreLocked ||
    (activeRoleTab === 'SUPERVISOR' && (isPeriodClosedForSupervisor || isCriteriaIncompleteForSupervisor));

  // Toggle criteria checkbox
  const handleToggleCriteria = (criteriaId) => {
    if (isCompleted || isRejected || (activeRoleTab === 'SUPERVISOR' && isPeriodClosedForSupervisor)) {
      return;
    }
    const idStr = criteriaId.toString();
    setCheckedCriteriaIds((prev) =>
      prev.includes(idStr) ? prev.filter((i) => i !== idStr) : [...prev, idStr],
    );
  };

  // Check all criteria
  const handleCheckAllCriteria = () => {
    if (isCompleted || isRejected || (activeRoleTab === 'SUPERVISOR' && isPeriodClosedForSupervisor)) {
      return;
    }
    setCheckedCriteriaIds(criteriaList.map((c) => c._id.toString()));
  };

  // Uncheck all criteria
  const handleUncheckAllCriteria = () => {
    if (isCompleted || isRejected || (activeRoleTab === 'SUPERVISOR' && isPeriodClosedForSupervisor)) {
      return;
    }
    setCheckedCriteriaIds([]);
  };

  // Save criteria evaluations
  const handleSaveCriteriaOnly = async () => {
    if (!thesis?._id) return;
    setSavingCriteriaOnly(true);
    try {
      const res = await thesisApi.evaluateCriteria(thesis._id, {
        checkedCriteriaIds,
      });
      if (res.success) {
        showToast('Đã lưu đánh giá điều kiện thực hiện KLTN thành công!', 'success');
        fetchThesisData();
      }
    } catch (err) {
      showToast(err.message || 'Lưu đánh giá điều kiện thất bại', 'error');
    } finally {
      setSavingCriteriaOnly(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isCompleted || isRejected) return;

    setError('');

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
        showToast('Chấm điểm và lưu kết quả đánh giá KLTN thành công!', 'success');
        fetchThesisData();
      }
    } catch (err) {
      setError(err.message || 'Lưu điểm đánh giá thất bại');
    } finally {
      setSubmitting(false);
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

  const progressList = progressData?.progressList || [];
  const stats = progressData?.stats || { total: 0, approved: 0, avgPercentage: 0 };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton count={3} />
      </div>
    );
  }

  if (!thesis) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Không tìm thấy đề tài khóa luận</h2>
        <p className="text-xs text-slate-500">Đề tài không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Link
          to="/lecturer/theses?view=evaluation"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-indigo-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách đề tài</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/lecturer/theses?view=evaluation"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition group"
        >
          <div className="p-2 rounded-xl bg-white border border-slate-200 group-hover:border-indigo-300 group-hover:bg-indigo-50/50 transition">
            <ArrowLeft className="w-4 h-4 text-slate-600 group-hover:text-indigo-600" />
          </div>
          <span>Quay lại danh sách đánh giá KLTN</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchThesisData();
              fetchProgressData();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-200 shrink-0 mt-1">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={thesis.status} size="sm" />
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                  {isTwoStudents ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                </span>
                {allRequiredChecked ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Đã đạt điều kiện
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    Chưa đạt điều kiện
                  </span>
                )}
              </div>

              <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
                {thesis.thesisTitle}
              </h1>

              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 pt-1">
                <span className="font-semibold text-indigo-950">
                  SV1: {thesis.studentId?.userId?.fullName} ({thesis.studentId?.studentCode})
                </span>
                {isTwoStudents && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-violet-950">
                      SV2: {thesis.secondStudentId?.userId?.fullName} ({thesis.secondStudentId?.studentCode})
                    </span>
                  </>
                )}
                {thesis.academicTermId?.name && (
                  <>
                    <span>•</span>
                    <span className="text-slate-500 font-mono">Học kỳ: {thesis.academicTermId.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Score Overview Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-[10.5px] font-bold text-slate-400 uppercase">Điểm tổng kết KLTN</div>
              <div className="font-mono font-extrabold text-lg text-emerald-700 mt-0.5">
                {thesis.scores?.finalScore != null ? `${thesis.scores.finalScore} / 10` : '— / 10'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Lock Notice if COMPLETED, REJECTED, or Locked */}
      {isCompleted ? (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3 shadow-2xs">
          <Lock className="w-5 h-5 shrink-0 text-emerald-600" />
          <div>
            <div className="font-bold text-sm">Đánh giá đã hoàn thành (COMPLETED)</div>
            <p className="text-xs text-emerald-700 mt-0.5">
              Đề tài khóa luận này đã hoàn tất nghiệm thu và khóa đánh giá. Không được phép chỉnh sửa điểm và nhận xét.
            </p>
          </div>
        </div>
      ) : isRejected ? (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <div>
            <div className="font-bold text-sm">Đề tài đã bị dừng quy trình (FAIL / REJECTED)</div>
            <p className="text-xs text-rose-700 mt-0.5">
              {thesis.rejectionReason || 'Đề tài không đủ điều kiện hoặc quá hạn đánh giá KLTN.'}
            </p>
          </div>
        </div>
      ) : isRoleScoreLocked ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3 shadow-2xs">
          <Lock className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <div className="font-bold text-sm">Điểm của vai trò này đang bị khóa</div>
            <p className="text-xs text-amber-700 mt-0.5">
              Vui lòng mở khóa trên danh sách đề tài nếu bạn cần chỉnh sửa điểm hoặc nhận xét.
            </p>
          </div>
        </div>
      ) : null}

      {/* 4 Main Nav Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTabSection('REPORTS')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${activeTabSection === 'REPORTS'
              ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. Báo Cáo & Code SV</span>
          {progressList.length > 0 && (
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10.5px] font-mono">
              {progressList.length} báo cáo
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTabSection('CRITERIA')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${activeTabSection === 'CRITERIA'
              ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>2. Điều Kiện KLTN</span>
          {allRequiredChecked ? (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTabSection('GRADE')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${activeTabSection === 'GRADE'
              ? 'bg-white text-violet-700 shadow-sm border border-violet-200'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <Award className="w-4 h-4" />
          <span>3. Nhập Điểm & Đánh Giá</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabSection('INFO')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${activeTabSection === 'INFO'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <Users className="w-4 h-4" />
          <span>4. Thông Tin Đề Tài & Nhóm SV</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: BÁO CÁO & CODE CỦA SINH VIÊN */}
      {/* ========================================================= */}
      {activeTabSection === 'REPORTS' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Tổng số báo cáo nộp</div>
              <div className="text-2xl font-extrabold text-indigo-950 font-mono">
                {loadingProgress ? '...' : progressList.length}
              </div>
              <div className="text-[11px] text-slate-400">Các đợt tiến độ sinh viên đã gửi</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đã phê duyệt (Approved)</div>
              <div className="text-2xl font-extrabold text-emerald-950 font-mono">
                {loadingProgress ? '...' : stats.approved || 0}
              </div>
              <div className="text-[11px] text-slate-400">Báo cáo đạt chất lượng yêu cầu</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-violet-100 shadow-2xs space-y-1">
              <div className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">Tiến độ trung bình</div>
              <div className="text-2xl font-extrabold text-violet-950 font-mono">
                {loadingProgress ? '...' : `${stats.avgPercentage || 0}%`}
              </div>
              <div className="text-[11px] text-slate-400">Độ hoàn thiện đề tài KLTN</div>
            </div>
          </div>

          {/* Progress List */}
          {loadingProgress ? (
            <div className="p-12 text-center text-slate-400">Đang tải danh sách báo cáo & file nộp của sinh viên...</div>
          ) : progressList.length === 0 ? (
            <div className="p-12 bg-white border border-dashed border-slate-200 rounded-3xl text-center text-slate-500 space-y-2 shadow-2xs">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">Chưa có báo cáo tiến độ nào được nộp</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Sinh viên chưa nộp nhật ký hoặc file báo cáo tiến độ tuần nào trên hệ thống.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {progressList.map((rep, idx) => (
                <div
                  key={rep._id || idx}
                  className="p-5 bg-white border border-slate-200 rounded-3xl space-y-3.5 shadow-2xs hover:border-indigo-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs font-mono border border-indigo-100">
                        Tuần {rep.weekNumber || idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{rep.title}</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${rep.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : rep.status === 'NEEDS_REVISION'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                        {rep.status === 'APPROVED' ? '✓ Đã duyệt' : rep.status === 'NEEDS_REVISION' ? '⚠ Cần sửa' : 'Đã nộp'}
                      </span>
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        {rep.completionPercentage || 0}% Hoàn thành
                      </span>
                    </div>
                  </div>

                  {rep.description && (
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {rep.description}
                    </div>
                  )}

                  {/* File & Details */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                    {rep.file && rep.file.fileUrl ? (
                      <a
                        href={rep.file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 transition shadow-2xs"
                      >
                        <Download className="w-4 h-4" />
                        <span className="truncate max-w-[280px]">{rep.file.originalName || rep.file.fileName || 'Tải file báo cáo'}</span>
                        <span className="text-indigo-400 font-normal">({formatFileSize(rep.file.size)})</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Không có file đính kèm</span>
                    )}

                    <div className="text-xs text-slate-400 flex items-center gap-3 font-mono">
                      {rep.submittedAt && (
                        <span>Ngày nộp: {new Date(rep.submittedAt).toLocaleDateString('vi-VN')}</span>
                      )}
                      {rep.lecturerScore !== null && rep.lecturerScore !== undefined && (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          Điểm tiến độ: {rep.lecturerScore}/10
                        </span>
                      )}
                    </div>
                  </div>

                  {rep.lecturerComment && (
                    <div className="text-xs text-slate-700 bg-amber-50/80 border border-amber-200 p-3 rounded-xl space-y-0.5">
                      <strong className="text-amber-900">GVHD nhận xét tiến độ:</strong>
                      <p className="text-slate-600 mt-0.5">{rep.lecturerComment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bottom Action Nav */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Đã kiểm tra xong báo cáo & sản phẩm của sinh viên? Chuyển sang <strong>Tab 2: Điều Kiện KLTN</strong> để đánh giá.
            </span>
            <button
              type="button"
              onClick={() => setActiveTabSection('CRITERIA')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer text-xs flex items-center gap-1.5 shadow-xs"
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
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Tiêu chí đánh giá điều kiện thực hiện KLTN <span className="text-rose-500">*</span></span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sinh viên phải đạt <strong>TẤT CẢ</strong> các tiêu chí bắt buộc dưới đây (Demo sản phẩm, Nộp đủ code, Nộp đủ báo cáo...) thì GVHD mới được phép nhập điểm đánh giá.
                </p>
              </div>

              {!isCompleted && !isRejected && !isPeriodClosedForSupervisor && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCheckAllCriteria}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition cursor-pointer shadow-2xs"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Tick tất cả</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleUncheckAllCriteria}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Bỏ chọn</span>
                  </button>
                </div>
              )}
            </div>

            {loadingCriteria ? (
              <div className="py-8 text-center text-slate-400 text-xs">Đang tải danh sách tiêu chí...</div>
            ) : criteriaList.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed rounded-2xl text-slate-500 text-center text-xs">
                Chưa có tiêu chí đánh giá nào được kích hoạt trong hệ thống.
              </div>
            ) : (
              <div className="space-y-3">
                {criteriaList.map((crit) => {
                  const isChecked = checkedCriteriaIds.includes(crit._id.toString());
                  return (
                    <label
                      key={crit._id}
                      onClick={() => handleToggleCriteria(crit._id)}
                      className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 transition cursor-pointer select-none ${isChecked
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-2xs'
                          : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => { }}
                        disabled={isCompleted || isRejected || isPeriodClosedForSupervisor}
                        className="w-5 h-5 text-emerald-600 rounded-lg border-slate-300 focus:ring-emerald-500 mt-0.5 pointer-events-none"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{crit.name}</span>
                          {crit.isRequired !== false && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                              Bắt buộc
                            </span>
                          )}
                        </div>
                        {crit.description && (
                          <div className="text-xs text-slate-500 mt-1">{crit.description}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Status & Save Button */}
            {allRequiredChecked ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Đã đạt tất cả tiêu chí điều kiện ({checkedCriteriaIds.length}/{requiredCriteria.length}) - Đủ điều kiện nhập điểm!</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCriteriaOnly}
                  disabled={savingCriteriaOnly}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shrink-0 shadow-xs"
                >
                  {savingCriteriaOnly ? 'Đang lưu...' : 'Lưu điều kiện'}
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 font-semibold">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Chưa đủ điều kiện nhập điểm ({checkedCriteriaIds.length}/{requiredCriteria.length} tiêu chí đạt).</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCriteriaOnly}
                  disabled={savingCriteriaOnly}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer shrink-0"
                >
                  {savingCriteriaOnly ? 'Đang lưu...' : 'Lưu tạm'}
                </button>
              </div>
            )}
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTabSection('REPORTS')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer text-xs"
            >
              ← Xem lại Báo cáo & Code
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSection('GRADE')}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition cursor-pointer text-xs flex items-center gap-1.5 shadow-xs"
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-2xs">
            {/* Role Switching Tabs (If lecturer has multiple roles on this thesis) */}
            {isBothReviewers && (
              <div className="p-1.5 bg-slate-100 rounded-2xl flex items-center gap-2 border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleRoleTabChange('REVIEWER1')}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer ${activeRoleTab === 'REVIEWER1'
                      ? 'bg-white text-violet-700 shadow-2xs border border-violet-200'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  1. Phản biện kín (30%)
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleTabChange('REVIEWER2')}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer ${activeRoleTab === 'REVIEWER2'
                      ? 'bg-white text-amber-700 shadow-2xs border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  2. Phản biện Hội đồng (30%)
                </button>
              </div>
            )}

            {/* Current Role Banner & Grading Period Notice */}
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-slate-900 text-sm">{roleTitle}</span>
                </div>
                <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-mono font-bold text-xs border border-indigo-100 shadow-2xs">
                  Trọng số: {roleWeight}
                </span>
              </div>

              {/* Grading Period Banner for Supervisor */}
              {activeRoleTab === 'SUPERVISOR' && gradingPeriodInfo.hasPeriods && (
                <div
                  className={`p-4 rounded-2xl text-xs flex items-center gap-3 border ${gradingPeriodInfo.isActive
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                >
                  <Clock className="w-5 h-5 shrink-0 text-blue-600" />
                  <div className="flex-1 font-medium text-xs">{gradingPeriodInfo.statusText}</div>
                </div>
              )}
            </div>

            {/* Warning if criteria not passed yet */}
            {activeRoleTab === 'SUPERVISOR' && !allRequiredChecked && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>
                    Chưa đạt đủ tiêu chí điều kiện ({checkedCriteriaIds.length}/{requiredCriteria.length}). Ô nhập điểm đang bị khóa.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTabSection('CRITERIA')}
                  className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition shrink-0 cursor-pointer shadow-xs"
                >
                  Tick tiêu chí ngay →
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Score Inputs (Student 1 and Student 2) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Nhập Điểm Đánh Giá <span className="text-rose-500">*</span> (Thang điểm 10)
                </label>
                {!isFormLocked && (
                  <span className="text-xs text-slate-400 font-normal">
                    Nhấn <kbd className="px-2 py-0.5 bg-slate-200 rounded text-slate-700 font-mono font-bold">Enter</kbd> để chuyển ô
                  </span>
                )}
              </div>

              <div className={`grid ${isTwoStudents ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {/* Student 1 Box */}
                <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-300 transition space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 text-xs flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      SV 1: {thesis.studentId?.userId?.fullName}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
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
                      className={`w-24 h-14 text-center border-2 rounded-2xl text-xl font-mono font-extrabold transition ${isFormLocked
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-50/40 border-indigo-200 text-indigo-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600'
                        }`}
                      required
                    />
                    <div className="text-xs text-slate-500">
                      Điểm số / 10
                      <span className="block text-[11px] text-slate-400 font-normal">
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
                  <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-300 transition space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-violet-900 text-xs flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                        SV 2: {thesis.secondStudentId?.userId?.fullName}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
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
                        className={`w-24 h-14 text-center border-2 rounded-2xl text-xl font-mono font-extrabold transition ${isFormLocked
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-violet-50/40 border-violet-200 text-violet-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100 focus:border-violet-600'
                          }`}
                      />
                      <div className="text-xs text-slate-500">
                        Điểm số / 10
                        <span className="block text-[11px] text-slate-400 font-normal">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nhận xét & Đánh giá chi tiết <span className="text-slate-400 font-normal">{isFormLocked ? '' : '(Tùy chọn)'}</span>
              </label>
              <textarea
                ref={commentRef}
                rows={4}
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
                className={`w-full p-4 border rounded-2xl text-xs transition resize-none ${isFormLocked
                    ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                  }`}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link
                to="/lecturer/theses?view=evaluation"
                className="px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer text-xs"
              >
                Quay lại danh sách
              </Link>
              {!isFormLocked && (
                <button
                  type="submit"
                  disabled={submitting || isFormLocked}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Đang lưu kết quả...' : 'Lưu kết quả đánh giá (Enter)'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* TAB 4: THÔNG TIN ĐỀ TÀI & NHÓM SINH VIÊN */}
      {/* ========================================================= */}
      {activeTabSection === 'INFO' && (
        <div className="space-y-6">
          {/* Topic description */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-2xs">
            <div>
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Tên đề tài KLTN</label>
              <div className="text-base font-bold text-slate-900 mt-1">{thesis.thesisTitle}</div>
            </div>

            {thesis.description && (
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Mô tả tóm tắt</label>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {thesis.description}
                </p>
              </div>
            )}

            {thesis.objectives && (
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Mục tiêu & Yêu cầu đề tài</label>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {thesis.objectives}
                </p>
              </div>
            )}
          </div>

          {/* Student Profile Cards */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
              Thông tin sinh viên thực hiện
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-indigo-100 space-y-2.5 text-xs shadow-2xs">
                <div className="font-bold text-indigo-950 flex items-center justify-between border-b border-indigo-50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span>Sinh viên 1 (Trưởng nhóm)</span>
                  </div>
                  <UserNameClickable
                    user={thesis.studentId}
                    name="Xem hồ sơ ↗"
                    showAvatar={false}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  />
                </div>
                <div><strong>Họ tên:</strong> {thesis.studentId?.userId?.fullName}</div>
                <div><strong>MSSV:</strong> {thesis.studentId?.studentCode}</div>
                <div><strong>Lớp:</strong> {thesis.studentId?.className || '—'}</div>
                <div><strong>Ngành:</strong> {thesis.studentId?.major || thesis.studentId?.department || '—'}</div>
                <div><strong>GPA:</strong> {thesis.studentId?.gpa ?? '—'} • <strong>Tín chỉ:</strong> {thesis.studentId?.creditsAccumulated ?? '—'}</div>
                <div><strong>Email:</strong> {thesis.studentId?.userId?.email || '—'}</div>
              </div>

              {thesis.secondStudentId ? (
                <div className="p-5 rounded-3xl bg-white border border-violet-100 space-y-2.5 text-xs shadow-2xs">
                  <div className="font-bold text-violet-950 flex items-center justify-between border-b border-violet-50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                      <span>Sinh viên 2</span>
                    </div>
                    <UserNameClickable
                      user={thesis.secondStudentId}
                      name="Xem hồ sơ ↗"
                      showAvatar={false}
                      className="text-xs font-bold text-violet-600 hover:underline"
                    />
                  </div>
                  <div><strong>Họ tên:</strong> {thesis.secondStudentId?.userId?.fullName}</div>
                  <div><strong>MSSV:</strong> {thesis.secondStudentId?.studentCode}</div>
                  <div><strong>Lớp:</strong> {thesis.secondStudentId?.className || '—'}</div>
                  <div><strong>Ngành:</strong> {thesis.secondStudentId?.major || thesis.secondStudentId?.department || '—'}</div>
                  <div><strong>GPA:</strong> {thesis.secondStudentId?.gpa ?? '—'} • <strong>Tín chỉ:</strong> {thesis.secondStudentId?.creditsAccumulated ?? '—'}</div>
                  <div><strong>Email:</strong> {thesis.secondStudentId?.userId?.email || '—'}</div>
                </div>
              ) : (
                <div className="p-5 rounded-3xl bg-white border border-dashed border-slate-200 text-xs flex items-center justify-center text-slate-400">
                  Đề tài thực hiện cá nhân (1 sinh viên)
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerThesisEvaluationDetailPage;
