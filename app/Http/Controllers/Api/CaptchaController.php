<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NumericCaptchaService;
use Illuminate\Http\JsonResponse;

class CaptchaController extends Controller
{
    public function __construct(
        private readonly NumericCaptchaService $captchaService
    ) {}

    public function show(): JsonResponse
    {
        return response()->json($this->captchaService->generate());
    }
}
