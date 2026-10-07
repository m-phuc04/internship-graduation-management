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
  UserCheck,
  UserPlus,
  UserMinus,
  Send,
  Check,
  X,
  AlertTriangle,
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

  // Invitation & Action states
  const [respondingInvitation, setRespondingInvitation] = useState(false);
  const [sendingToSupervisor, setSendingToSupervisor] = useState(false);
  const [cancelingInvite, setCancelingInvite] = useState(false);
  const [cancelingParticipation, setCancelingParticipation] = useState(false);
  const [cancelingGroup, setCancelingGroup] = useState(false);
  const [removingStudent2, setRemovingStudent2] = useState(false);

  // Invite Partner Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteSv2Code, setInviteSv2Code] = useState('');
  const [inviteStudent2, setInviteStudent2] = useState(null);
  const [inviteSv2Error, setInviteSv2Error] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState([]);
  const [searchingInviteStudents, setSearchingInviteStudents] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);

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

  // Handle SV2 Respond Invitation (ACCEPT / REJECT)
  const handleRespondInvitation = async (action) => {
    if (!thesis?._id) return;
    setRespondingInvitation(true);
    try {
      const res = await thesisApi.respondStudent2Invitation(thesis._id, { action });
      if (res.success) {
        showToast(
          action === 'ACCEPT'
            ? 'Đã xác nhận tham gia nhóm làm đề tài!'
            : 'Đã từ chối lời mời tham gia nhóm.',
          'success'
        );
        fetchMyThesis();
      }
    } catch (err) {
      showToast(err.message || 'Thao tác thất bại', 'error');
    } finally {
      setRespondingInvitation(false);
    }
  };

  // Handle SV2 Cancel Group Participation
  const handleCancelParticipation = async () => {
    if (!thesis?._id) return;
    if (
      !window.confirm(
        'Bạn có chắc chắn muốn hủy tham gia nhóm đăng ký khóa luận này không?'
      )
    ) {
      return;
    }
    setCancelingParticipation(true);
    try {
      const res = await thesisApi.cancelParticipation(thesis._id);
      if (res.success) {
        showToast('Đã hủy tham gia nhóm đăng ký khóa luận thành công!', 'success');
        fetchMyThesis();
      }
    } catch (err) {
      showToast(err.message || 'Hủy tham gia nhóm thất bại', 'error');
    } finally {
      setCancelingParticipation(false);
    }
  };

  // Handle SV1 Cancel Group Registration (Cancel whole thesis before supervisor approval)
  const handleCancelGroupRegistration = async () => {
    if (!thesis?._id) return;
    if (
      !window.confirm(
        'Bạn có chắc chắn muốn hủy đăng ký nhóm khóa luận này không? Toàn bộ thành viên sẽ được giải phóng để đăng ký lại.'
      )
    ) {
      return;
    }
    setCancelingGroup(true);
    try {
      const res = await thesisApi.cancelGroupRegistration(thesis._id);
      if (res.success) {
        showToast('Đã hủy đăng ký nhóm đề tài thành công!', 'success');
        fetchMyThesis();
      }
    } catch (err) {
      showToast(err.message || 'Hủy nhóm thất bại', 'error');
    } finally {
      setCancelingGroup(false);
    }
  };

  // Handle SV1 Remove Student 2 from Group
  const handleRemoveStudent2 = async () => {
    if (!thesis?._id) return;
    const s2Name =
      thesis.secondStudentId?.userId?.fullName ||
      thesis.secondStudentId?.studentCode ||
      'Sinh viên thứ hai';
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn rút thành viên ${s2Name} khỏi nhóm không?`
      )
    ) {
      return;
    }
    setRemovingStudent2(true);
    try {
      const res = await thesisApi.removeStudent2(thesis._id);
      if (res.success) {
        showToast(`Đã rút sinh viên ${s2Name} khỏi nhóm thành công!`, 'success');
        fetchMyThesis();
      }
    } catch (err) {
      showToast(err.message || 'Thao tác thất bại', 'error');
    } finally {
      setRemovingStudent2(false);
    }
  };

  // Handle SV1 Send Request to Supervisor
  const handleSendSupervisorRequest = async () => {
    if (!thesis?._id) return;
    setSendingToSupervisor(true);
    try {
      const res = await thesisApi.sendSupervisorRequest(thesis._id);
      if (res.success) {
        showToast('Đã gửi yêu cầu đăng ký đề tài đến Giảng viên hướng dẫn!', 'success');
        fetchMyThesis();
      }
    } catch (err) {
      showToast(err.message || 'Gửi yêu cầu thất bại', 'error');
    } finally {
      setSendingToSupervisor(false);
    }
  };

  // Handle SV1 Cancel SV2 Invite
  const handleCancelStudent2Invite = async () => {
    if (!thesis?._id) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy lời mời Sinh viên 2 này không?')) return;
    setCancelingInvite(true);
    try {
      const res = await thesisApi.cancelStudent2Invite(thesis._id);
      if (res.success) {
        showToast('Đã hủy lời mời Sinh viên 2 thành công', 'success');
        fetchMyThesis();
      }
    } catch (err) {
      showToast(err.message || 'Hủy lời mời thất bại', 'error');
    } finally {
      setCancelingInvite(false);
    }
  };

  // Search partner for modal
  const handleSearchInviteStudents = async (keyword) => {
    setInviteSv2Code(keyword);
    setInviteSv2Error('');
    if (!keyword || !keyword.trim()) {
      setInviteSearchResults([]);
      return;
    }

    setSearchingInviteStudents(true);
    try {
      const res = await thesisApi.searchStudents({ query: keyword.trim() });
      if (res.success) {
        setInviteSearchResults(res.data || []);
      }
    } catch (err) {
      console.warn('Student search error:', err.message);
    } finally {
      setSearchingInviteStudents(false);
    }
  };

  const handleSelectInvitePartner = (s) => {
    if (s.isInActiveThesis) {
      setInviteSv2Error(`Sinh viên ${s.fullName} (${s.studentCode}) đã tham gia đề tài khác!`);
      return;
    }
    setInviteStudent2(s);
    setInviteSv2Code(s.studentCode);
    setInviteSearchResults([]);
    setInviteSv2Error('');
  };

  // Handle SV1 Submit Invite SV2
  const handleConfirmInviteStudent2 = async () => {
    if (!inviteStudent2) {
      setInviteSv2Error('Vui lòng tìm và chọn Sinh viên 2');
      return;
    }
    setSubmittingInvite(true);
    try {
      const res = await thesisApi.inviteStudent2(thesis._id, {
        secondStudentId: inviteStudent2._id,
        secondStudentCode: inviteStudent2.studentCode,
      });
      if (res.success) {
        showToast(`Đã gửi lời mời tham gia nhóm đến ${inviteStudent2.fullName}!`, 'success');
        setInviteModalOpen(false);
        setInviteStudent2(null);
        setInviteSv2Code('');
        fetchMyThesis();
      }
    } catch (err) {
      showToast(err.message || 'Gửi lời mời thất bại', 'error');
    } finally {
      setSubmittingInvite(false);
    }
  };

  // Determine current student role in thesis
  const isStudent1 =
    student?._id &&
    thesis?.studentId &&
    (thesis.studentId?._id?.toString() === student._id.toString() ||
      thesis.studentId?.toString() === student._id.toString());

  const isStudent2 =
    student?._id &&
    thesis?.secondStudentId &&
    (thesis.secondStudentId?._id?.toString() === student._id.toString() ||
      thesis.secondStudentId?.toString() === student._id.toString());

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
    return name.trim();
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
  const isSupervisorApproved = ['APPROVED', 'ASSIGNED_REVIEWERS', 'IN_PROGRESS', 'SUBMITTED', 'GRADED', 'COMPLETED'].includes(thesis?.status);
  const canCancelRegistration = thesis && !isSupervisorApproved && !['REJECTED'].includes(thesis?.status);

  // Calculations for Thesis Evaluation
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

  const isAssignedPB1 = Boolean(
    thesis?.reviewer1Id ||
    (Array.isArray(thesis?.reviewers) && thesis.reviewers.some((r) => r.isPrivateReviewer && r.lecturerId))
  );
  const isAssignedPB2 = Boolean(
    thesis?.reviewer2Id ||
    (Array.isArray(thesis?.reviewers) && thesis.reviewers.some((r) => r.isCouncilReviewer && r.lecturerId))
  );

  // 2. Điểm Phản biện kín (30%):
  // - Nếu phân công 2 GVPB: trung bình cộng khi cả 2 đã chấm
  // - Nếu phân công 1 GVPB: lấy điểm của 1 GVPB đó
  let privateReviewerScore = null;
  if (isAssignedPB1 && isAssignedPB2) {
    if (reviewer1Score !== null && reviewer2Score !== null) {
      privateReviewerScore = Number(((reviewer1Score + reviewer2Score) / 2).toFixed(2));
    }
  } else if (isAssignedPB1) {
    if (reviewer1Score !== null) {
      privateReviewerScore = reviewer1Score;
    }
  } else if (isAssignedPB2) {
    if (reviewer2Score !== null) {
      privateReviewerScore = reviewer2Score;
    }
  } else if (thesis?.scores?.reviewerScore !== null && thesis?.scores?.reviewerScore !== undefined) {
    privateReviewerScore = Number(thesis.scores.reviewerScore);
  }

  // 3. Điểm Hội đồng (20%) = Trung bình cộng các GV Hội đồng
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
  if (privateReviewerScore !== null) scoredCount++;
  if (councilScore !== null) scoredCount++;

  const isFullGraded = supervisorScore !== null && privateReviewerScore !== null && councilScore !== null;
  let finalScore = null;
  if (isFullGraded) {
    finalScore = Number((supervisorScore * 0.5 + privateReviewerScore * 0.3 + councilScore * 0.2).toFixed(2));
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

  // Load Council info directly from populated thesis.councilId (MongoDB)
  const assignedCouncil =
    thesis?.councilId && typeof thesis.councilId === 'object'
      ? thesis.councilId
      : null;

  // Extract Reviewers (GVPB)
  const reviewer1 =
    thesis?.reviewer1Id ||
    (Array.isArray(thesis?.reviewers)
      ? thesis.reviewers.find((r) => r.isPrivateReviewer)?.lecturerId
      : null);

  const reviewer2 =
    thesis?.reviewer2Id ||
    (Array.isArray(thesis?.reviewers)
      ? thesis.reviewers.find(
          (r) =>
            r.isCouncilReviewer ||
            (r.isPrivateReviewer &&
              reviewer1 &&
              (r.lecturerId?._id?.toString() || r.lecturerId?.toString()) !==
                (reviewer1._id?.toString() || reviewer1.toString()))
        )?.lecturerId
      : null);

  const hasReviewers = Boolean(reviewer1 || reviewer2);

  const councilFormat = assignedCouncil
    ? (assignedCouncil.type === 'ORAL' ? ' - Oral' : ' - Poster')
    : '';
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

    // 4. GV Hội đồng 1 - (Loại hội đồng oral/poster nếu đã phân công) (tên)
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
      title: `4. GV Hội đồng 1${councilFormat} (${hđ1Name})`,
      comment: hđ1Comment,
      isPublished: isCouncilPublished,
    });

    // 5. GV Hội đồng 2 - (Loại hội đồng oral/poster nếu đã phân công) (tên)
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
      title: `5. GV Hội đồng 2${councilFormat} (${hđ2Name})`,
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#123891] to-[#1B4DA1] text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
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
                    {(thesis.startDate || thesis.academicTermId?.startDate) && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          Thời gian KLTN: {formatDate(thesis.startDate || thesis.academicTermId?.startDate)} — {formatDate(thesis.endDate || thesis.academicTermId?.endDate)}
                        </span>
                      </>
                    )}
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

      {/* 1. SV2 Pending Invitation Banner */}
      {thesis && isStudent2 && thesis.status === 'WAITING_FOR_STUDENT2_CONFIRMATION' && thesis.student2Status === 'PENDING' && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent border-2 border-amber-400 text-slate-900 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Users className="w-6 h-6 text-amber-700 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wider">
                    Lời mời tham gia nhóm KLTN
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Sinh viên {thesis.studentId?.userId?.fullName || thesis.studentId?.studentCode} ({thesis.studentId?.studentCode}) đã mời bạn tham gia nhóm đề tài
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Đề tài: <strong>"{thesis.thesisTitle}"</strong> • GVHD: <strong>{formatLecturerDisplay(thesis.supervisorId?.academicTitle, thesis.supervisorId?.userId?.fullName)}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
              <button
                onClick={() => handleRespondInvitation('ACCEPT')}
                disabled={respondingInvitation}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{respondingInvitation ? 'Đang xử lý...' : 'Xác nhận tham gia'}</span>
              </button>
              <button
                onClick={() => handleRespondInvitation('REJECT')}
                disabled={respondingInvitation}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 hover:border-rose-400 disabled:opacity-50 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Từ chối</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SV1 Waiting for SV2 Confirmation Banner */}
      {thesis && isStudent1 && thesis.status === 'WAITING_FOR_STUDENT2_CONFIRMATION' && (
        <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <div className="font-bold text-sm text-amber-900">
                Đang chờ Sinh viên 2 xác nhận tham gia nhóm
              </div>
              <div className="mt-0.5 leading-relaxed text-slate-700">
                Hệ thống đã gửi lời mời đến Sinh viên{' '}
                <strong>
                  {thesis.secondStudentId?.userId?.fullName || thesis.secondStudentId?.studentCode} ({thesis.secondStudentId?.studentCode})
                </strong>. 
                Đề tài chưa được gửi đến Giảng viên hướng dẫn. Sau khi Sinh viên 2 xác nhận, bạn sẽ có thể gửi yêu cầu đăng ký chính thức đến GVHD.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCancelStudent2Invite}
              disabled={cancelingInvite}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-semibold transition cursor-pointer text-xs"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>{cancelingInvite ? 'Đang hủy...' : 'Hủy lời mời SV2'}</span>
            </button>
            <button
              onClick={handleCancelGroupRegistration}
              disabled={cancelingGroup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-xl font-semibold transition cursor-pointer text-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>{cancelingGroup ? 'Đang hủy...' : 'Hủy đăng ký'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Ready for Supervisor Request Banner */}
      {thesis && thesis.status === 'WAITING_FOR_SUPERVISOR_REQUEST' && (
        <div className="p-5 rounded-2xl bg-blue-50/90 border border-blue-200 text-slate-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#123891] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-[#102d7d]">
                {isStudent1
                  ? thesis.student2Status === 'ACCEPTED'
                    ? 'Sinh viên 2 đã đồng ý tham gia! Nhóm đã đủ điều kiện gửi GVHD'
                    : 'Đề tài sẵn sàng gửi yêu cầu xét duyệt đến Giảng viên hướng dẫn'
                  : 'Bạn đã tham gia nhóm thành công!'}
              </div>
              <div className="mt-0.5 leading-relaxed text-slate-700">
                {isStudent1 ? (
                  thesis.student2Status === 'ACCEPTED' ? (
                    <>
                      Nhóm 2 sinh viên (<strong>{thesis.studentId?.userId?.fullName}</strong> & <strong>{thesis.secondStudentId?.userId?.fullName}</strong>) đã hoàn tất xác nhận. Hãy nhấn nút <strong>"Gửi yêu cầu GVHD"</strong> để chuyển đề tài đến GVHD xem xét.
                    </>
                  ) : (
                    <>
                      Đề tài đang thực hiện với tư cách cá nhân (1 thành viên). Bạn có thể gửi yêu cầu trực tiếp đến GVHD hoặc mời thêm thành viên thứ hai trước khi gửi.
                    </>
                  )
                ) : (
                  <>
                    Đang chờ Trưởng nhóm (<strong>{thesis.studentId?.userId?.fullName || thesis.studentId?.studentCode}</strong>) gửi yêu cầu đăng ký chính thức đến Giảng viên hướng dẫn.
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SV2 Action */}
          {isStudent2 && canCancelRegistration && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCancelParticipation}
                disabled={cancelingParticipation}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded-xl font-bold transition cursor-pointer text-xs shadow-xs"
              >
                <UserMinus className="w-4 h-4" />
                <span>{cancelingParticipation ? 'Đang xử lý...' : 'Hủy tham gia nhóm'}</span>
              </button>
            </div>
          )}

          {/* SV1 Actions */}
          {isStudent1 && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {(!thesis.secondStudentId || thesis.student2Status === 'REJECTED') && (
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold transition cursor-pointer text-xs"
                >
                  <UserPlus className="w-4 h-4 text-[#123891]" />
                  <span>Mời Sinh viên 2</span>
                </button>
              )}

              {thesis.secondStudentId && thesis.student2Status === 'ACCEPTED' && (
                <button
                  onClick={handleRemoveStudent2}
                  disabled={removingStudent2}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl font-bold transition cursor-pointer text-xs"
                  title="Rút SV2 khỏi nhóm để thực hiện 1 người hoặc mời SV khác"
                >
                  <UserMinus className="w-4 h-4" />
                  <span>{removingStudent2 ? 'Đang rút...' : 'Rút SV2'}</span>
                </button>
              )}

              <button
                onClick={handleCancelGroupRegistration}
                disabled={cancelingGroup}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded-xl font-bold transition cursor-pointer text-xs"
                title="Hủy đề tài nhóm để đăng ký lại"
              >
                <X className="w-4 h-4" />
                <span>{cancelingGroup ? 'Đang hủy...' : 'Hủy nhóm'}</span>
              </button>

              <button
                onClick={handleSendSupervisorRequest}
                disabled={sendingToSupervisor}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-sm transition cursor-pointer text-xs"
              >
                <Send className="w-4 h-4" />
                <span>{sendingToSupervisor ? 'Đang gửi...' : 'Gửi yêu cầu GVHD'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Pending Approval Notice Banner */}
      {thesis && isPendingApproval && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
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

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {isStudent2 && canCancelRegistration && (
              <button
                onClick={handleCancelParticipation}
                disabled={cancelingParticipation}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded-xl font-bold transition cursor-pointer text-xs shadow-xs"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>{cancelingParticipation ? 'Đang xử lý...' : 'Hủy tham gia nhóm'}</span>
              </button>
            )}

            {isStudent1 && canCancelRegistration && (
              <button
                onClick={handleCancelGroupRegistration}
                disabled={cancelingGroup}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded-xl font-bold transition cursor-pointer text-xs shadow-xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>{cancelingGroup ? 'Đang hủy...' : 'Hủy đăng ký nhóm'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Supervisor Rejected Banner */}
      {thesis && thesis.status === 'REJECTED' && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-xs flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-rose-900">
              Đề tài khóa luận đã bị Giảng viên từ chối
            </div>
            <div className="mt-0.5 leading-relaxed text-slate-700">
              Lý do: <span className="font-medium text-rose-800">{thesis.rejectionReason || 'Không có lý do chi tiết.'}</span>. 
              Bạn có thể nhấn nút <strong>"Đăng ký đề tài mới"</strong> để chọn đề tài khác.
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
                  ? 'border-[#123891]/60 ring-2 ring-blue-500/20 shadow-blue-100/50'
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

                    {/* 2. Điểm PB Kín (30%) */}
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1 text-center relative flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-[#102d7d] uppercase tracking-wider">
                          2. Điểm PB Kín (30%)
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
                        ) : isAssignedPB1 && isAssignedPB2 ? (
                          reviewer1Score !== null && reviewer2Score !== null ? (
                            <span>GVPB 1: {reviewer1Score.toFixed(1)} | GVPB 2: {reviewer2Score.toFixed(1)}</span>
                          ) : reviewer1Score !== null ? (
                            <span>GVPB 1: {reviewer1Score.toFixed(1)} (Chờ GVPB 2)</span>
                          ) : reviewer2Score !== null ? (
                            <span>GVPB 2: {reviewer2Score.toFixed(1)} (Chờ GVPB 1)</span>
                          ) : (
                            <span>Chờ 2 GVPB chấm</span>
                          )
                        ) : isAssignedPB1 ? (
                          reviewer1Score !== null ? (
                            <span>GVPB 1: {reviewer1Score.toFixed(1)}</span>
                          ) : (
                            <span>Chờ GVPB 1 chấm</span>
                          )
                        ) : isAssignedPB2 ? (
                          reviewer2Score !== null ? (
                            <span>GVPB 2: {reviewer2Score.toFixed(1)}</span>
                          ) : (
                            <span>Chờ GVPB 2 chấm</span>
                          )
                        ) : (
                          <span>Chưa phân công</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Điểm PB Hội đồng (20%) */}
                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1 text-center relative flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                          3. Điểm PB Hội đồng (20%)
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

          {/* Right Col: Timeline, Supervisor & Members */}
          <div className="space-y-6">
            {/* Thời gian thực hiện KLTN Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#123891]" />
                  <span>Thời gian thực hiện KLTN</span>
                </div>
                {thesis.startDate ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-[#102d7d] rounded-md">
                    GVHD đã tùy chỉnh
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                    Theo học kỳ
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <span className="text-slate-400 block text-[10.5px] font-bold uppercase">Bắt đầu</span>
                  <div className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                    {formatDate(thesis.startDate || thesis.academicTermId?.startDate)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <span className="text-slate-400 block text-[10.5px] font-bold uppercase">Kết thúc</span>
                  <div className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                    {formatDate(thesis.endDate || thesis.academicTermId?.endDate)}
                  </div>
                </div>
              </div>
            </div>

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
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <span>Thành viên thực hiện ({thesis.studentCount || 1} Sinh viên)</span>
                {isStudent1 && (!thesis.secondStudentId || thesis.student2Status === 'REJECTED') && thesis.status === 'WAITING_FOR_SUPERVISOR_REQUEST' && (
                  <button
                    onClick={() => setInviteModalOpen(true)}
                    className="text-[11px] font-bold text-[#123891] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Mời SV2</span>
                  </button>
                )}
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
                {thesis.secondStudentId ? (
                  <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                    <div className="flex justify-between items-center mb-1">
                      <UserNameClickable
                        user={thesis.secondStudentId}
                        name={`2. ${thesis.secondStudentId?.userId?.fullName || 'Sinh viên 2'}`}
                        showAvatar={false}
                        className="text-[#123891] font-bold hover:underline"
                      />
                      <div className="flex items-center gap-1.5">
                        {thesis.student2Status === 'PENDING' && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                            Chờ xác nhận
                          </span>
                        )}
                        {thesis.student2Status === 'ACCEPTED' && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                            Đã xác nhận
                          </span>
                        )}
                        {thesis.student2Status === 'REJECTED' && (
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                            Đã từ chối
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-[#102d7d] bg-blue-100 px-1.5 py-0.5 rounded">
                          Thành viên
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      MSSV: {thesis.secondStudentId?.studentCode} • {thesis.secondStudentId?.className || ''}
                    </div>
                    <div className="text-[11px] text-slate-500">{thesis.secondStudentId?.userId?.email}</div>

                    {isStudent1 && thesis.status === 'WAITING_FOR_STUDENT2_CONFIRMATION' && (
                      <div className="pt-1.5 flex justify-end">
                        <button
                          onClick={handleCancelStudent2Invite}
                          disabled={cancelingInvite}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                        >
                          {cancelingInvite ? 'Đang hủy...' : 'Hủy lời mời'}
                        </button>
                      </div>
                    )}

                    {isStudent1 && thesis.student2Status === 'ACCEPTED' && canCancelRegistration && (
                      <div className="pt-1.5 flex justify-end">
                        <button
                          onClick={handleRemoveStudent2}
                          disabled={removingStudent2}
                          className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>{removingStudent2 ? 'Đang rút...' : 'Rút SV2 khỏi nhóm'}</span>
                        </button>
                      </div>
                    )}

                    {isStudent2 && thesis.student2Status === 'ACCEPTED' && canCancelRegistration && (
                      <div className="pt-1.5 flex justify-end">
                        <button
                          onClick={handleCancelParticipation}
                          disabled={cancelingParticipation}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <UserMinus className="w-3 h-3" />
                          <span>{cancelingParticipation ? 'Đang xử lý...' : 'Hủy tham gia nhóm'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-center text-xs">
                    Chưa có Sinh viên 2 (Đề tài cá nhân 1 sinh viên)
                  </div>
                )}
              </div>
            </div>

            {/* Reviewers Lecturer Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#123891]" />
                  <span>Giảng viên Phản biện (GVPB)</span>
                </div>
              </div>

              {hasReviewers ? (
                <div className="space-y-3 text-xs">
                  {/* GVPB 1 */}
                  {reviewer1 && (
                    <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-[#102d7d] bg-blue-100 px-1.5 py-0.5 rounded">
                          GVPB 1 (Phản biện kín)
                        </span>
                        {reviewer1._id && (
                          <UserNameClickable
                            user={reviewer1}
                            name="Xem hồ sơ ↗"
                            showAvatar={false}
                            className="text-[11px] font-bold text-[#123891] hover:underline"
                          />
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Họ và tên:</span>
                        <strong className="text-slate-900 text-sm">
                          {formatLecturerDisplay(reviewer1.academicTitle, reviewer1.userId?.fullName)}
                        </strong>
                      </div>
                      {reviewer1.lecturerCode && (
                        <div>
                          <span className="text-slate-400 block text-[11px]">Mã giảng viên:</span>
                          <span className="font-mono text-[#102d7d] font-bold">{reviewer1.lecturerCode}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400 block text-[11px]">Email liên hệ:</span>
                        <span className="text-slate-700">{reviewer1.userId?.email || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                        <span className="text-slate-700">{reviewer1.userId?.phone || '—'}</span>
                      </div>
                    </div>
                  )}

                  {/* GVPB 2 */}
                  {reviewer2 && (
                    <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-[#102d7d] bg-blue-100 px-1.5 py-0.5 rounded">
                          GVPB 2 (Phản biện hội đồng)
                        </span>
                        {reviewer2._id && (
                          <UserNameClickable
                            user={reviewer2}
                            name="Xem hồ sơ ↗"
                            showAvatar={false}
                            className="text-[11px] font-bold text-[#123891] hover:underline"
                          />
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Họ và tên:</span>
                        <strong className="text-slate-900 text-sm">
                          {formatLecturerDisplay(reviewer2.academicTitle, reviewer2.userId?.fullName)}
                        </strong>
                      </div>
                      {reviewer2.lecturerCode && (
                        <div>
                          <span className="text-slate-400 block text-[11px]">Mã giảng viên:</span>
                          <span className="font-mono text-[#102d7d] font-bold">{reviewer2.lecturerCode}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400 block text-[11px]">Email liên hệ:</span>
                        <span className="text-slate-700">{reviewer2.userId?.email || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                        <span className="text-slate-700">{reviewer2.userId?.phone || '—'}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-amber-600">Chưa được phân công</div>
              )}
            </div>

            {/* Council Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#123891]" />
                  <span>Hội đồng Khóa luận Tốt nghiệp</span>
                </div>
                {assignedCouncil?.type && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      assignedCouncil.type === 'POSTER'
                        ? 'bg-blue-50 text-[#102d7d] border-blue-200'
                        : 'bg-blue-50 text-[#102d7d] border-blue-200'
                    }`}
                  >
                    {assignedCouncil.type === 'POSTER' ? 'Báo cáo Poster' : 'Báo cáo Oral'}
                  </span>
                )}
              </div>

              {assignedCouncil ? (
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tên Hội đồng:</span>
                    <strong className="text-slate-900 text-sm">
                      {assignedCouncil.name}
                    </strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Phòng / Địa điểm:</span>
                      <span className="font-semibold text-slate-800">{assignedCouncil.room || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Hình thức:</span>
                      <span className="font-semibold text-slate-800">
                        {assignedCouncil.type === 'POSTER' ? 'Poster' : 'Oral'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Ngày báo cáo:</span>
                      <span className="font-semibold text-slate-800">
                        {formatDate(assignedCouncil.reportDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Thời gian:</span>
                      <span className="font-semibold text-slate-800">
                        {assignedCouncil.reportTime ||
                          (assignedCouncil.reportStartTime && assignedCouncil.reportEndTime
                            ? `${assignedCouncil.reportStartTime} - ${assignedCouncil.reportEndTime}`
                            : '—')}
                      </span>
                    </div>
                  </div>

                  {/* Danh sách thành viên Hội đồng */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block text-[11px] font-bold uppercase mb-2">
                      Thành viên Hội đồng ({assignedCouncil.lecturers?.length || 0} Giảng viên)
                    </span>
                    <div className="space-y-2">
                      {assignedCouncil.lecturers && assignedCouncil.lecturers.length > 0 ? (
                        assignedCouncil.lecturers.map((l, idx) => {
                          const lec = l.lecturerId || l;
                          const name = formatLecturerDisplay(
                            lec.academicTitle || l.academicTitle,
                            lec.userId?.fullName || lec.fullName || l.fullName,
                          );
                          const code = lec.lecturerCode || l.lecturerCode;
                          const email = lec.userId?.email || lec.email || l.email;
                          const phone = lec.userId?.phone || lec.phone || l.phone;
                          const role = l.role && !l.role.toLowerCase().includes('chủ tịch') && !l.role.toLowerCase().includes('thư ký')
                            ? l.role
                            : `Giảng viên ${idx + 1}`;

                          return (
                            <div key={idx} className="p-2.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs space-y-0.5">
                              <div className="flex justify-between items-center mb-1">
                                <strong className="text-slate-900 font-bold">{name}</strong>
                                <span className="text-[10px] font-semibold text-[#102d7d] bg-blue-100 px-1.5 py-0.5 rounded">
                                  {role}
                                </span>
                              </div>
                              {code && (
                                <div className="text-[11px] text-slate-600 font-mono">Mã GV: {code}</div>
                              )}
                              {email && (
                                <div className="text-[11px] text-slate-500">{email}</div>
                              )}
                              {phone && (
                                <div className="text-[11px] text-slate-500">SĐT: {phone}</div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-slate-400 italic text-[11px]">Chưa có danh sách thành viên</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-600">
                  Chưa được phân công Hội đồng
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Partner Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Mời Sinh viên thứ hai</h3>
                  <p className="text-xs text-slate-500">Tìm kiếm và mời thành viên cùng làm đề tài</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setInviteModalOpen(false);
                  setInviteStudent2(null);
                  setInviteSv2Code('');
                  setInviteSv2Error('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Tìm kiếm Sinh viên 2 (MSSV hoặc Họ tên):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inviteSv2Code}
                    onChange={(e) => handleSearchInviteStudents(e.target.value)}
                    placeholder="Nhập MSSV (VD: 20012345) hoặc tên SV..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] outline-hidden"
                  />
                  {searchingInviteStudents && (
                    <div className="absolute right-3 top-2.5">
                      <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {inviteSearchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg p-1.5 space-y-1 mt-1">
                    {inviteSearchResults.map((s) => (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => handleSelectInvitePartner(s)}
                        className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                          s.isInActiveThesis
                            ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                            : 'hover:bg-blue-50 text-slate-800'
                        }`}
                      >
                        <div>
                          <span className="font-bold">{s.fullName}</span>{' '}
                          <span className="font-mono text-[11px] text-slate-500">({s.studentCode})</span>
                          <div className="text-[10px] text-slate-400">{s.className || '—'}</div>
                        </div>
                        {s.isInActiveThesis ? (
                          <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-medium">
                            Đã có đề tài
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                            Hợp lệ
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {inviteSv2Error && (
                  <div className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{inviteSv2Error}</span>
                  </div>
                )}
              </div>

              {/* Selected Partner Card */}
              {inviteStudent2 && (
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#102d7d] uppercase">
                      Sinh viên được chọn:
                    </span>
                    <button
                      type="button"
                      onClick={() => setInviteStudent2(null)}
                      className="text-slate-400 hover:text-rose-600 text-[11px] font-semibold"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{inviteStudent2.fullName}</div>
                  <div className="text-slate-600 font-mono text-xs">MSSV: {inviteStudent2.studentCode} • Lớp: {inviteStudent2.className}</div>
                  <div className="text-slate-500 text-[11px]">{inviteStudent2.email}</div>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-950 text-[11px] leading-relaxed">
                <strong>Lưu ý:</strong> Sau khi gửi lời mời, đề tài sẽ chuyển sang trạng thái <strong>"Chờ SV2 xác nhận"</strong>. Sinh viên 2 cần đăng nhập để đồng ý tham gia trước khi bạn có thể gửi yêu cầu chính thức đến Giảng viên hướng dẫn.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setInviteModalOpen(false);
                  setInviteStudent2(null);
                  setInviteSv2Code('');
                  setInviteSv2Error('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmInviteStudent2}
                disabled={submittingInvite || !inviteStudent2}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#123891] hover:bg-[#102d7d] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingInvite ? 'Đang gửi...' : 'Gửi lời mời'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyThesisPage;
