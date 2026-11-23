<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $jitsiDomain = (string) config('jitsi.domain', 'meet.perpusdigital.com');
        $jitsiOrigin = $jitsiDomain !== '' ? "https://{$jitsiDomain}" : '';

        $csp = implode('; ', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' {$jitsiOrigin}",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: {$jitsiOrigin}",
            "connect-src 'self' ws: wss: {$jitsiOrigin}",
            "frame-src 'self' {$jitsiOrigin}",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
        ]);

        $jitsiOriginQuoted = $jitsiOrigin !== '' ? " \"{$jitsiOrigin}\"" : '';

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set(
            'Permissions-Policy',
            "camera=(self{$jitsiOriginQuoted}), microphone=(self{$jitsiOriginQuoted}), display-capture=(self{$jitsiOriginQuoted}), geolocation=()"
        );

        if (! app()->environment('local')) {
            $response->headers->set('Content-Security-Policy', $csp);
        }

        return $response;
    }
}
