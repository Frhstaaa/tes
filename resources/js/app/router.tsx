import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from '@/features/auth/LandingPage';
import { useAuthModalStore, type AuthModalMode } from '@/stores/useAuthModalStore';

const HomePage = lazy(() =>
  import('@/features/meetings/HomePage').then((m) => ({ default: m.HomePage }))
);
const SchedulePage = lazy(() =>
  import('@/features/meetings/SchedulePage').then((m) => ({ default: m.SchedulePage }))
);
const HistoryPage = lazy(() =>
  import('@/features/history/HistoryPage').then((m) => ({ default: m.HistoryPage }))
);
const AccountPage = lazy(() =>
  import('@/features/auth/AccountPage').then((m) => ({ default: m.AccountPage }))
);
const AdminUsersPage = lazy(() =>
  import('@/features/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage }))
);

const PrejoinPage = lazy(() =>
  import('@/features/prejoin/PrejoinPage').then((m) => ({ default: m.PrejoinPage }))
);
const JitsiRoomPage = lazy(() =>
  import('@/features/room/JitsiRoomPage').then((m) => ({ default: m.JitsiRoomPage }))
);
const FinishedPage = lazy(() =>
  import('@/features/room/FinishedPage').then((m) => ({ default: m.FinishedPage }))
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--paper)] text-sm text-[var(--ink-soft)]">
        Memuat...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/masuk" replace />;
  }
  return <>{children}</>;
}

function GuestOnlyLanding({ initialModal }: { initialModal?: AuthModalMode }) {
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const openModal = useAuthModalStore((s) => s.openModal);

  useEffect(() => {
    if (initialModal && !user && !isLoading) {
      openModal(initialModal);
    }
  }, [initialModal, user, isLoading, openModal]);

  // Support legacy vcon query links (?r=room&u=name or ?q=room/name)
  const qParam = searchParams.get('q');
  const rParam = searchParams.get('r') || (qParam ? qParam.split('/')[0] : '');
  const uParam = searchParams.get('u') || (qParam ? qParam.split('/')[1] ?? '' : '');

  if (rParam) {
    const target = uParam
      ? `/m/${encodeURIComponent(rParam)}?u=${encodeURIComponent(uParam)}`
      : `/m/${encodeURIComponent(rParam)}`;
    return <Navigate to={target} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--paper)] text-sm text-[var(--ink-soft)]">
        Memuat...
      </div>
    );
  }
  if (user) {
    return <Navigate to="/beranda" replace />;
  }
  return <LandingPage />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-[var(--paper)] text-sm text-[var(--ink-soft)]">
            Memuat...
          </div>
        }
      >
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<GuestOnlyLanding />} />
            <Route path="/masuk" element={<GuestOnlyLanding initialModal="login" />} />
            <Route path="/daftar" element={<GuestOnlyLanding initialModal="register" />} />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/beranda" element={<HomePage />} />
            <Route path="/jadwal" element={<SchedulePage />} />
            <Route path="/riwayat" element={<HistoryPage />} />
            <Route path="/akun" element={<AccountPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          <Route path="/m/:kode" element={<PrejoinPage />} />
          <Route path="/m/:kode/ruang" element={<JitsiRoomPage />} />
          <Route path="/m/:kode/selesai" element={<FinishedPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
