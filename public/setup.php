<?php
/**
 * Meetingkeun — Pure-PHP CyberPanel Setup & GitHub Updater (Tanpa Wajib SSH/Exec)
 * Dibuat oleh Tiyas Frahesta
 *
 * Akses via: https://meetingkeun.frahesta.com/setup.php?token=meetingkeun-setup-2026
 */

@set_time_limit(300);
@ini_set('display_errors', '1');
error_reporting(E_ALL);

$basePath = dirname(__DIR__);
$envPath = $basePath . '/.env';

function readEnvValue(string $envPath, string $key, string $default = ''): string
{
    if (! is_file($envPath)) {
        return $default;
    }
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (str_starts_with($line, $key . '=')) {
            $val = substr($line, strlen($key) + 1);
            return trim($val, "\"'");
        }
    }
    return $default;
}

function runArtisan(string $basePath, string $command, array $params = []): array
{
    try {
        require_once $basePath . '/vendor/autoload.php';
        $app = require $basePath . '/bootstrap/app.php';
        $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
        $code = $kernel->call($command, $params);
        $output = trim($kernel->output());
        return [
            'code' => $code,
            'output' => $output !== '' ? $output : "(artisan {$command} selesai)",
        ];
    } catch (Throwable $e) {
        return [
            'code' => 1,
            'output' => $e->getMessage() . "\n" . $e->getFile() . ':' . $e->getLine(),
        ];
    }
}

function downloadAndExtractGithubZip(string $basePath, string $zipUrl): array
{
    if (! class_exists('ZipArchive')) {
        return ['code' => 1, 'output' => 'Ekstensi PHP ZipArchive tidak aktif di server.'];
    }

    $tmpZip = $basePath . '/storage/app/github-update.zip';
    $data = @file_get_contents($zipUrl);
    if ($data === false && function_exists('curl_init')) {
        $ch = curl_init($zipUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_USERAGENT => 'Meetingkeun-Updater/1.0',
        ]);
        $data = curl_exec($ch);
        curl_close($ch);
    }

    if (! is_string($data) || $data === '') {
        return ['code' => 1, 'output' => 'Gagal mengunduh arsip dari GitHub.'];
    }

    file_put_contents($tmpZip, $data);

    $zip = new ZipArchive();
    if ($zip->open($tmpZip) !== true) {
        @unlink($tmpZip);
        return ['code' => 1, 'output' => 'Gagal membuka file ZIP dari GitHub.'];
    }

    $updated = 0;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $entry = $zip->getNameIndex($i);
        if ($entry === false) {
            continue;
        }
        // Strip top-level folder (e.g. "tes-main/")
        $pos = strpos($entry, '/');
        if ($pos === false) {
            continue;
        }
        $rel = substr($entry, $pos + 1);
        if ($rel === '' || str_starts_with($rel, '.env') || str_starts_with($rel, 'storage/')) {
            continue;
        }

        $dest = $basePath . '/' . $rel;
        if (str_ends_with($rel, '/')) {
            if (! is_dir($dest)) {
                @mkdir($dest, 0755, true);
            }
            continue;
        }

        $dir = dirname($dest);
        if (! is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        $content = $zip->getFromIndex($i);
        if ($content !== false) {
            file_put_contents($dest, $content);
            $updated++;
        }
    }

    $zip->close();
    @unlink($tmpZip);

    return ['code' => 0, 'output' => "Berhasil memperbarui {$updated} file dari GitHub (branch main)."];
}

$expectedToken = readEnvValue($envPath, 'DEPLOY_SETUP_TOKEN', 'meetingkeun-setup-2026');
$providedToken = (string) ($_POST['token'] ?? $_GET['token'] ?? '');
$authenticated = $providedToken !== '' && hash_equals($expectedToken, $providedToken);

$logs = [];
$action = (string) ($_POST['action'] ?? '');

if ($authenticated && $_SERVER['REQUEST_METHOD'] === 'POST' && $action !== '') {
    if ($action === 'setup_initial') {
        if (! is_file($envPath)) {
            $newKey = 'base64:' . base64_encode(random_bytes(32));
            $envContent = <<<ENV
APP_NAME=Meetingkeun
APP_ENV=production
APP_KEY={$newKey}
APP_DEBUG=false
APP_TIMEZONE=Asia/Jakarta
APP_URL=https://meetingkeun.frahesta.com
SANCTUM_STATEFUL_DOMAINS=meetingkeun.frahesta.com
SESSION_SECURE_COOKIE=true

LOG_CHANNEL=stack
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=meet_meetingkeun
DB_USERNAME=meet_meetingkeun
DB_PASSWORD=23052003
DB_COLLATION=utf8mb4_unicode_ci

CACHE_STORE=database
SESSION_DRIVER=database
QUEUE_CONNECTION=database

JITSI_DOMAIN=meet.perpusdigital.com
JITSI_APP_ID=meetingkeun
JITSI_APP_SECRET=ganti-dengan-secret-panjang-minimal-32-karakter
JITSI_JWT_TTL_MINUTES=120

DEPLOY_SETUP_TOKEN={$expectedToken}
ENV;
            file_put_contents($envPath, $envContent . "\n");
            $logs[] = ['label' => 'Buat .env produksi + APP_KEY', 'code' => 0, 'output' => '.env berhasil dibuat.'];
        } else {
            $logs[] = ['label' => 'Cek .env', 'code' => 0, 'output' => '.env sudah ada (tidak ditimpa).'];
        }

        $logs[] = array_merge(['label' => 'Bersihkan Cache Lama'], runArtisan($basePath, 'optimize:clear'));
        $logs[] = array_merge(['label' => 'Migrasi Database'], runArtisan($basePath, 'migrate', ['--force' => true]));
        $logs[] = array_merge(['label' => 'Seed Superadmin Awal'], runArtisan($basePath, 'db:seed', ['--force' => true]));
    }

    if ($action === 'github_update') {
        $logs[] = array_merge(
            ['label' => 'Unduh & Ekstrak Kode Terbaru dari GitHub (Frhstaaa/tes)'],
            downloadAndExtractGithubZip($basePath, 'https://github.com/Frhstaaa/tes/archive/refs/heads/main.zip')
        );
        $logs[] = array_merge(['label' => 'Migrasi Database'], runArtisan($basePath, 'migrate', ['--force' => true]));
        $logs[] = array_merge(['label' => 'Bersihkan Cache'], runArtisan($basePath, 'optimize:clear'));
    }

    if ($action === 'clear_cache') {
        $logs[] = array_merge(['label' => 'Bersihkan Cache Laravel'], runArtisan($basePath, 'optimize:clear'));
    }
}

$envExists = is_file($envPath);
$storageWritable = is_writable($basePath . '/storage');
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Meetingkeun — Setup &amp; Deploy CyberPanel</title>
  <style>
    :root {
      --paper: #F6F2E9; --paper-2: #ECE6D8; --ink: #16211C;
      --ink-soft: #4A5750; --moss: #2E5E4E; --clay: #B8431E; --line: #D8D0BE;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--paper); color: var(--ink); line-height: 1.5; }
    .wrap { max-width: 820px; margin: 0 auto; padding: 32px 16px; }
    .card { background: var(--paper-2); border: 1px solid var(--line); border-radius: 14px; padding: 20px; margin-bottom: 16px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    h2 { margin: 0 0 12px; font-size: 16px; }
    p { margin: 0 0 12px; color: var(--ink-soft); font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; min-height: 44px; padding: 10px 16px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); font-weight: 600; font-size: 14px; cursor: pointer; }
    .btn-primary { background: var(--moss); border-color: var(--moss); color: #F6F2E9; }
    .btn-danger { background: var(--clay); border-color: var(--clay); color: #F6F2E9; }
    input { width: 100%; min-height: 44px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--paper); font-size: 15px; margin-bottom: 12px; }
    pre { background: var(--ink); color: var(--paper); padding: 12px; border-radius: 10px; overflow-x: auto; font-size: 12px; margin: 8px 0 0; white-space: pre-wrap; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-family: monospace; background: var(--paper); border: 1px solid var(--line); }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Meetingkeun — Setup &amp; Update</h1>
      <p>Panel deployment pure-PHP (tanpa butuh SSH/Terminal) untuk <strong>meetingkeun.frahesta.com</strong></p>
      <div>
        <span class="badge">PHP <?= htmlspecialchars(PHP_VERSION) ?></span>
        <span class="badge">.env: <?= $envExists ? 'Ada' : 'Belum ada' ?></span>
        <span class="badge">storage writable: <?= $storageWritable ? 'Ya' : 'Tidak' ?></span>
      </div>
    </div>

    <?php if (! $authenticated): ?>
      <div class="card">
        <h2>Masukkan Token Setup</h2>
        <p>Token default awal: <code>meetingkeun-setup-2026</code> (ubah lewat <code>DEPLOY_SETUP_TOKEN</code> di <code>.env</code>).</p>
        <form method="post">
          <input type="password" name="token" placeholder="Masukkan DEPLOY_SETUP_TOKEN" required />
          <button type="submit" class="btn btn-primary">Buka Panel Setup</button>
        </form>
      </div>
    <?php else: ?>
      <div class="card">
        <h2>Aksi Setup &amp; Update</h2>
        <div class="grid">
          <form method="post">
            <input type="hidden" name="token" value="<?= htmlspecialchars($providedToken) ?>" />
            <input type="hidden" name="action" value="setup_initial" />
            <button type="submit" class="btn btn-primary">1. Setup Awal (.env + Migrasi + Seed)</button>
          </form>

          <form method="post">
            <input type="hidden" name="token" value="<?= htmlspecialchars($providedToken) ?>" />
            <input type="hidden" name="action" value="github_update" />
            <button type="submit" class="btn">2. Update Terbaru dari GitHub</button>
          </form>

          <form method="post">
            <input type="hidden" name="token" value="<?= htmlspecialchars($providedToken) ?>" />
            <input type="hidden" name="action" value="clear_cache" />
            <button type="submit" class="btn btn-danger">3. Bersihkan Cache Laravel</button>
          </form>
        </div>
      </div>

      <?php foreach ($logs as $log): ?>
        <div class="card">
          <strong><?= htmlspecialchars($log['label']) ?></strong>
          <span class="badge">exit: <?= (int) $log['code'] ?></span>
          <pre><?= htmlspecialchars($log['output']) ?></pre>
        </div>
      <?php endforeach; ?>
    <?php endif; ?>
  </div>
</body>
</html>
