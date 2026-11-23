<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Meeting;
use Illuminate\Console\Command;

class AutoEndIdleMeetings extends Command
{
    protected $signature = 'meetings:auto-end {--minutes=30 : Menit tanpa peserta aktif sebelum diakhiri}';

    protected $description = 'Mengakhiri ruang meeting live yang sudah kosong melewati batas waktu';

    public function handle(): int
    {
        $idleMinutes = max(5, (int) $this->option('minutes'));
        $cutoff = now()->subMinutes($idleMinutes);

        $meetings = Meeting::query()
            ->where('status', 'live')
            ->where('updated_at', '<', $cutoff)
            ->get();

        $endedCount = 0;

        foreach ($meetings as $meeting) {
            $hasActiveParticipant = $meeting->participants()
                ->where('status', 'admitted')
                ->whereNull('left_at')
                ->exists();

            if ($hasActiveParticipant) {
                continue;
            }

            $lastLeft = $meeting->participants()->max('left_at');
            $lastActivity = $lastLeft ?? $meeting->started_at ?? $meeting->updated_at;

            if ($lastActivity && now()->parse($lastActivity)->lt($cutoff)) {
                $meeting->update([
                    'status' => 'ended',
                    'ended_at' => now(),
                ]);
                AuditLog::record('meeting.auto_ended', null, 'meeting', $meeting->code, [
                    'idle_minutes' => $idleMinutes,
                ]);
                $endedCount++;
            }
        }

        $this->info("Berhasil mengakhiri {$endedCount} ruang meeting kosong.");

        return self::SUCCESS;
    }
}
