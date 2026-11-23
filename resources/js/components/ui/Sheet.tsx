import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { motionTokens } from '@/lib/motionTokens';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
            className="fixed inset-0 bg-[#16211C]/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: motionTokens.distance.sheet, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: motionTokens.distance.sheet, opacity: 0 }}
            transition={{
              duration: motionTokens.duration.normal,
              ease: motionTokens.easing.smooth,
            }}
            className="relative z-10 w-full max-w-lg rounded-t-[16px] sm:rounded-[16px] border border-[var(--line)] bg-[var(--paper)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[var(--ink)] max-h-[90dvh] overflow-y-auto"
          >
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <h2 className="font-display text-lg font-semibold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-[var(--ink-soft)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
