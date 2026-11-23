<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_always_creates_regular_user_not_superadmin(): void
    {
        Cache::put('captcha:reg-test', Hash::make('12345'), now()->addMinutes(5));

        $res = $this->postJson('/api/auth/register', [
            'name' => 'Pendaftar Baru',
            'email' => 'pendaftar@contoh.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'captcha_id' => 'reg-test',
            'captcha_answer' => '12345',
        ]);

        $res->assertCreated()
            ->assertJsonPath('user.role', 'user')
            ->assertJsonPath('user.is_active', true);

        $this->getJson('/api/admin/users')->assertForbidden();
    }

    public function test_non_superadmin_cannot_access_admin_users(): void
    {
        $user = User::factory()->create(['role' => 'user', 'is_active' => true]);

        $this->actingAs($user)
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_superadmin_can_create_update_deactivate_and_delete_users(): void
    {
        $admin = User::factory()->create(['role' => 'superadmin', 'is_active' => true]);

        $createRes = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Budi Host',
            'email' => 'budi@meetingkeun.id',
            'password' => 'password123',
            'role' => 'user',
        ]);

        $createRes->assertCreated()
            ->assertJsonPath('user.role', 'user')
            ->assertJsonPath('user.is_active', true);

        $userId = $createRes->json('user.id');

        // Deactivate user
        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$userId}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('user.is_active', false);

        // Inactive user cannot login
        Cache::put('captcha:login-test', Hash::make('12345'), now()->addMinutes(5));
        $this->postJson('/api/auth/login', [
            'email' => 'budi@meetingkeun.id',
            'password' => 'password123',
            'captcha_id' => 'login-test',
            'captcha_answer' => '12345',
        ])->assertForbidden();

        // Superadmin cannot deactivate self
        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$admin->id}", ['is_active' => false])
            ->assertStatus(422);

        // Superadmin can delete other user
        $this->actingAs($admin)
            ->deleteJson("/api/admin/users/{$userId}")
            ->assertOk();
    }

    public function test_superadmin_can_monitor_and_join_any_live_meeting(): void
    {
        $admin = User::factory()->create(['role' => 'superadmin', 'is_active' => true]);
        $host = User::factory()->create(['role' => 'user', 'is_active' => true]);

        $meeting = \App\Models\Meeting::create([
            'code' => \App\Models\Meeting::generateUniqueCode(),
            'host_id' => $host->id,
            'title' => 'Rapat Divisi',
            'type' => 'instant',
            'status' => 'live',
            'lobby_enabled' => true,
            'locked' => true,
            'started_at' => now(),
        ]);

        // Monitor endpoint lists the live meeting
        $this->actingAs($admin)
            ->getJson('/api/admin/meetings')
            ->assertOk()
            ->assertJsonPath('stats.live', 1)
            ->assertJsonPath('meetings.0.code', $meeting->code);

        // Superadmin can join even locked + lobby room without passcode/captcha as moderator
        $this->actingAs($admin)
            ->postJson("/api/meetings/{$meeting->code}/join", [
                'display_name' => 'Superadmin',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'admitted')
            ->assertJsonPath('role', 'host');
    }
}
