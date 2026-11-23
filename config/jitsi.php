<?php

return [
    'domain' => env('JITSI_DOMAIN', 'meet.jit.si'),
    'app_id' => env('JITSI_APP_ID', 'meetingkeun'),
    'app_secret' => env('JITSI_APP_SECRET', ''),
    'jwt_ttl_minutes' => (int) env('JITSI_JWT_TTL_MINUTES', 120),
];
