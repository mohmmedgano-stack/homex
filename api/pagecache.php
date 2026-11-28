<?php
/**
 * Ready-made copies of what every visitor asks for: the product list, the store settings, the home page and each
 * product page. The web server (.htaccess) hands these files out directly without starting PHP, so a rush of
 * visitors costs almost nothing. A copy is written the first time someone asks after a change, and every copy is
 * thrown away whenever anything is saved (a product, a price, an order that changes stock...), after a deploy,
 * and after 30 minutes at most.
 */
declare(strict_types=1);

const PAGECACHE_MAX_AGE = 1800;

function pagecache_dir(): string {
    return dirname(__DIR__) . '/cache';
}

/** Writes one copy atomically (never half a file). Silent if the folder isn't writable: the site then works as before. */
function pagecache_put(string $name, string $body): void {
    if (!preg_match('/^[a-z0-9-]+\.(json|html)$/', $name)) return;
    // Pages carry the site's address: only keep copies made for the real address (or a local test server)
    if (!preg_match('/^(home-x\.online|127\.0\.0\.1:\d+|localhost(:\d+)?)$/', (string)($_SERVER['HTTP_HOST'] ?? ''))) return;
    try {
        $dir = pagecache_dir();
        if (!is_dir($dir) && !@mkdir($dir, 0755, true)) return;
        $tmp = "$dir/.$name." . bin2hex(random_bytes(4));
        if (@file_put_contents($tmp, $body) === false) return;
        @rename($tmp, "$dir/$name");
    } catch (Throwable $e) {
        error_log('[homex] pagecache: ' . $e->getMessage());
    }
}

/** The exact response ok() sends, kept as a file. */
function pagecache_json(string $name, $data): void {
    pagecache_put("$name.json", json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE));
}

/** Throws every copy away (or only those older than $maxAge seconds). */
function pagecache_clear(int $maxAge = 0): void {
    $dir = pagecache_dir();
    if (!is_dir($dir)) return;
    $limit = time() - $maxAge;
    foreach (glob("$dir/*.{json,html}", GLOB_BRACE) ?: [] as $f) {
        if ($maxAge === 0 || @filemtime($f) < $limit) @unlink($f);
    }
}

/** Runs a page renderer and keeps its output when the page came out fine. */
function pagecache_render(string $name, callable $render): void {
    ob_start();
    $render();
    $html = (string)ob_get_clean();
    $code = (int)(http_response_code() ?: 200);
    if ($code === 200 && strlen($html) > 500 && !headers_list_has('Location')) pagecache_put($name, $html);
    echo $html;
}

function headers_list_has(string $name): bool {
    foreach (headers_list() as $h) if (stripos($h, "$name:") === 0) return true;
    return false;
}
