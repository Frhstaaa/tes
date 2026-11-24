export function PageWaves({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
    >
      {/* Full-width subtle top ambient wash */}
      <div
        className="absolute inset-x-0 top-0 h-[55vh] opacity-70 dark:opacity-100"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 15% 0%, color-mix(in srgb, var(--moss) 14%, transparent), transparent 70%), radial-gradient(ellipse 70% 55% at 88% 10%, color-mix(in srgb, var(--sand) 16%, transparent), transparent 70%)',
        }}
      />

      {/* Full-width subtle bottom wave */}
      <svg
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-36 w-full text-[#0B7A69]/[0.06] dark:text-[#0D9488]/[0.09] sm:h-48"
        fill="currentColor"
      >
        <path d="M0,120 C240,180 480,60 760,110 C1040,160 1240,80 1440,120 L1440,220 L0,220 Z" />
        <path
          d="M0,160 C320,110 620,200 960,150 C1180,118 1330,145 1440,170 L1440,220 L0,220 Z"
          opacity="0.65"
        />
      </svg>
    </div>
  );
}
