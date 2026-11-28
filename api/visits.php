<?php
/**
 * Visitors: where people open the store from and on what device.
 * The store sends one beacon per visit (per browser tab session). The server works out the device from the
 * User-Agent (plus the model Chrome on Android reports through client hints, and the screen size for iPhones),
 * the source from the referrer and the link's tags, and the place from the visitor's IP.
 * No raw IP is stored: a salted hash stands in for it, only to count distinct visitors and cache the place.
 */
declare(strict_types=1);

function visits_migrate(PDO $db): void {
    $db->exec("
    CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at INTEGER NOT NULL,
        day TEXT NOT NULL,
        vid TEXT NOT NULL,
        path TEXT NOT NULL DEFAULT '/',
        source TEXT NOT NULL DEFAULT 'direct',
        country TEXT NOT NULL DEFAULT '',
        country_code TEXT NOT NULL DEFAULT '',
        region TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        device TEXT NOT NULL DEFAULT 'mobile',
        os TEXT NOT NULL DEFAULT '',
        os_ver TEXT NOT NULL DEFAULT '',
        brand TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT '',
        browser TEXT NOT NULL DEFAULT '',
        screen TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_visits_at ON visits(at);
    CREATE TABLE IF NOT EXISTS ip_geo (h TEXT PRIMARY KEY, country TEXT, country_code TEXT, region TEXT, city TEXT, at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS visit_attempts (h TEXT NOT NULL, at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS geo_queue (visit_id INTEGER NOT NULL, ip TEXT NOT NULL, h TEXT NOT NULL, at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_visit_attempts ON visit_attempts(h, at);
    ");
}

function visit_salt(): string {
    $s = (string)get_setting('visit_salt', '');
    if ($s === '') {
        $s = bin2hex(random_bytes(16));
        db()->prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING')->execute(['visit_salt', $s]);
        $s = (string)get_setting('visit_salt', $s);
    }
    return $s;
}

const VISIT_BOTS = '/bot|crawl|spider|slurp|facebookexternalhit|meta-externalagent|whatsapp\/|telegrambot|preview|headless|lighthouse|pagespeed|gtmetrix|python|curl|wget|httpclient|okhttp|go-http|java\/|scrapy|firecrawl|monitor|uptime/i';

/** POST visit: {path, ref, q (the landing query string), sw, sh (screen), tp (touch points), model, osv (client hints)} */
function visit_record(array $b): array {
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    if ($ua === '' || preg_match(VISIT_BOTS, $ua)) return ['skipped' => true];
    // Store staff opening their own site don't count
    if (!empty($_COOKIE['homex_admin']) && current_admin()) return ['skipped' => true];

    $ip = (string)($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '');
    $salt = visit_salt();
    $ipHash = substr(hash('sha256', $salt . '|' . $ip), 0, 24);
    $db = db();

    // At most 40 beacons an hour from one address
    if (random_int(1, 50) === 1) $db->prepare('DELETE FROM visit_attempts WHERE at < ?')->execute([time() - 3600]);
    $st = $db->prepare('SELECT COUNT(*) FROM visit_attempts WHERE h = ? AND at > ?');
    $st->execute([$ipHash, time() - 3600]);
    $recent = (int)$st->fetchColumn();
    $st->closeCursor();  // an open read would block this request's own write below when others are writing
    if ($recent >= 40) return ['skipped' => true];
    $db->prepare('INSERT INTO visit_attempts (h, at) VALUES (?, ?)')->execute([$ipHash, time()]);

    $dev = visit_device($ua, str($b['model'] ?? '', 60), str($b['osv'] ?? '', 20), (int)($b['sw'] ?? 0), (int)($b['sh'] ?? 0), (int)($b['tp'] ?? 0));
    $path = str($b['path'] ?? '/', 200);
    if ($path === '' || $path[0] !== '/') $path = '/';
    $source = visit_source(str($b['ref'] ?? '', 400), str($b['q'] ?? '', 600), $ua);
    $now = time();
    $day = (new DateTime('now', new DateTimeZone('Africa/Cairo')))->format('Y-m-d');
    $vid = substr(hash('sha256', $salt . '|' . $ip . '|' . $ua . '|' . $day), 0, 24);
    $sw = max(0, min(10000, (int)($b['sw'] ?? 0)));
    $sh = max(0, min(10000, (int)($b['sh'] ?? 0)));

    $db->prepare('INSERT INTO visits (at, day, vid, path, source, device, os, os_ver, brand, model, browser, screen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([$now, $day, $vid, $path, $source, $dev['device'], $dev['os'], $dev['osVer'], $dev['brand'], $dev['model'], $dev['browser'], $sw && $sh ? "{$sw}x{$sh}" : '']);
    $id = (int)$db->lastInsertId();

    // The place: straight from the cache when this address was seen in the last 30 days. Otherwise the address
    // waits in geo_queue (minutes at most) and the next health tick looks up to 100 of them in one request,
    // so a rush of visitors never holds the server waiting on the lookup service.
    try {
        $st = $db->prepare('SELECT country, country_code, region, city FROM ip_geo WHERE h = ? AND at > ?');
        $st->execute([$ipHash, time() - 30 * 86400]);
        $g = $st->fetch();
        $st->closeCursor();
        if ($g) {
            $db->prepare('UPDATE visits SET country = ?, country_code = ?, region = ?, city = ? WHERE id = ?')->execute([$g['country'], $g['country_code'], $g['region'], $g['city'], $id]);
        } elseif (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            $db->prepare('INSERT INTO geo_queue (visit_id, ip, h, at) VALUES (?, ?, ?, ?)')->execute([$id, $ip, $ipHash, time()]);
        }
    } catch (Throwable $e) { error_log('[homex] visit geo: ' . $e->getMessage()); }
    if (random_int(1, 200) === 1) {
        $db->prepare('DELETE FROM visits WHERE at < ?')->execute([time() - 400 * 86400]);
        $db->prepare('DELETE FROM ip_geo WHERE at < ?')->execute([time() - 30 * 86400]);
    }
    return ['id' => $id];
}

/** Looks up queued visitor addresses in one batch request, then forgets the addresses. Called by monitor_tick. */
function visit_geo_flush(): void {
    $db = db();
    $rows = $db->query('SELECT rowid, visit_id, ip, h, at FROM geo_queue ORDER BY rowid LIMIT 100')->fetchAll();
    if (!$rows) return;
    $ips = array_values(array_unique(array_column($rows, 'ip')));
    $found = [];
    $c = curl_init('http://ip-api.com/batch?fields=status,query,country,countryCode,regionName,city');
    curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($ips), CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_USERAGENT => 'HOMEX/1.0']);
    $raw = curl_exec($c);
    $code = (int)curl_getinfo($c, CURLINFO_HTTP_CODE);
    curl_close($c);
    if (is_string($raw) && $code === 200 && is_array($list = json_decode($raw, true))) {
        foreach ($list as $j) if (($j['status'] ?? '') === 'success') {
            $found[$j['query']] = visit_arabic_place(['country' => (string)$j['country'], 'country_code' => (string)$j['countryCode'], 'region' => (string)($j['regionName'] ?? ''), 'city' => (string)($j['city'] ?? '')]);
        }
    } else {
        // Batch service unavailable: fall back to one-by-one for a few, the rest wait for the next tick
        foreach (array_slice($ips, 0, 5) as $ip) {
            $h = $rows[array_search($ip, array_column($rows, 'ip'))]['h'];
            if ($g = visit_geo($ip, $h)) $found[$ip] = $g;
        }
    }
    $upd = $db->prepare('UPDATE visits SET country = ?, country_code = ?, region = ?, city = ? WHERE id = ?');
    $cache = $db->prepare('INSERT INTO ip_geo (h, country, country_code, region, city, at) VALUES (?,?,?,?,?,?) ON CONFLICT(h) DO UPDATE SET country=excluded.country, country_code=excluded.country_code, region=excluded.region, city=excluded.city, at=excluded.at');
    $del = $db->prepare('DELETE FROM geo_queue WHERE rowid = ?');
    $db->beginTransaction();
    foreach ($rows as $r) {
        $g = $found[$r['ip']] ?? null;
        if ($g) {
            $upd->execute([$g['country'], $g['country_code'], $g['region'], $g['city'], $r['visit_id']]);
            $cache->execute([$r['h'], $g['country'], $g['country_code'], $g['region'], $g['city'], time()]);
        }
        // Resolved, or tried long enough: the address is never kept beyond this
        if ($g || $r['at'] < time() - 3600 || count($found) > 0) $del->execute([$r['rowid']]);
    }
    $db->commit();
}

/* ---------------- Place ---------------- */

function visit_http_json(string $url): ?array {
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 4, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_USERAGENT => 'HOMEX/1.0']);
        $raw = curl_exec($c);
        $code = (int)curl_getinfo($c, CURLINFO_HTTP_CODE);
        curl_close($c);
        if (!is_string($raw) || $code !== 200) return null;
    } else {
        $raw = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 4, 'header' => "User-Agent: HOMEX/1.0\r\n"]]));
        if (!is_string($raw)) return null;
    }
    $j = json_decode($raw, true);
    return is_array($j) ? $j : null;
}

function visit_geo(string $ip, string $ipHash): ?array {
    if ($ip === '' || !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return null;
    $db = db();
    $st = $db->prepare('SELECT country, country_code, region, city FROM ip_geo WHERE h = ? AND at > ?');
    $st->execute([$ipHash, time() - 30 * 86400]);
    if ($row = $st->fetch()) return $row;

    $g = null;
    $j = visit_http_json('https://ipwho.is/' . rawurlencode($ip) . '?fields=success,country,country_code,region,city');
    if ($j && !empty($j['success'])) $g = ['country' => (string)$j['country'], 'country_code' => (string)$j['country_code'], 'region' => (string)($j['region'] ?? ''), 'city' => (string)($j['city'] ?? '')];
    if (!$g) {
        $j = visit_http_json('http://ip-api.com/json/' . rawurlencode($ip) . '?fields=status,country,countryCode,regionName,city');
        if ($j && ($j['status'] ?? '') === 'success') $g = ['country' => (string)$j['country'], 'country_code' => (string)$j['countryCode'], 'region' => (string)($j['regionName'] ?? ''), 'city' => (string)($j['city'] ?? '')];
    }
    if (!$g) return null;
    $g = visit_arabic_place($g);
    $db->prepare('INSERT INTO ip_geo (h, country, country_code, region, city, at) VALUES (?,?,?,?,?,?) ON CONFLICT(h) DO UPDATE SET country=excluded.country, country_code=excluded.country_code, region=excluded.region, city=excluded.city, at=excluded.at')
        ->execute([$ipHash, $g['country'], $g['country_code'], $g['region'], $g['city'], time()]);
    return $g;
}

/** Egyptian governorates and big cities in Arabic; other countries keep their English names. */
function visit_arabic_place(array $g): array {
    $key = fn(string $s) => preg_replace('/[^a-z]/', '', strtolower(str_ireplace(['governorate', 'muhafazat', 'gouvernorat'], '', $s)));
    $gov = [
        'القاهرة' => ['cairo', 'alqahirah', 'qahirah'], 'الجيزة' => ['giza', 'aljizah', 'jizah', 'gizah'],
        'الإسكندرية' => ['alexandria', 'aliskandariyah', 'iskandariyah'], 'الدقهلية' => ['dakahlia', 'addaqahliyah', 'daqahliyah', 'dakahliya', 'dakhalia'],
        'الشرقية' => ['sharqia', 'ashsharqiyah', 'sharqiyah', 'sharkia', 'alsharqia'], 'القليوبية' => ['qalyubia', 'alqalyubiyah', 'qalyubiyah', 'kalyubia'],
        'الغربية' => ['gharbia', 'algharbiyah', 'gharbiyah', 'gharbiya'], 'المنوفية' => ['monufia', 'almunufiyah', 'minufiyah', 'menofia', 'monufiya'],
        'البحيرة' => ['beheira', 'albuhayrah', 'buhayrah', 'behera', 'albeheira'], 'كفر الشيخ' => ['kafrelsheikh', 'kafrashshaykh', 'kafralshaykh', 'kafrelshaikh'],
        'دمياط' => ['damietta', 'dumyat'], 'بورسعيد' => ['portsaid', 'bursaid'], 'الإسماعيلية' => ['ismailia', 'alismailiyah', 'ismailiyah'],
        'السويس' => ['suez', 'assuways', 'suways'], 'الفيوم' => ['faiyum', 'alfayyum', 'fayyum', 'fayoum'], 'بني سويف' => ['benisuef', 'banisuwayf', 'banisweif'],
        'المنيا' => ['minya', 'alminya', 'elminya'], 'أسيوط' => ['asyut', 'assiut'], 'سوهاج' => ['sohag', 'suhaj'], 'قنا' => ['qena', 'qina'],
        'الأقصر' => ['luxor', 'aluqsur', 'luqsur'], 'أسوان' => ['aswan'], 'البحر الأحمر' => ['redsea', 'albahralahmar'],
        'الوادي الجديد' => ['newvalley', 'alwadialjadid'], 'مطروح' => ['matrouh', 'matruh', 'marsamatruh'],
        'شمال سيناء' => ['northsinai', 'shamalsina'], 'جنوب سيناء' => ['southsinai', 'janubsina'],
    ];
    $city = [
        'mansoura' => 'المنصورة', 'almansurah' => 'المنصورة', 'cairo' => 'القاهرة', 'giza' => 'الجيزة', 'alexandria' => 'الإسكندرية',
        'tanta' => 'طنطا', 'zagazig' => 'الزقازيق', 'damietta' => 'دمياط', 'portsaid' => 'بورسعيد', 'ismailia' => 'الإسماعيلية', 'suez' => 'السويس',
        'shibinalkawm' => 'شبين الكوم', 'banha' => 'بنها', 'benha' => 'بنها', 'kafrelsheikh' => 'كفر الشيخ', 'damanhur' => 'دمنهور',
        'mahallaalkubra' => 'المحلة الكبرى', 'elmahallaelkubra' => 'المحلة الكبرى', 'almahallahalkubra' => 'المحلة الكبرى', 'mitghamr' => 'ميت غمر', 'talkha' => 'طلخا',
        'faiyum' => 'الفيوم', 'benisuef' => 'بني سويف', 'minya' => 'المنيا', 'asyut' => 'أسيوط', 'sohag' => 'سوهاج', 'qena' => 'قنا', 'luxor' => 'الأقصر',
        'aswan' => 'أسوان', 'hurghada' => 'الغردقة', 'sharmelsheikh' => 'شرم الشيخ', 'newcairo' => 'القاهرة الجديدة', 'nasrcity' => 'مدينة نصر',
        'helwan' => 'حلوان', 'shubraelkheima' => 'شبرا الخيمة', 'sixthofoctober' => '6 أكتوبر', 'octobercity' => '6 أكتوبر', 'sheikhzayed' => 'الشيخ زايد',
        'aga' => 'أجا', 'sherbin' => 'شربين', 'belqas' => 'بلقاس', 'dikirnis' => 'دكرنس', 'minyaelqamh' => 'منيا القمح', 'bilbeis' => 'بلبيس',
    ];
    $g['country_code'] = strtoupper($g['country_code']);
    if ($g['country_code'] !== 'EG') return $g;
    $g['country'] = 'مصر';
    $rk = $key($g['region']);
    foreach ($gov as $ar => $vars) foreach ($vars as $v) if ($rk === $v || ($rk !== '' && str_starts_with($rk, $v))) { $g['region'] = $ar; break 2; }
    $ck = $key($g['city']);
    if (isset($city[$ck])) $g['city'] = $city[$ck];
    return $g;
}

/* ---------------- Source ---------------- */

function visit_source(string $ref, string $q, string $ua): string {
    parse_str(ltrim($q, '?'), $qs);
    $utm = strtolower((string)($qs['utm_source'] ?? ''));
    $host = strtolower((string)(parse_url($ref, PHP_URL_HOST) ?? ''));
    $own = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    if ($host !== '' && $own !== '' && ($host === $own || str_ends_with($host, '.' . $own))) $host = '';
    $is = fn(string $re) => preg_match($re, $utm) || preg_match($re, $host);
    if (preg_match('/Instagram/', $ua) || $is('/instagram|^ig$/')) return 'instagram';
    if (preg_match('/FBAN|FBAV|FB_IAB|FBIOS/', $ua) || isset($qs['fbclid']) || $is('/facebook|^fb$|messenger/')) return 'facebook';
    if (preg_match('/musical_ly|BytedanceWebview|TikTok/i', $ua) || isset($qs['ttclid']) || $is('/tiktok/')) return 'tiktok';
    if (isset($qs['gclid']) || isset($qs['gbraid']) || isset($qs['wbraid']) || $is('/google/')) return 'google';
    if ($is('/whatsapp|wa\.me/')) return 'whatsapp';
    if ($is('/bing|yahoo|duckduckgo|yandex|chatgpt|openai|perplexity|claude|gemini/')) return 'search';
    if ($is('/youtube|youtu\.be/')) return 'youtube';
    if ($is('/snapchat/') || preg_match('/Snapchat/', $ua)) return 'snapchat';
    if ($utm !== '' || $host !== '') return 'other';
    return 'direct';
}

/* ---------------- Device ---------------- */

/** iPhones don't say which model they are; the screen size narrows it to a family. */
function visit_iphone_family(int $w, int $h): string {
    if (!$w || !$h) return 'iPhone';
    [$a, $b] = [min($w, $h), max($w, $h)];
    $m = [
        '440x956' => 'iPhone 16 Pro Max', '402x874' => 'iPhone 16 Pro',
        '430x932' => 'iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus', '393x852' => 'iPhone 14 Pro / 15 / 15 Pro / 16',
        '428x926' => 'iPhone 12 Pro Max / 13 Pro Max / 14 Plus', '390x844' => 'iPhone 12 / 13 / 14',
        '375x812' => 'iPhone X / XS / 11 Pro / 12 mini / 13 mini', '414x896' => 'iPhone XR / XS Max / 11 / 11 Pro Max',
        '414x736' => 'iPhone 6 / 7 / 8 Plus', '375x667' => 'iPhone 6 / 7 / 8 / SE', '320x568' => 'iPhone 5 / SE (1st)',
    ];
    return $m["{$a}x{$b}"] ?? 'iPhone';
}

function visit_android_name(string $model): array {
    $m = trim($model);
    if ($m === '' || $m === 'K') return ['', ''];
    $u = strtoupper($m);
    if (preg_match('/^SM-([AMFE])(\d{2})(\d)/', $u, $x)) return ['Samsung', 'Galaxy ' . $x[1] . $x[2] . ($x[3] === '7' ? 's' : '')];
    if (preg_match('/^SM-S9([0-3])(\d)/', $u, $x)) {
        $tier = ['6' => '+', '8' => ' Ultra'][$x[2]] ?? '';
        return ['Samsung', 'Galaxy S' . (22 + (int)$x[1]) . $tier];
    }
    if (preg_match('/^SM-G9([6-9])(\d)/', $u, $x)) return ['Samsung', 'Galaxy S' . ['6' => '9', '7' => '10', '8' => '20', '9' => '21'][$x[1]] . (['5' => '+', '6' => '+', '8' => ' Ultra'][$x[2]] ?? '')];
    if (preg_match('/^SM-N9(\d)/', $u, $x)) return ['Samsung', 'Galaxy Note (' . $m . ')'];
    if (preg_match('/^SM-S7(\d)1/', $u, $x)) return ['Samsung', 'Galaxy S' . (22 + (int)$x[1]) . ' FE'];
    if (preg_match('/^SM-F(\d)(\d)/', $u)) return ['Samsung', 'Galaxy Z (' . $m . ')'];
    if (preg_match('/^SM-T|^SM-X/', $u)) return ['Samsung', 'Galaxy Tab (' . $m . ')'];
    if (preg_match('/^SM-/', $u)) return ['Samsung', $m];
    $brands = [
        '/^(REDMI|POCO|XIAOMI|MI )/' => 'Xiaomi', '/^\d{4,5}[A-Z0-9]{3,}$/' => 'Xiaomi', '/^M2\d{3}/' => 'Xiaomi',
        '/^CPH\d/' => 'Oppo', '/^OPPO/' => 'Oppo', '/^RMX\d/' => 'realme', '/^REALME/' => 'realme', '/^V2\d{3}/' => 'vivo', '/^VIVO/' => 'vivo',
        '/^INFINIX|^X6\d{2}/' => 'Infinix', '/^TECNO/' => 'Tecno', '/^ITEL|^IT\d{4}/' => 'itel', '/^NOKIA|^TA-\d/' => 'Nokia', '/^PIXEL/' => 'Google',
        '/^HUAWEI|^[A-Z]{3}-[A-Z]{1,2}\d{2}/' => 'Huawei / Honor', '/^HONOR/' => 'Huawei / Honor', '/^MOTO|^MOTOROLA/' => 'Motorola',
        '/^ONEPLUS|^[A-Z]{2}\d{4}$/' => 'OnePlus', '/^LENOVO|^TB-/' => 'Lenovo', '/^LG-|^LM-/' => 'LG', '/^ASUS/' => 'Asus', '/^SONY|^XQ-/' => 'Sony',
    ];
    foreach ($brands as $re => $brand) if (preg_match($re, $u)) return [$brand, $m];
    return ['أخرى', $m];
}

function visit_device(string $ua, string $hintModel, string $hintOsVer, int $sw, int $sh, int $touch = 0): array {
    $d = ['device' => 'mobile', 'os' => 'أخرى', 'osVer' => '', 'brand' => '', 'model' => '', 'browser' => 'أخرى'];

    // Browser, in-app browsers first (Facebook / Instagram / TikTok open links inside their own app)
    $browsers = [
        '/FBAN|FBAV|FB_IAB|FBIOS/' => 'داخل فيسبوك', '/Instagram/' => 'داخل إنستجرام', '/musical_ly|BytedanceWebview|TikTok/i' => 'داخل تيك توك',
        '/Snapchat/' => 'داخل سناب شات', '/WhatsApp/' => 'داخل واتساب', '/SamsungBrowser/' => 'Samsung Internet', '/EdgA?\/|Edg\//' => 'Edge',
        '/OPR\/|Opera/' => 'Opera', '/MiuiBrowser|XiaoMi/' => 'Mi Browser', '/HeyTapBrowser/' => 'Oppo Browser', '/UCBrowser/' => 'UC Browser',
        '/Firefox|FxiOS/' => 'Firefox', '/CriOS/' => 'Chrome', '/Chrome\//' => 'Chrome', '/Safari\//' => 'Safari',
    ];
    foreach ($browsers as $re => $name) if (preg_match($re, $ua)) { $d['browser'] = $name; break; }

    if (preg_match('/iPhone/', $ua)) {
        $d['os'] = 'iOS'; $d['brand'] = 'Apple'; $d['model'] = visit_iphone_family($sw, $sh);
        if (preg_match('/OS (\d+)[_.](\d+)/', $ua, $x)) $d['osVer'] = $x[1];
    } elseif (preg_match('/iPad/', $ua) || (preg_match('/Macintosh/', $ua) && $touch > 1)) {
        // iPads ask for the desktop site and say "Macintosh"; only a touch screen gives them away
        $d['device'] = 'tablet'; $d['os'] = 'iPadOS'; $d['brand'] = 'Apple'; $d['model'] = 'iPad';
        if (preg_match('/OS (\d+)[_.]/', $ua, $x)) $d['osVer'] = $x[1];
    } elseif (preg_match('/Android/', $ua)) {
        $d['os'] = 'Android';
        if (preg_match('/Android (\d+)/', $ua, $x)) $d['osVer'] = $x[1];
        if ($hintOsVer !== '' && preg_match('/^(\d+)/', $hintOsVer, $x)) $d['osVer'] = $x[1];
        $model = $hintModel;
        if ($model === '' && preg_match('/Android [\d.]+;(?: [a-z]{2}[-_][a-z]{2};)? ([^;)]+?)(?: Build\/[^;)]*)?[;)]/i', $ua, $x)) $model = trim($x[1]);
        if ($model === 'K' || preg_match('/^(wv|Linux|U)$/i', $model)) $model = '';
        [$brand, $name] = visit_android_name($model);
        if ($brand === '' && preg_match('/SamsungBrowser/', $ua)) $brand = 'Samsung';
        $d['brand'] = $brand ?: 'أندرويد (موديل مش معروف)';
        $d['model'] = $name;
        if (!preg_match('/Mobile/', $ua) || preg_match('/Tab|^SM-[TX]/i', $model)) $d['device'] = 'tablet';
    } elseif (preg_match('/Windows/', $ua)) {
        $d['device'] = 'desktop'; $d['os'] = 'Windows'; $d['brand'] = 'كمبيوتر';
    } elseif (preg_match('/Macintosh|Mac OS X/', $ua)) {
        $d['device'] = 'desktop'; $d['os'] = 'macOS'; $d['brand'] = 'Apple'; $d['model'] = 'Mac';
    } elseif (preg_match('/CrOS/', $ua)) {
        $d['device'] = 'desktop'; $d['os'] = 'ChromeOS'; $d['brand'] = 'كمبيوتر';
    } elseif (preg_match('/Linux/', $ua)) {
        $d['device'] = 'desktop'; $d['os'] = 'Linux'; $d['brand'] = 'كمبيوتر';
    }
    $d['osVer'] = $d['osVer'] !== '' ? $d['os'] . ' ' . $d['osVer'] : $d['os'];
    return $d;
}

/* ---------------- Dashboard ---------------- */

const VISIT_SOURCES = ['facebook' => 'فيسبوك', 'instagram' => 'إنستجرام', 'tiktok' => 'تيك توك', 'google' => 'جوجل', 'whatsapp' => 'واتساب',
    'search' => 'محركات بحث تانية / الذكاء الاصطناعي', 'youtube' => 'يوتيوب', 'snapchat' => 'سناب شات', 'other' => 'مواقع تانية', 'direct' => 'دخول مباشر'];
const VISIT_DEVICES = ['mobile' => 'موبايل', 'tablet' => 'تابلت', 'desktop' => 'كمبيوتر'];

function admin_visitors(array $q): array {
    $days = max(1, min(365, (int)($q['days'] ?? 7)));
    $tz = new DateTimeZone('Africa/Cairo');
    $from = (new DateTime('today', $tz))->modify('-' . ($days - 1) . ' days');
    $since = $from->getTimestamp();
    $db = db();
    $one = function (string $sql, array $a = []) use ($db) { $s = $db->prepare($sql); $s->execute($a); return $s->fetchColumn(); };
    $rows = function (string $sql, array $a = []) use ($db) { $s = $db->prepare($sql); $s->execute($a); return $s->fetchAll(); };
    $top = function (string $col, int $limit = 12, string $where = '') use ($rows, $since) {
        return array_map(fn($r) => ['label' => (string)$r['k'], 'count' => (int)$r['n']],
            $rows("SELECT $col AS k, COUNT(*) AS n FROM visits WHERE at >= ? AND $col <> '' $where GROUP BY k ORDER BY n DESC LIMIT $limit", [$since]));
    };

    $total = (int)$one('SELECT COUNT(*) FROM visits WHERE at >= ?', [$since]);
    $unique = (int)$one('SELECT COUNT(DISTINCT vid) FROM visits WHERE at >= ?', [$since]);
    $orders = (int)$one("SELECT COUNT(*) FROM orders WHERE created_at >= ? AND status NOT IN ('cancelled', 'awaiting_payment')", [gmdate('Y-m-d H:i:s', $since)]);

    $series = [];
    $byDay = [];
    foreach ($rows('SELECT day, COUNT(*) AS n, COUNT(DISTINCT vid) AS u FROM visits WHERE at >= ? GROUP BY day', [$since]) as $r) $byDay[$r['day']] = $r;
    $d = clone $from;
    for ($i = 0; $i < $days; $i++) { $k = $d->format('Y-m-d'); $series[] = ['day' => $k, 'visits' => (int)($byDay[$k]['n'] ?? 0), 'visitors' => (int)($byDay[$k]['u'] ?? 0)]; $d->modify('+1 day'); }

    $label = fn(array $list, array $names) => array_map(fn($x) => ['label' => $names[$x['label']] ?? $x['label'], 'count' => $x['count']], $list);
    $productNames = [];
    foreach ($rows('SELECT id, name FROM products') as $p) $productNames[(int)$p['id']] = $p['name'];
    $pages = array_map(function ($x) use ($productNames) {
        $p = $x['label'];
        if ($p === '/') $x['label'] = 'الصفحة الرئيسية';
        elseif (preg_match('#^/product/(\d+)#', $p, $m)) $x['label'] = $productNames[(int)$m[1]] ?? $p;
        elseif (preg_match('#^/w(/|$)#', $p)) $x['label'] = 'قايمة جهاز العروسة';
        elseif (preg_match('#^/p/returns#', $p)) $x['label'] = 'الاسترجاع والاستبدال';
        elseif (preg_match('#^/o/#', $p)) $x['label'] = 'متابعة طلب';
        return $x;
    }, $top('path', 30));
    // Product pages share names across their URL variants: merge them
    $merged = [];
    foreach ($pages as $p) $merged[$p['label']] = ($merged[$p['label']] ?? 0) + $p['count'];
    arsort($merged);
    $pages = array_slice(array_map(fn($k, $v) => ['label' => (string)$k, 'count' => $v], array_keys($merged), $merged), 0, 10);

    $placed = (int)$one("SELECT COUNT(*) FROM visits WHERE at >= ? AND country <> ''", [$since]);
    return [
        'days' => $days,
        'total' => $total,
        'unique' => $unique,
        'orders' => $orders,
        'mobileShare' => $total ? round(100 * (int)$one("SELECT COUNT(*) FROM visits WHERE at >= ? AND device <> 'desktop'", [$since]) / $total) : 0,
        'series' => $series,
        'placed' => $placed,
        'governorates' => $top('region', 27, "AND country_code = 'EG'"),
        'cities' => $top('city', 15, "AND country_code = 'EG'"),
        'countries' => $top('country', 10),
        'sources' => $label($top('source', 10), VISIT_SOURCES),
        'devices' => $label($top('device', 3), VISIT_DEVICES),
        'os' => $top('os_ver', 10),
        'brands' => $top('brand', 12),
        'models' => $top('model', 15),
        'browsers' => $top('browser', 10),
        'pages' => $pages,
    ];
}
