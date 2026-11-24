<?php

namespace App\Providers;

use Illuminate\Support\Facades\DB;
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

        if (
            ! $this->app->runningUnitTests() &&
            config('database.default') === 'sqlite' &&
            config('database.connections.sqlite.database') !== ':memory:'
        ) {
            try {
                DB::statement('PRAGMA journal_mode=WAL;');
                DB::statement('PRAGMA synchronous=NORMAL;');
                DB::statement('PRAGMA busy_timeout=5000;');
            } catch (\Throwable) {
                // Ignore during early artisan bootstrap before DB file exists
            }
        }
    }
}
