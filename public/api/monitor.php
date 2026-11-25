<?php
/**
 * Site health: the same five steps as a Prometheus + Grafana + Loki + Alertmanager setup, built into the app because
 * shared hosting can't run those services.
 *   1. Metrics   every API and page request is measured (route, status, time) into req_log.
 *   2. Scraping  nothing to scrape: the app writes its own numbers; the dashboard reads them.
 *   3. Dashboard admin «صحة الموقع» (admin_health): traffic, errors, p95, slowest routes, disk, DB, backups.
 *   4. Logs      server errors, failed payments, login abuse and visitors' browser errors in one table, secrets
 *                masked, kept 7 days.
 *   5. Alerts    ready-made rules checked every few minutes; one email per incident (with inhibit rules so one
 *                problem doesn't send five emails), and a «resolved» email when it clears.
 */
declare(strict_types=1);

const MON_KEEP_DAYS = 7;

function monitor_migrate(PDO $db): void {
    $db->exec("
    CREATE TABLE IF NOT EXISTS req_log (at INTEGER NOT NULL, route TEXT NOT NULL, status INTEGER NOT NULL, ms INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_req_log_at ON req_log(at);
    CREATE TABLE IF NOT EXISTS app_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, level TEXT NOT NULL, source TEXT NOT NULL, message TEXT NOT NULL, ctx TEXT NOT NULL DEFAULT '');
    CREATE INDEX IF NOT EXISTS idx_app_logs_at ON app_logs(at);
    CREATE TABLE IF NOT EXISTS alerts (rule TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT 'ok', since INTEGER NOT NULL DEFAULT 0, value TEXT NOT NULL DEFAULT '', notified INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS client_log_attempts (h TEXT NOT NULL, at INTEGER NOT NULL);
    ");
}

/* ---------------- 1. Metrics ---------------- */

/** Called first thing on every request: measures it when the script ends, whatever way it ends. */
function monitor_begin(string $route): void {
    $GLOBALS['mon_t0'] = microtime(true);
    $GLOBALS['mon_route'] = substr($route, 0, 60);
    register_shutdown_function('monitor_end');
}

function monitor_end(): void {
    try {
        $t0 = $GLOBALS['mon_t0'] ?? null;
        if ($t0 === null) return;
        $ms = (int)round((microtime(true) - $t0) * 1000);
        $status = (int)(http_response_code() ?: 200);
        $route = (string)($GLOBALS['mon_route'] ?? '');
        // A PHP fatal error never reaches the API's catch block: log it here
        $e = error_get_last();
        if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
            $status = 500;
            app_log('critical', 'server', $e['message'], ['route' => $route, 'file' => basename((string)$e['file']) . ':' . $e['line']]);
        }
        $db = db();
        $db->prepare('INSERT INTO req_log (at, route, status, ms) VALUES (?, ?, ?, ?)')->execute([time(), $route, $status, $ms]);
        monitor_tick();
    } catch (Throwable $e) {
        error_log('[homex] monitor: ' . $e->getMessage());
    }
}

/* ---------------- 4. Logs ---------------- */

/** Masks passwords, tokens, keys, card numbers and most of each phone number before anything is stored. */
function mon_mask(string $s): string {
    $s = preg_replace('/("?(?:pass(?:word)?|pwd|token|secret|api_?key|apikey|hmac|authorization|cookie|session|otp|cvv|pin)"?\s*[:=]\s*"?)[^"&,\s}]+/i', '$1***', $s);
    $s = preg_replace('/\b\d(?:[ -]?\d){12,18}\b/', '****', $s);                     // card-like numbers
    $s = preg_replace('/\b(01[0125])\d{4}(\d{4})\b/', '$1****$2', $s);              // Egyptian mobiles
    $s = preg_replace('/\b(?:eyJ[\w-]{10,}\.[\w-]+\.[\w-]+|[A-Za-z0-9_\-]{32,})\b/', '***', $s); // JWTs and long keys
    return $s;
}

function app_log(string $level, string $source, string $message, array $ctx = []): void {
    try {
        $ctxJson = $ctx ? json_encode($ctx, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '';
        db()->prepare('INSERT INTO app_logs (at, level, source, message, ctx) VALUES (?, ?, ?, ?, ?)')
            ->execute([time(), $level, substr($source, 0, 30), mb_substr(mon_mask($message), 0, 1000), mb_substr(mon_mask((string)$ctxJson), 0, 2000)]);
    } catch (Throwable $e) {
        error_log('[homex] app_log: ' . $e->getMessage());
    }
}

/** POST log-client: a visitor's browser hit a JavaScript error. Rate-limited per address. */
function client_log(array $b): array {
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    if (preg_match('/bot|crawl|spider|headless|lighthouse/i', $ua)) return [];
    $h = substr(hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? '') . '|' . visit_salt()), 0, 24);
    $db = db();
    $db->prepare('DELETE FROM client_log_attempts WHERE at < ?')->execute([time() - 3600]);
    $st = $db->prepare('SELECT COUNT(*) FROM client_log_attempts WHERE h = ?');
    $st->execute([$h]);
    if ((int)$st->fetchColumn() >= 10) return [];
    $db->prepare('INSERT INTO client_log_attempts (h, at) VALUES (?, ?)')->execute([$h, time()]);
    $msg = str($b['message'] ?? '', 500);
    if ($msg === '' || preg_match('/ResizeObserver loop|Script error\.?$|chrome-extension|moz-extension/i', $msg)) return [];
    app_log('error', 'browser', $msg, [
        'page' => str($b['page'] ?? '', 200), 'at' => str($b['src'] ?? '', 200), 'stack' => str($b['stack'] ?? '', 800),
        'device' => ($dv = visit_device($ua, '', '', 0, 0))['model'] ?: $dv['os'], 'browser' => $dv['browser'],
    ]);
    return [];
}

/* ---------------- 5. Alerts ---------------- */

const MON_RULES = [
    'AppErrors'       => ['critical', 'أخطاء في السيرفر', 'طلبات كتير بترجع خطأ 500 في آخر 15 دقيقة'],
    'PaymentErrors'   => ['critical', 'مشكلة في الدفع', 'أخطاء في رجوع الدفع من شركة الدفع في آخر ساعة'],
    'SlowP95'         => ['warning', 'الموقع بطيء', 'أبطأ 5% من الطلبات بتاخد أكتر من 2 ثانية في آخر 15 دقيقة'],
    'LoginAbuse'      => ['warning', 'محاولات دخول كتير', 'أكتر من 20 محاولة دخول غلط للوحة التحكم في 15 دقيقة'],
    'DiskAlmostFull'  => ['warning', 'المساحة قربت تخلص', 'المساحة الفاضية على الاستضافة أقل من 10%'],
    'BackupStale'     => ['warning', 'النسخة الاحتياطية قديمة', 'مفيش نسخة احتياطية جديدة من أكتر من يومين'],
    'BrowserErrors'   => ['warning', 'أخطاء عند الزوار', 'أكتر من 15 خطأ في متصفحات الزوار في آخر ساعة'],
];
/** When the first rule fires, the others in its list are not emailed: they are almost always the same incident. */
const MON_INHIBIT = ['AppErrors' => ['SlowP95', 'BrowserErrors', 'PaymentErrors']];

/** p95 of request times since $since (ms), or null if too few requests to say. */
function mon_p95(int $since, int $min = 20): ?int {
    $db = db();
    $st = $db->prepare("SELECT COUNT(*) FROM req_log WHERE at >= ? AND route NOT IN ('POST visit', 'POST log-client', 'GET img')");
    $st->execute([$since]);
    $n = (int)$st->fetchColumn();
    if ($n < $min) return null;
    $off = (int)floor($n * 0.95);
    $st = $db->prepare("SELECT ms FROM req_log WHERE at >= ? AND route NOT IN ('POST visit', 'POST log-client', 'GET img') ORDER BY ms LIMIT 1 OFFSET $off");
    $st->execute([$since]);
    return (int)$st->fetchColumn();
}

function mon_disk(): array {
    $dir = data_dir();
    $free = @disk_free_space($dir);
    $total = @disk_total_space($dir);
    $dbFile = $dir . '/homex.sqlite';
    $dbSize = is_file($dbFile) ? filesize($dbFile) + (is_file("$dbFile-wal") ? filesize("$dbFile-wal") : 0) : 0;
    return ['free' => $free === false ? null : (float)$free, 'total' => $total === false ? null : (float)$total, 'db' => $dbSize];
}

function mon_last_backup(): int {
    $last = 0;
    foreach (glob(backup_dir() . '/homex-*.sqlite') ?: [] as $f) $last = max($last, (int)filemtime($f));
    return $last;
}

/** Works out which rules are firing right now: rule => value shown in the email/dashboard. */
function mon_evaluate(): array {
    $db = db();
    $now = time();
    $q = function (string $sql, array $a) use ($db) { $s = $db->prepare($sql); $s->execute($a); return (int)$s->fetchColumn(); };
    $firing = [];

    $n15 = $q('SELECT COUNT(*) FROM req_log WHERE at >= ?', [$now - 900]);
    $e15 = $q('SELECT COUNT(*) FROM req_log WHERE at >= ? AND status >= 500', [$now - 900]);
    if ($e15 >= 5 && $e15 >= 0.05 * $n15) $firing['AppErrors'] = "$e15 خطأ من $n15 طلب";

    $pay = $q("SELECT COUNT(*) FROM req_log WHERE at >= ? AND status >= 500 AND (route LIKE '%paymob%' OR route LIKE '%kashier%' OR route LIKE '%fawry%')", [$now - 3600]);
    if ($pay >= 1) $firing['PaymentErrors'] = "$pay خطأ";

    $p95 = mon_p95($now - 900);
    if ($p95 !== null && $p95 > 2000) $firing['SlowP95'] = number_format($p95 / 1000, 1) . ' ثانية';

    $bad = $q("SELECT COUNT(*) FROM req_log WHERE at >= ? AND route IN ('POST login', 'POST station/login') AND status IN (401, 403, 429)", [$now - 900]);
    if ($bad > 20) $firing['LoginAbuse'] = "$bad محاولة";

    $d = mon_disk();
    // Shared hosting reports the whole server disk: only alert when it's low in both share and size
    if ($d['free'] !== null && $d['total'] && $d['free'] / $d['total'] < 0.10 && $d['free'] < 2e9) $firing['DiskAlmostFull'] = round(100 * $d['free'] / $d['total']) . '% فاضي';

    $lb = mon_last_backup();
    if ($lb && $now - $lb > 2 * 86400) $firing['BackupStale'] = 'آخر نسخة من ' . floor(($now - $lb) / 86400) . ' يوم';

    $br = $q("SELECT COUNT(*) FROM app_logs WHERE at >= ? AND source = 'browser'", [$now - 3600]);
    if ($br > 15) $firing['BrowserErrors'] = "$br خطأ";

    return $firing;
}

/** Runs the rules at most every 5 minutes (piggybacking on normal traffic, plus the scheduled health check). */
function monitor_tick(bool $force = false): void {
    $db = db();
    $now = time();
    $last = (int)get_setting('mon_last_tick', '0');
    if (!$force && $now - $last < 300) return;
    $db->prepare("INSERT INTO settings (key, value) VALUES ('mon_last_tick', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")->execute([(string)$now]);
    // A visitor's response shouldn't wait for the checks (or an alert email): finish it first
    if (!$force) {
        if (function_exists('litespeed_finish_request')) litespeed_finish_request();
        elseif (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
    }
    // Retention
    $db->prepare('DELETE FROM req_log WHERE at < ?')->execute([$now - MON_KEEP_DAYS * 86400]);
    $db->prepare('DELETE FROM app_logs WHERE at < ?')->execute([$now - MON_KEEP_DAYS * 86400]);

    $firing = mon_evaluate();
    $prev = [];
    foreach ($db->query('SELECT rule, state, since, notified FROM alerts')->fetchAll() as $r) $prev[$r['rule']] = $r;

    $newly = []; $resolved = [];
    foreach (MON_RULES as $rule => $_) {
        $was = ($prev[$rule]['state'] ?? 'ok') === 'firing';
        $is = isset($firing[$rule]);
        if ($is && !$was) {
            $db->prepare("INSERT INTO alerts (rule, state, since, value, notified) VALUES (?, 'firing', ?, ?, 0) ON CONFLICT(rule) DO UPDATE SET state='firing', since=excluded.since, value=excluded.value, notified=0")
                ->execute([$rule, $now, $firing[$rule]]);
            $newly[$rule] = $firing[$rule];
        } elseif ($is) {
            $db->prepare("UPDATE alerts SET value = ? WHERE rule = ?")->execute([$firing[$rule], $rule]);
        } elseif ($was) {
            $db->prepare("UPDATE alerts SET state = 'ok', value = '', since = ? WHERE rule = ?")->execute([$now, $rule]);
            $resolved[$rule] = ['since' => (int)$prev[$rule]['since'], 'notified' => (int)$prev[$rule]['notified']];
        }
    }
    // Inhibit: a firing parent swallows its children's emails
    foreach (MON_INHIBIT as $parent => $children) {
        if (isset($firing[$parent])) foreach ($children as $c) unset($newly[$c]);
    }
    if ($newly) {
        foreach ($newly as $rule => $v) app_log(MON_RULES[$rule][0], 'alert', 'تنبيه: ' . MON_RULES[$rule][1], ['rule' => $rule, 'value' => $v]);
        if (mon_notify(true, $newly)) $db->prepare('UPDATE alerts SET notified = 1 WHERE rule IN (' . implode(',', array_fill(0, count($newly), '?')) . ')')->execute(array_keys($newly));
    }
    if ($resolved) {
        foreach ($resolved as $rule => $r) app_log('info', 'alert', 'اتحل: ' . MON_RULES[$rule][1], ['rule' => $rule, 'minutes' => (int)ceil(($now - $r['since']) / 60)]);
        // Only say «resolved» for problems the owner was told about
        $told = array_map(fn($r) => $r['since'], array_filter($resolved, fn($r) => $r['notified']));
        if ($told) mon_notify(false, $told);
    }
}

/** One email for every alert that started (or cleared) in this tick. Returns true if it was sent. */
function mon_notify(bool $firing, array $rules): bool {
    $to = (string)(payment_settings()['notify_email'] ?? '');
    if ($to === '') return false;
    $store = get_setting('store_name', 'HOMEX') ?: 'HOMEX';
    $base = site_base();
    $now = time();
    $lines = [];
    foreach ($rules as $rule => $v) {
        [$sev, $title, $desc] = MON_RULES[$rule];
        $lines[] = $firing
            ? ($sev === 'critical' ? '🔴 ' : '🟠 ') . "$title ($v)\n   $desc"
            : "✅ $title: اتحلت بعد " . max(1, (int)ceil(($now - (int)$v) / 60)) . ' دقيقة';
    }
    $subject = $firing ? "تنبيه في موقع $store: " . MON_RULES[array_key_first($rules)][1] : "اتحلت: " . MON_RULES[array_key_first($rules)][1] . " — $store";
    $text = ($firing ? "فيه مشكلة محتاجة تبص عليها في $store:\n\n" : "المشكلة اللي اتبعتلك عنها اتحلت لوحدها:\n\n")
        . implode("\n\n", $lines) . "\n\nالتفاصيل: $base/admin/#health\n";
    $html = '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.8">'
        . nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8')) . '</div>';
    $err = send_mail($to, $subject, $html, $text);
    if ($err !== '') { error_log('[homex] alert mail: ' . $err); return false; }
    return true;
}

/* ---------------- 3. Dashboard ---------------- */

function admin_health(array $q): array {
    $hours = max(1, min(168, (int)($q['hours'] ?? 24)));
    $now = time();
    $since = $now - $hours * 3600;
    $db = db();
    $one = function (string $sql, array $a = []) use ($db) { $s = $db->prepare($sql); $s->execute($a); return $s->fetchColumn(); };
    $rows = function (string $sql, array $a = []) use ($db) { $s = $db->prepare($sql); $s->execute($a); return $s->fetchAll(); };

    monitor_tick(true);
    $total = (int)$one('SELECT COUNT(*) FROM req_log WHERE at >= ?', [$since]);
    $e5 = (int)$one('SELECT COUNT(*) FROM req_log WHERE at >= ? AND status >= 500', [$since]);
    $e4 = (int)$one('SELECT COUNT(*) FROM req_log WHERE at >= ? AND status >= 400 AND status < 500', [$since]);

    // Requests per bucket (hour, or 15 minutes for short windows)
    $step = $hours <= 6 ? 900 : 3600;
    $start = (int)(floor($since / $step) * $step);
    $byB = [];
    foreach ($rows("SELECT (at / $step) * $step AS b, COUNT(*) AS n, SUM(status >= 500) AS e, CAST(AVG(ms) AS INTEGER) AS avg FROM req_log WHERE at >= ? GROUP BY b", [$start]) as $r) $byB[(int)$r['b']] = $r;
    $series = [];
    for ($b = $start; $b <= $now; $b += $step) $series[] = ['t' => $b, 'n' => (int)($byB[$b]['n'] ?? 0), 'e' => (int)($byB[$b]['e'] ?? 0), 'avg' => (int)($byB[$b]['avg'] ?? 0)];

    // Slowest routes by p95
    $routes = [];
    foreach ($rows("SELECT route, COUNT(*) AS n, CAST(AVG(ms) AS INTEGER) AS avg, MAX(ms) AS max, SUM(status >= 500) AS e FROM req_log WHERE at >= ? GROUP BY route HAVING n >= 3 ORDER BY avg DESC LIMIT 8", [$since]) as $r) {
        $routes[] = ['route' => $r['route'], 'n' => (int)$r['n'], 'avg' => (int)$r['avg'], 'max' => (int)$r['max'], 'errors' => (int)$r['e']];
    }

    $alerts = [];
    $state = [];
    foreach ($db->query('SELECT rule, state, since, value FROM alerts')->fetchAll() as $r) $state[$r['rule']] = $r;
    foreach (MON_RULES as $rule => [$sev, $title, $desc]) {
        $s = $state[$rule] ?? null;
        $alerts[] = ['rule' => $rule, 'severity' => $sev, 'title' => $title, 'desc' => $desc,
            'firing' => ($s['state'] ?? '') === 'firing', 'since' => (int)($s['since'] ?? 0), 'value' => (string)($s['value'] ?? '')];
    }

    // Logs
    $lv = (string)($q['level'] ?? '');
    $src = (string)($q['source'] ?? '');
    $search = trim((string)($q['q'] ?? ''));
    $where = 'at >= ?'; $args = [$now - MON_KEEP_DAYS * 86400];
    if (in_array($lv, ['critical', 'error', 'warning', 'info'], true)) { $where .= ' AND level = ?'; $args[] = $lv; }
    if (in_array($src, ['server', 'browser', 'alert', 'payment'], true)) { $where .= ' AND source = ?'; $args[] = $src; }
    if ($search !== '') { $where .= ' AND (message LIKE ? OR ctx LIKE ?)'; $args[] = "%$search%"; $args[] = "%$search%"; }
    $logs = array_map(fn($r) => ['id' => (int)$r['id'], 'at' => (int)$r['at'], 'level' => $r['level'], 'source' => $r['source'], 'message' => $r['message'], 'ctx' => $r['ctx']],
        $rows("SELECT * FROM app_logs WHERE $where ORDER BY id DESC LIMIT 100", $args));

    $d = mon_disk();
    return [
        'hours' => $hours,
        'total' => $total,
        'errors5' => $e5,
        'errors4' => $e4,
        'errorRate' => $total ? round(100 * $e5 / $total, 2) : 0,
        'p95' => mon_p95($since, 5),
        'avg' => (int)$one('SELECT CAST(AVG(ms) AS INTEGER) FROM req_log WHERE at >= ?', [$since]),
        'series' => $series,
        'step' => $step,
        'routes' => $routes,
        'alerts' => $alerts,
        'logs' => $logs,
        'logCounts' => array_column($rows('SELECT level, COUNT(*) AS n FROM app_logs WHERE at >= ? GROUP BY level', [$now - MON_KEEP_DAYS * 86400]), 'n', 'level'),
        'disk' => ['free' => $d['free'], 'total' => $d['total'], 'db' => $d['db']],
        'lastBackup' => mon_last_backup(),
        'php' => PHP_VERSION,
        'memoryPeak' => memory_get_peak_usage(true),
        'notifyEmail' => (string)(payment_settings()['notify_email'] ?? '') !== '',
        'lastTick' => (int)get_setting('mon_last_tick', '0'),
    ];
}

/** GET ping: for the scheduled outside check. Tiny, and runs the alert rules while it's here. */
function monitor_ping(): array {
    db()->query('SELECT 1')->fetchColumn();
    return ['ok' => true, 'at' => time()];
}
