export function PageWaves({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
    >
      {/* Top full-width layered wave */}
      <svg
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 h-32 w-full text-[#B8DDD6] opacity-55 dark:text-[#0D9488] dark:opacity-15 sm:h-44"
        fill="currentColor"
      >
        <path d="M0,0 L1440,0 L1440,95 C1200,155 960,40 680,95 C420,146 200,120 0,70 Z" />
        <path
          d="M0,0 L1440,0 L1440,55 C1180,110 880,20 560,65 C300,102 140,85 0,45 Z"
          opacity="0.6"
        />
      </svg>

      {/* Bottom full-width layered wave */}
      <svg
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-36 w-full text-[#B8DDD6] opacity-60 dark:text-[#0D9488] dark:opacity-15 sm:h-48"
        fill="currentColor"
      >
        <path d="M0,125 C240,185 520,75 820,125 C1090,170 1280,105 1440,130 L1440,220 L0,220 Z" />
        <path
          d="M0,165 C320,120 620,200 940,155 C1160,124 1320,150 1440,175 L1440,220 L0,220 Z"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
