import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Lock, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { api, extractErrorMessage } from '@/lib/api';
import { formatMeetingDate } from '@/lib/format';
import type { JoinMeetingResponse, Meeting } from '@/types';
import { useAuth } from '@/features/auth/useAuth';
import { useRoomSessionStore } from '@/stores/useRoomSessionStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { NumericCaptcha } from '@/components/ui/NumericCaptcha';
import { BrandLogo } from '@/components/BrandLogo';
import { cn } from '@/lib/cn';

export function PrejoinPage() {
  const { kode = '' } = useParams<{ kode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const setSession = useRoomSessionStore((s) => s.setSession);
  const clearSession = useRoomSessionStore((s) => s.clearSession);

  const [displayName, setDisplayName] = useState(() => searchParams.get('u') ?? '');
  const [passcode, setPasscode] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mediaError, setMediaError] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaRefresh, setCaptchaRefresh] = useState(0);

  // Lobby state
  const [waitingParticipantId, setWaitingParticipantId] = useState<number | null>(null);
  const [waitingReason, setWaitingReason] = useState<'host_not_joined' | 'lobby'>('lobby');
  const [lobbyDenied, setLobbyDenied] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    if (user?.name && !displayName) {
      setDisplayName(user.name);
    }
  }, [user, displayName]);

  const meetingQuery = useQuery<Meeting>({
    queryKey: ['meeting-public', kode],
    queryFn: async () => {
      const res = await api.get<{ meeting: Meeting }>(`/meetings/${kode}`);
      return res.data.meeting;
    },
    retry: false,
  });

  const isCountdownActive = Boolean(
    meetingQuery.data &&
      meetingQuery.data.status === 'scheduled' &&
      !meetingQuery.data.is_host &&
      meetingQuery.data.scheduled_at &&
      new Date(meetingQuery.data.scheduled_at).getTime() - nowMs > 15 * 60 * 1000
  );

  useEffect(() => {
    if (!isCountdownActive) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isCountdownActive]);

  // Camera & mic preview + live audio level
  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let audioCtx: AudioContext | null = null;

    async function startPreview() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError('Browser tidak mendukung akses kamera/mikrofon.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setMediaError('');

        // Audio level meter
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((acc, v) => acc + v, 0) / data.length;
          setMicLevel(Math.min(100, Math.round((avg / 90) * 100)));
          rafId = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setMediaError('Izin kamera atau mikrofon ditolak. Kamu tetap bisa gabung tanpa kamera.');
        setCamOn(false);
        setMicOn(false);
      }
    }

    startPreview();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      audioCtx?.close().catch(() => undefined);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Sync track enabled states
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = micOn;
    });
  }, [micOn]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = camOn;
    });
  }, [camOn]);

  // Poll lobby status when waiting
  useEffect(() => {
    if (!waitingParticipantId) return;

    const timer = window.setInterval(async () => {
      try {
        const res = await api.get<{
          status: string;
          waiting_reason?: 'host_not_joined' | 'lobby' | null;
          jwt?: string;
          room?: string;
          domain?: string;
          role?: 'host' | 'cohost' | 'guest';
          participant_id?: number;
        }>(`/meetings/${kode}/participants/${waitingParticipantId}/status`);

        const data = res.data;
        if (data.waiting_reason) {
          setWaitingReason(data.waiting_reason);
        }
        if (data.status === 'admitted' && data.jwt && data.room && data.domain) {
          window.clearInterval(timer);
          streamRef.current?.getTracks().forEach((t) => t.stop());
          setSession({
            code: kode,
            jwt: data.jwt,
            room: data.room,
            domain: data.domain,
            role: data.role ?? 'guest',
            participantId: waitingParticipantId,
            displayName: displayName.trim(),
            startMutedAudio: !micOn,
            startMutedVideo: !camOn,
            joinedAtMs: Date.now(),
          });
          navigate(`/m/${kode}/ruang`, { replace: true });
        } else if (data.status === 'denied') {
          window.clearInterval(timer);
          setWaitingParticipantId(null);
          setLobbyDenied(true);
        } else if (data.status === 'ended') {
          window.clearInterval(timer);
          navigate(`/m/${kode}/selesai`, { replace: true });
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [waitingParticipantId, kode, displayName, micOn, camOn, navigate, setSession]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setJoinError('Masukkan nama kamu dulu.');
      return;
    }

    setJoinError('');
    setIsJoining(true);

    try {
      const res = await api.post<JoinMeetingResponse>(`/meetings/${kode}/join`, {
        display_name: displayName.trim(),
        passcode: passcode.trim() || undefined,
        captcha_id: meetingQuery.data?.is_host ? undefined : captchaId,
        captcha_answer: meetingQuery.data?.is_host ? undefined : captchaAnswer,
      });

      const data = res.data;
      if (data.status === 'waiting') {
        setWaitingReason(data.waiting_reason ?? 'lobby');
        setWaitingParticipantId(data.participant_id);
        return;
      }

      if (data.jwt) {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setSession({
          code: kode,
          jwt: data.jwt,
          room: data.room,
          domain: data.domain,
          role: data.role,
          participantId: data.participant_id,
          displayName: displayName.trim(),
          startMutedAudio: !micOn,
          startMutedVideo: !camOn,
          joinedAtMs: Date.now(),
        });
        navigate(`/m/${kode}/ruang`, { replace: true });
      }
    } catch (err) {
      setJoinError(extractErrorMessage(err, 'Tidak bisa terhubung ke ruang. Cek koneksi, lalu coba lagi.'));
      setCaptchaRefresh((n) => n + 1);
    } finally {
      setIsJoining(false);
    }
  };

  if (meetingQuery.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--paper)] p-6">
        <p className="text-sm text-[var(--ink-soft)]">Memuat informasi ruang...</p>
      </div>
    );
  }

  if (meetingQuery.isError || !meetingQuery.data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--paper)] p-6 text-center">
        <div className="w-full max-w-sm space-y-5 rounded-[16px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-6 sm:p-8">
          <div className="flex justify-center">
            <BrandLogo size="sm" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold">Ruang tidak ditemukan</h1>
            <p className="text-sm text-[var(--ink-soft)]">
              Pastikan kode <span className="font-mono font-medium text-[var(--ink)]">{kode}</span> sudah benar atau minta tautan baru dari host.
            </p>
          </div>
          <Link to="/" className="block">
            <Button variant="primary" className="w-full">Kembali ke beranda</Button>
          </Link>
        </div>
      </div>
    );
  }

  const meeting = meetingQuery.data;

  if (meeting.status === 'ended' || meeting.status === 'cancelled') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--paper)] p-6 text-center">
        <div className="w-full max-w-sm space-y-5 rounded-[16px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-6 sm:p-8">
          <div className="flex justify-center">
            <BrandLogo size="sm" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold">Meeting sudah selesai</h1>
            <p className="text-sm text-[var(--ink-soft)]">
              Ruang <span className="font-medium text-[var(--ink)]">{meeting.title}</span> telah berakhir.
            </p>
          </div>
          <Link to="/" className="block">
            <Button variant="primary" className="w-full">Kembali ke beranda</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Countdown screen if scheduled > 15 minutes in the future and not host
  if (meeting.status === 'scheduled' && !meeting.is_host && meeting.scheduled_at) {
    const targetMs = new Date(meeting.scheduled_at).getTime();
    const diffMs = targetMs - nowMs;
    if (diffMs > 15 * 60 * 1000) {
      const totalSec = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      const pad = (n: number) => String(n).padStart(2, '0');

      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--paper)] p-6 text-center">
          <div className="w-full max-w-md space-y-5 rounded-[16px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--moss)]">
              Belum dimulai · {meeting.code}
            </p>
            <h1 className="font-display text-2xl font-bold">{meeting.title}</h1>
            <p className="text-sm text-[var(--ink-soft)]">
              Jadwal: {formatMeetingDate(meeting.scheduled_at)}
            </p>
            <div className="grid grid-cols-4 gap-2 pt-2 font-mono">
              <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-3">
                <span className="block text-2xl font-semibold">{pad(days)}</span>
                <span className="text-[11px] text-[var(--ink-soft)]">Hari</span>
              </div>
              <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-3">
                <span className="block text-2xl font-semibold">{pad(hours)}</span>
                <span className="text-[11px] text-[var(--ink-soft)]">Jam</span>
              </div>
              <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-3">
                <span className="block text-2xl font-semibold">{pad(mins)}</span>
                <span className="text-[11px] text-[var(--ink-soft)]">Menit</span>
              </div>
              <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-3">
                <span className="block text-2xl font-semibold">{pad(secs)}</span>
                <span className="text-[11px] text-[var(--ink-soft)]">Detik</span>
              </div>
            </div>
            <p className="text-xs text-[var(--ink-soft)]">
              Pintu ruang otomatis terbuka 15 menit sebelum jadwal dimulai.
            </p>
            <Link to="/" className="inline-block">
              <Button variant="outline">Kembali ke beranda</Button>
            </Link>
          </div>
        </div>
      );
    }
  }

  if (waitingParticipantId) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--paper)] p-6 text-center">
        <div className="w-full max-w-sm space-y-5 rounded-[16px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-6 sm:p-8">
          <div className="flex justify-center">
            <BrandLogo size="sm" />
          </div>
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--moss)]">
              {waitingReason === 'host_not_joined' ? 'Menunggu Host' : 'Ruang Tunggu'}
            </p>
            <h1 className="font-display text-2xl font-bold">{meeting.title}</h1>
            <p className="text-sm text-[var(--ink-soft)]" aria-live="polite">
              {waitingReason === 'host_not_joined'
                ? 'Menunggu pembuat meeting (host) membuka ruang terlebih dahulu.'
                : 'Menunggu host mengizinkan kamu masuk.'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const pid = waitingParticipantId;
              setWaitingParticipantId(null);
              if (pid) {
                api.post(`/meetings/${kode}/leave`, { participant_id: pid }).catch(() => undefined);
              }
            }}
            className="w-full"
          >
            Batal
          </Button>
        </div>
      </div>
    );
  }

  if (lobbyDenied) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--paper)] p-6 text-center">
        <div className="w-full max-w-sm space-y-5 rounded-[16px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-6 sm:p-8">
          <div className="flex justify-center">
            <BrandLogo size="sm" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold">Permintaan masuk ditolak</h1>
            <p className="text-sm text-[var(--ink-soft)]">
              Host belum mengizinkan kamu bergabung ke ruang ini.
            </p>
          </div>
          <Link to="/" className="block">
            <Button variant="outline" className="w-full">Kembali</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] px-4 py-3 md:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link
            to={user ? '/beranda' : '/'}
            className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            <span>Kembali</span>
          </Link>
          <BrandLogo size="sm" className="hidden sm:inline-flex" />
          <span className="rounded-[8px] border border-[var(--line)] bg-[var(--paper-2)] px-2.5 py-1 font-mono text-xs font-medium text-[var(--ink)]">
            {meeting.code}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 p-4 pb-28 lg:grid lg:max-w-5xl lg:grid-cols-12 lg:items-start lg:gap-8 lg:px-10 lg:py-8">
        {/* Left column (Preview & Toggles) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Camera preview (4:5 on mobile, 16:10 on desktop) */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[16px] border border-[var(--line)] bg-[#16211C] sm:aspect-[16/10]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                'h-full w-full -scale-x-100 object-cover',
                !camOn && 'hidden'
              )}
            />
            {!camOn && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#F6F2E9]/70">
                <VideoOff className="h-8 w-8" strokeWidth={1.5} />
                <span className="text-sm">Kamera dimatikan</span>
              </div>
            )}

            {/* Live mic level bar */}
            {micOn && (
              <div
                className="absolute bottom-3 left-3 flex items-center gap-2 rounded-[8px] bg-[#16211C]/80 px-2.5 py-1.5 text-xs text-[#F6F2E9]"
                aria-hidden="true"
              >
                <Mic className="h-3.5 w-3.5 text-[#8FC4AE]" strokeWidth={1.75} />
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full bg-[#8FC4AE] transition-all duration-75"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {mediaError && (
            <p className="rounded-[10px] border border-[var(--sand)]/50 bg-[var(--sand)]/15 px-3.5 py-2.5 text-xs text-[var(--ink)]">
              {mediaError}
            </p>
          )}

          {/* Mic & Camera toggles (icon + text) */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={micOn ? 'outline' : 'danger'}
              onClick={() => setMicOn((v) => !v)}
              className="w-full"
            >
              {micOn ? (
                <>
                  <Mic className="h-4 w-4" strokeWidth={1.75} />
                  <span>Mikrofon nyala</span>
                </>
              ) : (
                <>
                  <MicOff className="h-4 w-4" strokeWidth={1.75} />
                  <span>Mikrofon mati</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant={camOn ? 'outline' : 'danger'}
              onClick={() => setCamOn((v) => !v)}
              className="w-full"
            >
              {camOn ? (
                <>
                  <Video className="h-4 w-4" strokeWidth={1.75} />
                  <span>Kamera nyala</span>
                </>
              ) : (
                <>
                  <VideoOff className="h-4 w-4" strokeWidth={1.75} />
                  <span>Kamera mati</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right column (Meeting Info & Form) */}
        <div className="mt-5 space-y-5 lg:col-span-5 lg:mt-0 lg:rounded-[16px] lg:border lg:border-[var(--line)] lg:bg-[var(--paper-2)]/40 lg:p-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {meeting.status === 'live' && <Chip tone="moss">Berlangsung</Chip>}
              {meeting.locked && <Chip tone="clay">Terkunci</Chip>}
              {meeting.requires_passcode && (
                <Chip tone="sand">
                  <Lock className="h-3 w-3" strokeWidth={1.75} />
                  Butuh passcode
                </Chip>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold">{meeting.title}</h1>
            {meeting.scheduled_at && (
              <p className="text-xs text-[var(--ink-soft)]">
                Jadwal: {formatMeetingDate(meeting.scheduled_at)}
              </p>
            )}
          </div>

          <form id="prejoin-form" onSubmit={handleJoin} className="space-y-4">
            <Input
              label="Nama kamu"
              placeholder="Tulis nama tampilan"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />

            {meeting.requires_passcode && !meeting.is_host && (
              <Input
                label="Passcode ruang"
                type="password"
                placeholder="Masukkan passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
              />
            )}

            {!meeting.is_host && (
              <NumericCaptcha
                captchaId={captchaId}
                answer={captchaAnswer}
                onCaptchaChange={setCaptchaId}
                onAnswerChange={setCaptchaAnswer}
                refreshSignal={captchaRefresh}
              />
            )}

            {joinError && (
              <p className="text-sm text-[var(--clay)]" role="alert">
                {joinError}
              </p>
            )}

            {/* Desktop inline submit */}
            <div className="hidden pt-1 lg:block">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={isJoining}
              >
                Gabung sekarang
              </Button>
            </div>
          </form>
        </div>
      </main>

      {/* Mobile sticky bottom join bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--line)] bg-[var(--paper)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto max-w-xl">
          <Button
            type="submit"
            form="prejoin-form"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isJoining}
          >
            Gabung sekarang
          </Button>
        </div>
      </div>
    </div>
  );
}
