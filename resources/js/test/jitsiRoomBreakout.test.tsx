import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { JitsiRoomPage } from '@/features/room/JitsiRoomPage';
import { useRoomSessionStore } from '@/stores/useRoomSessionStore';

const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
const executeCommandMock = vi.fn();
const disposeMock = vi.fn();

vi.mock('@/lib/jitsi', () => ({
  loadJitsiExternalApi: vi.fn(async () => {
    return class MockJitsiAPI {
      addListener(event: string, cb: (...args: unknown[]) => void) {
        const list = listeners.get(event) ?? [];
        list.push(cb);
        listeners.set(event, list);
      }
      removeListener(event: string, cb: (...args: unknown[]) => void) {
        const list = listeners.get(event) ?? [];
        listeners.set(
          event,
          list.filter((fn) => fn !== cb)
        );
      }
      executeCommand = executeCommandMock;
      listBreakoutRooms = vi.fn(async () => ({}));
      dispose = disposeMock;
    };
  }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(async (url: string) => {
      if (url.endsWith('/waiting')) {
        return {
          data: {
            waiting: [],
            active: [
              { id: 1, display_name: 'Host User', role: 'host', status: 'admitted' },
              { id: 2, display_name: 'Guest A', role: 'guest', status: 'admitted' },
              { id: 3, display_name: 'Guest B', role: 'guest', status: 'admitted' },
            ],
          },
        };
      }
      return { data: { status: 'admitted', meeting_status: 'live' } };
    }),
    post: vi.fn(async () => ({ data: {} })),
  },
  extractErrorMessage: (_err: unknown, fallback: string) => fallback,
}));

function emitJitsiEvent(event: string, payload?: unknown) {
  const list = listeners.get(event) ?? [];
  list.forEach((cb) => cb(payload));
}

describe('JitsiRoomPage breakout rooms flow', () => {
  beforeEach(() => {
    listeners.clear();
    executeCommandMock.mockClear();
    disposeMock.mockClear();

    useRoomSessionStore.setState({
      session: {
        code: 'abc-def-ghi',
        jwt: 'fake.jwt.token',
        room: 'abc-def-ghi',
        domain: 'meet.example.com',
        role: 'host',
        participantId: 1,
        displayName: 'Host User',
        startMutedAudio: false,
        startMutedVideo: false,
        joinedAtMs: Date.now(),
      },
    });
  });

  function renderRoom() {
    return render(
      <MemoryRouter initialEntries={['/m/abc-def-ghi/ruang']}>
        <Routes>
          <Route path="/m/:kode/ruang" element={<JitsiRoomPage />} />
          <Route path="/m/:kode/selesai" element={<div>Selesai Page</div>} />
          <Route path="/m/:kode" element={<div>Prejoin Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('renders Breakout Rooms section once even with multiple non-host participants', async () => {
    renderRoom();

    await waitFor(() => {
      expect(screen.getByText('Panel Host')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Panel Host'));

    await waitFor(() => {
      expect(screen.getByText('Guest A')).toBeInTheDocument();
      expect(screen.getByText('Guest B')).toBeInTheDocument();
    });

    const breakoutHeadings = screen.getAllByText(/Breakout Rooms \(0\)/i);
    expect(breakoutHeadings).toHaveLength(1);
  });

  it('does not exit to finished page when switching into and out of a breakout room', async () => {
    renderRoom();

    await waitFor(() => {
      expect(listeners.has('breakoutRoomsUpdated')).toBe(true);
    });

    act(() => {
      emitJitsiEvent('breakoutRoomsUpdated', {
        rooms: {
          main: { id: 'main', jid: 'main@conference.meet.example.com', isMainRoom: true },
          b1: {
            id: 'b1',
            jid: 'b1@breakout.meet.example.com',
            name: 'Kelompok 1',
            participants: { p1: {} },
          },
        },
      });
    });

    fireEvent.click(screen.getByText('Panel Host'));
    fireEvent.click(screen.getByText('Masuk'));

    expect(executeCommandMock).toHaveBeenCalledWith('joinBreakoutRoom', 'b1@breakout.meet.example.com');

    // Jitsi fires videoConferenceLeft then videoConferenceJoined({ breakoutRoom: true })
    act(() => {
      emitJitsiEvent('videoConferenceLeft');
      emitJitsiEvent('videoConferenceJoined', { breakoutRoom: true });
    });

    await waitFor(() => {
      expect(screen.getByText('Kembali ke Ruang Utama')).toBeInTheDocument();
    });
    expect(screen.queryByText('Selesai Page')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Kembali ke Ruang Utama'));
    expect(executeCommandMock).toHaveBeenCalledWith(
      'joinBreakoutRoom',
      'main@conference.meet.example.com'
    );
  });

  it('exits to finished page on readyToClose', async () => {
    renderRoom();

    await waitFor(() => {
      expect(listeners.has('readyToClose')).toBe(true);
    });

    await act(async () => {
      emitJitsiEvent('readyToClose');
    });

    await waitFor(() => {
      expect(screen.getByText('Selesai Page')).toBeInTheDocument();
    });
  });
});
