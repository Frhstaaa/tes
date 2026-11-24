import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Hand,
  Lock,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { extractRoomCode } from '@/lib/format';
import { motionTokens } from '@/lib/motionTokens';
import { useAuthModalStore } from '@/stores/useAuthModalStore';

export function LandingPage() {
  const navigate = useNavigate();
  const openModal = useAuthModalStore((s) => s.openModal);
  const [roomInput, setRoomInput] = useState('');
  const [error, setError] = useState('');

  // Interactive preview state (desktop stage)
  const [previewMicOn, setPreviewMicOn] = useState(true);
  const [previewCamOn, setPreviewCamOn] = useState(true);
  const [previewAdmitted, setPreviewAdmitted] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractRoomCode(roomInput);
    if (!code) {
      setError('Masukkan kode atau tautan meeting terlebih dahulu.');
      return;
    }
    setError('');
    navigate(`/m/${code}`);
  };

  return (
    <div className="relative flex flex-1 flex-col justify-between gap-12 py-2 lg:gap-14 lg:py-4">
      {/* Subtle Ambient Background Glow (Breaks Flat Monotone Feel) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-24 h-80 w-80 rounded-full bg-[var(--moss)]/10 blur-3xl dark:bg-[var(--moss)]/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 right-0 h-96 w-96 rounded-full bg-[var(--sand)]/20 blur-3xl dark:bg-[var(--clay)]/12"
      />

      {/* Hero Split */}
      <section className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-6 lg:col-span-6">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--moss)]/25 bg-[var(--paper-2)]/90 px-3.5 py-1.5 text-xs font-medium text-[var(--ink)] shadow-xs">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--clay-bright)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--clay-bright)]" />
            </span>
            <span>Video meeting di browser · tanpa batas waktu</span>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h1 className="font-display text-[36px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[56px] lg:leading-[1.03]">
              Ayo meeting.{' '}
              <span className="relative inline-block text-[var(--moss)] dark:text-[var(--moss-light)]">
                Buat ruang, kirim tautan.
                <span
                  aria-hidden="true"
                  className="absolute right-0 -bottom-1 left-0 h-[3px] rounded-full bg-gradient-to-r from-[var(--moss)] via-[var(--clay-bright)] to-[var(--sand)] opacity-70"
                />
              </span>
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-[var(--ink-soft)] sm:text-lg">
              Gabung langsung dari HP atau laptop tanpa pasang aplikasi tambahan. Cepat di ponsel, lapang di desktop, dan aman dengan token server-side.
            </p>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="primary"
              size="lg"
              className="w-full shadow-md shadow-[var(--moss)]/20 transition-transform hover:-translate-y-0.5 sm:w-auto sm:px-7"
              onClick={() => openModal('register')}
            >
              <Video className="h-4 w-4" strokeWidth={1.75} />
              <span>Mulai sekarang</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full bg-[var(--paper)]/80 backdrop-blur-xs transition-transform hover:-translate-y-0.5 sm:w-auto sm:px-6"
              onClick={() => openModal('login')}
            >
              <span>Masuk ke akun</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>

          {/* Micro Trust Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--paper-2)]/60 px-2.5 py-1">
              <Sparkles className="h-3.5 w-3.5 text-[var(--moss)] dark:text-[var(--moss-light)]" strokeWidth={1.75} />
              Tanpa install aplikasi
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--paper-2)]/60 px-2.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--clay-bright)]" strokeWidth={1.75} />
              Token JWT terenkripsi
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--paper-2)]/60 px-2.5 py-1">
              <Users className="h-3.5 w-3.5 text-[var(--moss)] dark:text-[var(--moss-light)]" strokeWidth={1.75} />
              Lobby &amp; kontrol host
            </span>
          </div>

          {/* Pixel-aligned Quick Join Bar */}
          <form
            onSubmit={handleJoin}
            className="rounded-[14px] border border-[var(--line)] bg-[var(--paper-2)]/85 p-4 shadow-sm backdrop-blur-xs transition-colors focus-within:border-[var(--moss)]/60"
          >
            <label
              htmlFor="landing-room-code"
              className="mb-2 block text-sm font-medium text-[var(--ink)]"
            >
              Punya kode atau tautan?
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <input
                id="landing-room-code"
                type="text"
                placeholder="contoh: kdm-4f9-xqa"
                value={roomInput}
                onChange={(e) => {
                  setRoomInput(e.target.value);
                  if (error) setError('');
                }}
                className={`min-h-[44px] flex-1 rounded-[10px] border bg-[var(--paper)] px-3.5 py-2.5 font-mono text-[16px] text-[var(--ink)] placeholder:text-[var(--ink-soft)]/60 focus:outline-none ${
                  error
                    ? 'border-[var(--clay)] focus:border-[var(--clay)]'
                    : 'border-[var(--line)] focus:border-[var(--moss)]'
                }`}
              />
              <Button type="submit" variant="outline" className="w-full shrink-0 bg-[var(--paper)] sm:w-auto">
                <span>Gabung ke ruang</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-[var(--clay)]" role="alert">
                {error}
              </p>
            )}
          </form>
        </div>

        {/* Desktop Interactive Room Stage Preview (2 People Meeting) */}
        <div className="hidden lg:col-span-6 lg:block">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
            className="relative rounded-[18px] border border-[#2F463B] bg-gradient-to-b from-[#1A2822] to-[#121B17] p-5 text-[#FFFFFF] shadow-[0_24px_60px_-15px_rgba(22,33,28,0.45)]"
          >
            {/* Room Top Bar */}
            <div className="flex items-center justify-between border-b border-[#233C36] pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4552B] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#D4552B]" />
                </span>
                <span className="text-sm font-semibold tracking-tight">Sinkronisasi Produk Mingguan</span>
                <span className="rounded-full bg-[#142622] px-2 py-0.5 font-mono text-[10px] font-medium text-[#5EEAD4]">
                  LIVE · 12:48
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-[8px] border border-[#233C36] bg-[#142622] px-2.5 py-1 text-xs text-[#94A3B8]">
                  <Lock className="h-3 w-3 text-[#C9A66B]" strokeWidth={1.75} />
                  Terkunci
                </span>
                <span className="rounded-[8px] bg-[#0B7A69] px-2.5 py-1 font-mono text-xs font-semibold text-white">
                  kdm-4f9-xqa
                </span>
              </div>
            </div>

            {/* 2 Real Video Participant Tiles */}
            <div className="my-4 grid grid-cols-2 gap-3">
              {/* Participant 1: Host */}
              <div
                className={`group relative aspect-[16/11] overflow-hidden rounded-[12px] border transition-colors ${
                  previewMicOn ? 'border-[#14B8A6] ring-1 ring-[#14B8A6]/40' : 'border-[#233C36]'
                } bg-[#142622]`}
              >
                {previewCamOn ? (
                  <img
                    src="/images/meeting-host.jpg"
                    alt="Tiyas Frahesta sedang berbicara dalam meeting"
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#11201D]">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#0B7A69] font-display text-sm font-bold text-[#FFFFFF]">
                      TF
                    </span>
                    <span className="text-[11px] text-[#94A3B8]">Kamera nonaktif</span>
                  </div>
                )}

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1511]/90 via-[#0D1511]/15 to-[#0D1511]/35"
                />

                {/* Top Overlay */}
                <div className="absolute top-2.5 right-2.5 left-2.5 flex items-center justify-between">
                  <span className="rounded-[6px] bg-[#0B7A69]/95 px-2 py-0.5 text-[11px] font-semibold text-[#FFFFFF] backdrop-blur-xs">
                    Host
                  </span>
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-xs ${
                      previewMicOn ? 'bg-[#0E1B18]/75 text-[#5EEAD4]' : 'bg-[#B8431E]/90 text-[#FFFFFF]'
                    }`}
                  >
                    {previewMicOn ? (
                      <Mic className="h-3.5 w-3.5" strokeWidth={1.9} />
                    ) : (
                      <MicOff className="h-3.5 w-3.5" strokeWidth={1.9} />
                    )}
                  </span>
                </div>

                {/* Bottom Name + Live Audio Waveform */}
                <div className="absolute right-2.5 bottom-2.5 left-2.5 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold leading-tight text-[#FFFFFF] sm:text-sm">
                      Tiyas Frahesta
                    </p>
                    <p className="text-[10px] text-[#A7E0C8]">
                      {previewMicOn ? 'Sedang berbicara...' : 'Mikrofon mati'}
                    </p>
                  </div>
                  {previewMicOn && (
                    <div className="flex h-4 items-end gap-0.5 rounded-full bg-[#0E1B18]/75 px-1.5 py-1" aria-hidden="true">
                      <span className="h-1.5 w-0.5 animate-pulse rounded-full bg-[#5EEAD4]" />
                      <span className="h-3 w-0.5 animate-pulse rounded-full bg-[#5EEAD4] [animation-delay:150ms]" />
                      <span className="h-2 w-0.5 animate-pulse rounded-full bg-[#5EEAD4] [animation-delay:300ms]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Participant 2: Guest */}
              <div className="group relative aspect-[16/11] overflow-hidden rounded-[12px] border border-[#233C36] bg-[#142622]">
                <img
                  src="/images/meeting-guest.jpg"
                  alt="Nadia Pratama sedang menyimak dan berdiskusi di meeting"
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1511]/90 via-[#0D1511]/15 to-[#0D1511]/30"
                />

                {/* Top Overlay */}
                <div className="absolute top-2.5 right-2.5 left-2.5 flex items-center justify-between">
                  <span className="rounded-[6px] bg-[#0E1B18]/75 px-2 py-0.5 text-[10px] font-medium text-[#D8E2DC] backdrop-blur-xs">
                    HD Video
                  </span>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0E1B18]/75 text-[#94A3B8] backdrop-blur-xs">
                    <Mic className="h-3.5 w-3.5" strokeWidth={1.9} />
                  </span>
                </div>

                {/* Bottom Name */}
                <div className="absolute right-2.5 bottom-2.5 left-2.5 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold leading-tight text-[#FFFFFF] sm:text-sm">
                      Nadia Pratama
                    </p>
                    <p className="text-[10px] text-[#94A3B8]">Terhubung · Menyimak</p>
                  </div>
                </div>
              </div>

              {/* Interactive Lobby Row */}
              <div className="col-span-2 flex items-center justify-between rounded-[10px] border border-[#233C36] bg-[#13231F]/90 px-4 py-2.5 text-xs">
                {previewAdmitted ? (
                  <div className="flex items-center gap-2 text-[#5EEAD4]">
                    <Check className="h-4 w-4" strokeWidth={2} />
                    <span>Andi Ramadhan telah masuk ke ruang meeting.</span>
                  </div>
                ) : (
                  <>
                    <span className="text-[#FFFFFF]">
                      <strong>Andi Ramadhan</strong> menunggu izin di lobby
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewAdmitted(true)}
                      className="cursor-pointer rounded-[8px] bg-[#0B7A69] px-3 py-1.5 font-medium text-[#FFFFFF] transition-colors hover:bg-[#0D9488]"
                    >
                      Terima
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Control Bar */}
            <div className="flex items-center justify-between border-t border-[#233C36] pt-3.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMicOn((v) => !v)}
                  title="Coba toggle mikrofon"
                  className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border transition-colors ${
                    previewMicOn
                      ? 'border-[#233C36] bg-[#142622] text-[#FFFFFF] hover:bg-[#233C36]'
                      : 'border-[#B8431E] bg-[#B8431E] text-[#FFFFFF]'
                  }`}
                >
                  {previewMicOn ? (
                    <Mic className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <MicOff className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewCamOn((v) => !v)}
                  title="Coba toggle kamera"
                  className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border transition-colors ${
                    previewCamOn
                      ? 'border-[#233C36] bg-[#142622] text-[#FFFFFF] hover:bg-[#233C36]'
                      : 'border-[#B8431E] bg-[#B8431E] text-[#FFFFFF]'
                  }`}
                >
                  {previewCamOn ? (
                    <Video className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <VideoOff className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#233C36] bg-[#142622] text-[#94A3B8]">
                  <MonitorUp className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#233C36] bg-[#142622] text-[#94A3B8]">
                  <Hand className="h-4 w-4" strokeWidth={1.75} />
                </span>
              </div>

              <span className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#B8431E] px-4 text-xs font-semibold text-[#FFFFFF]">
                <PhoneOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Keluar</span>
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Capabilities + Numbered Flow */}
      <section className="relative z-10 grid grid-cols-1 gap-5 border-t border-[var(--line)] pt-7 md:grid-cols-3">
        <div className="group rounded-[14px] border border-[var(--line)] border-t-[3px] border-t-[var(--moss)] bg-[var(--paper-2)]/65 p-5 transition-all hover:-translate-y-0.5 hover:bg-[var(--paper-2)] hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-[var(--moss)]/12 px-2 py-0.5 font-mono text-xs font-semibold text-[var(--moss)] dark:text-[var(--moss-light)]">
              01
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--moss)]/12 text-[var(--moss)] dark:text-[var(--moss-light)]">
              <Video className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </div>
          <h2 className="mt-3 font-display text-lg font-semibold">Kurang dari 3 ketukan</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
            Buat ruang instan, salin tautan, langsung masuk dari browser HP maupun desktop.
          </p>
        </div>

        <div className="group rounded-[14px] border border-[var(--line)] border-t-[3px] border-t-[var(--clay-bright)] bg-[var(--paper-2)]/65 p-5 transition-all hover:-translate-y-0.5 hover:bg-[var(--paper-2)] hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-[var(--clay)]/12 px-2 py-0.5 font-mono text-xs font-semibold text-[var(--clay-bright)]">
              02
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--clay)]/12 text-[var(--clay-bright)]">
              <Users className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </div>
          <h2 className="mt-3 font-display text-lg font-semibold">Kontrol host &amp; multiuser</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
            Ruang tunggu, kunci ruang, passcode opsional, serta manajemen pengguna oleh superadmin.
          </p>
        </div>

        <div className="group rounded-[14px] border border-[var(--line)] border-t-[3px] border-t-[var(--sand)] bg-[var(--paper-2)]/65 p-5 transition-all hover:-translate-y-0.5 hover:bg-[var(--paper-2)] hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-[var(--sand)]/25 px-2 py-0.5 font-mono text-xs font-semibold text-[#8A6A34] dark:text-[var(--sand)]">
              03
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--sand)]/25 text-[#8A6A34] dark:text-[var(--sand)]">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </div>
          <h2 className="mt-3 font-display text-lg font-semibold">Token aman &amp; CAPTCHA</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
            JWT ditandatangani server per peserta dan dilengkapi verifikasi foto angka sekali pakai.
          </p>
        </div>
      </section>
    </div>
  );
}
