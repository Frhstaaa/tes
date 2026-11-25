import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
}

function getPageNumbers(current: number, last: number): Array<number | 'ellipsis'> {
  if (last <= 5) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }
  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);

  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < last - 1) pages.push('ellipsis');
  pages.push(last);

  return pages;
}

export function Pagination({
  currentPage,
  lastPage,
  total,
  perPage,
  onPageChange,
  isFetching = false,
}: PaginationProps) {
  if (lastPage <= 1) return null;

  const from = (currentPage - 1) * perPage + 1;
  const to = Math.min(total, currentPage * perPage);
  const pages = getPageNumbers(currentPage, lastPage);

  return (
    <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
      <p className="text-xs text-[var(--ink-soft)]">
        Menampilkan <span className="font-mono font-medium text-[var(--ink)]">{from}–{to}</span> dari{' '}
        <span className="font-mono font-medium text-[var(--ink)]">{total}</span> data
      </p>

      <nav className="flex items-center gap-1.5" aria-label="Navigasi halaman">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isFetching}
          aria-label="Halaman sebelumnya"
          className="inline-flex h-10 min-w-[40px] cursor-pointer items-center justify-center gap-1 rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)] px-3 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--moss)]/45 hover:bg-[#F5FBF9] disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-[#1D2E29]"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e-${idx}`} className="px-1.5 font-mono text-xs text-[var(--ink-soft)]">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              disabled={isFetching}
              aria-current={p === currentPage ? 'page' : undefined}
              className={cn(
                'inline-flex h-10 min-w-[40px] cursor-pointer items-center justify-center rounded-[12px] border px-2.5 font-mono text-xs font-semibold transition-all',
                p === currentPage
                  ? 'border-[var(--moss)] bg-gradient-to-r from-[#0C7D6C] to-[#075D50] text-white shadow-[0_6px_16px_rgba(11,122,105,0.2)]'
                  : 'border-[var(--line)] bg-[var(--paper-2)] text-[var(--ink)] hover:border-[var(--moss)]/45 hover:bg-[#F5FBF9] dark:hover:bg-[#1D2E29]'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage || isFetching}
          aria-label="Halaman berikutnya"
          className="inline-flex h-10 min-w-[40px] cursor-pointer items-center justify-center gap-1 rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)] px-3 text-xs font-semibold text-[var(--ink)] transition-colors hover:border-[var(--moss)]/45 hover:bg-[#F5FBF9] disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-[#1D2E29]"
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </nav>
    </div>
  );
}
