<?php
/**
 * Meetingkeun — CyberPanel Setup & GitHub Auto-Updater
 * Dibuat oleh Tiyas Frahesta
 *
 * Akses via: https://meetingkeun.frahesta.com/setup.php?token=meetingkeun-setup-2026
 * PENTING: Segera ganti DEPLOY_SETUP_TOKEN di .env setelah setup awal selesai.
 */

declare(strict_types=1);

@set_time_limit(300);

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

$expectedToken = readEnvValue($envPath, 'DEPLOY_SETUP_TOKEN', 'meetingkeun-setup-2026');
$providedToken = (string) ($_POST['token'] ?? $_GET['token'] ?? '');
$authenticated = $providedToken !== '' && hash_equals($expectedToken, $providedToken);

function runShell(string $cmd, string $cwd): array
{
    $descriptor = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $process = proc_open($cmd, $descriptor, $pipes, $cwd);
    if (! is_resource($process)) {
        return ['code' => 1, 'output' => "Gagal menjalankan perintah: {$cmd}"];
    }
    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]) ?: '';
    $stderr = stream_get_contents($pipes[2]) ?: '';
    fclose($pipes[1]);
    fclose($pipes[2]);
    $code = proc_close($process);
    return [
        'code' => $code,
        'output' => trim($stdout . ($stderr !== '' ? "\n" . $stderr : '')),
    ];
}

function findBinary(array $candidates, string $fallback): string
{
    foreach ($candidates as $path) {
        if ($path !== '' && is_executable($path)) {
            return $path;
        }
    }
    return $fallback;
}

$phpBin = PHP_BINARY ?: '/usr/local/lsws/lsphp83/bin/php';
$composerBin = findBinary(['/usr/local/bin/composer', '/usr/bin/composer'], 'composer');
$gitBin = findBinary(['/usr/bin/git', '/usr/local/bin/git'], 'git');
$npmBin = findBinary(['/usr/bin/npm', '/usr/local/bin/npm'], 'npm');

$logs = [];
$action = (string) ($_POST['action'] ?? '');

if ($authenticated && $_SERVER['REQUEST_METHOD'] === 'POST' && $action !== '') {
    $run = function (string $label, string $cmd) use (&$logs, $basePath): int {
        $res = runShell($cmd, $basePath);
        $logs[] = [
            'label' => $label,
            'code' => $res['code'],
            'output' => $res['output'] !== '' ? $res['output'] : '(selesai tanpa output)',
        ];
        return $res['code'];
    };

    if ($action === 'setup_initial') {
        if (! is_file($envPath)) {
            $existingKey = '';
            $envContent = <<<ENV
APP_NAME=Meetingkeun
APP_ENV=production
APP_KEY={$existingKey}
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
            $logs[] = ['label' => 'Buat file .env produksi', 'code' => 0, 'output' => '.env berhasil dibuat untuk meetingkeun.frahesta.com'];
        } else {
            $logs[] = ['label' => 'Cek file .env', 'code' => 0, 'output' => '.env sudah ada (tidak ditimpa).'];
        }

        if (readEnvValue($envPath, 'APP_KEY') === '') {
            $run('Generate APP_KEY', "{$phpBin} artisan key:generate --force");
        }
        $run('Migrasi Database', "{$phpBin} artisan migrate --force");
        $run('Seed Superadmin Awal', "{$phpBin} artisan db:seed --force");
        $run('Storage Link', "{$phpBin} artisan storage:link");
        $run('Optimize Cache', "{$phpBin} artisan optimize:clear && {$phpBin} artisan config:cache && {$phpBin} artisan route:cache && {$phpBin} artisan view:cache");
    }

    if ($action === 'git_pull') {
        $repoUrl = 'https://github.com/Frhstaaa/tes.git';
        $safeBase = escapeshellarg($basePath);
        $run('Git Safe Directory', "{$gitBin} config --global --add safe.directory {$safeBase}");

        if (! is_dir($basePath . '/.git')) {
            $run('Inisialisasi Git & Remote', "{$gitBin} init && {$gitBin} branch -M main && {$gitBin} remote add origin {$repoUrl}");
        }

        $run('Fetch & Pull dari GitHub (origin main)', "{$gitBin} fetch origin main && {$gitBin} pull origin main --ff-only");
    }

    if ($action === 'update_app') {
        if (is_file($basePath . '/composer.json')) {
            $run('Update Backend (Composer)', "{$composerBin} install --no-dev --optimize-autoloader --no-interaction");
        }
        $hasNpm = runShell('command -v npm || which npm', $basePath);
        if ($hasNpm['code'] === 0 && is_file($basePath . '/package.json')) {
            $run('Build Frontend (npm install & build)', "{$npmBin} install && {$npmBin} run build");
        } else {
            $logs[] = ['label' => 'Frontend Build', 'code' => 0, 'output' => 'npm tidak ditemukan di server; menggunakan folder public/build/ dari GitHub/ZIP.'];
        }
        $run('Migrasi Database', "{$phpBin} artisan migrate --force");
        $run('Refresh Cache Laravel', "{$phpBin} artisan optimize:clear && {$phpBin} artisan config:cache && {$phpBin} artisan route:cache && {$phpBin} artisan view:cache");
    }

    if ($action === 'clear_cache') {
        $run('Bersihkan & Bangun Cache', "{$phpBin} artisan optimize:clear && {$phpBin} artisan config:cache && {$phpBin} artisan route:cache && {$phpBin} artisan view:cache");
    }
}

$envExists = is_file($envPath);
$gitBranch = is_dir($basePath . '/.git') ? runShell("{$gitBin} rev-parse --short HEAD", $basePath)['output'] : 'Belum terhubung ke Git';
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Meetingkeun — Setup & Deploy CyberPanel</title>
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
      <h1>Meetingkeun — Setup & Deploy</h1>
      <p>Panel deployment CyberPanel untuk <strong>meetingkeun.frahesta.com</strong></p>
      <div>
        <span class="badge">PHP <?= htmlspecialchars(PHP_VERSION) ?></span>
        <span class="badge">.env: <?= $envExists ? 'Ada' : 'Belum ada' ?></span>
        <span class="badge">Git HEAD: <?= htmlspecialchars($gitBranch) ?></span>
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
        <h2>Aksi Deployment</h2>
        <div class="grid">
          <form method="post">
            <input type="hidden" name="token" value="<?= htmlspecialchars($providedToken) ?>" />
            <input type="hidden" name="action" value="setup_initial" />
            <button type="submit" class="btn btn-primary">1. Setup Awal (.env + Migrasi + Seed)</button>
          </form>

          <form method="post">
            <input type="hidden" name="token" value="<?= htmlspecialchars($providedToken) ?>" />
            <input type="hidden" name="action" value="git_pull" />
            <button type="submit" class="btn">2. Pull Terbaru dari GitHub</button>
          </form>

          <form method="post">
            <input type="hidden" name="token" value="<?= htmlspecialchars($providedToken) ?>" />
            <input type="hidden" name="action" value="update_app" />
            <button type="submit" class="btn">3. Update Backend &amp; Frontend</button>
          </form>

          <form method="post">
            <input type="hidden" name="token" value="<?= htmlspecialchars($providedToken) ?>" />
            <input type="hidden" name="action" value="clear_cache" />
            <button type="submit" class="btn btn-danger">4. Refresh Cache Laravel</button>
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
