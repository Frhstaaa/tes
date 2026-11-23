import { Link, useLocation, useParams } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/features/auth/useAuth';

export function FinishedPage() {
  const { kode = '' } = useParams<{ kode: string }>();
  const location = useLocation();
  const { user } = useAuth();

  const durationMs = (location.state as { durationMs?: number } | null)?.durationMs;
  const minutes = durationMs ? Math.max(1, Math.round(durationMs / 60000)) : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--paper)] p-6 text-center text-[var(--ink)]">
      <div className="w-full max-w-sm space-y-6 rounded-[16px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-6 sm:p-8">
        <div className="flex justify-center">
          <BrandLogo size="sm" />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--moss)]">
            {kode}
          </p>
          <h1 className="font-display text-3xl font-bold">Meeting selesai.</h1>
          {minutes !== null && (
            <p className="text-sm text-[var(--ink-soft)]">
              Kamu berada di ruang selama <span className="font-mono font-medium text-[var(--ink)]">{minutes} menit</span>.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Link to={`/m/${kode}`}>
            <Button variant="outline" size="lg" className="w-full">
              <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
              <span>Gabung lagi</span>
            </Button>
          </Link>

          <Link to={user ? '/beranda' : '/'}>
            <Button variant="primary" size="lg" className="w-full">
              Kembali ke beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
