import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import evaluationApi from '../../api/evaluationApi';
import { useToast } from '../../context/ToastContext';
import IUHLogo from '../common/IUHLogo';
import {
  Building2,
  GraduationCap,
  Award,
  Send,
  Save,
  CheckSquare,
  Square,
  AlertCircle,
  FileCheck,
  Briefcase,
  Users,
  User,
  FileText,
} from 'lucide-react';

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

const CompanyEvaluationModal = ({
  isOpen,
  onClose,
  internship,
  company,
  onSaved,
}) => {
  const [businessField, setBusinessField] = useState('');
  const [companySize, setCompanySize] = useState('Từ 50 đến 100 người');
  const [workFields, setWorkFields] = useState([]);
  const [workFieldOther, setWorkFieldOther] = useState('');

  const [endUserReq, setEndUserReq] = useState('');
  const [leaderReq, setLeaderReq] = useState('');
  const [peo1, setPeo1] = useState('');
  const [peo2, setPeo2] = useState('');
  const [peo3, setPeo3] = useState('');

  const [teamwork, setTeamwork] = useState('Tốt');
  const [teamworkOther, setTeamworkOther] = useState('');

  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');

  // Evaluator Info state
  const [evaluatorName, setEvaluatorName] = useState('');
  const [evaluatorPosition, setEvaluatorPosition] = useState('');
  const [evaluatorEmail, setEvaluatorEmail] = useState('');
  const [evaluatorPhone, setEvaluatorPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    if (internship) {
      const ev = internship.evaluation;
      if (ev) {
        setBusinessField(ev.companyInfo?.businessField || company?.name || '');
        setCompanySize(ev.companyInfo?.companySize || 'Từ 50 đến 100 người');
        setWorkFields(Array.isArray(ev.workFields) ? ev.workFields : []);
        setWorkFieldOther(ev.workFieldOther || '');
        setEndUserReq(ev.requirements?.endUserRequirements || '');
        setLeaderReq(ev.requirements?.leaderRequirements || '');
        setPeo1(ev.requirements?.peo1 || '');
        setPeo2(ev.requirements?.peo2 || '');
        setPeo3(ev.requirements?.peo3 || '');
        setTeamwork(ev.teamworkEvaluation || 'Tốt');
        setTeamworkOther(ev.teamworkOther || '');
        setScore(ev.score !== null && ev.score !== undefined ? ev.score : '');
        setComments(ev.comments || '');

        setEvaluatorName(ev.evaluatorInfo?.name || internship.mentorName || company?.contactPerson || '');
        setEvaluatorPosition(ev.evaluatorInfo?.position || internship.mentorPosition || 'Cán bộ quản lý thực tập');
        setEvaluatorEmail(ev.evaluatorInfo?.email || internship.mentorEmail || company?.email || '');
        setEvaluatorPhone(ev.evaluatorInfo?.phone || internship.mentorPhone || company?.phone || '');
      } else {
        setBusinessField(company?.name || 'Công nghệ thông tin');
        setCompanySize('Từ 50 đến 100 người');
        setWorkFields([]);
        setWorkFieldOther('');
        setEndUserReq('');
        setLeaderReq('');
        setPeo1('');
        setPeo2('');
        setPeo3('');
        setTeamwork('Tốt');
        setTeamworkOther('');
        setScore('');
        setComments('');

        setEvaluatorName(internship.mentorName || company?.contactPerson || '');
        setEvaluatorPosition(internship.mentorPosition || 'Cán bộ quản lý thực tập');
        setEvaluatorEmail(internship.mentorEmail || company?.email || '');
        setEvaluatorPhone(internship.mentorPhone || company?.phone || '');
      }
      setError('');
    }
  }, [internship, company]);

  const handleToggleWorkField = (item) => {
    if (workFields.includes(item)) {
      setWorkFields(workFields.filter((f) => f !== item));
    } else {
      setWorkFields([...workFields, item]);
    }
  };

  const handleSubmit = async (targetStatus) => {
    if (targetStatus === 'SUBMITTED') {
      if (!evaluatorName.trim()) {
        setError('Vui lòng nhập họ và tên người đánh giá');
        return;
      }
      if (!evaluatorPosition.trim()) {
        setError('Vui lòng nhập chức vụ / bộ phận công tác của người đánh giá');
        return;
      }
      if (!evaluatorEmail.trim()) {
        setError('Vui lòng nhập email người đánh giá');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(evaluatorEmail.trim())) {
        setError('Email người đánh giá không đúng định dạng');
        return;
      }
      if (!evaluatorPhone.trim()) {
        setError('Vui lòng nhập số điện thoại người đánh giá');
        return;
      }
      if (!/^(0|\+84)[0-9]{9,10}$/.test(evaluatorPhone.trim().replace(/[\s.-]/g, ''))) {
        setError('Số điện thoại người đánh giá không hợp lệ (10-11 số)');
        return;
      }
    }

    if (score === '') {
      setError('Vui lòng nhập điểm đánh giá tổng kết');
      return;
    }

    if (Number(score) < 0 || Number(score) > 10) {
      setError('Điểm đánh giá phải nằm trong khoảng từ 0 đến 10');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        internshipId: internship._id,
        score: Number(score),
        comments: comments.trim() || null,
        evaluatorInfo: {
          name: evaluatorName.trim(),
          position: evaluatorPosition.trim(),
          email: evaluatorEmail.trim().toLowerCase(),
          phone: evaluatorPhone.trim(),
        },
        companyInfo: {
          businessField: businessField.trim() || company?.name || '',
          companySize,
        },
        workFields,
        workFieldOther: workFields.includes('Khác') ? workFieldOther.trim() : null,
        requirements: {
          endUserRequirements: endUserReq.trim() || null,
          leaderRequirements: leaderReq.trim() || null,
          peo1: peo1.trim() || null,
          peo2: peo2.trim() || null,
          peo3: peo3.trim() || null,
        },
        teamworkEvaluation: teamwork,
        teamworkOther: teamwork === 'Ý kiến khác' ? teamworkOther.trim() : null,
        status: targetStatus,
      };

      await evaluationApi.createOrUpdate(payload);
      showToast(
        targetStatus === 'DRAFT'
          ? 'Đã lưu bản nháp phiếu đánh giá thành công!'
          : 'Đã gửi phiếu đánh giá thực tập chính thức!',
        'success',
      );

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể lưu phiếu đánh giá');
      showToast(err.message || 'Không thể lưu phiếu đánh giá', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!internship) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phiếu Đánh Giá Kết Quả Thực Tập Doanh Nghiệp"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 text-xs max-h-[78vh] overflow-y-auto pr-1">
        {/* IUH Header Banner */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IUHLogo className="h-10 w-auto object-contain" />
            <div>
              <div className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
                Khoa Công nghệ Thông tin — Trường ĐH Công nghiệp TP.HCM
              </div>
              <div className="font-bold text-sm text-slate-900 mt-0.5">
                Sinh viên: {internship.studentId?.userId?.fullName} (MSSV: {internship.studentId?.studentCode})
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Vị trí: <strong>{internship.position}</strong> • Lớp: {internship.studentId?.className}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-indigo-100 text-indigo-800 self-start sm:self-auto border border-indigo-200">
            {internship.evaluation?.status || 'Chưa đánh giá'}
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* PHẦN I: THÔNG TIN CHUNG */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>I. Thông Tin Chung</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                1. Tên Doanh nghiệp
              </label>
              <input
                type="text"
                disabled
                value={company?.name || internship.companyId?.name || ''}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                2. Địa chỉ Doanh nghiệp
              </label>
              <input
                type="text"
                disabled
                value={company?.address || internship.companyId?.address || ''}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 cursor-not-allowed truncate"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                4. Lĩnh vực hoạt động chính
              </label>
              <input
                type="text"
                value={businessField}
                onChange={(e) => setBusinessField(e.target.value)}
                placeholder="VD: Công nghệ thông tin, Phát triển phần mềm..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                5. Quy mô Doanh nghiệp
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {COMPANY_SIZE_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer text-[11px] transition ${
                      companySize === opt
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modalCompanySize"
                      value={opt}
                      checked={companySize === opt}
                      onChange={() => setCompanySize(opt)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* PHẦN II: CÔNG VIỆC THỰC TẬP */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <span>1. Công việc thực tập hiện tại của Anh/Chị (A/C) tại doanh nghiệp là:</span>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WORK_FIELD_OPTIONS.map((item) => {
                const checked = workFields.includes(item);
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => handleToggleWorkField(item)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                      checked
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>

            {workFields.includes('Khác') && (
              <div className="pt-1 animate-in fade-in">
                <input
                  type="text"
                  value={workFieldOther}
                  onChange={(e) => setWorkFieldOther(e.target.value)}
                  placeholder="Nhập công việc khác..."
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            )}
          </div>
        </div>

        {/* PHẦN III: YÊU CẦU CỦA NGƯỜI SỬ DỤNG */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>2. Yêu cầu của người sử dụng (End User) liên quan đến công việc thực tập của A/C</span>
          </div>
          <textarea
            rows={3}
            value={endUserReq}
            onChange={(e) => setEndUserReq(e.target.value)}
            placeholder="Nhập nội dung yêu cầu của người sử dụng..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition leading-relaxed"
          />
        </div>

        {/* PHẦN IV: YÊU CẦU CỦA NGƯỜI LÃNH ĐẠO TRỰC TIẾP */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100 flex items-center gap-1.5">
            <User className="w-4 h-4 text-indigo-600" />
            <span>3. Yêu cầu của người lãnh đạo trực tiếp liên quan đến công việc thực tập của A/C</span>
          </div>
          <textarea
            rows={3}
            value={leaderReq}
            onChange={(e) => setLeaderReq(e.target.value)}
            placeholder="Nhập nội dung yêu cầu của người lãnh đạo trực tiếp..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition leading-relaxed"
          />
        </div>

        {/* PHẦN V: ĐÁNH GIÁ MỤC TIÊU ĐÀO TẠO (PEO) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>4. A/C cho biết ý kiến về mục tiêu chương trình đào tạo CNTT (PEO)</span>
          </div>

          <div className="space-y-3.5">
            {/* PEO 1 */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="font-semibold text-slate-900 leading-snug">
                <span className="text-indigo-700 font-bold mr-1">PEO 1.</span>
                Thể hiện kiến thức lý thuyết và thực hành cơ bản và chuyên sâu liên quan đến CNTT để đáp ứng những yêu cầu trong việc quản trị, bảo mật và phát triển các hệ thống IT cho tổ chức và doanh nghiệp.
              </div>
              <textarea
                rows={2}
                value={peo1}
                onChange={(e) => setPeo1(e.target.value)}
                placeholder="Ý kiến đánh giá PEO 1..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            {/* PEO 2 */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="font-semibold text-slate-900 leading-snug">
                <span className="text-indigo-700 font-bold mr-1">PEO 2.</span>
                Thể hiện khả năng làm việc hiệu quả với tư cách là thành viên hay lãnh đạo trong nhóm đa quốc gia trong môi trường chuyên nghiệp không ngừng thay đổi.
              </div>
              <textarea
                rows={2}
                value={peo2}
                onChange={(e) => setPeo2(e.target.value)}
                placeholder="Ý kiến đánh giá PEO 2..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            {/* PEO 3 */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="font-semibold text-slate-900 leading-snug">
                <span className="text-indigo-700 font-bold mr-1">PEO 3.</span>
                Thể hiện năng lực học tập suốt đời cũng như đạo đức tốt trong môi trường chuyên nghiệp.
              </div>
              <textarea
                rows={2}
                value={peo3}
                onChange={(e) => setPeo3(e.target.value)}
                placeholder="Ý kiến đánh giá PEO 3..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* PHẦN VI: ĐÁNH GIÁ KHẢ NĂNG LÀM VIỆC NHÓM */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>5. Đánh giá của quản lý trực tiếp về khả năng làm việc nhóm của thực tập viên</span>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {TEAMWORK_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setTeamwork(opt)}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${
                    teamwork === opt
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {teamwork === 'Ý kiến khác' && (
              <div className="pt-1 animate-in fade-in">
                <input
                  type="text"
                  value={teamworkOther}
                  onChange={(e) => setTeamworkOther(e.target.value)}
                  placeholder="Nhập ý kiến khác..."
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            )}
          </div>
        </div>

        {/* PHẦN VII: ĐÁNH GIÁ KẾT QUẢ THỰC TẬP (ĐIỂM & NHẬN XÉT) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Đánh Giá Kết Quả Thực Tập</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[11px]">
                Điểm đánh giá (Thang điểm 10) <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="8.5"
                  className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-indigo-900 font-mono text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                <span className="text-slate-500 font-bold">/ 10 điểm</span>
                {score !== '' && !isNaN(score) && (
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                    (Bằng chữ: <strong>{numberToWords(score)}</strong>)
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[11px]">
                Nhận xét & kiến nghị tổng quát của Doanh nghiệp
              </label>
              <textarea
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Nhận xét tổng quát về tinh thần thái độ, ý thức kỷ luật, năng lực chuyên môn và khả năng phát triển của sinh viên..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition leading-relaxed"
              />
            </div>
          </div>
        </div>
        {/* PHẦN VIII: THÔNG TIN NGƯỜI ĐÁNH GIÁ */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" />
              <span>👤 Thông Tin Người Đánh Giá</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-[11px]">
            💡 <strong>Lưu ý:</strong> Thông tin được lấy từ hồ sơ đăng ký thực tập. Bạn có thể chỉnh sửa nếu thông tin người đánh giá đã thay đổi.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                Họ và tên người đánh giá <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={evaluatorName}
                onChange={(e) => setEvaluatorName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn Quản Lý"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                Chức vụ / Bộ phận công tác <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={evaluatorPosition}
                onChange={(e) => setEvaluatorPosition(e.target.value)}
                placeholder="Ví dụ: Trưởng phòng IT / Tech Lead"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                Email liên hệ <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={evaluatorEmail}
                onChange={(e) => setEvaluatorEmail(e.target.value)}
                placeholder="manager@company.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={evaluatorPhone}
                onChange={(e) => setEvaluatorPhone(e.target.value)}
                placeholder="0901234567"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* NÚT THAO TÁC MODAL */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('DRAFT')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Lưu bản nháp</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit('SUBMITTED')}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Gửi phiếu đánh giá</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CompanyEvaluationModal;
