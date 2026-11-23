<?php

namespace Tests\Feature;

use App\Models\Meeting;
use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MeetingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_unique_code_format_excludes_ambiguous_characters(): void
    {
        for ($i = 0; $i < 15; $i++) {
            $code = Meeting::generateUniqueCode();
            $this->assertMatchesRegularExpression('/^[2-9a-km-np-z]{3}-[2-9a-km-np-z]{3}-[2-9a-km-np-z]{3}$/', $code);
        }
    }

    public function test_host_can_create_instant_meeting_and_receive_moderator_jwt(): void
    {
        $host = User::factory()->create();

        $createResponse = $this->actingAs($host)->postJson('/api/meetings', [
            'type' => 'instant',
            'title' => 'Standup Pagi',
        ]);

        $createResponse->assertCreated();
        $code = $createResponse->json('meeting.code');

        $joinResponse = $this->actingAs($host)->postJson("/api/meetings/{$code}/join", [
            'display_name' => 'Tiyas',
        ]);

        $joinResponse->assertOk()
            ->assertJsonPath('status', 'admitted')
            ->assertJsonPath('role', 'host');

        $jwt = $joinResponse->json('jwt');
        $decoded = JWT::decode($jwt, new Key(config('jitsi.app_secret'), 'HS256'));

        $this->assertSame($code, $decoded->room);
        $this->assertTrue($decoded->context->user->moderator);
        $this->assertSame('Tiyas', $decoded->context->user->name);
    }

    public function test_guest_join_enforces_passcode_lock_and_lobby(): void
    {
        $host = User::factory()->create();
        $meeting = Meeting::create([
            'code' => Meeting::generateUniqueCode(),
            'host_id' => $host->id,
            'title' => 'Rapat Tim',
            'type' => 'scheduled',
            'status' => 'live',
            'passcode_hash' => Hash::make('rahasia'),
            'lobby_enabled' => true,
            'locked' => false,
        ]);

        // Wrong passcode
        Cache::put('captcha:c1', Hash::make('11111'), now()->addMinutes(5));
        $this->postJson("/api/meetings/{$meeting->code}/join", [
            'display_name' => 'Andi',
            'passcode' => 'salah',
            'captcha_id' => 'c1',
            'captcha_answer' => '11111',
        ])->assertStatus(403);

        // Correct passcode enters lobby waiting state without JWT
        Cache::put('captcha:c2', Hash::make('22222'), now()->addMinutes(5));
        $waitingRes = $this->postJson("/api/meetings/{$meeting->code}/join", [
            'display_name' => 'Andi',
            'passcode' => 'rahasia',
            'captcha_id' => 'c2',
            'captcha_answer' => '22222',
        ]);
        $waitingRes->assertOk()
            ->assertJsonPath('status', 'waiting')
            ->assertJsonMissingPath('jwt');

        $participantId = $waitingRes->json('participant_id');

        // Non-host cannot admit
        $otherUser = User::factory()->create();
        $this->actingAs($otherUser)
            ->postJson("/api/meetings/{$meeting->code}/participants/{$participantId}/admit")
            ->assertForbidden();

        // Host admits participant, then participant status returns non-moderator JWT
        $this->actingAs($host)
            ->postJson("/api/meetings/{$meeting->code}/participants/{$participantId}/admit")
            ->assertOk();

        $statusRes = $this->getJson("/api/meetings/{$meeting->code}/participants/{$participantId}/status");
        $statusRes->assertOk()->assertJsonPath('status', 'admitted');

        $decoded = JWT::decode($statusRes->json('jwt'), new Key(config('jitsi.app_secret'), 'HS256'));
        $this->assertFalse($decoded->context->user->moderator);

        // Locked room rejects new guests
        Cache::put('captcha:c3', Hash::make('33333'), now()->addMinutes(5));
        $this->actingAs($host)->postJson("/api/meetings/{$meeting->code}/lock", ['locked' => true])->assertOk();
        $this->actingAs($otherUser)->postJson("/api/meetings/{$meeting->code}/join", [
            'display_name' => 'Budi',
            'passcode' => 'rahasia',
            'captcha_id' => 'c3',
            'captcha_answer' => '33333',
        ])->assertStatus(423);
    }

    public function test_host_can_end_meeting(): void
    {
        $host = User::factory()->create();
        $meeting = Meeting::create([
            'code' => Meeting::generateUniqueCode(),
            'host_id' => $host->id,
            'title' => 'Diskusi',
            'type' => 'instant',
            'status' => 'live',
        ]);

        $this->actingAs($host)
            ->postJson("/api/meetings/{$meeting->code}/end")
            ->assertOk()
            ->assertJsonPath('meeting.status', 'ended');

        $this->postJson("/api/meetings/{$meeting->code}/join", [
            'display_name' => 'Sari',
            'captcha_id' => 'unused',
            'captcha_answer' => '00000',
        ])->assertStatus(410);
    }

    public function test_guest_must_wait_until_host_opens_room_even_when_lobby_disabled(): void
    {
        $host = User::factory()->create();
        $meeting = Meeting::create([
            'code' => Meeting::generateUniqueCode(),
            'host_id' => $host->id,
            'title' => 'Meeting Tanpa Lobby',
            'type' => 'instant',
            'status' => 'live',
            'lobby_enabled' => false,
        ]);

        // Guest joins before host -> must wait
        Cache::put('captcha:wait-host', Hash::make('44444'), now()->addMinutes(5));
        $guestJoin = $this->postJson("/api/meetings/{$meeting->code}/join", [
            'display_name' => 'Dina',
            'captcha_id' => 'wait-host',
            'captcha_answer' => '44444',
        ]);
        $guestJoin->assertOk()
            ->assertJsonPath('status', 'waiting')
            ->assertJsonPath('waiting_reason', 'host_not_joined')
            ->assertJsonMissingPath('jwt');

        $guestId = $guestJoin->json('participant_id');

        // Host joins -> opens room as moderator
        $this->actingAs($host)->postJson("/api/meetings/{$meeting->code}/join", [
            'display_name' => 'Host',
        ])->assertOk()->assertJsonPath('status', 'admitted')->assertJsonPath('role', 'host');

        // Guest status now auto-admits with non-moderator JWT
        $statusRes = $this->getJson("/api/meetings/{$meeting->code}/participants/{$guestId}/status");
        $statusRes->assertOk()->assertJsonPath('status', 'admitted');
        $decoded = JWT::decode($statusRes->json('jwt'), new Key(config('jitsi.app_secret'), 'HS256'));
        $this->assertFalse($decoded->context->user->moderator);
    }
}
