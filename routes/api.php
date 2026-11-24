<?php

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CaptchaController;
use App\Http\Controllers\Api\MeetingController;
use Illuminate\Support\Facades\Route;

// Numeric image CAPTCHA (high limit for concurrent users behind shared NAT/Wi-Fi)
Route::get('/captcha', [CaptchaController::class, 'show'])->middleware('throttle:120,1');

// Public & rate-limited auth routes
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Protected auth routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/me', [AuthController::class, 'updateProfile']);
    Route::post('/me/personal-room', [MeetingController::class, 'openPersonalRoom']);

    // Host meeting management
    Route::get('/meetings', [MeetingController::class, 'index']);
    Route::post('/meetings', [MeetingController::class, 'store']);
    Route::patch('/meetings/{code}', [MeetingController::class, 'update']);
    Route::delete('/meetings/{code}', [MeetingController::class, 'destroy']);
    Route::post('/meetings/{code}/end', [MeetingController::class, 'end']);
    Route::post('/meetings/{code}/lock', [MeetingController::class, 'lock']);
    Route::get('/meetings/{code}/waiting', [MeetingController::class, 'waiting']);
    Route::post('/meetings/{code}/participants/{id}/admit', [MeetingController::class, 'admit']);
    Route::post('/meetings/{code}/participants/{id}/deny', [MeetingController::class, 'deny']);
    Route::post('/meetings/{code}/participants/{id}/kick', [MeetingController::class, 'kick']);
    Route::post('/meetings/{code}/participants/{id}/cohost', [MeetingController::class, 'cohost']);

    // Superadmin multi-user & audit management
    Route::middleware('superadmin')->prefix('admin')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::patch('/users/{id}', [AdminUserController::class, 'update']);
        Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);
        Route::get('/meetings', [AdminUserController::class, 'meetings']);
        Route::get('/audit-logs', [AdminUserController::class, 'auditLogs']);
    });
});

// Public / optional-auth meeting join & info routes
Route::get('/meetings/{code}', [MeetingController::class, 'show']);
Route::post('/meetings/{code}/join', [MeetingController::class, 'join'])->middleware('throttle:60,1');
Route::get('/meetings/{code}/participants/{id}/status', [MeetingController::class, 'participantStatus']);
Route::post('/meetings/{code}/leave', [MeetingController::class, 'leave']);
