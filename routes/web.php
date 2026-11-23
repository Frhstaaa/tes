<?php

use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], '/_setup', function () {
    $file = public_path('setup.php');
    abort_unless(is_file($file), 404);
    require $file;
    exit;
});

Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api|sanctum|up|_setup).*$');
