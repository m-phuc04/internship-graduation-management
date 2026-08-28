import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  pagination,
  currentPage,
  totalPages: propTotalPages,
  total: propTotal,
  limit: propLimit,
  onPageChange,
}) => {
  // Normalize pagination props (support both object and separate props)
  const page = currentPage || pagination?.page || 1;
  const totalPages = propTotalPages || pagination?.totalPages || 1;
  const total = propTotal ?? pagination?.total ?? 0;
  const limit = propLimit || pagination?.limit || 10;

  if (totalPages <= 1) return null;

  const from = Math.max(1, (page - 1) * limit + 1);
  const to = total > 0 ? Math.min(page * limit, total) : page * limit;

  // Generate page numbers
  const pages = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const handlePageClick = (targetPage, e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (targetPage >= 1 && targetPage <= totalPages && targetPage !== page) {
      if (onPageChange) {
        onPageChange(targetPage);
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
      <div className="text-xs text-slate-500 font-medium">
        Hiển thị <span className="text-slate-800 font-semibold">{from}</span> -{' '}
        <span className="text-slate-800 font-semibold">{to}</span>
        {total > 0 && (
          <>
            {' '}trong tổng số <span className="text-slate-800 font-semibold">{total}</span> mục
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => handlePageClick(page - 1, e)}
          disabled={page <= 1}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => handlePageClick(1, e)}
              className="w-8 h-8 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              1
            </button>
            {startPage > 2 && <span className="text-slate-400 text-xs px-1">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={(e) => handlePageClick(p, e)}
            className={`w-8 h-8 text-xs font-semibold rounded-lg transition cursor-pointer ${
              p === page
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="text-slate-400 text-xs px-1">...</span>
            )}
            <button
              type="button"
              onClick={(e) => handlePageClick(totalPages, e)}
              className="w-8 h-8 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={(e) => handlePageClick(page + 1, e)}
          disabled={page >= totalPages}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
          title="Trang sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
