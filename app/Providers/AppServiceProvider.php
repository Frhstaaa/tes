<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        if (PHP_VERSION_ID >= 80500) {
            error_reporting(error_reporting() & ~E_DEPRECATED & ~E_USER_DEPRECATED);
        }
    }

    public function boot(): void
    {
        if (empty(config('app.key'))) {
            throw new RuntimeException('APP_KEY belum diatur. Jalankan: php artisan key:generate');
        }

        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
