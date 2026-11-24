import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { motionTokens } from '@/lib/motionTokens';
import { cn } from '@/lib/cn';

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -motionTokens.distance.sm }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -motionTokens.distance.sm }}
            transition={{
              duration: motionTokens.duration.fast,
              ease: motionTokens.easing.smooth,
            }}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-[14px] border px-4 py-3 text-sm font-medium shadow-[0_12px_28px_rgba(15,23,42,0.16)]',
              toast.tone === 'danger'
                ? 'border-[var(--clay)] bg-[var(--clay)] text-white'
                : toast.tone === 'success'
                  ? 'border-[var(--moss)] bg-[var(--moss)] text-white'
                  : 'border-[var(--line)] bg-[var(--ink)] text-[var(--paper)]'
            )}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Tutup notifikasi"
              className="rounded p-1 opacity-80 hover:opacity-100 cursor-pointer"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
