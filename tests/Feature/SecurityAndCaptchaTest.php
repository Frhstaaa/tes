<?php

namespace Tests\Feature;

use App\Services\NumericCaptchaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SecurityAndCaptchaTest extends TestCase
{
    use RefreshDatabase;

    public function test_captcha_endpoint_returns_png_image_and_id(): void
    {
        $response = $this->getJson('/api/captcha');

        $response->assertOk()
            ->assertJsonStructure(['captcha_id', 'image_data_url', 'expires_in']);

        $dataUrl = $response->json('image_data_url');
        $this->assertStringStartsWith('data:image/png;base64,', $dataUrl);
    }

    public function test_captcha_is_single_use_and_rejects_wrong_answers(): void
    {
        $service = app(NumericCaptchaService::class);
        $id = 'test-captcha-uuid';
        Cache::put("captcha:{$id}", Hash::make('54321'), now()->addMinutes(5));

        $this->assertFalse($service->verify($id, '99999'));
        // Single-use: even the right answer fails after the first attempt pulled it from cache
        $this->assertFalse($service->verify($id, '54321'));

        $id2 = 'test-captcha-uuid-2';
        Cache::put("captcha:{$id2}", Hash::make('12345'), now()->addMinutes(5));
        $this->assertTrue($service->verify($id2, '12345'));
        $this->assertFalse($service->verify($id2, '12345'));
    }

    public function test_security_headers_are_applied_to_responses(): void
    {
        $response = $this->get('/');

        $response->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
}
