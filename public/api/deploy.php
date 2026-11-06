<?php
/**
 * HOMEX self-updater.
 * Pulls the latest `hostinger-release` build of mohmmedgano-stack/homex from GitHub
 * and copies it into this site's web root. Called by GitHub Actions after every build.
 *
 * Safe without a secret: it can only install the official build of this one repo,
 * does nothing if that build is already installed, and runs at most once every 20s.
 * Store data (database, uploads) lives outside the web root and is never touched.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

const REPO = 'mohmmedgano-stack/homex';
const BRANCH = 'hostinger-release';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
set_time_limit(120);

function out(array $d, int $code = 200): void {
    http_response_code($code);
    echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function http_get(string $url): string {
    $ua = 'homex-deployer';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60,
            CURLOPT_USERAGENT => $ua, CURLOPT_HTTPHEADER => ['Accept: application/vnd.github+json'],
        ]);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        if ($body === false || $code >= 400) throw new RuntimeException("GET $url failed ($code)");
        return (string)$body;
    }
    $ctx = stream_context_create(['http' => ['header' => "User-Agent: $ua\r\n", 'timeout' => 60]]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) throw new RuntimeException("GET $url failed");
    return $body;
}

function rrmdir(string $dir): void {
    if (!is_dir($dir)) return;
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST) as $f) {
        $f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname());
    }
    @rmdir($dir);
}

$data = data_dir();
$webroot = realpath(dirname(__DIR__));
$lock = "$data/deploy.lock";
$shaFile = "$data/deployed.sha";

// Status only
if (($_GET['status'] ?? '') === '1') {
    out(['installed' => is_file($shaFile) ? trim((string)file_get_contents($shaFile)) : null]);
}

// Rate limit
if (is_file($lock) && time() - (int)file_get_contents($lock) < 20) out(['ok' => false, 'skipped' => 'busy'], 429);
file_put_contents($lock, (string)time());

try {
    $branch = json_decode(http_get('https://api.github.com/repos/' . REPO . '/branches/' . BRANCH), true);
    $sha = (string)($branch['commit']['sha'] ?? '');
    if (!preg_match('/^[a-f0-9]{40}$/', $sha)) throw new RuntimeException('could not read latest build');
    // CI says which build it just published; GitHub's API can lag a few seconds behind a push,
    // so until it shows that build we answer "waiting" and CI asks again. (Only the branch head is ever installed.)
    $want = (string)($_GET['sha'] ?? '');
    if (preg_match('/^[a-f0-9]{40}$/', $want) && $want !== $sha) { @unlink($lock); out(['ok' => false, 'waiting' => true, 'branch' => $sha]); }

    $current = is_file($shaFile) ? trim((string)file_get_contents($shaFile)) : '';
    if ($current === $sha && empty($_GET['force'])) out(['ok' => true, 'unchanged' => true, 'sha' => $sha]);

    // Download that exact build
    $zipPath = "$data/release.zip";
    file_put_contents($zipPath, http_get('https://codeload.github.com/' . REPO . "/zip/$sha"));
    $tmp = "$data/release_tmp";
    rrmdir($tmp);
    mkdir($tmp, 0755, true);
    if (class_exists('ZipArchive')) {
        $z = new ZipArchive();
        if ($z->open($zipPath) !== true) throw new RuntimeException('bad zip');
        $z->extractTo($tmp);
        $z->close();
    } else {
        (new PharData($zipPath))->extractTo($tmp, null, true);
    }
    $dirs = glob("$tmp/*", GLOB_ONLYDIR);
    if (count($dirs) !== 1 || !is_file($dirs[0] . '/index.html')) throw new RuntimeException('unexpected build layout');
    $src = realpath($dirs[0]);

    // Copy the build over the web root
    $copied = 0;
    $newFiles = [];
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($src, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST);
    foreach ($it as $f) {
        $rel = substr($f->getPathname(), strlen($src) + 1);
        if ($rel === 'README.md') continue;
        $dest = $webroot . '/' . $rel;
        if ($f->isDir()) { if (!is_dir($dest)) mkdir($dest, 0755, true); continue; }
        $newFiles[$rel] = true;
        if (!copy($f->getPathname(), $dest . '.new') || !rename($dest . '.new', $dest)) throw new RuntimeException("copy failed: $rel");
        $copied++;
    }

    // Remove old hashed bundles the new build no longer references
    $removed = 0;
    foreach (glob("$webroot/assets/*") ?: [] as $old) {
        $rel = 'assets/' . basename($old);
        if (is_file($old) && !isset($newFiles[$rel])) { @unlink($old); $removed++; }
    }

    file_put_contents($shaFile, $sha);
    @unlink($zipPath);
    rrmdir($tmp);
    out(['ok' => true, 'deployed' => $sha, 'from' => $current ?: null, 'files' => $copied, 'removedOld' => $removed]);
} catch (Throwable $e) {
    error_log('[homex deploy] ' . $e->getMessage());
    out(['ok' => false, 'error' => $e->getMessage()], 500);
}
