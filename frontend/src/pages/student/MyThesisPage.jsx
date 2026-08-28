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

  // Calculations for Thesis Evaluation
  const supervisorScore =
    thesis?.scores?.supervisorScore !== null && thesis?.scores?.supervisorScore !== undefined
      ? Number(thesis.scores.supervisorScore)
      : null;

  const reviewer1Score =
    thesis?.scores?.reviewer1Score !== null && thesis?.scores?.reviewer1Score !== undefined
      ? Number(thesis.scores.reviewer1Score)
      : null;

  const reviewer2Score =
    thesis?.scores?.reviewer2Score !== null && thesis?.scores?.reviewer2Score !== undefined
      ? Number(thesis.scores.reviewer2Score)
      : null;

  let scoredCount = 0;
  if (supervisorScore !== null) scoredCount++;
  if (reviewer1Score !== null) scoredCount++;
  if (reviewer2Score !== null) scoredCount++;

  const isFullGraded = scoredCount === 3;
  let finalScore = null;
  if (isFullGraded) {
    finalScore = Number((supervisorScore * 0.4 + reviewer1Score * 0.3 + reviewer2Score * 0.3).toFixed(2));
  } else if (thesis?.scores?.finalScore !== null && thesis?.scores?.finalScore !== undefined) {
    finalScore = Number(thesis.scores.finalScore);
  }

  // Evaluation Overview Status Text & Style
  let evalStatusBadge = {
    text: 'Đang chờ đánh giá',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  if (scoredCount === 3) {
    evalStatusBadge = {
      text: 'Đã hoàn tất đánh giá',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  } else if (scoredCount === 2) {
    evalStatusBadge = {
      text: 'Đã có 2/3 điểm',
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
  } else if (scoredCount === 1) {
    evalStatusBadge = {
      text: 'Đã có 1/3 điểm',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    };
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
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
                    <span className="font-bold text-indigo-700">
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
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Đăng ký đề tài mới</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {!thesis ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs">
          <EmptyState
            title="Bạn chưa đăng ký đề tài Khóa luận tốt nghiệp"
            description="Hãy nhấn nút 'Đăng ký đề tài mới' để chọn hình thức thực hiện (cá nhân hoặc nhóm 2 người) và chọn Giảng viên hướng dẫn."
          />
          <div className="text-center mt-4">
            <Link
              to="/student/thesis/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition"
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
                <BookOpen className="w-4 h-4 text-indigo-600" />
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
                  ? 'border-indigo-400 ring-2 ring-indigo-500/20 shadow-indigo-100/50'
                  : 'border-slate-200/80'
              }`}
            >
              {/* Header with Title & Overall Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      KẾT QUẢ ĐÁNH GIÁ & ĐIỂM SỐ KHÓA LUẬN
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Trọng số tính điểm: <strong>GVHD (40%)</strong> + <strong>PB Kín (30%)</strong> + <strong>PB Hội đồng (30%)</strong>
                    </p>
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

              {/* 3 Component Score Columns + Final Score */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Điểm GVHD (40%) */}
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1 text-center relative flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                      1. Điểm GVHD
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold mb-2">
                      Trọng số: <span className="text-indigo-600 font-bold">40%</span>
                    </div>
                  </div>

                  <div className="py-1">
                    {supervisorScore !== null ? (
                      <div className="font-mono text-2xl font-black text-indigo-950">
                        {supervisorScore.toFixed(1)}{' '}
                        <span className="text-xs font-normal text-slate-400">/ 10</span>
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-slate-400 italic py-1">
                        — Chưa có điểm
                      </div>
                    )}
                  </div>

                  <div className="text-[10.5px] text-slate-500 pt-1 border-t border-indigo-100/70">
                    {supervisorScore !== null ? (
                      <span>Đóng góp: <strong className="text-indigo-900 font-mono">{(supervisorScore * 0.4).toFixed(2)} đ</strong></span>
                    ) : (
                      <span>Chờ GVHD chấm</span>
                    )}
                  </div>
                </div>

                {/* 2. Điểm PB Kín (30%) */}
                <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-100 space-y-1 text-center relative flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">
                      2. Điểm PB Kín
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold mb-2">
                      Trọng số: <span className="text-violet-600 font-bold">30%</span>
                    </div>
                  </div>

                  <div className="py-1">
                    {reviewer1Score !== null ? (
                      <div className="font-mono text-2xl font-black text-violet-950">
                        {reviewer1Score.toFixed(1)}{' '}
                        <span className="text-xs font-normal text-slate-400">/ 10</span>
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-slate-400 italic py-1">
                        — Chưa có điểm
                      </div>
                    )}
                  </div>

                  <div className="text-[10.5px] text-slate-500 pt-1 border-t border-violet-100/70">
                    {reviewer1Score !== null ? (
                      <span>Đóng góp: <strong className="text-violet-900 font-mono">{(reviewer1Score * 0.3).toFixed(2)} đ</strong></span>
                    ) : (
                      <span>Chờ PB Kín chấm</span>
                    )}
                  </div>
                </div>

                {/* 3. Điểm PB Hội đồng (30%) */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1 text-center relative flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                      3. Điểm PB Hội đồng
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold mb-2">
                      Trọng số: <span className="text-amber-600 font-bold">30%</span>
                    </div>
                  </div>

                  <div className="py-1">
                    {reviewer2Score !== null ? (
                      <div className="font-mono text-2xl font-black text-amber-950">
                        {reviewer2Score.toFixed(1)}{' '}
                        <span className="text-xs font-normal text-slate-400">/ 10</span>
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-slate-400 italic py-1">
                        — Chưa có điểm
                      </div>
                    )}
                  </div>

                  <div className="text-[10.5px] text-slate-500 pt-1 border-t border-amber-100/70">
                    {reviewer2Score !== null ? (
                      <span>Đóng góp: <strong className="text-amber-900 font-mono">{(reviewer2Score * 0.3).toFixed(2)} đ</strong></span>
                    ) : (
                      <span>Chờ PB Hội đồng chấm</span>
                    )}
                  </div>
                </div>

                {/* 4. Điểm Tổng Kết */}
                <div
                  className={`p-4 rounded-2xl border space-y-1 text-center relative flex flex-col justify-between ${
                    isFullGraded
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <div>
                    <div
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isFullGraded ? 'text-emerald-100' : 'text-slate-600'
                      }`}
                    >
                      ĐIỂM TỔNG KẾT
                    </div>
                    <div
                      className={`text-[10px] font-semibold mb-2 ${
                        isFullGraded ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      {isFullGraded ? 'Tổng hợp đủ 3 cột điểm' : 'Yêu cầu đủ 3 điểm'}
                    </div>
                  </div>

                  <div className="py-1">
                    {isFullGraded && finalScore !== null ? (
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
                      isFullGraded
                        ? 'border-emerald-500/60 text-emerald-100 font-medium'
                        : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    {isFullGraded ? (
                      <span>{finalScore >= 8.5 ? 'Xuất sắc' : finalScore >= 8.0 ? 'Giỏi' : finalScore >= 7.0 ? 'Khá' : 'Đạt'}</span>
                    ) : (
                      <span>Đã có <strong>{scoredCount}/3</strong> thành phần điểm</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Feedback & Comments from Each Lecturer */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>Chi tiết đánh giá & nhận xét của Giảng viên</span>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {/* Evaluator 1: GVHD */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                          1
                        </div>
                        <div>
                          <UserNameClickable
                            user={thesis.supervisorId}
                            name={`${thesis.supervisorId?.academicTitle ? thesis.supervisorId.academicTitle + ' ' : ''}${thesis.supervisorId?.userId?.fullName || 'Giảng viên Hướng dẫn'}`}
                            showAvatar={false}
                            className="font-bold text-xs text-slate-900 hover:text-indigo-600"
                          />
                          <div className="text-[11px] text-slate-500">
                            Vai trò: <span className="font-semibold text-indigo-700">GVHD (Trọng số 40%)</span>
                            {thesis.supervisorId?.lecturerCode && (
                              <span className="font-mono ml-2">• Mã GV: {thesis.supervisorId.lecturerCode}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Điểm chấm:</span>
                        <span
                          className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg border ${
                            supervisorScore !== null
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                        >
                          {supervisorScore !== null ? `${supervisorScore.toFixed(1)} / 10` : 'Chưa có điểm'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] font-medium block mb-1">
                        Nhận xét của GVHD:
                      </span>
                      <p className="text-slate-800 text-xs leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60 whitespace-pre-wrap">
                        {thesis.supervisorComment?.trim() || 'Chưa có nhận xét.'}
                      </p>
                    </div>
                  </div>

                  {/* Evaluator 2: Reviewer 1 (PB Kín) */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                          2
                        </div>
                        <div>
                          <strong className="text-xs text-slate-900 block">
                            {thesis.reviewer1Id?.academicTitle ? `${thesis.reviewer1Id.academicTitle} ` : ''}
                            {thesis.reviewer1Id?.userId?.fullName || 'Giảng viên Phản biện Kín'}
                          </strong>
                          <div className="text-[11px] text-slate-500">
                            Vai trò: <span className="font-semibold text-violet-700">GVPB Kín (Trọng số 30%)</span>
                            {thesis.reviewer1Id?.lecturerCode && (
                              <span className="font-mono ml-2">• Mã GV: {thesis.reviewer1Id.lecturerCode}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Điểm chấm:</span>
                        <span
                          className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg border ${
                            reviewer1Score !== null
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                        >
                          {reviewer1Score !== null ? `${reviewer1Score.toFixed(1)} / 10` : 'Chưa có điểm'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] font-medium block mb-1">
                        Nhận xét của GVPB Kín:
                      </span>
                      <p className="text-slate-800 text-xs leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60 whitespace-pre-wrap">
                        {thesis.reviewer1Comment?.trim() || 'Chưa có nhận xét.'}
                      </p>
                    </div>
                  </div>

                  {/* Evaluator 3: Reviewer 2 (PB Hội đồng) */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                          3
                        </div>
                        <div>
                          <strong className="text-xs text-slate-900 block">
                            {thesis.reviewer2Id?.academicTitle ? `${thesis.reviewer2Id.academicTitle} ` : ''}
                            {thesis.reviewer2Id?.userId?.fullName || 'Giảng viên Phản biện Hội đồng'}
                          </strong>
                          <div className="text-[11px] text-slate-500">
                            Vai trò: <span className="font-semibold text-amber-700">GVPB Hội đồng (Trọng số 30%)</span>
                            {thesis.reviewer2Id?.lecturerCode && (
                              <span className="font-mono ml-2">• Mã GV: {thesis.reviewer2Id.lecturerCode}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Điểm chấm:</span>
                        <span
                          className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg border ${
                            reviewer2Score !== null
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                        >
                          {reviewer2Score !== null ? `${reviewer2Score.toFixed(1)} / 10` : 'Chưa có điểm'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[11px] font-medium block mb-1">
                        Nhận xét của GVPB Hội đồng:
                      </span>
                      <p className="text-slate-800 text-xs leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60 whitespace-pre-wrap">
                        {thesis.reviewer2Comment?.trim() || 'Chưa có nhận xét.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
                    className="text-[11px] font-bold text-indigo-600 hover:underline"
                  />
                )}
              </div>

              {thesis.supervisorId ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Họ và tên:</span>
                    <strong className="text-slate-900 text-sm">
                      {thesis.supervisorId.academicTitle ? `${thesis.supervisorId.academicTitle} ` : ''}
                      {thesis.supervisorId.userId?.fullName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Mã giảng viên:</span>
                    <span className="font-mono text-indigo-700 font-bold">{thesis.supervisorId.lecturerCode}</span>
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
                <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                  <div className="flex justify-between items-center mb-1">
                    <UserNameClickable
                      user={thesis.studentId}
                      name={`1. ${thesis.studentId?.userId?.fullName || 'Sinh viên 1'}`}
                      showAvatar={false}
                      className="text-indigo-950 font-bold hover:underline"
                    />
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                      Trưởng nhóm
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">MSSV: {thesis.studentId?.studentCode}</div>
                  <div className="text-[11px] text-slate-500">{thesis.studentId?.userId?.email}</div>
                </div>

                {/* Member 2 if any */}
                {thesis.studentCount === 2 && thesis.secondStudentId && (
                  <div className="p-3 rounded-2xl bg-violet-50/60 border border-violet-100">
                    <div className="flex justify-between items-center mb-1">
                      <UserNameClickable
                        user={thesis.secondStudentId}
                        name={`2. ${thesis.secondStudentId?.userId?.fullName || 'Sinh viên 2'}`}
                        showAvatar={false}
                        className="text-violet-950 font-bold hover:underline"
                      />
                      <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">
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

            {/* Application Timestamps */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 space-y-2">
              <div className="flex justify-between">
                <span>Ngày gửi đăng ký:</span>
                <strong className="text-slate-800">{formatDate(thesis.createdAt)}</strong>
              </div>
              {thesis.approvedAt && (
                <div className="flex justify-between">
                  <span>Ngày TBM phê duyệt:</span>
                  <strong className="text-slate-800">{formatDate(thesis.approvedAt)}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyThesisPage;
