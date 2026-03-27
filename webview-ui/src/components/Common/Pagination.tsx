import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) { return null; }

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) { pages.push(i); }
  } else {
    pages.push(1);
    if (currentPage > 3) { pages.push('...'); }
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) { pages.push('...'); }
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center gap-1 justify-center mt-4">
      <button
        className="btn-secondary px-2 py-1 text-xs"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        ←
      </button>
      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 opacity-50">…</span>
        ) : (
          <button
            key={page}
            className={`px-2 py-1 text-xs rounded ${
              page === currentPage ? 'btn-primary' : 'btn-secondary'
            }`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        )
      )}
      <button
        className="btn-secondary px-2 py-1 text-xs"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        →
      </button>
    </div>
  );
}
