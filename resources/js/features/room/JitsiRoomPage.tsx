import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Layers, Lock, Plus, Shield, Shuffle, Unlock, UserX, X } from 'lucide-react';
import { useRoomSessionStore } from '@/stores/useRoomSessionStore';
import { loadJitsiExternalApi, type JitsiMeetExternalAPIInstance } from '@/lib/jitsi';
import { api, extractErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { BrandLogo } from '@/components/BrandLogo';
import { useToastStore } from '@/stores/useToastStore';
import type { MeetingParticipant, ParticipantRole } from '@/types';

export function JitsiRoomPage() {
  const { kode = '' } = useParams<{ kode: string }>();
  const navigate = useNavigate();
  const { session, clearSession } = useRoomSessionStore();
  const pushToast = useToastStore((s) => s.push);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<JitsiMeetExternalAPIInstance | null>(null);
  const isEndingRef = useRef(false);
  const leaveTimerRef = useRef<number | null>(null);

  const [loadError, setLoadError] = useState('');
  const [hostSheetOpen, setHostSheetOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [waitingList, setWaitingList] = useState<MeetingParticipant[]>([]);
  const [activeList, setActiveList] = useState<MeetingParticipant[]>([]);
  const [breakoutRoomName, setBreakoutRoomName] = useState('');
  const [inBreakoutRoom, setInBreakoutRoom] = useState(false);
  const [mainRoomJid, setMainRoomJid] = useState('');
  const [myRole, setMyRole] = useState<ParticipantRole>(session?.role ?? 'guest');
  const [breakoutRooms, setBreakoutRooms] = useState<
    Array<{ id: string; jid: string; name: string; participantCount: number }>
  >([]);

  useEffect(() => {
    if (session?.role) {
      setMyRole(session.role);
    }
  }, [session?.role]);

  const syncBreakoutRooms = useCallback((roomsInput: unknown) => {
    if (!roomsInput || typeof roomsInput !== 'object') return;
    const entries = Object.values(
      roomsInput as Record<
        string,
        { id?: string; jid?: string; name?: string; participants?: Record<string, unknown>; isMainRoom?: boolean }
      >
    );
    const main = entries.find((r) => r.isMainRoom && r.jid);
    if (main?.jid) {
      setMainRoomJid(main.jid);
    }
    const list = entries
      .filter((r) => !r.isMainRoom && r.jid)
      .map((r) => ({
        id: r.id ?? r.jid ?? '',
        jid: r.jid ?? '',
        name: r.name || 'Breakout Room',
        participantCount: r.participants ? Object.keys(r.participants).length : 0,
      }));
    setBreakoutRooms(list);
  }, []);

  useEffect(() => {
    if (isEndingRef.current) return;
    if (!session || session.code !== kode) {
      navigate(`/m/${kode}`, { replace: true });
      return;
    }

    let disposed = false;

    async function mountJitsi() {
      if (!session || !containerRef.current) return;

      try {
        const JitsiAPI = await loadJitsiExternalApi(session.domain);
        if (disposed || !containerRef.current) return;

        const instance = new JitsiAPI(session.domain, {
          roomName: session.room,
          jwt: session.jwt,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: session.displayName,
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            doNotFlipLocalVideo: false,
            startWithAudioMuted: session.startMutedAudio,
            startWithVideoMuted: session.startMutedVideo,
            resolution: 720,
            enableLayerSuspension: true,
            maxFullResolutionParticipants: 2,
            desktopSharingFrameRate: {
              min: 5,
              max: 15,
            },
            videoQuality: {
              maxBitratesVideo: {
                screenshare: 2500000,
                VP8: {
                  low: 200000,
                  standard: 500000,
                  high: 1500000,
                  ssHigh: 2500000,
                },
                VP9: {
                  low: 100000,
                  standard: 300000,
                  high: 1200000,
                  ssHigh: 2500000,
                },
              },
            },
            testing: {
              capScreenshareBitrate: 0,
            },
            breakoutRooms: {
              hideAddRoomButton: false,
              hideAutoAssignButton: false,
              hideJoinRoomButton: false,
            },
          },
          interfaceConfigOverwrite: {
            APP_NAME: 'Meetingkeun',
            NATIVE_APP_NAME: 'Meetingkeun',
            DEFAULT_BACKGROUND: '#0E1B18',
            SHOW_JITSI_WATERMARK: false,
            HIDE_DEEP_LINKING_LOGO: true,
            SHOW_BRAND_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_POWERED_BY: false,
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'hangup',
              'profile',
              'participants-pane',
              'recording',
              'livestreaming',
              'etherpad',
              'sharedvideo',
              'settings',
              'raisehand',
              'videoquality',
              'filmstrip',
              'feedback',
              'stats',
              'shortcuts',
              'tileview',
            ],
          },
        });

        apiRef.current = instance;

        const iframe = containerRef.current.querySelector('iframe');
        if (iframe) {
          iframe.setAttribute(
            'allow',
            'camera *; microphone *; display-capture *; autoplay *; clipboard-write *; fullscreen *'
          );
        }

        const handleLeave = async () => {
          if (leaveTimerRef.current) {
            window.clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
          }
          if (isEndingRef.current) return;
          isEndingRef.current = true;
          try {
            await api.post(`/meetings/${kode}/leave`, {
              participant_id: session.participantId,
            });
          } catch {
            // Best-effort leave recording
          }
          const durationMs = Date.now() - session.joinedAtMs;
          clearSession();
          navigate(`/m/${kode}/selesai`, {
            replace: true,
            state: { durationMs },
          });
        };

        instance.addListener('videoConferenceJoined', (payload: unknown) => {
          // Cancel pending leave if we just transitioned into/out of a breakout room
          if (leaveTimerRef.current) {
            window.clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
          }
          const data = payload as { breakoutRoom?: boolean } | null;
          setInBreakoutRoom(Boolean(data?.breakoutRoom));

          if (typeof instance.listBreakoutRooms === 'function') {
            instance
              .listBreakoutRooms()
              .then((rooms) => syncBreakoutRooms(rooms))
              .catch(() => undefined);
          }
        });

        instance.addListener('videoConferenceLeft', () => {
          // Switching to/from a breakout room fires videoConferenceLeft before videoConferenceJoined.
          // Defer leaving briefly so a breakout room transition can cancel it.
          if (leaveTimerRef.current) {
            window.clearTimeout(leaveTimerRef.current);
          }
          leaveTimerRef.current = window.setTimeout(() => {
            handleLeave();
          }, 1200);
        });

        instance.addListener('readyToClose', handleLeave);
        instance.addListener('breakoutRoomsUpdated', (payload: unknown) => {
          const data = payload as { rooms?: unknown } | null;
          if (!data?.rooms) return;
          syncBreakoutRooms(data.rooms);
        });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat ruang meeting.');
      }
    }

    mountJitsi();

    return () => {
      disposed = true;
      if (leaveTimerRef.current) {
        window.clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [session, kode, navigate, clearSession, syncBreakoutRooms]);

  // Poll meeting & participant status so guests/cohosts auto-exit when host ends or kicks them
  useEffect(() => {
    if (!session) return;

    const checkRoomStatus = async () => {
      if (document.hidden) return;
      try {
        const res = await api.get<{
          status: string;
          meeting_status: string;
          role?: ParticipantRole;
        }>(`/meetings/${kode}/participants/${session.participantId}/status`);
        if (res.data.meeting_status === 'ended' || res.data.meeting_status === 'cancelled' || res.data.status === 'ended') {
          isEndingRef.current = true;
          apiRef.current?.dispose();
          apiRef.current = null;
          const durationMs = Date.now() - session.joinedAtMs;
          clearSession();
          pushToast('Meeting telah diakhiri oleh host.', 'default');
          navigate(`/m/${kode}/selesai`, { replace: true, state: { durationMs } });
        } else if (res.data.status === 'kicked') {
          isEndingRef.current = true;
          apiRef.current?.dispose();
          apiRef.current = null;
          clearSession();
          pushToast('Kamu dikeluarkan dari ruang oleh host.', 'danger');
          navigate('/', { replace: true });
        } else if (res.data.role && res.data.role !== myRole) {
          setMyRole(res.data.role);
          pushToast(
            res.data.role === 'cohost'
              ? 'Kamu ditunjuk sebagai Co-moderator.'
              : 'Hak Co-moderator kamu dicabut.',
            res.data.role === 'cohost' ? 'success' : 'default'
          );
        }
      } catch {
        // Ignore transient poll errors
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        checkRoomStatus();
      }
    };

    const handlePageHide = () => {
      if (isEndingRef.current) return;
      try {
        void fetch(`/api/meetings/${kode}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participant_id: session.participantId }),
          keepalive: true,
        });
      } catch {
        // Best-effort leave on tab close/refresh
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibility);
    const timer = window.setInterval(checkRoomStatus, 3500);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(timer);
    };
  }, [session, kode, clearSession, navigate, pushToast]);

  // Poll host waiting list when moderator panel is open
  const canModerate = myRole === 'host' || myRole === 'cohost';

  useEffect(() => {
    if (!session || !canModerate) return;

    const fetchWaiting = async () => {
      if (document.hidden) return;
      try {
        const res = await api.get<{
          waiting: MeetingParticipant[];
          active: MeetingParticipant[];
        }>(`/meetings/${kode}/waiting`);
        setWaitingList(res.data.waiting);
        setActiveList(res.data.active);
      } catch {
        // Ignore transient errors
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        fetchWaiting();
      }
    };

    fetchWaiting();
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = window.setInterval(fetchWaiting, 4000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(interval);
    };
  }, [session, kode, hostSheetOpen]);

  const handleToggleLock = async () => {
    try {
      const res = await api.post<{ locked: boolean }>(`/meetings/${kode}/lock`, {
        locked: !locked,
      });
      setLocked(res.data.locked);
      pushToast(res.data.locked ? 'Ruang dikunci.' : 'Kunci ruang dibuka.', 'default');
    } catch {
      pushToast('Gagal mengubah kunci ruang.', 'danger');
    }
  };

  const handleAdmit = async (id: number) => {
    try {
      await api.post(`/meetings/${kode}/participants/${id}/admit`);
      setWaitingList((prev) => prev.filter((p) => p.id !== id));
      pushToast('Peserta diizinkan masuk.', 'success');
    } catch (err) {
      pushToast(extractErrorMessage(err, 'Gagal mengizinkan peserta.'), 'danger');
    }
  };

  const handleDeny = async (id: number) => {
    try {
      await api.post(`/meetings/${kode}/participants/${id}/deny`);
      setWaitingList((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      pushToast(extractErrorMessage(err, 'Gagal menolak peserta.'), 'danger');
    }
  };

  const handleKick = async (id: number) => {
    try {
      await api.post(`/meetings/${kode}/participants/${id}/kick`);
      setActiveList((prev) => prev.filter((p) => p.id !== id));
      pushToast('Peserta dikeluarkan.', 'default');
    } catch (err) {
      pushToast(extractErrorMessage(err, 'Gagal mengeluarkan peserta.'), 'danger');
    }
  };

  const handleToggleCohost = async (id: number) => {
    try {
      const res = await api.post<{ participant: MeetingParticipant }>(
        `/meetings/${kode}/participants/${id}/cohost`
      );
      const updated = res.data.participant;
      setActiveList((prev) =>
        prev.map((p) => (p.id === id ? { ...p, role: updated.role } : p))
      );

      if (updated.role === 'cohost') {
        try {
          const jitsiParticipants = apiRef.current?.getParticipantsInfo?.() ?? [];
          const targetName = updated.display_name.trim().toLowerCase();
          const match = jitsiParticipants.find(
            (jp) => jp.displayName?.trim().toLowerCase() === targetName
          );
          if (match?.participantId) {
            apiRef.current?.executeCommand('grantModerator', match.participantId);
          }
        } catch {
          // Best-effort Jitsi moderator grant
        }
      }

      pushToast(
        updated.role === 'cohost'
          ? `${updated.display_name} dijadikan Co-moderator.`
          : `Hak Co-moderator ${updated.display_name} dicabut.`,
        updated.role === 'cohost' ? 'success' : 'default'
      );
    } catch (err) {
      pushToast(extractErrorMessage(err, 'Gagal mengubah peran co-host.'), 'danger');
    }
  };

  const handleAddBreakoutRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const name = breakoutRoomName.trim() || `Kelompok ${breakoutRooms.length + 1}`;
    try {
      apiRef.current?.executeCommand('addBreakoutRoom', name);
      setBreakoutRoomName('');
      pushToast(`Breakout room "${name}" dibuat.`, 'success');
    } catch {
      pushToast('Server meeting belum mendukung Breakout Room.', 'danger');
    }
  };

  const handleAutoAssignBreakout = () => {
    try {
      apiRef.current?.executeCommand('autoAssignToBreakoutRooms');
      pushToast('Peserta dibagi otomatis ke breakout room.', 'default');
    } catch {
      pushToast('Gagal membagi peserta otomatis.', 'danger');
    }
  };

  const handleJoinBreakout = (jid: string) => {
    try {
      apiRef.current?.executeCommand('joinBreakoutRoom', jid);
      setHostSheetOpen(false);
    } catch {
      pushToast('Gagal masuk ke breakout room.', 'danger');
    }
  };

  const handleReturnToMainRoom = () => {
    try {
      if (mainRoomJid) {
        apiRef.current?.executeCommand('joinBreakoutRoom', mainRoomJid);
      } else {
        apiRef.current?.executeCommand('joinBreakoutRoom');
      }
      setHostSheetOpen(false);
    } catch {
      pushToast('Gagal kembali ke ruang utama.', 'danger');
    }
  };

  const handleCloseBreakout = (jid: string) => {
    try {
      apiRef.current?.executeCommand('closeBreakoutRoom', jid);
      pushToast('Breakout room ditutup.', 'default');
    } catch {
      pushToast('Gagal menutup breakout room.', 'danger');
    }
  };

  const handleEndAll = async () => {
    isEndingRef.current = true;
    try {
      await api.post(`/meetings/${kode}/end`);
      try {
        apiRef.current?.executeCommand('hangup');
      } catch {
        // Ignore if Jitsi already closed
      }
      apiRef.current?.dispose();
      apiRef.current = null;
      const durationMs = session ? Date.now() - session.joinedAtMs : undefined;
      clearSession();
      pushToast('Meeting diakhiri untuk semua peserta.', 'default');
      navigate(`/m/${kode}/selesai`, { replace: true, state: { durationMs } });
    } catch (err) {
      pushToast(extractErrorMessage(err, 'Gagal mengakhiri meeting.'), 'danger');
    }
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0E1B18] text-white">
      {loadError ? (
        <div className="flex h-full flex-col items-center justify-center p-6 text-center">
          <BrandLogo size="sm" inverted className="mb-4" />
          <h1 className="font-display text-xl font-bold">Gagal memuat ruang</h1>
          <p className="mt-2 max-w-sm text-sm text-[#94A3B8]">{loadError}</p>
          <Button
            variant="outline"
            className="mt-5 border-[#233C36] bg-[#142622] text-white hover:bg-[#1B332E]"
            onClick={() => navigate(`/m/${kode}`, { replace: true })}
          >
            Kembali ke pra-join
          </Button>
        </div>
      ) : (
        <div ref={containerRef} className="h-full w-full" />
      )}

      {(canModerate || inBreakoutRoom) && (
        <div className="fixed bottom-20 left-3 z-30 flex flex-wrap items-center gap-2 sm:bottom-4 sm:left-4">
          {canModerate && (
            <Button
              variant="outline"
              onClick={() => setHostSheetOpen(true)}
              className="border-[#233C36] bg-[#0E1B18]/90 text-white backdrop-blur-xs hover:bg-[#142622]"
            >
              <Shield className="h-4 w-4 text-[#5EEAD4]" strokeWidth={1.75} />
              <span>Panel Host</span>
              {waitingList.length > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#D4552B] px-1.5 font-mono text-xs text-white">
                  {waitingList.length}
                </span>
              )}
            </Button>
          )}
          {inBreakoutRoom && (
            <Button
              variant="outline"
              onClick={handleReturnToMainRoom}
              className="border-[#0D9488] bg-[#0B7A69]/95 text-white hover:bg-[#0D9488]"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              <span>Kembali ke Ruang Utama</span>
            </Button>
          )}
        </div>
      )}

      <Sheet
        open={hostSheetOpen}
        onClose={() => setHostSheetOpen(false)}
        title="Kontrol Host"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              {locked ? (
                <Lock className="h-4 w-4 text-[var(--clay)]" strokeWidth={1.75} />
              ) : (
                <Unlock className="h-4 w-4 text-[var(--moss)]" strokeWidth={1.75} />
              )}
              <span className="text-sm font-medium">
                {locked ? 'Ruang terkunci' : 'Ruang terbuka'}
              </span>
            </div>
            <Button variant="outline" onClick={handleToggleLock}>
              {locked ? 'Buka kunci' : 'Kunci ruang'}
            </Button>
          </div>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
              Menunggu izin ({waitingList.length})
            </h3>
            {waitingList.length === 0 ? (
              <p className="text-sm text-[var(--ink-soft)]">Tidak ada yang menunggu.</p>
            ) : (
              <ul className="divide-y divide-[var(--line)] rounded-[10px] border border-[var(--line)]">
                {waitingList.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 p-3">
                    <span className="truncate text-sm font-medium">{p.display_name}</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="primary"
                        size="icon"
                        aria-label={`Terima ${p.display_name}`}
                        onClick={() => handleAdmit(p.id)}
                      >
                        <Check className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Tolak ${p.display_name}`}
                        onClick={() => handleDeny(p.id)}
                      >
                        <X className="h-4 w-4 text-[var(--clay)]" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
              Peserta aktif ({activeList.length})
            </h3>
            <ul className="divide-y divide-[var(--line)] rounded-[10px] border border-[var(--line)]">
              {activeList.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 p-3">
                  <span className="truncate text-sm font-medium">
                    {p.display_name}{' '}
                    {p.role === 'host' && (
                      <span className="font-mono text-xs text-[var(--moss)]">(Host)</span>
                    )}
                    {p.role === 'cohost' && (
                      <span className="font-mono text-xs text-[var(--sand)]">(Co-host)</span>
                    )}
                  </span>
                  {p.role !== 'host' && (
                    <div className="flex items-center gap-1">
                      {session?.role === 'host' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={p.role === 'cohost' ? 'Cabut Co-host' : 'Jadikan Co-host'}
                          aria-label={`Ubah peran co-host ${p.display_name}`}
                          onClick={() => handleToggleCohost(p.id)}
                        >
                          <Shield
                            className={`h-4 w-4 ${p.role === 'cohost' ? 'text-[var(--sand)]' : 'text-[var(--ink-soft)]'}`}
                            strokeWidth={1.75}
                          />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Keluarkan ${p.display_name}`}
                        onClick={() => handleKick(p.id)}
                      >
                        <UserX className="h-4 w-4 text-[var(--clay)]" strokeWidth={1.75} />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2.5 border-t border-[var(--line)] pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
                <Layers className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Breakout Rooms ({breakoutRooms.length})</span>
              </h3>
              {breakoutRooms.length > 0 && (
                <button
                  type="button"
                  onClick={handleAutoAssignBreakout}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] border border-[var(--line)] bg-[var(--paper-2)] px-2.5 py-1 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-2)]/70"
                >
                  <Shuffle className="h-3 w-3" strokeWidth={1.75} />
                  <span>Bagi otomatis</span>
                </button>
              )}
            </div>

            {inBreakoutRoom && (
              <div className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--moss)]/40 bg-[var(--moss)]/10 px-3 py-2">
                <span className="text-xs font-medium text-[var(--ink)]">
                  Kamu sedang berada di breakout room
                </span>
                <Button variant="outline" onClick={handleReturnToMainRoom} className="shrink-0">
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Ruang Utama</span>
                </Button>
              </div>
            )}

            <form onSubmit={handleAddBreakoutRoom} className="flex gap-2">
              <input
                type="text"
                value={breakoutRoomName}
                onChange={(e) => setBreakoutRoomName(e.target.value)}
                placeholder={`Kelompok ${breakoutRooms.length + 1}`}
                className="min-h-[40px] flex-1 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)]/70 focus:border-[var(--moss)] focus:bg-[var(--paper)] focus:outline-none"
              />
              <Button type="submit" variant="outline" className="shrink-0">
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                <span>Buat</span>
              </Button>
            </form>

            {breakoutRooms.length > 0 && (
              <ul className="divide-y divide-[var(--line)] rounded-[10px] border border-[var(--line)]">
                {breakoutRooms.map((room) => (
                  <li key={room.jid} className="flex items-center justify-between gap-2 p-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{room.name}</p>
                      <p className="font-mono text-[11px] text-[var(--ink-soft)]">
                        {room.participantCount} peserta
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" onClick={() => handleJoinBreakout(room.jid)}>
                        Masuk
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Tutup ${room.name}`}
                        onClick={() => handleCloseBreakout(room.jid)}
                      >
                        <X className="h-4 w-4 text-[var(--clay)]" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {session?.role === 'host' && (
            <div className="border-t border-[var(--line)] pt-4">
              <Button variant="danger" size="lg" className="w-full" onClick={handleEndAll}>
                Akhiri untuk semua
              </Button>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
