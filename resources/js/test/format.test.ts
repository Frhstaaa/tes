import { describe, expect, it } from 'vitest';
import { extractRoomCode, formatDuration } from '@/lib/format';

describe('format helpers', () => {
  it('extracts room code from full URL or plain code', () => {
    expect(extractRoomCode('https://meetingkeun.id/m/kdm-4f9-xqa')).toBe('kdm-4f9-xqa');
    expect(extractRoomCode('  KDM-4F9-XQA  ')).toBe('kdm-4f9-xqa');
  });

  it('formats meeting duration cleanly', () => {
    expect(formatDuration('2026-11-23T10:00:00Z', '2026-11-23T10:45:00Z')).toBe('45 menit');
    expect(formatDuration('2026-11-23T10:00:00Z', '2026-11-23T11:30:00Z')).toBe('1 jam 30 menit');
  });
});
