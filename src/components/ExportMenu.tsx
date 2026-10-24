export function ExportMenu({ scopeLabel }: { scopeLabel: string }) {
  return (
    <details className="relative" data-tour="export">
      <summary className="btn btn-quiet !min-h-9 cursor-pointer list-none !px-3 !text-sm [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
          <path d="M8 2v8m0 0L5 7m3 3 3-3M3 12.5h10" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        Export
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-64 border border-rule bg-sheet p-1 shadow-[0_8px_20px_rgba(6,38,61,0.12)]">
        <p className="px-3 pb-1 pt-2 text-xs text-ink-soft">{scopeLabel}</p>
        <a href="/api/export?format=xlsx" className="block px-3 py-2.5 text-sm hover:bg-navy-wash" download>
          Excel workbook <span className="text-ink-soft">(.xlsx)</span>
        </a>
        <a href="/api/export?format=csv" className="block px-3 py-2.5 text-sm hover:bg-navy-wash" download>
          Ratings as CSV <span className="text-ink-soft">(.csv)</span>
        </a>
      </div>
    </details>
  );
}
