import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import evaluationApi from '../../api/evaluationApi';
import { useToast } from '../../context/ToastContext';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import IUHLogo from '../../components/common/IUHLogo';
import Footer from '../../components/layout/Footer';

import {
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Printer,
  FileText,
  Award,
  Users,
  Briefcase,
  CheckSquare,
  Square,
  HelpCircle,
} from 'lucide-react';

import InternshipEvaluationDoc from '../../components/documents/InternshipEvaluationDoc';
import DocumentViewerModal from '../../components/documents/DocumentViewerModal';

const COMPANY_SIZE_OPTIONS = [
  'Từ dưới 30 người',
  'Từ 30 đến 50 người',
  'Từ 50 đến 100 người',
  'Trên 100 người',
];

const WORK_FIELD_OPTIONS = [
  'Quản trị mạng',
  'Quản trị máy chủ',
  'Hỗ trợ người dùng',
  'Lập trình',
  'Khác',
];

const TEAMWORK_OPTIONS = [
  'Đồng ý',
  'Xuất sắc',
  'Tốt',
  'Trung bình',
  'Yếu',
  'Ý kiến khác',
];

const numberToWords = (num) => {
  if (num === null || num === undefined || num === '' || isNaN(num)) return '';
  const val = Number(num);
  if (val < 0 || val > 10) return '';
  const words = [
    'Không',
    'Một',
    'Hai',
    'Ba',
    'Bốn',
    'Năm',
    'Sáu',
    'Bảy',
    'Tám',
    'Chín',
    'Mười',
  ];
  const whole = Math.floor(val);
  const decimal = Math.round((val - whole) * 10);
  if (decimal > 0) {
    return `${words[whole] || whole} phẩy ${words[decimal] || decimal}`;
  }
  return words[whole] || String(whole);
};

const formatScore = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return val;
  return num % 1 === 0 ? num.toFixed(1) : `${num}`;
};

const CompanyPublicEvaluationPage = () => {
  const { token } = useParams();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [submittedEvaluation, setSubmittedEvaluation] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Form State adhering strictly to IUH Faculty of IT format
  const [formData, setFormData] = useState({
    // Thông tin chung
    businessField: '',
    companySize: 'Từ 50 đến 100 người',
    // 1. Công việc thực tập (mặc định không tick ô nào)
    workFields: [],
    workFieldOther: '',
    // 2. Yêu cầu của người sử dụng
    endUserRequirements: '',
    // 3. Yêu cầu của người lãnh đạo trực tiếp
    leaderRequirements: '',
    // 4. Mục tiêu chương trình đào tạo CNTT (PEO)
    peo1: '',
    peo2: '',
    peo3: '',
    // 5. Đánh giá khả năng làm việc nhóm
    teamworkEvaluation: 'Tốt',
    teamworkOther: '',
    // Đánh giá kết quả thực tập (Điểm & Nhận xét)
    score: '',
    comments: '',
    // Thông tin người đánh giá
    evaluatorName: '',
    evaluatorPosition: '',
    evaluatorEmail: '',
    evaluatorPhone: '',
  });

  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    const fetchFormMetadata = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await evaluationApi.getPublicEvaluationByToken(token);
        if (res.success && res.data) {
          setData(res.data);
          if (
            res.data.status === 'SUBMITTED' ||
            res.data.internship?.status === 'COMPLETED' ||
            res.data.evaluation?.status === 'CONFIRMED'
          ) {
            setSubmittedSuccess(true);
            if (res.data.evaluation) {
              setSubmittedEvaluation(res.data.evaluation);
            }
          } else {
            const intern = res.data.internship || {};
            const comp = res.data.company || {};
            const ev = res.data.evaluation;
            setFormData((prev) => ({
              ...prev,
              businessField: ev?.companyInfo?.businessField || prev.businessField || comp.businessField || 'Công nghệ thông tin',
              companySize: ev?.companyInfo?.companySize || prev.companySize,
              workFields: Array.isArray(ev?.workFields) ? ev.workFields : [],
              workFieldOther: ev?.workFieldOther || '',
              endUserRequirements: ev?.requirements?.endUserRequirements || prev.endUserRequirements,
              leaderRequirements: ev?.requirements?.leaderRequirements || prev.leaderRequirements,
              peo1: ev?.requirements?.peo1 || prev.peo1,
              peo2: ev?.requirements?.peo2 || prev.peo2,
              peo3: ev?.requirements?.peo3 || prev.peo3,
              teamworkEvaluation: ev?.teamworkEvaluation || prev.teamworkEvaluation,
              teamworkOther: ev?.teamworkOther || prev.teamworkOther,
              score: ev?.score !== undefined && ev?.score !== null ? ev.score : prev.score,
              comments: ev?.comments || prev.comments,
              evaluatorName: ev?.evaluatorInfo?.name || intern.mentorName || comp.contactPerson || '',
              evaluatorPosition: ev?.evaluatorInfo?.position || intern.mentorPosition || 'Cán bộ quản lý thực tập',
              evaluatorEmail: ev?.evaluatorInfo?.email || intern.mentorEmail || comp.email || '',
              evaluatorPhone: ev?.evaluatorInfo?.phone || intern.mentorPhone || comp.phone || '',
            }));
          }
        }
      } catch (err) {
        setError(err.message || 'Không thể tải phiếu đánh giá hoặc liên kết không hợp lệ.');
      } finally {
        setLoading(false);
      }
    };

    fetchFormMetadata();
  }, [token]);

  const handleWorkFieldToggle = (field) => {
    setFormData((prev) => {
      const exists = prev.workFields.includes(field);
      const newWorkFields = exists
        ? prev.workFields.filter((f) => f !== field)
        : [...prev.workFields, field];
      return {
        ...prev,
        workFields: newWorkFields,
        workFieldOther: newWorkFields.includes('Khác') ? prev.workFieldOther : '',
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validate Evaluator Info
    if (!formData.evaluatorName.trim()) {
      showToast('Vui lòng nhập họ và tên người đánh giá.', 'error');
      return;
    }

    if (!formData.evaluatorPosition.trim()) {
      showToast('Vui lòng nhập chức vụ / bộ phận công tác của người đánh giá.', 'error');
      return;
    }

    if (!formData.evaluatorEmail.trim()) {
      showToast('Vui lòng nhập email người đánh giá.', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.evaluatorEmail.trim())) {
      showToast('Email người đánh giá không đúng định dạng.', 'error');
      return;
    }

    if (!formData.evaluatorPhone.trim()) {
      showToast('Vui lòng nhập số điện thoại người đánh giá.', 'error');
      return;
    }

    if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.evaluatorPhone.trim().replace(/[\s.-]/g, ''))) {
      showToast('Số điện thoại người đánh giá không hợp lệ (10-11 số).', 'error');
      return;
    }

    // 2. Validate Score
    if (formData.score === '' || isNaN(formData.score) || Number(formData.score) < 0 || Number(formData.score) > 10) {
      showToast('Vui lòng nhập Điểm đánh giá hợp lệ từ 0 đến 10', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        evaluatorInfo: {
          name: formData.evaluatorName.trim(),
          position: formData.evaluatorPosition.trim(),
          email: formData.evaluatorEmail.trim().toLowerCase(),
          phone: formData.evaluatorPhone.trim(),
        },
        companyInfo: {
          businessField: formData.businessField.trim(),
          companySize: formData.companySize,
        },
        workFields: formData.workFields,
        workFieldOther: formData.workFields.includes('Khác') ? formData.workFieldOther.trim() : null,
        requirements: {
          endUserRequirements: formData.endUserRequirements.trim(),
          leaderRequirements: formData.leaderRequirements.trim(),
          peo1: formData.peo1.trim(),
          peo2: formData.peo2.trim(),
          peo3: formData.peo3.trim(),
        },
        teamworkEvaluation: formData.teamworkEvaluation,
        teamworkOther: formData.teamworkEvaluation === 'Ý kiến khác' ? formData.teamworkOther.trim() : null,
        score: Number(formData.score),
        comments: formData.comments.trim(),
      };

      const res = await evaluationApi.submitPublicEvaluation(token, payload);
      if (res.success) {
        const fullEval = {
          ...payload,
          ...(res.data?.evaluation || {}),
          submittedAt: res.data?.evaluation?.submittedAt || new Date(),
        };
        setSubmittedEvaluation(fullEval);
        setSubmittedSuccess(true);
        showToast('Gửi phiếu đánh giá thành công! Cảm ơn Quý Doanh nghiệp.', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi gửi phiếu đánh giá', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center items-center">
        <div className="max-w-xl w-full bg-white p-8 rounded-3xl shadow-md border border-slate-200">
          <LoadingSkeleton rows={6} cols={2} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Không thể mở phiếu đánh giá</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{error}</p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              Về trang chủ hệ thống
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submittedSuccess) {
    const activeEval = submittedEvaluation || data?.evaluation;
    const evalScore = activeEval?.score ?? (formData.score !== '' ? formData.score : null);
    const evalComments = activeEval?.comments ?? formData.comments;
    const evalDate = activeEval?.submittedAt || data?.submittedAt || new Date();
    const companyName = data?.company?.companyName || data?.company?.name || 'Doanh nghiệp';
    const studentName = data?.student?.fullName || 'Sinh viên';
    const studentCode = data?.student?.studentCode || '—';

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
        <div className="max-w-xl w-full p-8 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-5 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Đã hoàn tất đánh giá
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-3">
              Phiếu Đánh Giá Đã Được Gửi Thành Công
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-md mx-auto">
              Trân trọng cảm ơn Quý Doanh nghiệp <strong>{companyName}</strong> đã dành thời gian đánh giá thực tập của sinh viên <strong>{studentName} ({studentCode})</strong>.
            </p>
          </div>

          {/* CARD: KẾT QUẢ ĐÁNH GIÁ THỰC TẬP (ĐIỂM SỐ) */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/90 via-white to-emerald-50/70 border border-indigo-100/90 shadow-2xs space-y-2.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              KẾT QUẢ ĐÁNH GIÁ THỰC TẬP
            </div>
            <div className="flex items-baseline justify-center gap-1.5 font-mono">
              <span className="text-4xl sm:text-5xl font-black text-indigo-900 tracking-tight">
                {formatScore(evalScore)}
              </span>
              <span className="text-xl font-bold text-slate-400">/ 10</span>
            </div>
            <div className="text-xs font-semibold text-indigo-700 bg-indigo-100/70 py-1 px-3.5 rounded-full inline-block">
              Điểm đánh giá của doanh nghiệp
            </div>
          </div>

          {/* THÔNG TIN CHI TIẾT PHIẾU ĐÁNH GIÁ */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2 text-slate-700">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Doanh nghiệp:</span>
              <strong className="text-slate-900">{companyName}</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Sinh viên:</span>
              <strong className="text-slate-900">{studentName}</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">MSSV:</span>
              <strong className="text-slate-900 font-mono">{studentCode}</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Điểm đánh giá:</span>
              <strong className="text-indigo-700 font-mono text-sm font-bold">
                {formatScore(evalScore)} / 10
              </strong>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Ngày đánh giá:</span>
              <strong className="text-slate-900">{formatDate(evalDate)}</strong>
            </div>
          </div>

          {/* NHẬN XÉT CỦA DOANH NGHIỆP (NẾU CÓ) */}
          {evalComments && evalComments.trim() && (
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-left text-xs space-y-2">
              <div className="font-bold uppercase text-[11px] text-amber-900 tracking-wider flex items-center gap-1.5">
                <span>💬 Nhận xét của Doanh nghiệp</span>
              </div>
              <p className="italic text-slate-800 bg-white/80 p-3.5 rounded-xl border border-amber-100/80 whitespace-pre-line leading-relaxed">
                "{evalComments}"
              </p>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-1.5 text-slate-600">
            <div>✓ Kết quả đánh giá đã được lưu vào hệ thống Quản lý TTDN & KLTN.</div>
            <div>✓ Giảng viên hướng dẫn và Khoa CNTT đã nhận được thông báo hoàn tất.</div>
            <div>✓ Quý Doanh nghiệp có thể in biểu mẫu để lưu trữ hồ sơ.</div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPrintModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In phiếu đánh giá (Print / PDF)</span>
            </button>
          </div>
        </div>

        {/* Modal Xem & In Biểu Mẫu Đầy Đủ */}
        <DocumentViewerModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          title="Phiếu Đánh Giá Kết Quả Thực Tập Doanh Nghiệp"
        >
          <InternshipEvaluationDoc
            internship={{
              ...(data?.internship || {}),
              _id: data?.internship?._id || data?._id,
              position: data?.internship?.position || data?.position,
              companyId: {
                name: data?.company?.companyName || data?.company?.name || data?.internship?.companyId?.name || data?.internship?.companyId?.companyName,
                companyName: data?.company?.companyName || data?.company?.name || data?.internship?.companyId?.name || data?.internship?.companyId?.companyName,
                address: data?.company?.address || data?.internship?.companyId?.address,
              },
              studentId: {
                studentCode: data?.student?.studentCode || data?.internship?.studentId?.studentCode,
                className: data?.student?.className || data?.internship?.studentId?.className,
                userId: {
                  fullName: data?.student?.fullName || data?.internship?.studentId?.userId?.fullName,
                },
              },
              mentorName: data?.internship?.mentorName || activeEval?.evaluatorInfo?.name || formData.evaluatorName,
            }}
            evaluation={activeEval}
          />
        </DocumentViewerModal>
      </div>
    );
  }

  const { student, company, internship, supervisor } = data || {};

  return (
    <div className="min-h-screen bg-[#F4F7FC] py-8 sm:py-12 px-3 sm:px-6 lg:px-8 print:bg-white print:p-0 selection:bg-indigo-600 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-6 print:max-w-none print:space-y-4">
        
        {/* ============================================================ */}
        {/* HEADER: KHOA CNTT - ĐH CÔNG NGHIỆP TP.HCM                   */}
        {/* ============================================================ */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-md relative overflow-hidden print:border-none print:shadow-none print:p-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 print:pb-3 print:border-black">
            {/* Left: Department Branding */}
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <IUHLogo className="h-12 sm:h-14 w-auto object-contain" />
              <div>
                <div className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-tight">
                  Trường Đại học Công nghiệp TP.HCM
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-indigo-700 uppercase tracking-wide">
                  Khoa Công nghệ Thông tin
                </div>
              </div>
            </div>

            {/* Right: National Motto */}
            <div className="text-center sm:text-right text-xs">
              <div className="font-bold uppercase tracking-wider text-slate-800">
                Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam
              </div>
              <div className="font-semibold text-slate-600 mt-0.5">
                Độc lập - Tự do - Hạnh phúc
              </div>
              <div className="w-24 h-0.5 bg-slate-300 mx-auto sm:ml-auto sm:mr-0 mt-1" />
              <div className="italic text-[11px] text-slate-500 mt-1">
                Ngày {day} tháng {month} năm {year}
              </div>
            </div>
          </div>

          {/* Form Main Title */}
          <div className="text-center pt-6 pb-2 print:pt-4">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
              Phiếu Đánh Giá Kết Quả Thực Tập Doanh Nghiệp
            </h1>
            <p className="text-xs text-slate-500 mt-1 italic">
              (Dành cho Doanh nghiệp & Đơn vị tiếp nhận sinh viên thực tập)
            </p>
          </div>
        </div>

        {/* Evaluation Form Main Container */}
        <form onSubmit={handleSubmit} className="space-y-6 print:space-y-4">
          
          {/* ============================================================ */}
          {/* PHẦN I: THÔNG TIN CHUNG                                      */}
          {/* ============================================================ */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4 print:border print:border-black print:rounded-none print:p-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 print:border-black text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-indigo-600 print:hidden" />
              <span>I. Thông Tin Chung</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* 1. Tên Doanh nghiệp */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 print:bg-transparent print:border-none print:p-0">
                <span className="text-[11px] font-bold text-slate-500 block uppercase">1. Tên Doanh nghiệp:</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{company?.companyName || '—'}</span>
              </div>

              {/* 2. Địa chỉ */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 print:bg-transparent print:border-none print:p-0">
                <span className="text-[11px] font-bold text-slate-500 block uppercase">2. Địa chỉ:</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{company?.address || '—'}</span>
              </div>

              {/* 3. Tên sinh viên thực tập */}
              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 print:bg-transparent print:border-none print:p-0 col-span-1 md:col-span-2">
                <span className="text-[11px] font-bold text-indigo-700 block uppercase">3. Thông tin Sinh viên thực tập:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                  <div>Họ và tên: <strong className="text-slate-900 text-sm">{student?.fullName}</strong></div>
                  <div>MSSV: <strong className="font-mono text-indigo-900">{student?.studentCode}</strong></div>
                  <div>Lớp: <strong className="text-slate-900">{student?.className}</strong></div>
                  <div>Vị trí: <strong className="text-slate-900">{internship?.position || 'Thực tập sinh'}</strong></div>
                  <div className="sm:col-span-2">Thời gian: <strong>{formatDate(internship?.startDate)}</strong> đến <strong>{formatDate(internship?.endDate)}</strong></div>
                </div>
              </div>

              {/* 4. Lĩnh vực hoạt động chính */}
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[11px] mb-1.5">
                  4. Lĩnh vực hoạt động chính của Doanh nghiệp:
                </label>
                <input
                  type="text"
                  value={formData.businessField}
                  onChange={(e) => setFormData({ ...formData, businessField: e.target.value })}
                  placeholder="Ví dụ: Công nghệ thông tin, Phát triển phần mềm, Tích hợp hệ thống..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900 text-xs font-semibold"
                />
              </div>

              {/* 5. Quy mô Doanh nghiệp */}
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[11px] mb-1.5">
                  5. Quy mô Doanh nghiệp:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COMPANY_SIZE_OPTIONS.map((opt) => {
                    const isChecked = formData.companySize === opt;
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="companySize"
                          value={opt}
                          checked={isChecked}
                          onChange={() => setFormData({ ...formData, companySize: opt })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* PHẦN II: CÔNG VIỆC THỰC TẬP HIỆN TẠI                          */}
          {/* ============================================================ */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4 print:border print:border-black print:rounded-none print:p-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 print:border-black text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Briefcase className="w-4 h-4 text-indigo-600 print:hidden" />
              <span>1. Công việc thực tập hiện tại của Anh/Chị (A/C) tại doanh nghiệp là:</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {WORK_FIELD_OPTIONS.map((field) => {
                  const isChecked = formData.workFields.includes(field);
                  return (
                    <label
                      key={field}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleWorkFieldToggle(field)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>{field}</span>
                    </label>
                  );
                })}
              </div>

              {formData.workFields.includes('Khác') && (
                <div className="pt-2 animate-in fade-in">
                  <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                    Nhập công việc khác:
                  </label>
                  <input
                    type="text"
                    value={formData.workFieldOther}
                    onChange={(e) => setFormData({ ...formData, workFieldOther: e.target.value })}
                    placeholder="Vui lòng nêu rõ các công việc khác..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-xs text-slate-900"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* PHẦN III: YÊU CẦU CỦA NGƯỜI SỬ DỤNG (END USER)               */}
          {/* ============================================================ */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-3 print:border print:border-black print:rounded-none print:p-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 print:border-black text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Users className="w-4 h-4 text-indigo-600 print:hidden" />
              <span>2. Yêu cầu của người sử dụng (End User) liên quan đến công việc thực tập của A/C:</span>
            </div>

            <textarea
              rows={3}
              value={formData.endUserRequirements}
              onChange={(e) => setFormData({ ...formData, endUserRequirements: e.target.value })}
              placeholder="Nhập nội dung yêu cầu của người sử dụng (End User) liên quan đến công việc thực tập của A/C..."
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900 text-xs leading-relaxed"
            />
          </div>

          {/* ============================================================ */}
          {/* PHẦN IV: YÊU CẦU CỦA NGƯỜI LÃNH ĐẠO TRỰC TIẾP                */}
          {/* ============================================================ */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-3 print:border print:border-black print:rounded-none print:p-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 print:border-black text-xs font-bold text-slate-900 uppercase tracking-wider">
              <User className="w-4 h-4 text-indigo-600 print:hidden" />
              <span>3. Yêu cầu của người lãnh đạo trực tiếp liên quan đến công việc thực tập của A/C:</span>
            </div>

            <textarea
              rows={3}
              value={formData.leaderRequirements}
              onChange={(e) => setFormData({ ...formData, leaderRequirements: e.target.value })}
              placeholder="Nhập nội dung yêu cầu của người lãnh đạo trực tiếp liên quan đến công việc thực tập của A/C..."
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900 text-xs leading-relaxed"
            />
          </div>

          {/* ============================================================ */}
          {/* PHẦN V: ĐÁNH GIÁ MỤC TIÊU CHƯƠNG TRÌNH ĐÀO TẠO CNTT (PEO)     */}
          {/* ============================================================ */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-5 print:border print:border-black print:rounded-none print:p-4">
            <div className="pb-2 border-b border-slate-100 print:border-black">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 print:hidden" />
                <span>4. A/C cho biết ý kiến về mục tiêu chương trình đào tạo CNTT (PEO):</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Đánh giá mức độ sinh viên thể hiện các mục tiêu đào tạo chuẩn đầu ra của Khoa CNTT - IUH.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* PEO 1 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900">
                  <span className="text-indigo-700 font-extrabold mr-1.5">PEO 1.</span>
                  Thể hiện kiến thức lý thuyết và thực hành cơ bản và chuyên sâu liên quan đến CNTT để đáp ứng những yêu cầu trong việc quản trị, bảo mật và phát triển các hệ thống IT cho tổ chức và doanh nghiệp.
                </div>
                <textarea
                  rows={2}
                  value={formData.peo1}
                  onChange={(e) => setFormData({ ...formData, peo1: e.target.value })}
                  placeholder="Ý kiến / nhận xét về PEO 1..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900 text-xs"
                />
              </div>

              {/* PEO 2 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900">
                  <span className="text-indigo-700 font-extrabold mr-1.5">PEO 2.</span>
                  Thể hiện khả năng làm việc hiệu quả với tư cách là thành viên hay lãnh đạo trong nhóm đa quốc gia trong môi trường chuyên nghiệp không ngừng thay đổi.
                </div>
                <textarea
                  rows={2}
                  value={formData.peo2}
                  onChange={(e) => setFormData({ ...formData, peo2: e.target.value })}
                  placeholder="Ý kiến / nhận xét về PEO 2..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900 text-xs"
                />
              </div>

              {/* PEO 3 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900">
                  <span className="text-indigo-700 font-extrabold mr-1.5">PEO 3.</span>
                  Thể hiện năng lực học tập suốt đời cũng như đạo đức tốt trong môi trường chuyên nghiệp.
                </div>
                <textarea
                  rows={2}
                  value={formData.peo3}
                  onChange={(e) => setFormData({ ...formData, peo3: e.target.value })}
                  placeholder="Ý kiến / nhận xét về PEO 3..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900 text-xs"
                />
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* PHẦN VI: ĐÁNH GIÁ KHẢ NĂNG LÀM VIỆC NHÓM                     */}
          {/* ============================================================ */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4 print:border print:border-black print:rounded-none print:p-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 print:border-black text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Users className="w-4 h-4 text-indigo-600 print:hidden" />
              <span>5. Đánh giá của quản lý trực tiếp về khả năng làm việc nhóm của thực tập viên:</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {TEAMWORK_OPTIONS.map((opt) => {
                  const isSelected = formData.teamworkEvaluation === opt;
                  return (
                    <label
                      key={opt}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer text-center transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="teamworkEvaluation"
                        value={opt}
                        checked={isSelected}
                        onChange={() => setFormData({ ...formData, teamworkEvaluation: opt })}
                        className="hidden"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>

              {formData.teamworkEvaluation === 'Ý kiến khác' && (
                <div className="pt-2 animate-in fade-in">
                  <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                    Nhập ý kiến khác:
                  </label>
                  <input
                    type="text"
                    value={formData.teamworkOther}
                    onChange={(e) => setFormData({ ...formData, teamworkOther: e.target.value })}
                    placeholder="Vui lòng nêu rõ ý kiến khác về khả năng làm việc nhóm..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-xs text-slate-900"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* PHẦN VII: ĐÁNH GIÁ KẾT QUẢ THỰC TẬP (ĐIỂM & NHẬN XÉT)       */}
          {/* ============================================================ */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4 print:border print:border-black print:rounded-none print:p-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 print:border-black text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Award className="w-4 h-4 text-indigo-600 print:hidden" />
              <span>Đánh Giá Kết Quả Thực Tập</span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Điểm đánh giá */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[11px]">
                  Điểm đánh giá (Thang điểm 10) <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                      placeholder="8.5"
                      required
                      className="w-36 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-base font-black text-indigo-900 font-mono text-center"
                    />
                  </div>
                  <span className="text-slate-500 font-bold">/ 10 điểm</span>
                  {formData.score !== '' && !isNaN(formData.score) && (
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                      (Bằng chữ: <strong>{numberToWords(formData.score)}</strong>)
                    </span>
                  )}
                </div>
              </div>

              {/* Nhận xét tổng quát */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[11px]">
                  Nhận xét & kiến nghị tổng quát của Doanh nghiệp:
                </label>
                <textarea
                  rows={4}
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Nhận xét tổng quát về thái độ, tính kỷ luật, năng lực chuyên môn, khả năng thích ứng và kiến nghị dành cho sinh viên..."
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900 text-xs leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* PHẦN VIII: THÔNG TIN NGƯỜI ĐÁNH GIÁ                          */}
          {/* ============================================================ */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4 print:border print:border-black print:rounded-none print:p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 print:border-black">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <User className="w-4 h-4 text-indigo-600 print:hidden" />
                <span>👤 Thông Tin Người Đánh Giá</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-[11px] print:hidden">
              💡 <strong>Lưu ý:</strong> Thông tin được lấy từ hồ sơ đăng ký thực tập. Bạn có thể chỉnh sửa nếu thông tin người đánh giá đã thay đổi.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và tên người đánh giá <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.evaluatorName}
                  onChange={(e) => setFormData({ ...formData, evaluatorName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn Quản Lý"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chức vụ / Bộ phận công tác <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.evaluatorPosition}
                  onChange={(e) => setFormData({ ...formData, evaluatorPosition: e.target.value })}
                  placeholder="Ví dụ: Trưởng phòng Kỹ thuật / Tech Lead"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Email liên hệ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.evaluatorEmail}
                  onChange={(e) => setFormData({ ...formData, evaluatorEmail: e.target.value })}
                  placeholder="manager@company.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.evaluatorPhone}
                  onChange={(e) => setFormData({ ...formData, evaluatorPhone: e.target.value })}
                  placeholder="0901234567"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* PHẦN IX: XÁC NHẬN CỦA QUẢN LÝ TRỰC TIẾP                     */}
          {/* ============================================================ */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4 print:border print:border-black print:rounded-none print:p-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 print:border-black text-xs font-bold text-slate-900 uppercase tracking-wider">
              <span>Xác Nhận Của Quản Lý Trực Tiếp</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-center pt-2">
              <div className="hidden sm:block text-slate-400 italic text-[11px] flex items-center justify-center">
                Kết quả đánh giá sẽ được chuyển lưu chính thức vào hồ sơ đào tạo của Khoa CNTT.
              </div>

              <div className="space-y-1">
                <div className="italic text-slate-600">
                  Ngày {day} tháng {month} năm {year}
                </div>
                <div className="font-bold text-slate-900 uppercase">
                  Cán bộ Quản lý / Người Đánh Giá
                </div>
                <div className="text-[11px] text-slate-500 italic">(Ký tên và ghi rõ họ tên)</div>
                <div className="h-16 flex items-center justify-center text-slate-300 font-serif italic text-sm">
                  {formData.evaluatorName || 'Ký tên'}
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {formData.evaluatorName || '...........................................'}
                </div>
                {formData.evaluatorPosition && (
                  <div className="text-slate-600 text-[11px]">{formData.evaluatorPosition}</div>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* NÚT THAO TÁC (GỬI / IN PHIẾU)                                */}
          {/* ============================================================ */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
            <div className="text-xs text-slate-500">
              Bằng việc nhấn <strong>Gửi phiếu đánh giá</strong>, kết quả sẽ được chuyển trực tiếp đến Giảng viên hướng dẫn và Khoa CNTT.
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold text-xs rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In biểu mẫu</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-200 transition disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi Phiếu Đánh Giá</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      <Footer className="print:hidden mt-8" />
    </div>
  );
};

export default CompanyPublicEvaluationPage;
