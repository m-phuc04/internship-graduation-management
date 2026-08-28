import React from 'react';

const InternshipConfirmationDoc = ({ docData }) => {
  if (!docData) return null;

  const {
    lecturer,
    company,
    startDate,
    endDate,
    totalWeeks,
    totalStudents,
    students = [],
  } = docData;

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

  return (
    <div className="bg-white text-black p-8 sm:p-12 max-w-4xl mx-auto shadow-lg print:shadow-none print:p-0 print:max-w-none text-sm leading-relaxed font-serif">
      {/* Header with University and National Motto */}
      <div className="flex justify-between items-start pb-6 border-b border-black/80">
        <div className="text-center font-bold text-xs uppercase tracking-tight">
          <div>Bộ Giáo Dục và Đào Tạo</div>
          <div className="text-sm font-extrabold mt-0.5">
            Trường ĐH Công Nghiệp TP.HCM
          </div>
          <div className="text-xs font-semibold text-slate-800">
            Khoa Công Nghệ Thông Tin
          </div>
          <div className="w-24 h-0.5 bg-black mx-auto mt-1" />
        </div>

        <div className="text-center text-xs">
          <div className="font-bold uppercase tracking-wider text-xs">
            Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam
          </div>
          <div className="font-semibold text-xs mt-0.5">
            Độc lập - Tự do - Hạnh phúc
          </div>
          <div className="w-32 h-0.5 bg-black mx-auto mt-1" />
          <div className="italic text-[11px] text-slate-700 mt-2">
            TP. Hồ Chí Minh, ngày {day} tháng {month} năm {year}
          </div>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center my-8">
        <h1 className="text-xl font-extrabold uppercase tracking-wide">
          Giấy Xác Nhận Hướng Dẫn Thực Tập Doanh Nghiệp
        </h1>
        <div className="text-xs italic text-slate-700 mt-1">
          Học kỳ 1 — Năm học 2026 - 2027
        </div>
      </div>

      {/* Lecturer & Company Information */}
      <div className="space-y-3 mb-6 text-xs leading-relaxed">
        <p>
          Khoa Công nghệ Thông tin — Trường Đại học Công nghiệp TP. Hồ Chí Minh
          trân trọng xác nhận việc phân công Giảng viên hướng dẫn thực tập doanh
          nghiệp (TTDN) với các thông tin chi tiết như sau:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 p-4 rounded-xl border border-slate-300 bg-slate-50/50 print:bg-transparent">
          <div>
            Họ và tên Giảng viên:{' '}
            <strong className="text-black">
              {lecturer?.academicTitle} {lecturer?.fullName}
            </strong>
          </div>
          <div>
            Mã số Giảng viên:{' '}
            <strong className="font-mono">{lecturer?.lecturerCode}</strong>
          </div>
          <div>
            Đơn vị công tác:{' '}
            <strong>{lecturer?.faculty || 'Khoa CNTT'}</strong>
          </div>
          <div>
            Email liên hệ: <strong>{lecturer?.email || '—'}</strong>
          </div>
          <div className="sm:col-span-2">
            Đơn vị tiếp nhận thực tập:{' '}
            <strong>{company?.name || 'Doanh nghiệp đối tác'}</strong>
          </div>
          <div className="sm:col-span-2">
            Địa chỉ thực tập: <span>{company?.address || '—'}</span>
          </div>
          <div className="sm:col-span-2">
            Thời gian thực tập: Từ ngày <strong>{formatDate(startDate)}</strong>{' '}
            đến ngày <strong>{formatDate(endDate)}</strong> (Tổng cộng:{' '}
            <strong>{totalWeeks} tuần</strong>).
          </div>
        </div>
      </div>

      {/* Student List Table */}
      <div className="mb-8">
        <div className="font-bold text-xs uppercase tracking-wider mb-2">
          Danh sách sinh viên thực tập được phân công (Tổng số: {totalStudents}{' '}
          sinh viên):
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-200 text-center font-bold">
              <th className="border border-black p-2 w-10">STT</th>
              <th className="border border-black p-2">Họ và tên sinh viên</th>
              <th className="border border-black p-2 w-28">Mã số SV</th>
              <th className="border border-black p-2 w-24">Lớp</th>
              <th className="border border-black p-2">Vị trí thực tập</th>
              <th className="border border-black p-2 w-32">Khoa / Ngành</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border border-black p-4 text-center text-slate-500 italic"
                >
                  Chưa có sinh viên nào trong danh sách hướng dẫn.
                </td>
              </tr>
            ) : (
              students.map((st, idx) => (
                <tr key={st.studentCode || idx} className="text-center">
                  <td className="border border-black p-2 font-mono">{idx + 1}</td>
                  <td className="border border-black p-2 text-left font-semibold">
                    {st.fullName}
                  </td>
                  <td className="border border-black p-2 font-mono font-bold">
                    {st.studentCode}
                  </td>
                  <td className="border border-black p-2 font-mono">{st.className}</td>
                  <td className="border border-black p-2 text-left">
                    {st.position}
                  </td>
                  <td className="border border-black p-2 text-slate-700">
                    Công nghệ Thông tin
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-3 gap-4 text-center text-xs mt-12 pt-4 page-break-inside-avoid">
        <div>
          <div className="font-bold uppercase">Trưởng Khoa / Bộ Môn</div>
          <div className="text-[11px] text-slate-600 italic">
            (Ký và ghi rõ họ tên)
          </div>
          <div className="h-20" />
          <div className="font-semibold text-slate-800">
            TS. Nguyễn Văn Quản (TBM)
          </div>
        </div>

        <div>
          <div className="font-bold uppercase">Đại Diện Doanh Nghiệp</div>
          <div className="text-[11px] text-slate-600 italic">
            (Ký tên và đóng dấu)
          </div>
          <div className="h-20" />
          <div className="font-semibold text-slate-800">
            {company?.contactPerson || 'Ban Giám Đốc'}
          </div>
        </div>

        <div>
          <div className="font-bold uppercase">Giảng Viên Hướng Dẫn</div>
          <div className="text-[11px] text-slate-600 italic">
            (Ký và ghi rõ họ tên)
          </div>
          <div className="h-20" />
          <div className="font-bold text-black">
            {lecturer?.academicTitle} {lecturer?.fullName}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternshipConfirmationDoc;
