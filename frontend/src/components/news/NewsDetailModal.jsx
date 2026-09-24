import React from 'react';
import { X, Calendar, User, Eye, Tag, Share2 } from 'lucide-react';
import IUHLogo from '../common/IUHLogo';

const NewsDetailModal = ({ news, isOpen, onClose }) => {
  if (!isOpen || !news) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'THONG_BAO':
        return {
          label: 'Thông Báo',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'SU_KIEN':
        return {
          label: 'Sự Kiện',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'TIN_TUC':
      default:
        return {
          label: 'Tin Tức',
          className: 'bg-blue-50 text-[#153898] border-blue-200',
        };
    }
  };

  const badge = getCategoryBadge(news.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <IUHLogo className="h-6 w-auto object-contain" />
            <div>
              <div className="text-xs font-bold text-slate-800">Khoa Công Nghệ Thông Tin</div>
              <div className="text-[10.5px] text-slate-500">Cổng thông tin & Sự kiện</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
          {/* Category & Meta */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${badge.className}`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{badge.label}</span>
            </span>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDate(news.publishedAt || news.createdAt)}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{news.authorName || news.authorId?.fullName || 'Khoa CNTT'}</span>
            </div>

            {news.views !== undefined && (
              <div className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
                <Eye className="w-3.5 h-3.5" />
                <span>{news.views} lượt xem</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight">
            {news.title}
          </h2>

          {/* Summary Quote */}
          {news.summary && (
            <div className="p-4 rounded-2xl bg-blue-50/70 border-l-4 border-[#153898] text-slate-700 text-xs sm:text-sm font-medium leading-relaxed">
              {news.summary}
            </div>
          )}

          {/* Full Content */}
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-4 font-normal">
            {news.content}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="text-xs text-slate-400">
            © Khoa Công nghệ Thông tin - Trường ĐH Công nghiệp TP.HCM
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsDetailModal;
