export function PageWaves({ className = '' }: { className?: string }) {
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 420 260"
        className={`pointer-events-none fixed top-0 right-0 z-0 h-56 w-72 text-[#B8DDD6]/55 dark:text-[#0B7A69]/18 md:h-72 md:w-96 ${className}`}
        fill="currentColor"
      >
        <path d="M160,0 C190,65 255,95 315,120 C365,140 400,175 420,235 L420,0 Z" />
        <path d="M235,0 C260,52 315,72 365,98 C395,114 410,145 420,180 L420,0 Z" opacity="0.55" />
      </svg>

      <svg
        aria-hidden="true"
        viewBox="0 0 420 220"
        className={`pointer-events-none fixed bottom-0 left-0 z-0 h-48 w-72 text-[#B8DDD6]/55 dark:text-[#0B7A69]/16 md:h-60 md:w-96 ${className}`}
        fill="currentColor"
      >
        <path d="M0,45 C75,68 125,115 190,145 C255,175 320,172 395,220 L0,220 Z" />
        <path d="M0,105 C55,125 95,155 160,182 C215,205 270,208 320,220 L0,220 Z" opacity="0.55" />
      </svg>
    </>
  );
}
