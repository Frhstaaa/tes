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
              'pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-[10px] border px-3.5 py-2.5 text-sm font-medium',
              toast.tone === 'danger'
                ? 'border-[var(--clay)] bg-[var(--clay)] text-[#F6F2E9]'
                : toast.tone === 'success'
                  ? 'border-[var(--moss)] bg-[var(--moss)] text-[#F6F2E9]'
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
