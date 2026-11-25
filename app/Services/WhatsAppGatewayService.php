<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class WhatsAppGatewayService
{
    public function getConfig(): array
    {
        $enabled = AppSetting::getValue('wa_enabled', '0') === '1';
        $provider = AppSetting::getValue('wa_provider', 'mardira') ?: 'mardira';
        $apiUrl = AppSetting::getValue('wa_api_url', '') ?: '';
        $session = AppSetting::getValue('wa_session', '') ?: '';
        $encryptedKey = AppSetting::getValue('wa_api_key');

        $apiKey = '';
        if ($encryptedKey) {
            try {
                $apiKey = Crypt::decryptString($encryptedKey);
            } catch (Throwable) {
                $apiKey = '';
            }
        }

        return [
            'enabled' => $enabled,
            'provider' => $provider,
            'api_url' => $apiUrl,
            'session' => $session,
            'api_key' => $apiKey,
        ];
    }

    public function getPublicStatus(): array
    {
        $cfg = $this->getConfig();

        return [
            'enabled' => $cfg['enabled'] && $cfg['api_url'] !== '',
            'provider' => $cfg['provider'],
        ];
    }

    public function getAdminView(): array
    {
        $cfg = $this->getConfig();
        $key = $cfg['api_key'];
        $masked = $key !== ''
            ? (strlen($key) > 6 ? substr($key, 0, 3) . str_repeat('*', max(4, strlen($key) - 6)) . substr($key, -3) : '******')
            : '';

        return [
            'enabled' => $cfg['enabled'],
            'provider' => $cfg['provider'],
            'api_url' => $cfg['api_url'],
            'session' => $cfg['session'],
            'api_key_set' => $key !== '',
            'api_key_preview' => $masked,
        ];
    }

    public function saveConfig(array $data): void
    {
        AppSetting::setValue('wa_enabled', ! empty($data['enabled']) ? '1' : '0');
        AppSetting::setValue('wa_provider', $data['provider']);
        AppSetting::setValue('wa_api_url', trim((string) ($data['api_url'] ?? '')));
        AppSetting::setValue('wa_session', trim((string) ($data['wa_session'] ?? $data['session'] ?? '')));

        if (! empty($data['clear_api_key'])) {
            AppSetting::setValue('wa_api_key', null);
        } elseif (! empty($data['api_key'])) {
            AppSetting::setValue('wa_api_key', Crypt::encryptString(trim((string) $data['api_key'])));
        }
    }

    public static function resolveMardiraUrl(string $rawUrl, string $path = '/api/v1/messages/send'): string
    {
        $url = rtrim(trim($rawUrl), '/');
        if ($url === '') {
            return '';
        }
        if (str_ends_with($url, '/api/v1/messages/send') || str_ends_with($url, '/api/v1/messages/send-media')) {
            return $path === '/api/v1/messages/send'
                ? $url
                : preg_replace('#/api/v1/messages/send(-media)?$#', $path, $url);
        }
        $base = preg_replace('#/api/v1$#', '', $url);

        return rtrim((string) $base, '/') . $path;
    }

    public function checkQuota(): array
    {
        $cfg = $this->getConfig();
        if ($cfg['api_url'] === '') {
            throw new RuntimeException('URL Endpoint WhatsApp Gateway belum diatur.');
        }
        if ($cfg['provider'] !== 'mardira') {
            throw new RuntimeException('Cek kuota langsung hanya tersedia untuk MARDIRA WA Gateway.');
        }

        $quotaUrl = self::resolveMardiraUrl($cfg['api_url'], '/api/v1/quota');
        $response = Http::timeout(10)
            ->withToken($cfg['api_key'])
            ->acceptJson()
            ->get($quotaUrl);

        if (! $response->successful()) {
            throw new RuntimeException('HTTP ' . $response->status() . ': ' . substr($response->body(), 0, 140));
        }

        return (array) $response->json();
    }

    public static function normalizePhone(string $raw): ?string
    {
        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if ($digits === '') {
            return null;
        }
        if (str_starts_with($digits, '0')) {
            $digits = '62' . substr($digits, 1);
        } elseif (str_starts_with($digits, '8')) {
            $digits = '62' . $digits;
        }

        if (strlen($digits) < 9 || strlen($digits) > 15) {
            return null;
        }

        return $digits;
    }

    /**
     * @param  string[]  $rawRecipients
     * @return string[]
     */
    public static function parseRecipients(array $rawRecipients): array
    {
        $normalized = [];
        foreach ($rawRecipients as $entry) {
            $parts = preg_split('/[\s,;]+/', (string) $entry) ?: [];
            foreach ($parts as $part) {
                $phone = self::normalizePhone($part);
                if ($phone !== null) {
                    $normalized[$phone] = true;
                }
            }
        }

        return array_slice(array_keys($normalized), 0, 50);
    }

    public function sendMessage(string $phone, string $message, bool $requireEnabled = true): array
    {
        $cfg = $this->getConfig();
        if ($requireEnabled && ! $cfg['enabled']) {
            throw new RuntimeException('WhatsApp Gateway belum diaktifkan oleh Superadmin.');
        }
        if ($cfg['api_url'] === '') {
            throw new RuntimeException('URL Endpoint WhatsApp Gateway belum diatur.');
        }

        $normalized = self::normalizePhone($phone);
        if ($normalized === null) {
            return [
                'phone' => $phone,
                'success' => false,
                'error' => 'Format nomor WhatsApp tidak valid.',
            ];
        }

        try {
            $request = Http::timeout(12)->acceptJson();

            $response = match ($cfg['provider']) {
                'mardira' => (function () use ($request, $cfg, $normalized, $message) {
                    $endpoint = self::resolveMardiraUrl($cfg['api_url'], '/api/v1/messages/send');
                    $payload = [
                        'phone' => $normalized,
                        'message' => $message,
                    ];
                    if ($cfg['session'] !== '' && ctype_digit($cfg['session'])) {
                        $payload['device_id'] = (int) $cfg['session'];
                    }

                    return $request->withToken($cfg['api_key'])->post($endpoint, $payload);
                })(),
                'fonnte' => $request
                    ->withHeaders(['Authorization' => $cfg['api_key']])
                    ->asForm()
                    ->post($cfg['api_url'], [
                        'target' => $normalized,
                        'message' => $message,
                        'countryCode' => '62',
                    ]),
                'wablas' => $request
                    ->withHeaders(['Authorization' => $cfg['api_key']])
                    ->post($cfg['api_url'], [
                        'phone' => $normalized,
                        'message' => $message,
                    ]),
                'waha' => $request
                    ->withHeaders($cfg['api_key'] !== '' ? ['X-Api-Key' => $cfg['api_key']] : [])
                    ->post($cfg['api_url'], [
                        'chatId' => $normalized . '@c.us',
                        'text' => $message,
                        'session' => $cfg['session'] ?: 'default',
                    ]),
                default => $request
                    ->withHeaders($cfg['api_key'] !== '' ? [
                        'Authorization' => 'Bearer ' . $cfg['api_key'],
                        'X-Api-Key' => $cfg['api_key'],
                    ] : [])
                    ->post($cfg['api_url'], [
                        'phone' => $normalized,
                        'target' => $normalized,
                        'message' => $message,
                        'session' => $cfg['session'] ?: 'default',
                    ]),
            };

            if ($response->successful()) {
                $json = $response->json();
                if (is_array($json) && array_key_exists('status', $json) && $json['status'] === false) {
                    return [
                        'phone' => $normalized,
                        'success' => false,
                        'error' => (string) ($json['reason'] ?? $json['message'] ?? 'Gateway menolak pesan.'),
                    ];
                }

                return [
                    'phone' => $normalized,
                    'success' => true,
                    'error' => null,
                ];
            }

            return [
                'phone' => $normalized,
                'success' => false,
                'error' => 'HTTP ' . $response->status() . ': ' . substr($response->body(), 0, 140),
            ];
        } catch (Throwable $e) {
            return [
                'phone' => $normalized,
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * @param  string[]  $phones
     */
    public function broadcast(array $phones, string $message): array
    {
        $targets = self::parseRecipients($phones);
        if ($targets === []) {
            throw new RuntimeException('Masukkan minimal 1 nomor WhatsApp yang valid.');
        }

        $results = [];
        $sent = 0;
        $failed = 0;

        foreach ($targets as $phone) {
            $res = $this->sendMessage($phone, $message, true);
            $results[] = $res;
            if ($res['success']) {
                $sent++;
            } else {
                $failed++;
            }
        }

        return [
            'sent_count' => $sent,
            'failed_count' => $failed,
            'total' => count($targets),
            'results' => $results,
        ];
    }
}
