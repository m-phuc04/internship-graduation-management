import React from 'react';
import { Inbox, Plus } from 'lucide-react';

const EmptyState = ({
  title = 'Không có dữ liệu',
  description = 'Chưa có bản ghi nào phù hợp với điều kiện tìm kiếm hoặc bộ lọc.',
  actionText,
  onAction,
  icon: Icon = Inbox,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100/80 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-4 shadow-xs">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-semibold text-slate-900 mb-1">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-indigo-200 transition"
        >
          <Plus className="w-4 h-4" />
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
