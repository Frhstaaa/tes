<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\NumericCaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function __construct(
        private readonly NumericCaptchaService $captchaService
    ) {}

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'captcha_id' => ['required', 'string'],
            'captcha_answer' => ['required', 'string'],
        ]);

        if (! $this->captchaService->verify($validated['captcha_id'], $validated['captcha_answer'])) {
            return response()->json([
                'message' => 'Angka verifikasi (CAPTCHA) tidak cocok. Silakan muat ulang.',
            ], 422);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'user',
            'is_active' => true,
        ]);

        Auth::guard('web')->login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        AuditLog::record('auth.register', $user->id, 'user', $user->id, ['email' => $user->email], $request);

        return response()->json([
            'user' => $this->formatUser($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'captcha_id' => ['required', 'string'],
            'captcha_answer' => ['required', 'string'],
        ]);

        if (! $this->captchaService->verify($validated['captcha_id'], $validated['captcha_answer'])) {
            return response()->json([
                'message' => 'Angka verifikasi (CAPTCHA) tidak cocok. Silakan muat ulang.',
            ], 422);
        }

        $credentials = [
            'email' => $validated['email'],
            'password' => $validated['password'],
        ];

        if (! Auth::guard('web')->attempt($credentials, $request->boolean('remember', true))) {
            return response()->json([
                'message' => 'Email atau kata sandi tidak cocok.',
            ], 422);
        }

        if (! Auth::guard('web')->user()->is_active) {
            Auth::guard('web')->logout();
            return response()->json([
                'message' => 'Akun Anda sedang dinonaktifkan oleh superadmin.',
            ], 403);
        }

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        AuditLog::record('auth.login', Auth::guard('web')->id(), 'user', Auth::guard('web')->id(), [], $request);

        return response()->json([
            'user' => $this->formatUser(Auth::guard('web')->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Berhasil keluar.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->formatUser($request->user()),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $user->update([
            'name' => $validated['name'],
        ]);

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role ?? 'user',
            'is_active' => (bool) ($user->is_active ?? true),
            'avatar_path' => $user->avatar_path,
            'personal_room_code' => $user->personal_room_code,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
