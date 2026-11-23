<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
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
