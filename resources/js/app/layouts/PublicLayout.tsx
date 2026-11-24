import { Link, Outlet } from 'react-router-dom';
import { Download } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { PageWaves } from '@/components/PageWaves';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useAuthModalStore } from '@/stores/useAuthModalStore';
import { AuthModal } from '@/features/auth/AuthModal';

export function PublicLayout() {
  const { canInstall, install } = usePwaInstall();
  const openModal = useAuthModalStore((s) => s.openModal);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[var(--paper)] text-[var(--ink)]">
      {/* Organic Flowing Teal/Mint Background Waves */}
      <PageWaves />

      <header className="relative z-10 border-b border-[var(--line)] bg-[var(--paper)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-2 px-4 sm:px-6 lg:px-12">
          <Link to="/" aria-label="Beranda Meetingkeun" className="shrink-0">
            <BrandLogo size="sm" />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {canInstall && (
              <button
                type="button"
                onClick={() => install()}
                className="hidden sm:inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-2)]/80"
              >
                <Download className="h-3.5 w-3.5 text-[var(--moss)]" strokeWidth={1.75} />
                <span>Pasang di HP</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openModal('login')}
              className="inline-flex min-h-[40px] cursor-pointer items-center whitespace-nowrap rounded-[10px] px-3 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => openModal('register')}
              className="inline-flex min-h-[40px] cursor-pointer items-center whitespace-nowrap rounded-[10px] bg-[var(--moss)] px-3.5 text-sm font-medium text-[var(--moss-fg)] hover:bg-[var(--moss-hover)] sm:px-4"
            >
              <span className="sm:hidden">Daftar</span>
              <span className="hidden sm:inline">Mulai sekarang</span>
            </button>
          </div>
        </div>
      </header>

      {canInstall && (
        <div className="border-b border-[var(--line)] bg-[var(--paper-2)]/70 px-4 py-2.5 sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[var(--ink)]">
              Pasang Meetingkeun di layar utama HP
            </span>
            <button
              type="button"
              onClick={() => install()}
              className="inline-flex min-h-[34px] shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] bg-[var(--moss)] px-3 text-xs font-medium text-[var(--moss-fg)]"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Pasang</span>
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 sm:px-6 md:py-10 lg:px-12">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-[var(--line)] bg-[var(--paper)]/80 py-5 backdrop-blur-xs">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-4 text-xs text-[var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-12">
          <span>Meetingkeun — dibuat oleh Tiyas Frahesta</span>
          <span>Ruang video meeting berbasis web</span>
        </div>
      </footer>

      <AuthModal />
    </div>
  );
}
