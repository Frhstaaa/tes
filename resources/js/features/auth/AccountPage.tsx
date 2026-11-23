import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Download, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { useAuth } from './useAuth';
import { useThemeStore } from '@/stores/useThemeStore';
import { useToastStore } from '@/stores/useToastStore';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { extractErrorMessage } from '@/lib/api';

export function AccountPage() {
  const navigate = useNavigate();
  const { user, updateProfile, isUpdatingProfile, logout, isLoggingOut } = useAuth();
  const { dark, toggle } = useThemeStore();
  const pushToast = useToastStore((s) => s.push);
  const { canInstall, isIos, isInstalled, install } = usePwaInstall();

  const [name, setName] = useState(user?.name ?? '');

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await updateProfile({ name: name.trim() });
      pushToast('Profil diperbarui.', 'success');
    } catch (err) {
      pushToast(extractErrorMessage(err, 'Gagal memperbarui profil.'), 'danger');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Akun</h1>
          <p className="text-sm text-[var(--ink-soft)]">{user?.email}</p>
        </div>
        <Chip tone={user?.role === 'superadmin' ? 'sand' : 'neutral'}>
          {user?.role === 'superadmin' ? 'Superadmin' : 'Host / User'}
        </Chip>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/40 p-5 md:col-span-7"
        >
          <Input
            label="Nama tampilan"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" variant="primary" loading={isUpdatingProfile}>
            Simpan perubahan
          </Button>
        </form>

        <div className="space-y-4 md:col-span-5">
          {user?.role === 'superadmin' && (
            <Link
              to="/admin/users"
              className="flex min-h-[56px] items-center justify-between rounded-[12px] border border-[var(--moss)]/40 bg-[var(--moss)]/10 px-4 py-3 transition-colors hover:bg-[var(--moss)]/15"
            >
              <span className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
                <ShieldCheck className="h-5 w-5 text-[var(--moss)] dark:text-[var(--moss-light)]" strokeWidth={1.75} />
                <span>Kelola Pengguna (Superadmin)</span>
              </span>
              <ArrowRight className="h-4 w-4 text-[var(--moss)] dark:text-[var(--moss-light)]" strokeWidth={1.75} />
            </Link>
          )}

          <button
            type="button"
            onClick={toggle}
            className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/40 px-4 py-3 text-left transition-colors hover:bg-[var(--paper-2)]"
          >
            <span className="flex items-center gap-3 text-sm font-medium">
              {dark ? (
                <Moon className="h-4 w-4 text-[var(--sand)]" strokeWidth={1.75} />
              ) : (
                <Sun className="h-4 w-4 text-[var(--moss)]" strokeWidth={1.75} />
              )}
              <span>{dark ? 'Mode gelap aktif' : 'Mode terang (kertas)'}</span>
            </span>
            <span className="font-mono text-xs text-[var(--ink-soft)]">Ganti</span>
          </button>

          {canInstall && (
            <Button variant="primary" className="w-full" onClick={() => install()}>
              <Download className="h-4 w-4" strokeWidth={1.75} />
              <span>Pasang Meetingkeun di HP</span>
            </Button>
          )}

          {isIos && !isInstalled && (
            <p className="rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)]/50 px-3.5 py-2.5 text-xs text-[var(--ink-soft)]">
              Untuk memasang di iPhone/iPad: ketuk tombol <strong>Bagikan</strong> di Safari lalu pilih <strong>Tambah ke Layar Utama</strong>.
            </p>
          )}

          <Button
            variant="outline"
            className="w-full text-[var(--clay)]"
            onClick={handleLogout}
            loading={isLoggingOut}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            <span>Keluar dari akun</span>
          </Button>
        </div>
      </div>

      <footer className="text-center text-xs text-[var(--ink-soft)] md:hidden">
        Meetingkeun — dibuat oleh Tiyas Frahesta
      </footer>
    </div>
  );
}
