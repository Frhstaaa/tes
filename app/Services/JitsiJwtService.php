<?php

namespace App\Services;

use App\Models\Meeting;
use App\Models\MeetingParticipant;
use Firebase\JWT\JWT;
use RuntimeException;

class JitsiJwtService
{
    public function issueToken(Meeting $meeting, MeetingParticipant $participant): string
    {
        $secret = (string) config('jitsi.app_secret');
        if ($secret === '') {
            throw new RuntimeException('JITSI_APP_SECRET is not configured.');
        }

        $now = time();
        $ttlMinutes = max(5, (int) config('jitsi.jwt_ttl_minutes', 120));

        $payload = [
            'aud' => 'jitsi',
            'iss' => (string) config('jitsi.app_id', 'meetingkeun'),
            'sub' => (string) config('jitsi.domain', 'meet.jit.si'),
            'room' => $meeting->code,
            'iat' => $now,
            'nbf' => $now - 5,
            'exp' => $now + ($ttlMinutes * 60),
            'context' => [
                'user' => [
                    'name' => $participant->display_name,
                    'id' => (string) $participant->id,
                    'moderator' => $participant->isModerator(),
                ],
            ],
        ];

        return JWT::encode($payload, $secret, 'HS256');
    }
}
