<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Meeting;
use App\Models\User;
use App\Services\WhatsAppGatewayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('q', ''));

        $query = User::query()
            ->withCount('meetings')
            ->orderByRaw("CASE WHEN role = 'superadmin' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->get()->map(fn (User $u) => $this->formatAdminUser($u));

        $statsRow = User::query()
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
                SUM(CASE WHEN role = 'superadmin' THEN 1 ELSE 0 END) as superadmins
            ")
            ->first();

        return response()->json([
            'users' => $users,
            'stats' => [
                'total' => (int) ($statsRow->total ?? 0),
                'active' => (int) ($statsRow->active ?? 0),
                'inactive' => (int) ($statsRow->inactive ?? 0),
                'superadmins' => (int) ($statsRow->superadmins ?? 0),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::min(8)],
            'role' => ['required', Rule::in(['user', 'superadmin'])],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $user->loadCount('meetings');

        AuditLog::record('admin.user.created', $request->user()->id, 'user', $user->id, [
            'email' => $user->email,
            'role' => $user->role,
        ], $request);

        return response()->json([
            'user' => $this->formatAdminUser($user),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::withCount('meetings')->findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'role' => ['sometimes', Rule::in(['user', 'superadmin'])],
            'is_active' => ['sometimes', 'boolean'],
            'password' => ['nullable', Password::min(8)],
        ]);

        if ($user->id === $request->user()->id) {
            if (isset($validated['is_active']) && $validated['is_active'] === false) {
                return response()->json([
                    'message' => 'Tidak dapat menonaktifkan akun sendiri.',
                ], 422);
            }
            if (isset($validated['role']) && $validated['role'] !== 'superadmin') {
                return response()->json([
                    'message' => 'Tidak dapat menurunkan peran akun sendiri.',
                ], 422);
            }
        }

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->fill(collect($validated)->only(['name', 'role', 'is_active'])->toArray());
        $user->save();

        AuditLog::record('admin.user.updated', $request->user()->id, 'user', $user->id, [
            'role' => $user->role,
            'is_active' => $user->is_active,
        ], $request);

        return response()->json([
            'user' => $this->formatAdminUser($user),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Tidak dapat menghapus akun yang sedang dipakai.',
            ], 422);
        }

        $deletedEmail = $user->email;
        $user->delete();

        AuditLog::record('admin.user.deleted', $request->user()->id, 'user', $id, [
            'email' => $deletedEmail,
        ], $request);

        return response()->json([
            'message' => 'Pengguna berhasil dihapus.',
        ]);
    }

    public function auditLogs(): JsonResponse
    {
        $logs = AuditLog::query()
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'target_type' => $log->target_type,
                'target_id' => $log->target_id,
                'metadata' => $log->metadata,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at?->toIso8601String(),
                'actor' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                ] : null,
            ]);

        return response()->json([
            'logs' => $logs,
        ]);
    }

    public function meetings(): JsonResponse
    {
        $meetings = Meeting::query()
            ->with('host:id,name,email')
            ->withCount([
                'participants as active_participants_count' => function ($q) {
                    $q->where('status', 'admitted')->whereNull('left_at');
                },
                'participants as waiting_participants_count' => function ($q) {
                    $q->where('status', 'waiting');
                },
            ])
            ->whereIn('status', ['live', 'scheduled'])
            ->orderByRaw("CASE WHEN status = 'live' THEN 0 ELSE 1 END")
            ->orderByDesc('started_at')
            ->orderBy('scheduled_at')
            ->limit(100)
            ->get()
            ->map(fn (Meeting $m) => [
                'id' => $m->id,
                'code' => $m->code,
                'title' => $m->title,
                'type' => $m->type,
                'status' => $m->status,
                'locked' => $m->locked,
                'lobby_enabled' => $m->lobby_enabled,
                'requires_passcode' => $m->hasPasscode(),
                'started_at' => $m->started_at?->toIso8601String(),
                'scheduled_at' => $m->scheduled_at?->toIso8601String(),
                'active_participants_count' => $m->active_participants_count,
                'waiting_participants_count' => $m->waiting_participants_count,
                'host' => $m->host ? [
                    'id' => $m->host->id,
                    'name' => $m->host->name,
                    'email' => $m->host->email,
                ] : null,
            ]);

        return response()->json([
            'meetings' => $meetings,
            'stats' => [
                'live' => $meetings->where('status', 'live')->count(),
                'scheduled' => $meetings->where('status', 'scheduled')->count(),
                'active_participants' => $meetings->sum('active_participants_count'),
            ],
        ]);
    }

    public function getWhatsappSettings(WhatsAppGatewayService $wa): JsonResponse
    {
        return response()->json([
            'whatsapp' => $wa->getAdminView(),
        ]);
    }

    public function updateWhatsappSettings(Request $request, WhatsAppGatewayService $wa): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'provider' => ['required', Rule::in(['fonnte', 'wablas', 'waha', 'custom'])],
            'api_url' => ['nullable', 'url', 'max:500'],
            'api_key' => ['nullable', 'string', 'max:500'],
            'clear_api_key' => ['nullable', 'boolean'],
            'session' => ['nullable', 'string', 'max:100'],
        ]);

        if ($validated['enabled'] && empty($validated['api_url'])) {
            return response()->json([
                'message' => 'URL Endpoint API wajib diisi saat WhatsApp Gateway diaktifkan.',
            ], 422);
        }

        $wa->saveConfig($validated);

        AuditLog::record('admin.whatsapp.updated', $request->user()->id, 'setting', 'whatsapp', [
            'enabled' => $validated['enabled'],
            'provider' => $validated['provider'],
        ], $request);

        return response()->json([
            'whatsapp' => $wa->getAdminView(),
        ]);
    }

    public function testWhatsapp(Request $request, WhatsAppGatewayService $wa): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'min:8', 'max:30'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $msg = trim((string) ($validated['message'] ?? ''))
            ?: "*Tes Koneksi WhatsApp Gateway*\nMeetingkeun berhasil terhubung dengan engine WhatsApp Anda.";

        try {
            $result = $wa->sendMessage($validated['phone'], $msg, false);
        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        if (! $result['success']) {
            return response()->json([
                'message' => $result['error'] ?: 'Gagal mengirim pesan tes.',
                'result' => $result,
            ], 422);
        }

        return response()->json([
            'message' => 'Pesan tes berhasil dikirim ke ' . $result['phone'] . '.',
            'result' => $result,
        ]);
    }

    private function formatAdminUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role ?? 'user',
            'is_active' => (bool) ($user->is_active ?? true),
            'meetings_count' => $user->meetings_count ?? 0,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
