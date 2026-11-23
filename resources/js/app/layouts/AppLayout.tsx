import { NavLink, Outlet } from 'react-router-dom';
import { Calendar, Clock, Home, ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/features/auth/useAuth';

const NAV_ITEMS = [
  { to: '/beranda', label: 'Beranda', icon: Home },
  { to: '/jadwal', label: 'Jadwal', icon: Calendar },
  { to: '/riwayat', label: 'Riwayat', icon: Clock },
  { to: '/akun', label: 'Akun', icon: UserIcon },
];

export function AppLayout() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)] md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-[var(--line)] md:bg-[var(--paper)] md:px-4 md:py-6">
        <div className="mb-8 px-2">
          <BrandLogo size="md" />
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Navigasi utama">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-colors duration-150',
                  isActive
                    ? 'border border-[var(--line)] bg-[var(--paper-2)] text-[var(--ink)]'
                    : 'text-[var(--ink-soft)] hover:bg-[var(--paper-2)]/60 hover:text-[var(--ink)]'
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}

          {isSuperadmin && (
            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <p className="mb-1.5 px-3 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)]">
                Superadmin
              </p>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-colors duration-150',
                    isActive
                      ? 'border border-[var(--line)] bg-[var(--paper-2)] text-[var(--ink)]'
                      : 'text-[var(--ink-soft)] hover:bg-[var(--paper-2)]/60 hover:text-[var(--ink)]'
                  )
                }
              >
                <ShieldCheck className="h-5 w-5 text-[var(--moss)] dark:text-[var(--moss-light)]" strokeWidth={1.75} aria-hidden="true" />
                <span>Kelola Pengguna</span>
              </NavLink>
            </div>
          )}
        </nav>

        <p className="mt-6 border-t border-[var(--line)] px-2 pt-4 text-xs text-[var(--ink-soft)]">
          Meetingkeun — dibuat oleh Tiyas Frahesta
        </p>
      </aside>

      {/* Main content — compact on mobile, full-width on desktop */}
      <main className="min-w-0 flex-1 pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-10">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 md:max-w-none md:px-10 md:py-8 lg:px-12">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation (unchanged 4 items) */}
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--paper)] pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150',
                  isActive ? 'text-[var(--moss)] dark:text-[var(--moss-light)]' : 'text-[var(--ink-soft)]'
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
