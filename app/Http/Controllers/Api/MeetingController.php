<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Meeting;
use App\Models\MeetingParticipant;
use App\Services\JitsiJwtService;
use App\Services\NumericCaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MeetingController extends Controller
{
    public function __construct(
        private readonly JitsiJwtService $jwtService,
        private readonly NumericCaptchaService $captchaService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $filter = $request->query('filter', 'all');

        $query = Meeting::query()
            ->where('host_id', $user->id)
            ->withCount(['participants as participant_count']);

        if ($filter === 'upcoming') {
            $query->whereIn('status', ['scheduled', 'live'])
                ->orderByRaw('COALESCE(scheduled_at, created_at) ASC');
        } elseif ($filter === 'history') {
            $query->whereIn('status', ['ended', 'cancelled'])
                ->orderByDesc('ended_at')
                ->orderByDesc('updated_at');
        } else {
            $query->orderByDesc('created_at');
        }

        $meetings = $query->limit(50)->get()->map(fn (Meeting $m) => $this->formatMeeting($m, $user->id));

        return response()->json([
            'meetings' => $meetings,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'type' => ['required', 'in:instant,scheduled'],
            'scheduled_at' => ['nullable', 'required_if:type,scheduled', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:480'],
            'passcode' => ['nullable', 'string', 'min:4', 'max:32'],
            'lobby_enabled' => ['nullable', 'boolean'],
        ]);

        $type = $validated['type'];
        $defaultTitle = $type === 'instant'
            ? 'Meeting Cepat'
            : 'Meeting Terjadwal';

        $scheduledAt = $type === 'scheduled' && ! empty($validated['scheduled_at'])
            ? Carbon::parse($validated['scheduled_at'])->setTimezone(config('app.timezone'))
            : null;

        $meeting = Meeting::create([
            'code' => Meeting::generateUniqueCode(),
            'host_id' => $request->user()->id,
            'title' => trim($validated['title'] ?? '') ?: $defaultTitle,
            'description' => $validated['description'] ?? null,
            'type' => $type,
            'status' => $type === 'instant' ? 'live' : 'scheduled',
            'scheduled_at' => $scheduledAt,
            'duration_minutes' => $validated['duration_minutes'] ?? 60,
            'passcode_hash' => ! empty($validated['passcode']) ? Hash::make($validated['passcode']) : null,
            'lobby_enabled' => $validated['lobby_enabled'] ?? ($type === 'scheduled'),
            'locked' => false,
            'started_at' => $type === 'instant' ? now() : null,
        ]);

        return response()->json([
            'meeting' => $this->formatMeeting($meeting, $request->user()->id),
        ], 201);
    }

    public function show(Request $request, string $code): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->with('host:id,name')->first();

        if (! $meeting) {
            return response()->json([
                'message' => 'Ruang meeting tidak ditemukan.',
            ], 404);
        }

        $user = $request->user('sanctum');

        return response()->json([
            'meeting' => $this->formatMeeting($meeting, $user?->id),
        ]);
    }

    public function update(Request $request, string $code): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->firstOrFail();
        Gate::authorize('manage', $meeting);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'scheduled_at' => ['nullable', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:480'],
            'passcode' => ['nullable', 'string', 'min:4', 'max:32'],
            'clear_passcode' => ['nullable', 'boolean'],
            'lobby_enabled' => ['sometimes', 'boolean'],
        ]);

        if (! empty($validated['clear_passcode'])) {
            $meeting->passcode_hash = null;
        } elseif (! empty($validated['passcode'])) {
            $meeting->passcode_hash = Hash::make($validated['passcode']);
        }

        $data = collect($validated)->only([
            'title',
            'description',
            'duration_minutes',
            'lobby_enabled',
        ])->toArray();

        if (! empty($validated['scheduled_at'])) {
            $data['scheduled_at'] = Carbon::parse($validated['scheduled_at'])->setTimezone(config('app.timezone'));
        }

        $meeting->fill($data);
        $meeting->save();

        return response()->json([
            'meeting' => $this->formatMeeting($meeting, $request->user()->id),
        ]);
    }

    public function destroy(Request $request, string $code): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->firstOrFail();
        Gate::authorize('manage', $meeting);

        $meeting->update([
            'status' => 'cancelled',
            'ended_at' => now(),
        ]);

        return response()->json([
            'message' => 'Meeting dibatalkan.',
        ]);
    }

    public function join(Request $request, string $code): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->first();

        if (! $meeting) {
            return response()->json([
                'message' => 'Ruang tidak ditemukan.',
            ], 404);
        }

        if (in_array($meeting->status, ['ended', 'cancelled'], true)) {
            return response()->json([
                'message' => 'Meeting ini sudah selesai.',
                'status' => $meeting->status,
            ], 410);
        }

        $user = $request->user('sanctum');
        $isHost = $user && $user->id === $meeting->host_id;

        $validated = $request->validate([
            'display_name' => ['required', 'string', 'min:1', 'max:60'],
            'passcode' => ['nullable', 'string', 'max:32'],
            'captcha_id' => [$isHost ? 'nullable' : 'required', 'string'],
            'captcha_answer' => [$isHost ? 'nullable' : 'required', 'string'],
        ]);

        if (! $isHost && ! $this->captchaService->verify($validated['captcha_id'] ?? null, $validated['captcha_answer'] ?? null)) {
            return response()->json([
                'message' => 'Angka verifikasi (CAPTCHA) tidak cocok. Silakan muat ulang.',
            ], 422);
        }

        if ($meeting->locked && ! $isHost) {
            return response()->json([
                'message' => 'Ruang sedang dikunci oleh host.',
            ], 423);
        }

        if (! $isHost && ! $meeting->verifyPasscode($validated['passcode'] ?? null)) {
            return response()->json([
                'message' => 'Kode akses (passcode) salah.',
            ], 403);
        }

        if ($meeting->status === 'scheduled' && ! $isHost && $meeting->scheduled_at && $meeting->scheduled_at->isFuture()) {
            // Allow joining up to 15 minutes early
            if ($meeting->scheduled_at->diffInMinutes(now(), false) < -15) {
                return response()->json([
                    'message' => 'Meeting belum dimulai.',
                ], 403);
            }
        }

        $hostJoined = $this->hasHostJoined($meeting);
        $needsWait = ! $isHost && (! $hostJoined || $meeting->lobby_enabled);
        $status = $needsWait ? 'waiting' : 'admitted';

        $participant = MeetingParticipant::create([
            'meeting_id' => $meeting->id,
            'user_id' => $user?->id,
            'display_name' => trim($validated['display_name']),
            'role' => $isHost ? 'host' : 'guest',
            'status' => $status,
            'joined_at' => $status === 'admitted' ? now() : null,
        ]);

        if ($status === 'admitted' && $meeting->status === 'scheduled') {
            $meeting->update([
                'status' => 'live',
                'started_at' => $meeting->started_at ?? now(),
            ]);
        }

        if ($status === 'waiting') {
            return response()->json([
                'status' => 'waiting',
                'waiting_reason' => ! $hostJoined ? 'host_not_joined' : 'lobby',
                'participant_id' => $participant->id,
                'role' => $participant->role,
                'room' => $meeting->code,
                'domain' => config('jitsi.domain'),
            ]);
        }

        return response()->json([
            'status' => 'admitted',
            'participant_id' => $participant->id,
            'role' => $participant->role,
            'room' => $meeting->code,
            'domain' => config('jitsi.domain'),
            'jwt' => $this->jwtService->issueToken($meeting, $participant),
        ]);
    }

    public function participantStatus(string $code, int $id): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->firstOrFail();
        $participant = $meeting->participants()->where('id', $id)->firstOrFail();

        if (in_array($meeting->status, ['ended', 'cancelled'], true)) {
            return response()->json([
                'status' => 'ended',
                'meeting_status' => $meeting->status,
            ]);
        }

        $hostJoined = $this->hasHostJoined($meeting);

        // If lobby is disabled and host has now opened the room, auto-admit waiting guest
        if ($participant->status === 'waiting' && ! $meeting->lobby_enabled && $hostJoined) {
            $participant->update([
                'status' => 'admitted',
                'joined_at' => now(),
            ]);
        }

        $response = [
            'status' => $participant->status,
            'waiting_reason' => $participant->status === 'waiting'
                ? (! $hostJoined ? 'host_not_joined' : 'lobby')
                : null,
            'meeting_status' => $meeting->status,
            'participant_id' => $participant->id,
            'role' => $participant->role,
            'room' => $meeting->code,
            'domain' => config('jitsi.domain'),
        ];

        if ($participant->status === 'admitted') {
            $response['jwt'] = $this->jwtService->issueToken($meeting, $participant);
        }

        return response()->json($response);
    }

    private function hasHostJoined(Meeting $meeting): bool
    {
        return $meeting->participants()
            ->where('role', 'host')
            ->where('status', 'admitted')
            ->whereNull('left_at')
            ->exists();
    }

    public function leave(Request $request, string $code): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->firstOrFail();
        $validated = $request->validate([
            'participant_id' => ['nullable', 'integer'],
        ]);

        if (! empty($validated['participant_id'])) {
            $meeting->participants()
                ->where('id', $validated['participant_id'])
                ->update([
                    'status' => 'left',
                    'left_at' => now(),
                ]);
        }

        return response()->json([
            'message' => 'Berhasil keluar dari ruang.',
        ]);
    }

    public function end(Request $request, string $code): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->firstOrFail();
        Gate::authorize('manage', $meeting);

        $meeting->update([
            'status' => 'ended',
            'ended_at' => now(),
        ]);

        $meeting->participants()
            ->whereNull('left_at')
            ->update([
                'left_at' => now(),
            ]);

        AuditLog::record('meeting.ended', $request->user()->id, 'meeting', $meeting->code, [], $request);

        return response()->json([
            'meeting' => $this->formatMeeting($meeting, $request->user()->id),
        ]);
    }

    public function lock(Request $request, string $code): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->firstOrFail();
        Gate::authorize('moderate', $meeting);

        $locked = $request->has('locked')
            ? $request->boolean('locked')
            : ! $meeting->locked;

        $meeting->update(['locked' => $locked]);

        AuditLog::record(
            $locked ? 'meeting.locked' : 'meeting.unlocked',
            $request->user()->id,
            'meeting',
            $meeting->code,
            [],
            $request
        );

        return response()->json([
            'locked' => $meeting->locked,
            'meeting' => $this->formatMeeting($meeting, $request->user()->id),
        ]);
    }

    public function waiting(Request $request, string $code): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->firstOrFail();
        Gate::authorize('moderate', $meeting);

        $waiting = $meeting->participants()
            ->where('status', 'waiting')
            ->orderBy('created_at')
            ->get(['id', 'display_name', 'role', 'status', 'created_at']);

        $active = $meeting->participants()
            ->where('status', 'admitted')
            ->orderBy('joined_at')
            ->get(['id', 'display_name', 'role', 'status', 'joined_at']);

        return response()->json([
            'waiting' => $waiting,
            'active' => $active,
        ]);
    }

    public function admit(Request $request, string $code, int $id): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->firstOrFail();
        Gate::authorize('moderate', $meeting);

        $participant = $meeting->participants()->where('id', $id)->firstOrFail();
        $participant->update([
            'status' => 'admitted',
            'joined_at' => now(),
        ]);

        if ($meeting->status === 'scheduled') {
            $meeting->update([
                'status' => 'live',
                'started_at' => $meeting->started_at ?? now(),
            ]);
        }

        return response()->json([
            'participant' => $participant,
        ]);
    }

    public function deny(Request $request, string $code, int $id): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->firstOrFail();
        Gate::authorize('moderate', $meeting);

        $participant = $meeting->participants()->where('id', $id)->firstOrFail();
        $participant->update([
            'status' => 'denied',
        ]);

        return response()->json([
            'participant' => $participant,
        ]);
    }

    public function kick(Request $request, string $code, int $id): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->firstOrFail();
        Gate::authorize('moderate', $meeting);

        $participant = $meeting->participants()->where('id', $id)->firstOrFail();
        if ($participant->role === 'host') {
            return response()->json([
                'message' => 'Tidak dapat mengeluarkan host.',
            ], 422);
        }

        $participant->update([
            'status' => 'kicked',
            'left_at' => now(),
        ]);

        AuditLog::record('participant.kicked', $request->user()->id, 'meeting', $meeting->code, [
            'participant_id' => $participant->id,
            'display_name' => $participant->display_name,
        ], $request);

        return response()->json([
            'participant' => $participant,
        ]);
    }

    public function cohost(Request $request, string $code, int $id): JsonResponse
    {
        $meeting = Meeting::where('code', $code)->firstOrFail();
        Gate::authorize('manage', $meeting);

        $participant = $meeting->participants()->where('id', $id)->firstOrFail();
        if ($participant->role === 'host') {
            return response()->json([
                'message' => 'Host utama tidak dapat diubah.',
            ], 422);
        }

        $newRole = $participant->role === 'cohost' ? 'guest' : 'cohost';
        $participant->update(['role' => $newRole]);

        AuditLog::record('participant.cohost_toggled', $request->user()->id, 'meeting', $meeting->code, [
            'participant_id' => $participant->id,
            'display_name' => $participant->display_name,
            'role' => $newRole,
        ], $request);

        return response()->json([
            'participant' => $participant,
        ]);
    }

    public function openPersonalRoom(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->personal_room_code) {
            $slug = Str::slug(Str::words($user->name, 2, ''), '-');
            $slug = $slug !== '' ? substr($slug, 0, 18) : 'ruang';
            do {
                $candidate = 'ruang-'.$slug.'-'.strtolower(Str::random(3));
            } while (
                \App\Models\User::where('personal_room_code', $candidate)->exists() ||
                Meeting::where('code', $candidate)->exists()
            );

            $user->update(['personal_room_code' => $candidate]);
        }

        $meeting = Meeting::firstOrCreate(
            ['code' => $user->personal_room_code],
            [
                'host_id' => $user->id,
                'title' => "Ruang Pribadi {$user->name}",
                'type' => 'instant',
                'status' => 'live',
                'lobby_enabled' => true,
                'locked' => false,
                'started_at' => now(),
            ]
        );

        if (in_array($meeting->status, ['ended', 'cancelled'], true)) {
            $meeting->update([
                'status' => 'live',
                'started_at' => now(),
                'ended_at' => null,
            ]);
        }

        return response()->json([
            'personal_room_code' => $user->personal_room_code,
            'meeting' => $this->formatMeeting($meeting, $user->id),
        ]);
    }

    private function formatMeeting(Meeting $meeting, ?int $currentUserId): array
    {
        return [
            'id' => $meeting->id,
            'code' => $meeting->code,
            'title' => $meeting->title,
            'description' => $meeting->description,
            'type' => $meeting->type,
            'status' => $meeting->status,
            'scheduled_at' => $meeting->scheduled_at?->toIso8601String(),
            'duration_minutes' => $meeting->duration_minutes,
            'requires_passcode' => $meeting->hasPasscode(),
            'lobby_enabled' => $meeting->lobby_enabled,
            'locked' => $meeting->locked,
            'started_at' => $meeting->started_at?->toIso8601String(),
            'ended_at' => $meeting->ended_at?->toIso8601String(),
            'created_at' => $meeting->created_at?->toIso8601String(),
            'host_name' => $meeting->relationLoaded('host') ? $meeting->host?->name : null,
            'is_host' => $currentUserId !== null && $currentUserId === $meeting->host_id,
            'participant_count' => $meeting->participant_count ?? null,
        ];
    }
}
