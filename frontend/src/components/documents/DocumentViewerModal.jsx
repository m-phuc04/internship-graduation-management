import React from 'react';
import { Printer, Download, X } from 'lucide-react';

const DocumentViewerModal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-5xl bg-slate-100 rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 my-auto flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white">
        {/* Top Floating Action Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shrink-0 print:hidden border-b border-slate-800 shadow-md">
          <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm">
            <span>{title || 'Xem trước Biểu mẫu Thực tập'}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-sm"
              title="In biểu mẫu này"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">In biểu mẫu</span>
            </button>

            {/* Export PDF Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
              title="Xuất file PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition ml-2"
              title="Đóng xem trước"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Printable Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;
