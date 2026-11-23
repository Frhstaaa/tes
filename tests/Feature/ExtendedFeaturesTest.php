<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Meeting;
use App\Models\MeetingParticipant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ExtendedFeaturesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_open_permanent_personal_room(): void
    {
        $user = User::factory()->create(['name' => 'Tiyas Frahesta']);

        $res1 = $this->actingAs($user)->postJson('/api/me/personal-room');
        $res1->assertOk();
        $code1 = $res1->json('personal_room_code');
        $this->assertNotEmpty($code1);

        $res2 = $this->actingAs($user)->postJson('/api/me/personal-room');
        $res2->assertOk()->assertJsonPath('personal_room_code', $code1);
    }

    public function test_host_can_promote_cohost_and_cohost_can_moderate(): void
    {
        $host = User::factory()->create();
        $cohostUser = User::factory()->create();

        $meeting = Meeting::create([
            'code' => Meeting::generateUniqueCode(),
            'host_id' => $host->id,
            'title' => 'Rapat Co-host',
            'type' => 'instant',
            'status' => 'live',
            'lobby_enabled' => true,
        ]);

        $participant = MeetingParticipant::create([
            'meeting_id' => $meeting->id,
            'user_id' => $cohostUser->id,
            'display_name' => 'Co-host',
            'role' => 'guest',
            'status' => 'admitted',
            'joined_at' => now(),
        ]);

        // Promote to cohost
        $this->actingAs($host)
            ->postJson("/api/meetings/{$meeting->code}/participants/{$participant->id}/cohost")
            ->assertOk()
            ->assertJsonPath('participant.role', 'cohost');

        // Cohost can lock room, but cannot end meeting for all
        $this->actingAs($cohostUser)
            ->postJson("/api/meetings/{$meeting->code}/lock", ['locked' => true])
            ->assertOk()
            ->assertJsonPath('locked', true);

        $this->actingAs($cohostUser)
            ->postJson("/api/meetings/{$meeting->code}/end")
            ->assertForbidden();
    }

    public function test_auto_end_idle_meetings_command_ends_empty_stale_rooms(): void
    {
        $host = User::factory()->create();
        $staleMeeting = Meeting::create([
            'code' => Meeting::generateUniqueCode(),
            'host_id' => $host->id,
            'title' => 'Ruang Lama',
            'type' => 'instant',
            'status' => 'live',
            'started_at' => now()->subHours(2),
        ]);
        Meeting::where('id', $staleMeeting->id)->update(['updated_at' => now()->subHours(2)]);

        $this->artisan('meetings:auto-end --minutes=30')->assertSuccessful();

        $this->assertSame('ended', $staleMeeting->fresh()->status);
    }

    public function test_superadmin_can_view_audit_logs(): void
    {
        $admin = User::factory()->create(['role' => 'superadmin', 'is_active' => true]);
        AuditLog::record('auth.login', $admin->id, 'user', $admin->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/audit-logs')
            ->assertOk()
            ->assertJsonCount(1, 'logs')
            ->assertJsonPath('logs.0.action', 'auth.login');
    }
}
