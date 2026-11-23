import { Link, Outlet } from 'react-router-dom';
import { Download } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useAuthModalStore } from '@/stores/useAuthModalStore';
import { AuthModal } from '@/features/auth/AuthModal';

export function PublicLayout() {
  const { canInstall, install } = usePwaInstall();
  const openModal = useAuthModalStore((s) => s.openModal);

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)]">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-10 lg:px-12">
          <Link to="/" aria-label="Beranda Meetingkeun">
            <BrandLogo size="sm" />
          </Link>

          <div className="flex items-center gap-2">
            {canInstall && (
              <button
                type="button"
                onClick={() => install()}
                className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-2)]/80"
              >
                <Download className="h-3.5 w-3.5 text-[var(--moss)]" strokeWidth={1.75} />
                <span className="hidden sm:inline">Pasang di HP</span>
                <span className="sm:hidden">Pasang</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openModal('login')}
              className="inline-flex min-h-[40px] cursor-pointer items-center rounded-[10px] px-3.5 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => openModal('register')}
              className="inline-flex min-h-[40px] cursor-pointer items-center rounded-[10px] bg-[var(--moss)] px-4 text-sm font-medium text-[var(--moss-fg)] hover:bg-[var(--moss-hover)]"
            >
              Mulai sekarang
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 md:px-10 md:py-12 lg:px-12">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--line)] py-5">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 text-xs text-[var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between md:px-10 lg:px-12">
          <span>Meetingkeun — dibuat oleh Tiyas Frahesta</span>
          <span>Ruang video meeting berbasis web</span>
        </div>
      </footer>

      <AuthModal />
    </div>
  );
}
