import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CalendarPlus,
  Clock,
  Copy,
  FileCode2,
  Loader2,
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
    <div className="space-y-6 md:space-y-8">
      {/* Hero Greeting + 3D Teal Video Camera Illustration */}
      <header className="flex items-center justify-between gap-4 pt-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[32px] font-extrabold leading-[1.12] tracking-[-0.03em] text-[#1E293B] dark:text-[#F1F5F9] md:text-4xl">
              Halo, {firstName}.
            </h1>
            {user?.role === 'superadmin' && (
              <Chip tone="sand">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                Superadmin
              </Chip>
            )}
          </div>
          <p className="mt-1.5 text-[14px] text-[#64748B] dark:text-[#94A3B8] md:text-base">
            Siap melakukan meeting sekarang?
          </p>
        </div>

        {/* 3D Teal Video Camera Emblem (matches reference mockup) */}
        <div className="relative shrink-0" aria-hidden="true">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D7EFEA] via-[#E8F6F3] to-transparent shadow-[0_8px_24px_rgba(11,122,105,0.08)] dark:from-[#0B7A69]/25 dark:via-[#0B7A69]/10 md:h-24 md:w-24">
            <svg viewBox="0 0 88 88" className="h-16 w-16 md:h-20 md:w-20" fill="none">
              <defs>
                <linearGradient id="mkCamBody" x1="12" y1="26" x2="58" y2="66" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1DB096" />
                  <stop offset="100%" stopColor="#076356" />
                </linearGradient>
                <linearGradient id="mkCamLens" x1="56" y1="30" x2="72" y2="58" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0D8A77" />
                  <stop offset="100%" stopColor="#05483E" />
                </linearGradient>
              </defs>
              {/* Spark lines */}
              <path d="M58 21L61 14M66 25L73 20M68 33L76 32" stroke="#0B7A69" strokeWidth="2.6" strokeLinecap="round" />
              {/* Camera body */}
              <rect x="14" y="28" width="42" height="34" rx="9" fill="url(#mkCamBody)" />
              <rect x="18" y="32" width="18" height="7" rx="3.5" fill="white" fillOpacity="0.18" />
              {/* Camera lens cone */}
              <path d="M56 38L70 30.5C72.2 29.3 74.8 30.9 74.8 33.4V56.6C74.8 59.1 72.2 60.7 70 59.5L56 52V38Z" fill="url(#mkCamLens)" />
            </svg>
          </div>
        </div>
      </header>

      {/* Main Content Split: Mobile single-col stack, Desktop 12-col */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
        <div className="space-y-6 md:col-span-7">
          {/* Primary Stacked Action Buttons (matches reference mockup) */}
          <section className="flex flex-col gap-3.5" aria-label="Aksi cepat">
            {/* Button 1: Mulai Sekarang */}
            <button
              type="button"
              onClick={handleInstantMeeting}
              disabled={createMeeting.isPending}
              className="group relative flex min-h-[58px] w-full cursor-pointer items-center justify-between overflow-hidden rounded-[15px] bg-gradient-to-r from-[#0C7D6C] via-[#096E5F] to-[#06574B] px-5 py-3.5 text-white shadow-[0_10px_24px_rgba(11,122,105,0.28)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(11,122,105,0.34)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-75"
            >
              {/* Subtle inner organic wave highlight */}
              <svg
                aria-hidden="true"
                viewBox="0 0 340 70"
                className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
                preserveAspectRatio="none"
              >
                <path d="M0,70 C85,48 160,18 250,30 C295,36 325,18 340,0 L340,70 Z" fill="#8CE0D1" />
              </svg>

              <span className="relative z-10 flex items-center gap-3.5">
                {createMeeting.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
                ) : (
                  <Video className="h-5 w-5 fill-white/95" strokeWidth={1.8} />
                )}
                <span className="h-5 w-px bg-white/35" aria-hidden="true" />
                <span className="text-[16px] font-semibold tracking-tight">
                  {createMeeting.isPending ? 'Membuat ruang...' : 'Mulai Sekarang'}
                </span>
              </span>
              <ArrowRight
                className="relative z-10 h-5 w-5 transition-transform duration-150 group-hover:translate-x-1"
                strokeWidth={2}
              />
            </button>

            {/* Button 2: Gabung dengan Kode */}
            <button
              type="button"
              onClick={() => setJoinSheetOpen(true)}
              className="group flex min-h-[54px] w-full cursor-pointer items-center gap-3.5 rounded-[15px] border-[1.5px] border-[#0B7A69]/35 bg-white px-5 py-3 text-[#1E293B] shadow-[0_4px_14px_rgba(15,23,42,0.03)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#0B7A69]/70 hover:bg-[#FAFDFC] dark:border-[#2C4A41] dark:bg-[#192823] dark:text-[#F1F5F9] dark:hover:border-[#5EEAD4]/50"
            >
              <FileCode2 className="h-5 w-5 text-[#0B7A69] dark:text-[#5EEAD4]" strokeWidth={1.85} />
              <span className="h-5 w-px bg-[#0B7A69]/25 dark:bg-[#5EEAD4]/25" aria-hidden="true" />
              <span className="text-[15.5px] font-semibold tracking-tight">Gabung dengan Kode</span>
            </button>
          </section>

          {/* Upcoming Meetings Section ("| Berikutnya") */}
          <section className="space-y-3.5" aria-label="Meeting berikutnya">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2.5 font-display text-[17px] font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9]">
                <span className="h-5 w-1 rounded-full bg-[#0B7A69] dark:bg-[#5EEAD4]" aria-hidden="true" />
                <span>Berikutnya</span>
              </h2>
              {upcoming.length > 0 && (
                <Link
                  to="/jadwal"
                  className="text-xs font-semibold text-[#0B7A69] hover:underline dark:text-[#5EEAD4]"
                >
                  Lihat semua ({upcoming.length})
                </Link>
              )}
            </div>

            {isLoading ? (
              <div className="h-44 animate-pulse rounded-[20px] border border-[#E2EFEC] bg-white/80 dark:border-[#243832] dark:bg-[#172420]" />
            ) : nextMeeting ? (
              <div className="space-y-3">
                {upcoming.slice(0, 3).map((meeting, idx) => (
                  <div
                    key={meeting.id}
                    className={
                      idx > 0
                        ? 'hidden rounded-[18px] border border-[#E2EFEC] bg-white/95 p-4 shadow-[0_8px_24px_rgba(11,122,105,0.05)] dark:border-[#243832] dark:bg-[#172420] md:block'
                        : 'rounded-[18px] border border-[#E2EFEC] bg-white p-4.5 shadow-[0_10px_28px_rgba(11,122,105,0.07)] dark:border-[#243832] dark:bg-[#172420]'
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-[#E6F4F1] px-2 py-0.5 font-mono text-xs font-semibold text-[#0B7A69] dark:bg-[#0B7A69]/25 dark:text-[#5EEAD4]">
                            {meeting.scheduled_at ? formatTimeOnly(meeting.scheduled_at) : 'Aktif'}
                          </span>
                          {meeting.status === 'live' && (
                            <Chip tone="moss">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#D4552B]" />
                              Sedang berlangsung
                            </Chip>
                          )}
                          {meeting.locked && <Chip tone="clay">Terkunci</Chip>}
                        </div>
                        <h3 className="truncate font-display text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                          {meeting.title}
                        </h3>
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                          {formatMeetingDate(meeting.scheduled_at)} ·{' '}
                          <span className="font-mono">{meeting.code}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Link to={`/m/${meeting.code}`} className="flex-1">
                        <Button
                          variant="primary"
                          className="w-full rounded-[12px] bg-[#0B7A69] hover:bg-[#086254]"
                        >
                          <span>Gabung</span>
                          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Bagikan tautan"
                        onClick={() => handleShare(meeting.code, meeting.title)}
                        className="rounded-[12px] border-[#DCEAE7] bg-white dark:border-[#243832] dark:bg-[#1D2D28]"
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
              /* Empty State Card (matches reference mockup) */
              <div className="flex flex-col items-center rounded-[20px] border border-[#E6F1EE] bg-white px-6 py-7 text-center shadow-[0_12px_32px_rgba(11,122,105,0.06)] dark:border-[#243832] dark:bg-[#172420]">
                <svg
                  viewBox="0 0 180 106"
                  className="mb-3 h-24 w-40"
                  fill="none"
                  aria-hidden="true"
                >
                  {/* Soft Mint Cloud */}
                  <path
                    d="M28 76C16 76 10 66 16 56C22 46 38 48 44 36C52 20 76 16 92 26C106 16 130 22 138 38C152 38 164 48 160 62C156 74 142 78 130 78H36C33 78 30 76 28 76Z"
                    fill="#E3F2EF"
                  />
                  {/* Spark lines */}
                  <path d="M126 30L130 22M134 36L142 32M135 44L144 45" stroke="#0B7A69" strokeWidth="2.4" strokeLinecap="round" />
                  {/* Calendar Card */}
                  <rect x="52" y="26" width="64" height="58" rx="11" fill="#FFFFFF" stroke="#DCEAE7" strokeWidth="2" />
                  <path d="M52 37C52 30.9 56.9 26 63 26H105C111.1 26 116 30.9 116 37V44H52V37Z" fill="#0B7A69" />
                  {/* Calendar rings */}
                  <rect x="66" y="20" width="5" height="12" rx="2.5" fill="#075448" />
                  <rect x="97" y="20" width="5" height="12" rx="2.5" fill="#075448" />
                  {/* Calendar grid dots */}
                  <rect x="62" y="52" width="10" height="8" rx="2" fill="#B6DBD4" />
                  <rect x="78" y="52" width="10" height="8" rx="2" fill="#B6DBD4" />
                  <rect x="94" y="52" width="10" height="8" rx="2" fill="#D5EBE6" />
                  <rect x="62" y="65" width="10" height="8" rx="2" fill="#B6DBD4" />
                  <rect x="78" y="65" width="10" height="8" rx="2" fill="#D5EBE6" />
                  {/* Clock badge */}
                  <circle cx="112" cy="76" r="16" fill="#FFFFFF" stroke="#0B7A69" strokeWidth="3.2" />
                  <path d="M112 68V76L117.5 79" stroke="#0B7A69" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                <p className="text-[14px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                  Belum ada jadwal. Mau bikin satu?
                </p>

                <button
                  type="button"
                  onClick={() => setScheduleSheetOpen(true)}
                  className="mt-4 inline-flex min-h-[44px] w-full max-w-[260px] cursor-pointer items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-[#0B7A69]/40 bg-white px-5 py-2.5 text-[14px] font-semibold text-[#0B7A69] transition-all hover:border-[#0B7A69] hover:bg-[#F0FAF8] dark:border-[#5EEAD4]/40 dark:bg-[#192823] dark:text-[#5EEAD4] dark:hover:bg-[#1F332C]"
                >
                  <CalendarPlus className="h-4 w-4" strokeWidth={1.9} />
                  <span>Jadwalkan meeting</span>
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Desktop Right Column: Stats & Personal Room */}
        <aside className="hidden space-y-4 md:col-span-5 md:block">
          <h2 className="flex items-center gap-2.5 font-display text-[17px] font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9]">
            <span className="h-5 w-1 rounded-full bg-[#0B7A69] dark:bg-[#5EEAD4]" aria-hidden="true" />
            <span>Ringkasan Ruang</span>
          </h2>

          <div className="grid grid-cols-2 gap-3.5">
            <Link
              to="/jadwal"
              className="rounded-[18px] border border-[#E2EFEC] bg-white p-4.5 shadow-[0_8px_24px_rgba(11,122,105,0.05)] transition-all hover:-translate-y-0.5 hover:border-[#0B7A69]/35 dark:border-[#243832] dark:bg-[#172420]"
            >
              <Calendar className="h-4 w-4 text-[#0B7A69] dark:text-[#5EEAD4]" strokeWidth={1.85} />
              <p className="mt-2.5 font-mono text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                {upcoming.length}
              </p>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Jadwal / Aktif</span>
            </Link>

            <Link
              to="/riwayat"
              className="rounded-[18px] border border-[#E2EFEC] bg-white p-4.5 shadow-[0_8px_24px_rgba(11,122,105,0.05)] transition-all hover:-translate-y-0.5 hover:border-[#0B7A69]/35 dark:border-[#243832] dark:bg-[#172420]"
            >
              <Clock className="h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" strokeWidth={1.85} />
              <p className="mt-2.5 font-mono text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                {history.length}
              </p>
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Riwayat Selesai</span>
            </Link>
          </div>

          {/* Personal Permanent Room */}
          <div className="space-y-3 rounded-[18px] border border-[#E2EFEC] bg-white p-5 shadow-[0_10px_28px_rgba(11,122,105,0.06)] dark:border-[#243832] dark:bg-[#172420]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">Ruang Pribadi Saya</p>
                <p className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {user?.personal_room_code ? `/m/${user.personal_room_code}` : 'Tautan tetap siap pakai'}
                </p>
              </div>
              {user?.personal_room_code && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Salin tautan ruang pribadi"
                  onClick={() => handleShare(user.personal_room_code!, `Ruang Pribadi ${user.name}`)}
                  className="rounded-[12px] border-[#DCEAE7] bg-white dark:border-[#243832] dark:bg-[#1D2D28]"
                >
                  <Copy className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              )}
            </div>
            <button
              type="button"
              onClick={handleOpenPersonalRoom}
              disabled={openPersonalRoom.isPending}
              className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#0B7A69]/35 bg-[#F4FAF8] px-4 py-2 text-sm font-semibold text-[#0B7A69] transition-colors hover:bg-[#E7F4F1] dark:border-[#5EEAD4]/35 dark:bg-[#1D2E29] dark:text-[#5EEAD4]"
            >
              {openPersonalRoom.isPending ? 'Membuka...' : 'Buka ruang pribadi'}
            </button>
          </div>

          {user?.role === 'superadmin' && (
            <Link
              to="/admin/users"
              className="flex items-center justify-between rounded-[18px] border border-[#E2EFEC] bg-white p-4.5 shadow-[0_8px_24px_rgba(11,122,105,0.05)] transition-all hover:-translate-y-0.5 dark:border-[#243832] dark:bg-[#172420]"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#0B7A69] dark:text-[#5EEAD4]" strokeWidth={1.85} />
                <div>
                  <p className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">Kelola Multiuser</p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Atur host, peran &amp; status akun</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#64748B]" strokeWidth={1.75} />
            </Link>
          )}
        </aside>
      </div>

      <Sheet
        open={joinSheetOpen}
        onClose={() => setJoinSheetOpen(false)}
        title="Gabung dengan Kode"
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
