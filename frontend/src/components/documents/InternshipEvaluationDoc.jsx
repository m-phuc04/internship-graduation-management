import React from 'react';

const numberToWords = (num) => {
  if (num === null || num === undefined || num === '' || isNaN(num)) return '—';
  const val = Number(num);
  if (val < 0 || val > 10) return '—';
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

const COMPANY_SIZE_OPTIONS = [
  'Từ dưới 30 người',
  'Từ 30 đến 50 người',
  'Từ 50 đến 100 người',
  'Trên 100 người',
];

const ALL_WORK_FIELDS = [
  'Quản trị mạng',
  'Quản trị máy chủ',
  'Hỗ trợ người dùng',
  'Lập trình',
  'Khác (ghi rõ công việc)',
];

const ALL_TEAMWORK_OPTIONS = [
  'Đồng ý',
  'Xuất sắc',
  'Tốt',
  'Trung bình',
  'Yếu',
  'Ý kiến khác',
];

const InternshipEvaluationDoc = ({ internship, evaluation }) => {
  if (!internship) return null;
  const ev = evaluation || internship?.evaluation;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const workFields = ev?.workFields || [];
  const currentSize = ev?.companyInfo?.companySize || 'Từ 50 đến 100 người';
  const currentTeamwork = ev?.teamworkEvaluation || 'Tốt';

  return (
    <div
      className="bg-white text-black p-8 sm:p-12 max-w-4xl mx-auto shadow-lg print:shadow-none print:p-0 print:max-w-none text-xs leading-relaxed"
      style={{ fontFamily: '"Times New Roman", Times, "Liberation Serif", serif' }}
    >
      {/* Header Quốc gia & Đơn vị */}
      <div className="flex justify-between items-start pb-4 border-b border-black">
        <div className="text-center text-xs font-bold uppercase">
          <div>Trường ĐH Công Nghiệp TP.HCM</div>
          <div>Khoa Công Nghệ Thông Tin</div>
          <div className="w-24 h-0.5 bg-black mx-auto mt-1" />
        </div>

        <div className="text-center text-xs">
          <div className="font-bold uppercase tracking-wider">
            Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam
          </div>
          <div className="font-semibold mt-0.5">
            Độc lập - Tự do - Hạnh phúc
          </div>
          <div className="w-28 h-0.5 bg-black mx-auto mt-1" />
          <div className="italic text-[11px] text-slate-700 mt-1">
            Ngày {day} tháng {month} năm {year}
          </div>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center my-6">
        <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-wide">
          Phiếu Đánh Giá Kết Quả Thực Tập Doanh Nghiệp
        </h1>
        <div className="text-[11px] italic text-slate-700 mt-0.5">
          (Dành cho Doanh nghiệp & Đơn vị tiếp nhận sinh viên thực tập)
        </div>
      </div>

      {/* I. THÔNG TIN CHUNG (ĐẶT NGAY ĐẦU BIỂU MẪU) */}
      <div className="space-y-2 mb-4">
        <div className="font-bold text-xs uppercase tracking-wider bg-slate-100 print:bg-slate-200 p-1.5 border border-black">
          I. Thông tin chung
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-2">
          <div className="col-span-2">
            1. Tên Doanh nghiệp: <strong>{internship.companyId?.name || internship.companyId?.companyName || '—'}</strong>
          </div>
          <div className="col-span-2">
            2. Địa chỉ: <span>{internship.companyId?.address || '—'}</span>
          </div>
          <div>
            3. Tên sinh viên thực tập: <strong className="text-sm">{internship.studentId?.userId?.fullName || '—'}</strong>
          </div>
          <div>
            MSSV: <strong className="font-mono">{internship.studentId?.studentCode || '—'}</strong> — Lớp: <span>{internship.studentId?.className || '—'}</span>
          </div>
          <div className="col-span-2">
            4. Lĩnh vực hoạt động chính của Doanh nghiệp:{' '}
            <span>{ev?.companyInfo?.businessField || 'Công nghệ thông tin'}</span>
          </div>
          <div className="col-span-2">
            5. Quy mô Doanh nghiệp:
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 pl-2 font-medium">
              {COMPANY_SIZE_OPTIONS.map((opt) => (
                <div key={opt} className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sm">
                    {currentSize === opt ? '☑' : '☐'}
                  </span>
                  <span>{opt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 1. CÔNG VIỆC THỰC TẬP */}
      <div className="space-y-2 mb-4">
        <div className="font-bold text-xs uppercase tracking-wider bg-slate-100 print:bg-slate-200 p-1.5 border border-black">
          1. Công việc thực tập hiện tại của Anh/Chị (A/C) tại doanh nghiệp là:
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 pl-2">
          {ALL_WORK_FIELDS.map((f) => {
            const isChecked =
              workFields.includes(f) ||
              (f === 'Khác (ghi rõ công việc)' && (workFields.includes('Khác') || Boolean(ev?.workFieldOther))) ||
              (f === 'Lập trình' && (internship.position?.toLowerCase().includes('lập trình') || internship.position?.toLowerCase().includes('developer') || internship.position?.toLowerCase().includes('dev'))) ||
              (f === 'Quản trị mạng' && internship.position?.toLowerCase().includes('mạng')) ||
              (f === 'Quản trị máy chủ' && (internship.position?.toLowerCase().includes('server') || internship.position?.toLowerCase().includes('system')));
            return (
              <div key={f} className="flex items-center gap-1.5 font-medium">
                <span className="font-mono font-bold text-sm">
                  {isChecked ? '☑' : '☐'}
                </span>
                <span>{f}</span>
              </div>
            );
          })}
          {ev?.workFieldOther && (
            <div className="w-full text-slate-700 italic pl-1 mt-0.5">
              (Ghi rõ công việc khác: {ev.workFieldOther})
            </div>
          )}
        </div>
      </div>

      {/* 2. YÊU CẦU CỦA NGƯỜI SỬ DỤNG */}
      <div className="space-y-1 mb-4">
        <div className="font-bold text-xs uppercase tracking-wider bg-slate-100 print:bg-slate-200 p-1.5 border border-black">
          2. Yêu cầu của người sử dụng (End User) liên quan đến công việc thực tập của A/C:
        </div>
        <div className="p-2 border border-slate-300 rounded min-h-[44px] italic text-slate-800">
          {ev?.requirements?.endUserRequirements || '—'}
        </div>
      </div>

      {/* 3. YÊU CẦU CỦA NGƯỜI LÃNH ĐẠO TRỰC TIẾP */}
      <div className="space-y-1 mb-4">
        <div className="font-bold text-xs uppercase tracking-wider bg-slate-100 print:bg-slate-200 p-1.5 border border-black">
          3. Yêu cầu của người lãnh đạo trực tiếp liên quan đến công việc thực tập của A/C:
        </div>
        <div className="p-2 border border-slate-300 rounded min-h-[44px] italic text-slate-800">
          {ev?.requirements?.leaderRequirements || '—'}
        </div>
      </div>

      {/* 4. ĐÁNH GIÁ MỤC TIÊU ĐÀO TẠO PEO */}
      <div className="space-y-2 mb-4">
        <div className="font-bold text-xs uppercase tracking-wider bg-slate-100 print:bg-slate-200 p-1.5 border border-black">
          4. A/C cho biết ý kiến về mục tiêu chương trình đào tạo CNTT (PEO):
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-50 print:bg-slate-100 text-center font-bold">
              <th className="border border-black p-1.5 w-14">Mục tiêu</th>
              <th className="border border-black p-1.5 w-72 text-left">Nội dung Chuẩn đầu ra PEO (Khoa CNTT - IUH)</th>
              <th className="border border-black p-1.5 text-left">Ý kiến / Nhận xét của Doanh nghiệp</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold text-indigo-950">PEO 1</td>
              <td className="border border-black p-1.5 leading-snug">
                Thể hiện kiến thức lý thuyết và thực hành cơ bản và chuyên sâu liên quan đến CNTT để đáp ứng những yêu cầu trong việc quản trị, bảo mật và phát triển các hệ thống IT cho tổ chức và doanh nghiệp.
              </td>
              <td className="border border-black p-1.5 italic text-slate-800">
                {ev?.requirements?.peo1 || '—'}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold text-indigo-950">PEO 2</td>
              <td className="border border-black p-1.5 leading-snug">
                Thể hiện khả năng làm việc hiệu quả với tư cách là thành viên hay lãnh đạo trong nhóm đa quốc gia trong môi trường chuyên nghiệp không ngừng thay đổi.
              </td>
              <td className="border border-black p-1.5 italic text-slate-800">
                {ev?.requirements?.peo2 || '—'}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold text-indigo-950">PEO 3</td>
              <td className="border border-black p-1.5 leading-snug">
                Thể hiện năng lực học tập suốt đời cũng như đạo đức tốt trong môi trường chuyên nghiệp.
              </td>
              <td className="border border-black p-1.5 italic text-slate-800">
                {ev?.requirements?.peo3 || '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. ĐÁNH GIÁ KHẢ NĂNG LÀM VIỆC NHÓM */}
      <div className="space-y-2 mb-4">
        <div className="font-bold text-xs uppercase tracking-wider bg-slate-100 print:bg-slate-200 p-1.5 border border-black">
          5. Đánh giá của quản lý trực tiếp về khả năng làm việc nhóm của thực tập viên:
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 pl-2 font-medium">
          {ALL_TEAMWORK_OPTIONS.map((opt) => {
            const isMatch =
              currentTeamwork === opt ||
              (opt === 'Ý kiến khác' && (currentTeamwork === 'Khác' || Boolean(ev?.teamworkOther)));
            return (
              <div key={opt} className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-sm">
                  {isMatch ? '☑' : '☐'}
                </span>
                <span>{opt}</span>
              </div>
            );
          })}
          {ev?.teamworkOther && (
            <div className="w-full text-slate-700 italic pl-1 mt-0.5">
              (Ý kiến khác: {ev.teamworkOther})
            </div>
          )}
        </div>
      </div>

      {/* ĐÁNH GIÁ KẾT QUẢ THỰC TẬP */}
      <div className="space-y-2 mb-4">
        <div className="font-bold text-xs uppercase tracking-wider bg-slate-100 print:bg-slate-200 p-1.5 border border-black">
          Đánh giá kết quả thực tập
        </div>

        <div className="p-2.5 border border-slate-300 rounded space-y-1.5">
          <div className="flex justify-between items-center">
            <div>
              <strong>Điểm đánh giá: </strong>
              <span className="text-sm font-bold">
                {ev?.score !== undefined && ev?.score !== null
                  ? `${Number(ev.score) % 1 === 0 ? Number(ev.score).toFixed(1) : ev.score}`
                  : '—'}{' '}
                / 10 điểm
              </span>
            </div>
            <div className="italic text-slate-700">
              (Bằng chữ: <strong>{numberToWords(ev?.score)}</strong>)
            </div>
          </div>
          <div>
            <strong>Nhận xét & kiến nghị của Doanh nghiệp:</strong>
            <p className="italic mt-1 pl-2 text-slate-800">
              "{ev?.comments || 'Sinh viên hoàn thành tốt đợt thực tập tốt nghiệp tại doanh nghiệp.'}"
            </p>
          </div>
        </div>
      </div>

      {/* PHẦN XÁC NHẬN CUỐI BIỂU MẪU: CHỈ CÓ DUY NHẤT QUẢN LÝ TRỰC TIẾP */}
      <div className="flex justify-end text-center text-xs mt-8 pt-2 page-break-inside-avoid">
        <div className="w-64 space-y-1">
          <div className="font-bold uppercase text-xs">
            Xác nhận của quản lý trực tiếp
          </div>
          <div className="text-[10px] text-slate-600 italic">
            (Ký, ghi rõ họ tên)
          </div>
          <div className="h-16 flex items-center justify-center font-serif italic text-slate-400">
            Ký tên
          </div>
          <div className="font-bold text-xs">
            {ev?.evaluatorInfo?.name || internship.mentorName || 'Quản lý trực tiếp'}
          </div>
          {ev?.evaluatorInfo?.position && (
            <div className="text-[10px] text-slate-500 font-medium">
              {ev.evaluatorInfo.position}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternshipEvaluationDoc;
