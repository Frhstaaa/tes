export function PageWaves({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 h-dvh w-screen overflow-hidden transform-gpu ${className}`}
    >
      {/* Full-viewport soft ambient radial glows synced to theme */}
      <div
        className="absolute -top-24 -right-24 h-[60vh] w-[60vw] rounded-full blur-3xl"
        style={{ background: 'var(--moss)', opacity: 0.08 }}
      />
      <div
        className="absolute -bottom-24 -left-24 h-[55vh] w-[55vw] rounded-full blur-3xl"
        style={{ background: 'var(--moss)', opacity: 0.08 }}
      />
      <div
        className="absolute top-1/3 left-1/2 h-[45vh] w-[50vw] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'var(--sand)', opacity: 0.08 }}
      />

      {/* Top full-width layered wave synced to app theme (--moss & --sand) */}
      <svg
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 h-[26vh] min-h-[150px] w-full sm:h-[32vh]"
      >
        <path
          d="M0,0 L1440,0 L1440,120 C1200,190 960,55 680,120 C420,180 200,145 0,90 Z"
          style={{ fill: 'var(--moss)', opacity: 0.11 }}
        />
        <path
          d="M0,0 L1440,0 L1440,70 C1180,135 880,28 560,82 C300,125 140,105 0,58 Z"
          style={{ fill: 'var(--sand)', opacity: 0.14 }}
        />
      </svg>

      {/* Bottom full-width layered wave synced to app theme (--moss & --sand) */}
      <svg
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[26vh] min-h-[150px] w-full sm:h-[32vh]"
      >
        <path
          d="M0,125 C240,195 520,70 820,125 C1090,175 1280,105 1440,135 L1440,240 L0,240 Z"
          style={{ fill: 'var(--moss)', opacity: 0.12 }}
        />
        <path
          d="M0,175 C320,125 620,210 940,160 C1160,128 1320,158 1440,185 L1440,240 L0,240 Z"
          style={{ fill: 'var(--sand)', opacity: 0.14 }}
        />
      </svg>
    </div>
  );
}
