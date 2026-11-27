import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Download, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
        <Badge variant={user?.role === 'superadmin' ? 'warning' : 'outline'}>
          {user?.role === 'superadmin' ? 'Superadmin' : 'Host / User'}
        </Badge>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Card className="md:col-span-7">
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>Perbarui nama tampilan Anda di ruang meeting.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <Input
                label="Nama tampilan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" variant="primary" loading={isUpdatingProfile} className="w-fit">
                Simpan perubahan
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 md:col-span-5">
          {user?.role === 'superadmin' && (
            <Link
              to="/admin/users"
              className="flex min-h-[56px] items-center justify-between rounded-xl border border-primary/35 bg-primary/10 px-4 py-3 transition-colors hover:bg-primary/15"
            >
              <span className="flex items-center gap-3 text-sm font-semibold text-foreground">
                <ShieldCheck className="size-5 text-primary" strokeWidth={1.75} />
                <span>Kelola Pengguna (Superadmin)</span>
              </span>
              <ArrowRight className="size-4 text-primary" strokeWidth={1.75} />
            </Link>
          )}

          <button
            type="button"
            onClick={toggle}
            className="flex min-h-[54px] w-full cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left shadow-xs transition-colors hover:border-primary/40"
          >
            <span className="flex items-center gap-3 text-sm font-medium">
              {dark ? (
                <Moon className="size-4 text-[var(--sand)]" strokeWidth={1.75} />
              ) : (
                <Sun className="size-4 text-primary" strokeWidth={1.75} />
              )}
              <span>{dark ? 'Mode gelap aktif' : 'Mode terang (kertas)'}</span>
            </span>
            <Badge variant="outline" className="font-mono">Ganti</Badge>
          </button>

          {canInstall && (
            <Button variant="primary" className="w-full" onClick={() => install()}>
              <Download className="size-4" strokeWidth={1.75} />
              <span>Pasang Meetingkeun di HP</span>
            </Button>
          )}

          {isIos && !isInstalled && (
            <Alert>
              <AlertDescription>
                Untuk memasang di iPhone/iPad: ketuk tombol <strong>Bagikan</strong> di Safari lalu pilih{' '}
                <strong>Tambah ke Layar Utama</strong>.
              </AlertDescription>
            </Alert>
          )}

          <Button
            variant="outline"
            className="w-full text-destructive"
            onClick={handleLogout}
            loading={isLoggingOut}
          >
            <LogOut className="size-4" strokeWidth={1.75} />
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
