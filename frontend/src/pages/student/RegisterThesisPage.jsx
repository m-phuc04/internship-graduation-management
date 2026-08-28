import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import thesisApi from '../../api/thesisApi';
import studentApi from '../../api/studentApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

import {
  GraduationCap,
  Users,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Eye,
  BookOpen,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

const RegisterThesisPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Registration Type: 1 or 2
  const [studentCount, setStudentCount] = useState(1);

  // SV1 (Current Student)
  const [student1, setStudent1] = useState(null);
  const [loadingStudent1, setLoadingStudent1] = useState(true);

  // SV2 (Group Partner)
  const [sv2Code, setSv2Code] = useState('');
  const [student2, setStudent2] = useState(null);
  const [sv2Error, setSv2Error] = useState('');
  const [sv2Warning, setSv2Warning] = useState('');
  const [loadingSv2, setLoadingSv2] = useState(false);

  // Available Supervisors
  const [supervisors, setSupervisors] = useState([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(true);

  // Form Fields
  const [thesisTitle, setThesisTitle] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState('');

  // Modals & Submission
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingThesis, setExistingThesis] = useState(null);

  // 1. Fetch Current Student Info & Active Thesis Check
  useEffect(() => {
    const fetchCurrentStudent = async () => {
      setLoadingStudent1(true);
      try {
        const [myThesisRes, supervisorsRes] = await Promise.all([
          thesisApi.getMyThesis(),
          thesisApi.getAvailableSupervisors(),
        ]);

        if (myThesisRes.success) {
          setStudent1(myThesisRes.student);
          if (myThesisRes.data && !['REJECTED'].includes(myThesisRes.data.status)) {
            setExistingThesis(myThesisRes.data);
          }
        }

        if (supervisorsRes.success) {
          setSupervisors(supervisorsRes.data || []);
          if (supervisorsRes.data?.length > 0) {
            const firstAvailable = supervisorsRes.data.find((s) => s.isAvailable);
            if (firstAvailable) {
              setSupervisorId(firstAvailable._id);
            }
          }
        }
      } catch (err) {
        showToast(err.message || 'Không thể tải thông tin sinh viên', 'error');
      } finally {
        setLoadingStudent1(false);
        setLoadingSupervisors(false);
      }
    };

    fetchCurrentStudent();
  }, [showToast]);

  // 2. Lookup SV2 by MSSV
  const handleLookupSv2 = async () => {
    if (!sv2Code.trim()) {
      setSv2Error('Vui lòng nhập MSSV của sinh viên thứ hai');
      setStudent2(null);
      return;
    }

    setLoadingSv2(true);
    setSv2Error('');
    setSv2Warning('');

    try {
      const res = await thesisApi.lookupStudent(sv2Code.trim());
      if (res.success) {
        const { student, isSelf, isInActiveThesis, activeThesisTitle } = res.data;

        if (isSelf) {
          setSv2Error('Sinh viên 2 không được trùng với Sinh viên 1 (chính bạn)!');
          setStudent2(null);
          return;
        }

        if (isInActiveThesis) {
          setSv2Error(
            `Sinh viên ${student.fullName} (${student.studentCode}) đã tham gia một đề tài KLTN khác ("${activeThesisTitle}")!`,
          );
          setStudent2(null);
          return;
        }

        setStudent2(student);
        showToast(`Đã tìm thấy sinh viên: ${student.fullName}`, 'success');
      }
    } catch (err) {
      setSv2Error(err.message || 'Không tìm thấy sinh viên với MSSV này');
      setStudent2(null);
    } finally {
      setLoadingSv2(false);
    }
  };

  // 3. Validation before Preview / Submit
  const validateForm = () => {
    if (existingThesis) {
      showToast('Bạn đã có đề tài khóa luận đang hoạt động trong hệ thống!', 'error');
      return false;
    }

    if (!thesisTitle.trim()) {
      showToast('Vui lòng nhập tên đề tài khóa luận', 'error');
      return false;
    }

    if (!supervisorId) {
      showToast('Vui lòng chọn giảng viên hướng dẫn', 'error');
      return false;
    }

    if (studentCount === 2 && !student2) {
      showToast('Vui lòng nhập và tra cứu thông tin sinh viên thứ hai', 'error');
      return false;
    }

    return true;
  };

  const handleOpenPreview = () => {
    if (validateForm()) {
      setPreviewModalOpen(true);
    }
  };

  // 4. Submit Registration
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        studentCount,
        secondStudentId: studentCount === 2 ? student2?._id : null,
        thesisTitle: thesisTitle.trim(),
        supervisorId,
        description: description.trim() || null,
        objectives: objectives.trim() || null,
      };

      const res = await thesisApi.register(payload);
      if (res.success) {
        showToast(
          'Đăng ký đề tài Khóa luận tốt nghiệp thành công! Hồ sơ đang chờ Trưởng Bộ Môn (TBM) phê duyệt.',
          'success',
        );
        setPreviewModalOpen(false);
        navigate('/student/thesis');
      }
    } catch (err) {
      showToast(err.message || 'Đăng ký đề tài thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSupervisor = supervisors.find((s) => s._id === supervisorId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-200 shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Đăng Ký Đề Tài Khóa Luận Tốt Nghiệp (KLTN)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Học kỳ 1 — Năm học 2026 - 2027 • Khoa Công nghệ Thông tin (IUH)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              Trạng thái ban đầu: PENDING_TBM_APPROVAL
            </span>
          </div>
        </div>
      </div>

      {/* Existing Active Thesis Warning */}
      {existingThesis && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Bạn đã có đề tài khóa luận đang hoạt động!</div>
            <div className="mt-0.5 leading-relaxed text-slate-700">
              Đề tài: <strong>"{existingThesis.thesisTitle}"</strong> • Trạng thái:{' '}
              <span className="font-bold text-indigo-700">{existingThesis.status}</span>.
              Theo quy chế đào tạo, mỗi sinh viên chỉ được tham gia 1 đề tài KLTN tại một thời điểm.
            </div>
          </div>
        </div>
      )}

      {/* Registration Mode Selector */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          1. Lựa chọn hình thức thực hiện Khóa luận
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Option 1 Student */}
          <button
            type="button"
            onClick={() => {
              setStudentCount(1);
              setStudent2(null);
              setSv2Code('');
              setSv2Error('');
            }}
            className={`p-4 rounded-2xl border text-left transition ${
              studentCount === 1
                ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Khóa luận cá nhân (1 Sinh viên)
              </div>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  studentCount === 1
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300'
                }`}
              >
                {studentCount === 1 && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Thực hiện đề tài độc lập một mình dưới sự hướng dẫn của Giảng viên.
            </p>
          </button>

          {/* Option 2 Students */}
          <button
            type="button"
            onClick={() => setStudentCount(2)}
            className={`p-4 rounded-2xl border text-left transition ${
              studentCount === 2
                ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Khóa luận nhóm (2 Sinh viên)
              </div>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  studentCount === 2
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300'
                }`}
              >
                {studentCount === 2 && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ghép nhóm cùng 1 bạn sinh viên khác cùng khóa/ngành để thực hiện chung đề tài.
            </p>
          </button>
        </div>
      </div>

      {/* Student Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SV1 Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              Sinh viên 1 (Trưởng nhóm / Người đăng ký)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
              Read-Only
            </span>
          </div>

          {loadingStudent1 ? (
            <LoadingSkeleton rows={4} cols={2} />
          ) : student1 ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Họ và tên:</span>
                <strong className="text-slate-900">{student1.userId?.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Mã số SV (MSSV):</span>
                <strong className="font-mono text-indigo-700">{student1.studentCode}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Lớp:</span>
                <span className="font-mono text-slate-800">{student1.className}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Ngành học:</span>
                <span className="text-slate-800">{student1.major || 'Công nghệ Thông tin'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Điểm GPA tích lũy:</span>
                <strong className="text-slate-900 font-mono">{student1.gpa || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Tín chỉ tích lũy:</span>
                <strong className="text-slate-900 font-mono">{student1.creditsAccumulated || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Email liên hệ:</span>
                <span className="text-slate-700 truncate block">{student1.userId?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                <span className="text-slate-700">{student1.userId?.phone || '—'}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-rose-500">Không tìm thấy thông tin sinh viên</div>
          )}
        </div>

        {/* SV2 Card (Conditional) */}
        {studentCount === 2 ? (
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-600" />
                Sinh viên 2 (Thành viên nhóm)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-700">
                Cần tra cứu
              </span>
            </div>

            {/* Input & Search MSSV */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Nhập Mã số Sinh viên 2 (MSSV) <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sv2Code}
                  onChange={(e) => {
                    setSv2Code(e.target.value);
                    setSv2Error('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupSv2();
                    }
                  }}
                  placeholder="VD: 22635272..."
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={handleLookupSv2}
                  disabled={loadingSv2 || !sv2Code.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{loadingSv2 ? 'Đang tìm...' : 'Tra cứu'}</span>
                </button>
              </div>

              {sv2Error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{sv2Error}</span>
                </div>
              )}
            </div>

            {/* SV2 Details Preview */}
            {student2 ? (
              <div className="p-3.5 rounded-2xl bg-violet-50/60 border border-violet-200/80 text-xs grid grid-cols-2 gap-2 mt-2">
                <div className="col-span-2 flex items-center justify-between pb-1.5 border-b border-violet-200">
                  <span className="font-bold text-violet-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {student2.fullName}
                  </span>
                  <span className="font-mono text-violet-700 font-bold">{student2.studentCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Lớp:</span>
                  <span className="font-mono font-medium">{student2.className}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">GPA / Tín chỉ:</span>
                  <span className="font-mono font-medium">{student2.gpa} / {student2.creditsAccumulated} TC</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">Email:</span>
                  <span className="truncate block">{student2.email}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Nhập MSSV và nhấn nút "Tra cứu" để tự động điền thông tin Sinh viên 2.
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-3xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs flex flex-col items-center justify-center text-center">
            <User className="w-8 h-8 text-slate-300 mb-2" />
            <div className="font-semibold text-slate-600">Khóa luận cá nhân (1 Sinh viên)</div>
            <div className="text-[11px] mt-0.5">Nếu muốn làm cùng bạn, hãy chuyển sang tùy chọn "Khóa luận nhóm (2 Sinh viên)".</div>
          </div>
        )}
      </div>

      {/* Thesis Information Form */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          2. Thông tin Đề tài & Giảng viên Hướng dẫn
        </div>

        {/* Thesis Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Tên đề tài Khóa luận tốt nghiệp <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={thesisTitle}
            onChange={(e) => setThesisTitle(e.target.value)}
            placeholder="VD: Xây dựng hệ thống quản lý chuỗi cung ứng ứng dụng Blockchain và AI..."
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Supervisor Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Giảng viên hướng dẫn (GVHD) <span className="text-rose-500">*</span>
          </label>
          {loadingSupervisors ? (
            <div className="w-full h-10 bg-slate-100 animate-pulse rounded-xl" />
          ) : (
            <select
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">-- Chọn Giảng viên hướng dẫn --</option>
              {supervisors.map((s) => (
                <option
                  key={s._id}
                  value={s._id}
                  disabled={!s.isAvailable}
                >
                  {s.displayText} {!s.isAvailable ? '(Đã hết chỉ tiêu)' : ''}
                </option>
              ))}
            </select>
          )}
          {selectedSupervisor && (
            <div className="mt-1.5 text-[11px] text-indigo-600">
              Đang chọn: <strong>{selectedSupervisor.academicTitle} {selectedSupervisor.fullName}</strong> • Email: {selectedSupervisor.email}
            </div>
          )}
        </div>

        {/* Description & Objectives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mô tả tóm tắt nội dung đề tài
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nêu bối cảnh, lý do chọn đề tài, phạm vi và công nghệ dự kiến sử dụng..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mục tiêu & Sản phẩm dự kiến đạt được
            </label>
            <textarea
              rows={4}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="Các tính năng hoàn thành, sản phẩm web/mobile, tài liệu phân tích kỹ thuật..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/student/thesis')}
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={existingThesis || submitting}
            onClick={handleOpenPreview}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            <span>Xem trước đơn đăng ký</span>
          </button>
        </div>
      </div>

      {/* Registration Preview & Confirmation Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="Xác nhận Đăng ký Đề tài Khóa Luận Tốt Nghiệp"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-indigo-950">
            <div className="font-bold text-sm">{thesisTitle}</div>
            <div className="text-[11px] text-slate-600 mt-1">
              Hình thức: <strong>{studentCount === 1 ? 'Khóa luận cá nhân (1 SV)' : 'Khóa luận nhóm (2 SV)'}</strong> • Trạng thái khởi tạo: <span className="font-bold text-indigo-700">PENDING_TBM_APPROVAL</span>
            </div>
          </div>

          {/* Members Table */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              Danh sách thành viên đăng ký:
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between p-2 rounded-xl bg-white border border-slate-200">
                <div>
                  <strong>1. {student1?.userId?.fullName}</strong> (MSSV: {student1?.studentCode})
                  <div className="text-[11px] text-slate-400">{student1?.className} • GPA: {student1?.gpa}</div>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 self-center">Trưởng nhóm</span>
              </div>

              {studentCount === 2 && student2 && (
                <div className="flex justify-between p-2 rounded-xl bg-white border border-slate-200">
                  <div>
                    <strong>2. {student2.fullName}</strong> (MSSV: {student2.studentCode})
                    <div className="text-[11px] text-slate-400">{student2.className} • GPA: {student2.gpa}</div>
                  </div>
                  <span className="text-[10px] font-bold text-violet-700 self-center">Thành viên</span>
                </div>
              )}
            </div>
          </div>

          {/* Supervisor Info */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-400">Giảng viên hướng dẫn:</div>
            <div className="font-bold text-slate-900 mt-0.5">
              {selectedSupervisor?.academicTitle} {selectedSupervisor?.fullName} ({selectedSupervisor?.specialization})
            </div>
            <div className="text-[11px] text-slate-600">{selectedSupervisor?.email}</div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPreviewModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Chỉnh sửa lại
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang nộp...' : 'Xác nhận nộp đơn đăng ký'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RegisterThesisPage;
