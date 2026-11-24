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
        if (
            $rel === '' ||
            str_starts_with($rel, '.env') ||
            str_starts_with($rel, 'storage/') ||
            str_starts_with($rel, 'public/storage') ||
            $rel === 'database/database.sqlite'
        ) {
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

function syncMissingEnvKeys(string $envPath, string $examplePath): array
{
    if (! is_file($envPath) || ! is_file($examplePath)) {
        return ['code' => 0, 'output' => 'Lewati sinkronisasi .env (.env atau .env.example tidak ditemukan).'];
    }

    $existingContent = (string) file_get_contents($envPath);
    $existingKeys = [];
    foreach (preg_split('/\r\n|\r|\n/', $existingContent) ?: [] as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#') || ! str_contains($trimmed, '=')) {
            continue;
        }
        $key = trim(substr($trimmed, 0, strpos($trimmed, '=')));
        if ($key !== '') {
            $existingKeys[$key] = true;
        }
    }

    $added = [];
    foreach (preg_split('/\r\n|\r|\n/', (string) file_get_contents($examplePath)) ?: [] as $line) {
        $trimmed = trim($line);
        if ($trimmed === '' || str_starts_with($trimmed, '#') || ! str_contains($trimmed, '=')) {
            continue;
        }
        $key = trim(substr($trimmed, 0, strpos($trimmed, '=')));
        if ($key !== '' && ! isset($existingKeys[$key])) {
            $added[] = $trimmed;
            $existingKeys[$key] = true;
        }
    }

    if ($added === []) {
        return ['code' => 0, 'output' => 'Semua kunci konfigurasi .env sudah lengkap (tidak ada yang ditimpa).'];
    }

    $suffix = (str_ends_with($existingContent, "\n") ? '' : "\n") . "\n# Ditambahkan otomatis saat update\n" . implode("\n", $added) . "\n";
    file_put_contents($envPath, $existingContent . $suffix);

    return [
        'code' => 0,
        'output' => 'Menambahkan ' . count($added) . ' kunci baru ke .env tanpa mengubah data lama: ' . implode(', ', array_map(fn ($l) => substr($l, 0, strpos($l, '=')), $added)),
    ];
}

function isPhpFunctionEnabled(string $fn): bool
{
    if (! function_exists($fn)) {
        return false;
    }
    $disabled = array_map('trim', explode(',', (string) ini_get('disable_functions')));
    return ! in_array($fn, $disabled, true);
}

function runTerminalCommand(string $basePath, string $command): array
{
    $command = trim($command);
    if ($command === '') {
        return ['code' => 1, 'output' => 'Perintah tidak boleh kosong.'];
    }

    if (isPhpFunctionEnabled('proc_open')) {
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $process = @proc_open($command, $descriptors, $pipes, $basePath);
        if (is_resource($process)) {
            fclose($pipes[0]);
            $stdout = stream_get_contents($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $code = proc_close($process);
            $combined = trim((string) $stdout . ((string) $stderr !== '' ? "\n" . $stderr : ''));
            return [
                'code' => $code,
                'output' => $combined !== '' ? $combined : '(perintah selesai tanpa output)',
            ];
        }
    }

    if (isPhpFunctionEnabled('exec')) {
        $lines = [];
        $code = 0;
        $escapedDir = escapeshellarg($basePath);
        @exec("cd {$escapedDir} && ({$command}) 2>&1", $lines, $code);
        $combined = trim(implode("\n", $lines));
        return [
            'code' => $code,
            'output' => $combined !== '' ? $combined : '(perintah selesai tanpa output)',
        ];
    }

    if (isPhpFunctionEnabled('shell_exec')) {
        $escapedDir = escapeshellarg($basePath);
        $out = @shell_exec("cd {$escapedDir} && ({$command}) 2>&1");
        $combined = trim((string) $out);
        return [
            'code' => 0,
            'output' => $combined !== '' ? $combined : '(perintah selesai tanpa output)',
        ];
    }

    return [
        'code' => 1,
        'output' => 'Fungsi eksekusi shell (proc_open, exec, shell_exec) dinonaktifkan di konfigurasi PHP server ini.',
    ];
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
        $logs[] = array_merge(
            ['label' => 'Sesuaikan Kunci Baru .env (Tanpa Menimpa Data Lama)'],
            syncMissingEnvKeys($envPath, $basePath . '/.env.example')
        );
        $logs[] = array_merge(['label' => 'Bersihkan Cache Lama'], runArtisan($basePath, 'optimize:clear'));
        $logs[] = array_merge(['label' => 'Migrasi Database (Aman, Tanpa Hapus Data)'], runArtisan($basePath, 'migrate', ['--force' => true]));
        if (! file_exists($basePath . '/public/storage')) {
            $logs[] = array_merge(['label' => 'Tautkan Storage Publik'], runArtisan($basePath, 'storage:link'));
        }
        $logs[] = array_merge(['label' => 'Optimalkan Cache Produksi (Config/Route/View)'], runArtisan($basePath, 'optimize'));
    }

    if ($action === 'clear_cache') {
        $logs[] = array_merge(['label' => 'Bersihkan Cache Laravel'], runArtisan($basePath, 'optimize:clear'));
    }

    if ($action === 'migrate_fresh') {
        $logs[] = array_merge(['label' => 'Bersihkan Cache Lama'], runArtisan($basePath, 'optimize:clear'));
        $logs[] = array_merge(['label' => 'Reset & Migrasi Ulang + Seed'], runArtisan($basePath, 'migrate:fresh', ['--force' => true, '--seed' => true]));
    }

    if ($action === 'terminal_exec') {
        $cmd = (string) ($_POST['command'] ?? '');
        $logs[] = array_merge(['label' => 'Terminal: ' . $cmd], runTerminalCommand($basePath, $cmd));
    }
}

$envExists = is_file($envPath);
$storageWritable = is_writable($basePath . '/storage');
$shellAvailable = isPhpFunctionEnabled('proc_open') || isPhpFunctionEnabled('exec') || isPhpFunctionEnabled('shell_exec');
$lastCommand = (string) ($_POST['command'] ?? '');
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Meetingkeun — Setup &amp; Deploy CyberPanel</title>
  <style>
    :root {
      --paper: #F2F8F7; --paper-2: #FFFFFF; --ink: #1E293B;
      --ink-soft: #64748B; --moss: #0B7A69; --clay: #B8431E; --line: #DCEAE7;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--paper); color: var(--ink); line-height: 1.5; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 32px 16px; }
    .card { background: var(--paper-2); border: 1px solid var(--line); border-radius: 18px; padding: 20px; margin-bottom: 16px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04); }
    h1 { margin: 0 0 6px; font-size: 24px; }
    h2 { margin: 0 0 12px; font-size: 16px; }
    p { margin: 0 0 12px; color: var(--ink-soft); font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; min-height: 44px; padding: 10px 16px; border-radius: 12px; border: 1px solid var(--line); background: var(--paper-2); color: var(--ink); font-weight: 600; font-size: 14px; cursor: pointer; }
    .btn:hover { background: #F5FBF9; }
    .btn-primary { background: linear-gradient(90deg, #0C7D6C, #075D50); border-color: var(--moss); color: #FFFFFF; }
    .btn-primary:hover { filter: brightness(1.05); }
    .btn-danger { background: var(--clay); border-color: var(--clay); color: #FFFFFF; }
    input { width: 100%; min-height: 44px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); font-size: 15px; margin-bottom: 12px; }
    .term-row { display: flex; gap: 10px; align-items: stretch; }
    .term-row input { margin-bottom: 0; font-family: ui-monospace, monospace; font-size: 14px; background: #0E1B18; color: #E2E8F0; border-color: #233C36; }
    .term-row button { width: auto; min-width: 120px; shrink: 0; }
    .presets { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .preset-btn { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--paper); color: var(--ink); font-family: ui-monospace, monospace; font-size: 12px; cursor: pointer; }
    .preset-btn:hover { border-color: var(--moss); color: var(--moss); }
    pre { background: #0E1B18; color: #E2E8F0; padding: 14px; border-radius: 12px; overflow-x: auto; font-size: 12.5px; margin: 10px 0 0; white-space: pre-wrap; word-break: break-word; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 8px; font-size: 12px; font-family: monospace; background: var(--paper); border: 1px solid var(--line); }
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
        <span class="badge">shell: <?= $shellAvailable ? 'Aktif' : 'Nonaktif' ?></span>
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
            <button type="submit" class="btn">2. Update dari GitHub (Aman, Data Tetap)</button>
          </form>

          <form method="post">
            <input type="hidden" name="token" value="<?= htmlspecialchars($providedToken) ?>" />
            <input type="hidden" name="action" value="clear_cache" />
            <button type="submit" class="btn">3. Bersihkan Cache Laravel</button>
          </form>

          <form method="post" onsubmit="return confirm('Semua tabel di database akan di-reset dan dibuat ulang. Lanjutkan?');">
            <input type="hidden" name="token" value="<?= htmlspecialchars($providedToken) ?>" />
            <input type="hidden" name="action" value="migrate_fresh" />
            <button type="submit" class="btn btn-danger">4. Reset &amp; Migrasi Ulang (Fresh)</button>
          </form>
        </div>
      </div>

      <div class="card">
        <h2>Terminal Server</h2>
        <p>Jalankan perintah langsung di direktori project (<code><?= htmlspecialchars($basePath) ?></code>).</p>
        <form method="post" id="terminal-form">
          <input type="hidden" name="token" value="<?= htmlspecialchars($providedToken) ?>" />
          <input type="hidden" name="action" value="terminal_exec" />
          <div class="term-row">
            <input
              type="text"
              id="terminal-command"
              name="command"
              value="<?= htmlspecialchars($lastCommand) ?>"
              placeholder="contoh: composer install --no-dev --optimize-autoloader"
              autocomplete="off"
              required
            />
            <button type="submit" class="btn btn-primary">Jalankan</button>
          </div>
          <div class="presets">
            <?php
              $presets = [
                'php -v',
                'php artisan about',
                'php artisan migrate --force',
                'php artisan optimize',
                'composer install --no-dev --optimize-autoloader',
                'git status',
              ];
              foreach ($presets as $preset):
            ?>
              <button
                type="button"
                class="preset-btn"
                onclick="document.getElementById('terminal-command').value = this.textContent.trim(); document.getElementById('terminal-command').focus();"
              ><?= htmlspecialchars($preset) ?></button>
            <?php endforeach; ?>
          </div>
        </form>
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
