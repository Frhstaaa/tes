import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Home, LogOut, ShieldCheck, User as UserIcon, Video } from 'lucide-react';
import { cn } from '@/lib/cn';
import { BrandLogo } from '@/components/BrandLogo';
import { PageWaves } from '@/components/PageWaves';
import { useAuth } from '@/features/auth/useAuth';

const NAV_ITEMS = [
  { to: '/beranda', label: 'Beranda', icon: Home },
  { to: '/jadwal', label: 'Jadwal', icon: Calendar },
  { to: '/riwayat', label: 'Riwayat', icon: Clock },
  { to: '/akun', label: 'Akun', icon: UserIcon },
];

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout, isLoggingOut } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/masuk', { replace: true });
    }
  };

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#F2F8F7] text-[#1E293B] dark:bg-[#111B18] dark:text-[#F1F5F9] md:flex">
      {/* Organic Flowing Teal/Mint Background Waves (matches reference mockup) */}
      <PageWaves />

      {/* Desktop Sidebar */}
      <aside className="relative z-10 hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-[#DCEBE8] md:bg-white/85 md:px-4 md:py-6 md:backdrop-blur-md dark:md:border-[#22352F] dark:md:bg-[#15221E]/90">
        <div className="mb-8 px-2">
          <BrandLogo size="md" />
        </div>

        <nav className="flex flex-1 flex-col gap-1.5" aria-label="Navigasi utama">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center gap-3 rounded-[12px] px-3.5 text-[15px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#0B7A69]/10 font-semibold text-[#0B7A69] shadow-2xs dark:bg-[#0B7A69]/25 dark:text-[#6EE7B7]'
                    : 'text-[#64748B] hover:bg-[#E7F3F0]/70 hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:bg-[#1D2F29] dark:hover:text-[#F1F5F9]'
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.85} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}

          {isSuperadmin && (
            <div className="mt-4 border-t border-[#DCEBE8] pt-4 dark:border-[#22352F]">
              <p className="mb-1.5 px-3 font-mono text-[11px] uppercase tracking-wider text-[#64748B]">
                Superadmin
              </p>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[44px] items-center gap-3 rounded-[12px] px-3.5 text-[15px] font-medium transition-all duration-150',
                    isActive
                      ? 'bg-[#0B7A69]/10 font-semibold text-[#0B7A69] dark:bg-[#0B7A69]/25 dark:text-[#6EE7B7]'
                      : 'text-[#64748B] hover:bg-[#E7F3F0]/70 hover:text-[#1E293B] dark:text-[#94A3B8]'
                  )
                }
              >
                <ShieldCheck className="h-5 w-5 text-[#0B7A69] dark:text-[#6EE7B7]" strokeWidth={1.85} aria-hidden="true" />
                <span>Kelola Pengguna</span>
              </NavLink>
            </div>
          )}
        </nav>

        <div className="mt-6 border-t border-[#DCEBE8] pt-4 dark:border-[#22352F]">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-sm font-medium text-[#64748B] transition-colors hover:bg-[#FEE2E2]/60 hover:text-[#B91C1C] dark:text-[#94A3B8] dark:hover:bg-[#3B1D1D] dark:hover:text-[#FCA5A5]"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.85} />
            <span>{isLoggingOut ? 'Keluar...' : 'Keluar akun'}</span>
          </button>
          <p className="mt-3 px-2 text-xs text-[#64748B]">
            MeetingKeun — oleh Tiyas Frahesta
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 min-w-0 flex-1 pb-[calc(92px+env(safe-area-inset-bottom))] md:pb-10">
        {/* Mobile Top Header (matches reference: Teal Logo Icon + MeetingKeun + White Logout Square) */}
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pt-5 pb-2 md:hidden">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#10937F] to-[#086254] text-white shadow-sm">
              <Video className="h-5 w-5 fill-white/95" strokeWidth={1.8} />
            </span>
            <span className="font-display text-[17px] font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9]">
              MeetingKeun
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Keluar dari akun"
            title="Keluar dari akun"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[12px] border border-[#DCEAE7] bg-white text-[#1E293B] shadow-[0_4px_12px_rgba(15,23,42,0.05)] transition-colors hover:bg-[#F8FCFB] dark:border-[#263C35] dark:bg-[#192823] dark:text-[#F1F5F9]"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
        </div>

        <div className="mx-auto w-full max-w-2xl px-5 py-4 md:max-w-5xl md:px-10 md:py-8 lg:px-12">
          <Outlet />
        </div>
      </main>

      {/* Mobile Floating Pill Bottom Navigation (matches reference mockup) */}
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 rounded-full border border-[#E2EFEC] bg-white/95 px-2 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.09)] backdrop-blur-md dark:border-[#243832] dark:bg-[#172420]/95">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex min-h-[50px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-150',
                  isActive
                    ? 'font-semibold text-[#0B7A69] dark:text-[#5EEAD4]'
                    : 'text-[#64748B] dark:text-[#94A3B8]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('h-5 w-5', isActive && 'fill-[#0B7A69]/15')}
                    strokeWidth={isActive ? 2.1 : 1.75}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 h-[3px] w-7 rounded-full bg-[#0B7A69] dark:bg-[#5EEAD4]"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
