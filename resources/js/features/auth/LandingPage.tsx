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
  Users,
  Video,
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
    <div className="flex flex-1 flex-col justify-between gap-12 py-2 lg:gap-16 lg:py-4">
      {/* Hero Split */}
      <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="space-y-6 lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3 py-1.5 text-xs font-medium text-[var(--ink)]">
            <span className="h-2 w-2 rounded-full bg-[var(--clay-bright)]" aria-hidden="true" />
            <span>Video meeting di browser · tanpa batas waktu</span>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h1 className="font-display text-[34px] font-bold leading-[1.06] tracking-[-0.035em] sm:text-5xl lg:text-[56px] lg:leading-[1.03]">
              Ayo meeting.{' '}
              <span className="text-[var(--moss)] dark:text-[var(--moss-light)]">
                Buat ruang, kirim tautan.
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
              className="w-full sm:w-auto sm:px-7"
              onClick={() => openModal('register')}
            >
              <Video className="h-4 w-4" strokeWidth={1.75} />
              <span>Mulai sekarang</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto sm:px-6"
              onClick={() => openModal('login')}
            >
              <span>Masuk ke akun</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>

          {/* Pixel-aligned Quick Join Bar */}
          <form
            onSubmit={handleJoin}
            className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/70 p-4"
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
              <Button type="submit" variant="outline" className="w-full shrink-0 sm:w-auto">
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

        {/* Desktop Interactive Room Stage Preview */}
        <div className="hidden lg:col-span-6 lg:block">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
            className="rounded-[16px] border border-[#2C3D34] bg-[#16211C] p-6 text-[#F6F2E9]"
          >
            {/* Room Top Bar */}
            <div className="flex items-center justify-between border-b border-[#2C3D34] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D4552B]" aria-hidden="true" />
                <span className="text-sm font-medium">Sinkronisasi Produk Mingguan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-[8px] border border-[#2C3D34] bg-[#1E2C25] px-2.5 py-1 text-xs text-[#A7B5AE]">
                  <Lock className="h-3 w-3 text-[#C9A66B]" strokeWidth={1.75} />
                  Terkunci
                </span>
                <span className="rounded-[8px] bg-[#C9A66B] px-2.5 py-1 font-mono text-xs font-semibold text-[#16211C]">
                  kdm-4f9-xqa
                </span>
              </div>
            </div>

            {/* 2x2 Participant Tiles */}
            <div className="my-5 grid grid-cols-2 gap-3">
              <div className="flex h-32 flex-col justify-between rounded-[12px] border border-[#3F7D68] bg-[#1E2C25] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="rounded-[6px] bg-[#2E5E4E] px-2 py-0.5 text-[11px] font-medium text-[#F6F2E9]">
                    Host
                  </span>
                  {previewMicOn ? (
                    <Mic className="h-4 w-4 text-[#8FC4AE]" strokeWidth={1.75} />
                  ) : (
                    <MicOff className="h-4 w-4 text-[#D4552B]" strokeWidth={1.75} />
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2E5E4E] font-display text-xs font-bold">
                    TF
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-tight">Tiyas Frahesta</p>
                    <p className="text-[11px] text-[#8FC4AE]">
                      {previewMicOn ? 'Sedang berbicara' : 'Mikrofon mati'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex h-32 flex-col justify-between rounded-[12px] border border-[#2C3D34] bg-[#1E2C25]/70 p-3.5">
                <div className="flex justify-end">
                  <Mic className="h-4 w-4 text-[#A7B5AE]" strokeWidth={1.75} />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2C3D34] font-display text-xs font-bold">
                    AR
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-tight">Andi Ramadhan</p>
                    <p className="text-[11px] text-[#A7B5AE]">Terhubung</p>
                  </div>
                </div>
              </div>

              {/* Interactive Lobby Row */}
              <div className="col-span-2 flex items-center justify-between rounded-[10px] border border-[#2C3D34] bg-[#1E2C25]/50 px-4 py-3 text-xs">
                {previewAdmitted ? (
                  <div className="flex items-center gap-2 text-[#8FC4AE]">
                    <Check className="h-4 w-4" strokeWidth={2} />
                    <span>Sari Kusuma telah masuk ke ruang.</span>
                  </div>
                ) : (
                  <>
                    <span className="text-[#F6F2E9]">
                      <strong>Sari Kusuma</strong> menunggu izin di lobby
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewAdmitted(true)}
                      className="cursor-pointer rounded-[8px] bg-[#2E5E4E] px-3 py-1.5 font-medium text-[#F6F2E9] hover:bg-[#3F7D68]"
                    >
                      Terima
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Control Bar */}
            <div className="flex items-center justify-between border-t border-[#2C3D34] pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMicOn((v) => !v)}
                  title="Coba toggle mikrofon"
                  className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border transition-colors ${
                    previewMicOn
                      ? 'border-[#2C3D34] bg-[#1E2C25] text-[#F6F2E9] hover:bg-[#2C3D34]'
                      : 'border-[#B8431E] bg-[#B8431E] text-[#F6F2E9]'
                  }`}
                >
                  {previewMicOn ? (
                    <Mic className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <MicOff className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#2C3D34] bg-[#1E2C25] text-[#A7B5AE]">
                  <Video className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#2C3D34] bg-[#1E2C25] text-[#A7B5AE]">
                  <MonitorUp className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#2C3D34] bg-[#1E2C25] text-[#A7B5AE]">
                  <Hand className="h-4 w-4" strokeWidth={1.75} />
                </span>
              </div>

              <span className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#B8431E] px-4 text-xs font-semibold text-[#F6F2E9]">
                <PhoneOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Keluar</span>
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Capabilities + Numbered Flow */}
      <section className="grid grid-cols-1 gap-5 border-t border-[var(--line)] pt-8 md:grid-cols-3">
        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/40 p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[var(--moss)] dark:text-[var(--moss-light)]">01</span>
            <Video className="h-4 w-4 text-[var(--ink-soft)]" strokeWidth={1.75} />
          </div>
          <h2 className="mt-3 font-display text-lg font-semibold">Kurang dari 3 ketukan</h2>
          <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
            Buat ruang instan, salin tautan, langsung masuk dari browser HP maupun desktop.
          </p>
        </div>

        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/40 p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[var(--moss)] dark:text-[var(--moss-light)]">02</span>
            <Users className="h-4 w-4 text-[var(--ink-soft)]" strokeWidth={1.75} />
          </div>
          <h2 className="mt-3 font-display text-lg font-semibold">Kontrol host & multiuser</h2>
          <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
            Ruang tunggu, kunci ruang, passcode opsional, serta manajemen pengguna oleh superadmin.
          </p>
        </div>

        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/40 p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[var(--moss)] dark:text-[var(--moss-light)]">03</span>
            <ShieldCheck className="h-4 w-4 text-[var(--ink-soft)]" strokeWidth={1.75} />
          </div>
          <h2 className="mt-3 font-display text-lg font-semibold">Token aman & CAPTCHA</h2>
          <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
            JWT ditandatangani server per peserta dan dilengkapi verifikasi foto angka sekali pakai.
          </p>
        </div>
      </section>
    </div>
  );
}
