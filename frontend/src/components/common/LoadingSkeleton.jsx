import React from 'react';

export const LoadingSkeleton = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full animate-pulse space-y-3 py-2">
      {/* Header row */}
      <div className="h-10 bg-slate-100/80 rounded-xl w-full" />
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 py-3 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className={`h-4 bg-slate-200/70 rounded-md ${
                cIdx === 0 ? 'w-12' : cIdx === 1 ? 'w-36' : 'flex-1'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
