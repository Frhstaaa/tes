import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CalendarPlus,
  Clock,
  Copy,
  Keyboard,
  Share2,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { Chip } from '@/components/ui/Chip';
import { useAuth } from '@/features/auth/useAuth';
import { useCreateMeeting, useMeetings, useOpenPersonalRoom } from './useMeetings';
import { NewMeetingSheet } from './NewMeetingSheet';
import { extractRoomCode, formatMeetingDate, formatTimeOnly } from '@/lib/format';
import { extractErrorMessage } from '@/lib/api';
import { useToastStore } from '@/stores/useToastStore';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const pushToast = useToastStore((s) => s.push);
  const createMeeting = useCreateMeeting();
  const openPersonalRoom = useOpenPersonalRoom();
  const { data: upcoming = [], isLoading } = useMeetings('upcoming');
  const { data: history = [] } = useMeetings('history');

  const [joinSheetOpen, setJoinSheetOpen] = useState(false);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');

  const firstName = user?.name?.split(' ')[0] ?? 'Kamu';
  const nextMeeting = upcoming[0] ?? null;

  const handleInstantMeeting = async () => {
    try {
      const meeting = await createMeeting.mutateAsync({ type: 'instant' });
      navigate(`/m/${meeting.code}`);
    } catch (err) {
      pushToast(extractErrorMessage(err, 'Gagal membuat ruang meeting.'), 'danger');
    }
  };

  const handleOpenPersonalRoom = async () => {
    try {
      const res = await openPersonalRoom.mutateAsync();
      navigate(`/m/${res.personal_room_code}`);
    } catch (err) {
      pushToast(extractErrorMessage(err, 'Gagal membuka ruang pribadi.'), 'danger');
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractRoomCode(joinCodeInput);
    if (!code) {
      setJoinError('Masukkan kode atau tautan ruang.');
      return;
    }
    setJoinSheetOpen(false);
    setJoinCodeInput('');
    setJoinError('');
    navigate(`/m/${code}`);
  };

  const handleShare = async (code: string, title: string) => {
    const url = `${window.location.origin}/m/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    pushToast('Tautan meeting disalin.', 'success');
  };

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-3xl font-bold tracking-[-0.035em] md:text-4xl">
              Halo, {firstName}.
            </h1>
            {user?.role === 'superadmin' && (
              <Chip tone="sand">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                Superadmin
              </Chip>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--ink-soft)] md:text-base">
            Siap mulai atau gabung meeting sekarang?
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          aria-label="Jadwalkan meeting"
          onClick={() => setScheduleSheetOpen(true)}
          title="Jadwalkan meeting"
          className="md:hidden"
        >
          <CalendarPlus className="h-5 w-5" strokeWidth={1.75} />
        </Button>
      </header>

      {/* Mobile Primary Actions (unchanged thumb-friendly stack) */}
      <section className="flex flex-col gap-3 md:hidden" aria-label="Aksi cepat">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleInstantMeeting}
          loading={createMeeting.isPending}
        >
          <Video className="h-5 w-5" strokeWidth={1.75} />
          <span>Mulai sekarang</span>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => setJoinSheetOpen(true)}
        >
          <Keyboard className="h-5 w-5" strokeWidth={1.75} />
          <span>Gabung dengan kode</span>
        </Button>
      </section>

      {/* Desktop Full-Width Action Bento */}
      <section className="hidden gap-4 md:grid md:grid-cols-3" aria-label="Aksi cepat desktop">
        <div className="flex flex-col justify-between rounded-[14px] border border-[var(--moss)] bg-[var(--moss)] p-5 text-[var(--moss-fg)]">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider opacity-85">
              <span className="h-2 w-2 rounded-full bg-[var(--clay-bright)]" />
              Instan
            </span>
            <h2 className="font-display text-xl font-bold">Mulai sekarang</h2>
            <p className="text-sm opacity-90">
              Buka ruang baru seketika dan bagikan tautannya.
            </p>
          </div>
          <Button
            variant="outline"
            size="lg"
            onClick={handleInstantMeeting}
            loading={createMeeting.isPending}
            className="mt-5 w-full border-[var(--paper)]/30 bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-2)]"
          >
            <Video className="h-4 w-4" strokeWidth={1.75} />
            <span>Buat ruang instan</span>
          </Button>
        </div>

        <form
          onSubmit={handleJoinSubmit}
          className="flex flex-col justify-between rounded-[14px] border border-[var(--line)] bg-[var(--paper-2)]/60 p-5"
        >
          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink-soft)]">
              Kode / Tautan
            </span>
            <h2 className="font-display text-xl font-bold">Gabung ruang</h2>
            <Input
              placeholder="contoh: kdm-4f9-xqa"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              error={joinError}
              className="bg-[var(--paper)] font-mono"
            />
          </div>
          <Button type="submit" variant="outline" size="lg" className="mt-4 w-full">
            <span>Lanjut ke pra-join</span>
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </form>

        <div className="flex flex-col justify-between rounded-[14px] border border-[var(--line)] bg-[var(--paper-2)]/60 p-5">
          <div className="space-y-1.5">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink-soft)]">
              Terencana
            </span>
            <h2 className="font-display text-xl font-bold">Jadwalkan meeting</h2>
            <p className="text-sm text-[var(--ink-soft)]">
              Atur tanggal, jam, passcode, dan ruang tunggu tamu.
            </p>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="mt-5 w-full"
            onClick={() => setScheduleSheetOpen(true)}
          >
            <CalendarPlus className="h-4 w-4" strokeWidth={1.75} />
            <span>Buat jadwal baru</span>
          </Button>
        </div>
      </section>

      {/* Main Content Area: Mobile single column, Desktop 12-col split */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Upcoming Meetings */}
        <section className="space-y-3 md:col-span-7" aria-label="Meeting berikutnya">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
              Berikutnya
            </h2>
            {upcoming.length > 0 && (
              <Link to="/jadwal" className="text-xs font-medium text-[var(--moss)] dark:text-[var(--moss-light)] hover:underline">
                Lihat semua ({upcoming.length})
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="h-28 animate-pulse rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]" />
          ) : nextMeeting ? (
            <div className="space-y-3">
              {(upcoming.slice(0, 3)).map((meeting, idx) => (
                <div
                  key={meeting.id}
                  className={idx > 0 ? 'hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/40 p-4 md:block' : 'rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/60 p-4'}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-[var(--moss)] dark:text-[var(--moss-light)]">
                          {meeting.scheduled_at
                            ? formatTimeOnly(meeting.scheduled_at)
                            : 'Aktif'}
                        </span>
                        {meeting.status === 'live' && (
                          <Chip tone="moss">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--clay-bright)]" />
                            Sedang berlangsung
                          </Chip>
                        )}
                        {meeting.locked && <Chip tone="clay">Terkunci</Chip>}
                      </div>
                      <h3 className="truncate font-display text-lg font-semibold">
                        {meeting.title}
                      </h3>
                      <p className="text-xs text-[var(--ink-soft)]">
                        {formatMeetingDate(meeting.scheduled_at)} ·{' '}
                        <span className="font-mono">{meeting.code}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Link to={`/m/${meeting.code}`} className="flex-1">
                      <Button variant="primary" className="w-full">
                        <span>Gabung</span>
                        <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Bagikan tautan"
                      onClick={() => handleShare(meeting.code, meeting.title)}
                    >
                      {typeof navigator !== 'undefined' && 'share' in navigator ? (
                        <Share2 className="h-4 w-4" strokeWidth={1.75} />
                      ) : (
                        <Copy className="h-4 w-4" strokeWidth={1.75} />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[12px] border border-dashed border-[var(--line)] p-6 text-center">
              <p className="text-sm text-[var(--ink-soft)]">
                Belum ada jadwal. Mau bikin satu?
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => setScheduleSheetOpen(true)}
              >
                <CalendarPlus className="h-4 w-4" strokeWidth={1.75} />
                <span>Jadwalkan meeting</span>
              </Button>
            </div>
          )}
        </section>

        {/* Desktop Right Column: Stats & Quick Links */}
        <aside className="hidden space-y-4 md:col-span-5 md:block">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
            Ringkasan Ruang
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/jadwal"
              className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/40 p-4 transition-colors hover:bg-[var(--paper-2)]"
            >
              <Calendar className="h-4 w-4 text-[var(--moss)] dark:text-[var(--moss-light)]" strokeWidth={1.75} />
              <p className="mt-2 font-mono text-2xl font-semibold">{upcoming.length}</p>
              <span className="text-xs text-[var(--ink-soft)]">Jadwal / Aktif</span>
            </Link>

            <Link
              to="/riwayat"
              className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/40 p-4 transition-colors hover:bg-[var(--paper-2)]"
            >
              <Clock className="h-4 w-4 text-[var(--ink-soft)]" strokeWidth={1.75} />
              <p className="mt-2 font-mono text-2xl font-semibold">{history.length}</p>
              <span className="text-xs text-[var(--ink-soft)]">Riwayat Selesai</span>
            </Link>
          </div>

          {/* Personal Permanent Room */}
          <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Ruang Pribadi Saya</p>
                <p className="font-mono text-xs text-[var(--ink-soft)]">
                  {user?.personal_room_code ? `/m/${user.personal_room_code}` : 'Tautan tetap siap pakai'}
                </p>
              </div>
              {user?.personal_room_code && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Salin tautan ruang pribadi"
                  onClick={() => handleShare(user.personal_room_code!, `Ruang Pribadi ${user.name}`)}
                >
                  <Copy className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleOpenPersonalRoom}
              loading={openPersonalRoom.isPending}
            >
              Buka ruang pribadi
            </Button>
          </div>

          {user?.role === 'superadmin' && (
            <Link
              to="/admin/users"
              className="flex items-center justify-between rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/60 p-4 transition-colors hover:bg-[var(--paper-2)]"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--moss)] dark:text-[var(--moss-light)]" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-semibold">Kelola Multiuser</p>
                  <p className="text-xs text-[var(--ink-soft)]">Atur host, peran & status akun</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--ink-soft)]" strokeWidth={1.75} />
            </Link>
          )}
        </aside>
      </div>

      <Sheet
        open={joinSheetOpen}
        onClose={() => setJoinSheetOpen(false)}
        title="Gabung dengan kode"
      >
        <form onSubmit={handleJoinSubmit} className="space-y-4">
          <Input
            label="Kode atau tautan meeting"
            placeholder="kdm-4f9-xqa"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value)}
            error={joinError}
            className="font-mono"
            autoFocus
          />
          <Button type="submit" size="lg" className="w-full">
            Lanjut ke pra-join
          </Button>
        </form>
      </Sheet>

      <NewMeetingSheet
        open={scheduleSheetOpen}
        onClose={() => setScheduleSheetOpen(false)}
        defaultMode="scheduled"
      />
    </div>
  );
}
