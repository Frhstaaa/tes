<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class NumericCaptchaService
{
    private const TTL_SECONDS = 300;

    public function generate(): array
    {
        $code = (string) random_int(10000, 99999);
        $id = (string) Str::uuid();

        Cache::put($this->cacheKey($id), Hash::make($code), now()->addSeconds(self::TTL_SECONDS));

        return [
            'captcha_id' => $id,
            'image_data_url' => $this->renderPngDataUrl($code),
            'expires_in' => self::TTL_SECONDS,
        ];
    }

    public function verify(?string $id, ?string $answer): bool
    {
        if (! $id || ! $answer) {
            return false;
        }

        $hash = Cache::pull($this->cacheKey($id));
        if (! is_string($hash) || $hash === '') {
            return false;
        }

        $normalized = preg_replace('/\D+/', '', $answer) ?? '';
        if ($normalized === '') {
            return false;
        }

        return Hash::check($normalized, $hash);
    }

    private function cacheKey(string $id): string
    {
        return "captcha:{$id}";
    }

    private function renderPngDataUrl(string $code): string
    {
        $width = 200;
        $height = 60;

        $img = imagecreatetruecolor($width, $height);
        imagesavealpha($img, true);

        // Meetingkeun paper-2 background (#ECE6D8)
        $bg = imagecolorallocate($img, 236, 230, 216);
        imagefill($img, 0, 0, $bg);

        // Subtle noise colors from palette: line (#D8D0BE), sand (#C9A66B), clay-bright (#D4552B)
        $lineColor = imagecolorallocate($img, 200, 192, 174);
        $sandColor = imagecolorallocate($img, 201, 166, 107);
        $clayColor = imagecolorallocate($img, 212, 85, 43);

        // Ink (#16211C) and Moss (#2E5E4E) for digits
        $digitColors = [
            imagecolorallocate($img, 22, 33, 28),
            imagecolorallocate($img, 46, 94, 78),
        ];

        // Subtle background grid lines
        for ($x = 12; $x < $width; $x += 22) {
            imageline($img, $x, 0, $x + random_int(-6, 6), $height, $lineColor);
        }

        // Interference arcs
        for ($i = 0; $i < 4; $i++) {
            $arcColor = $i % 2 === 0 ? $sandColor : $lineColor;
            imagearc(
                $img,
                random_int(20, $width - 20),
                random_int(10, $height - 10),
                random_int(80, 180),
                random_int(30, 70),
                random_int(0, 180),
                random_int(190, 360),
                $arcColor
            );
        }

        // Noise dots
        for ($i = 0; $i < 90; $i++) {
            $dotColor = $i % 7 === 0 ? $clayColor : $lineColor;
            imagesetpixel($img, random_int(0, $width - 1), random_int(0, $height - 1), $dotColor);
        }

        // Draw each digit using a crisp 3x-scaled glyph stamp with jittered Y
        $digits = str_split($code);
        $startX = 22;
        $stepX = 33;

        foreach ($digits as $index => $digit) {
            $glyph = imagecreatetruecolor(12, 18);
            imagealphablending($glyph, false);
            imagesavealpha($glyph, true);
            $gBg = imagecolorallocatealpha($glyph, 236, 230, 216, 127);
            imagefill($glyph, 0, 0, $gBg);

            $color = $digitColors[$index % count($digitColors)];
            imagestring($glyph, 5, 1, 1, $digit, $color);

            $destX = $startX + ($index * $stepX) + random_int(-2, 2);
            $destY = random_int(6, 15);
            $scaleW = random_int(24, 28);
            $scaleH = random_int(34, 40);

            imagealphablending($img, true);
            imagecopyresampled($img, $glyph, $destX, $destY, 0, 0, $scaleW, $scaleH, 12, 18);
            imagedestroy($glyph);
        }

        // One thin diagonal strike-through line across the image
        imageline(
            $img,
            random_int(8, 25),
            random_int(12, $height - 12),
            random_int($width - 25, $width - 8),
            random_int(12, $height - 12),
            $sandColor
        );

        ob_start();
        imagepng($img);
        $raw = (string) ob_get_clean();
        imagedestroy($img);

        return 'data:image/png;base64,' . base64_encode($raw);
    }
}
