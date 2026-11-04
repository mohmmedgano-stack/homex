<?php
declare(strict_types=1);

class ApiError extends Exception {}

/* ============================================================
   Bootstrap: storage dir, DB, session
   ============================================================ */

/** Data dir lives next to public_html so deploys never touch it. */
function data_dir(): string {
    static $dir = null;
    if ($dir) return $dir;
    $candidates = [
        getenv('HOMEX_DATA') ?: null,
        dirname(__DIR__, 2) . '/homex_data',   // ~/domains/home-x.online/homex_data
        dirname(__DIR__) . '/../homex_data',
        __DIR__ . '/../_data',                  // fallback inside webroot (denied by .htaccess)
    ];
    foreach (array_filter($candidates) as $c) {
        if ((is_dir($c) || @mkdir($c, 0755, true)) && is_writable($c)) {
            @mkdir("$c/uploads", 0755, true);
            if (!file_exists("$c/.htaccess")) @file_put_contents("$c/.htaccess", "Require all denied\n");
            return $dir = realpath($c);
        }
    }
    throw new ApiError('مجلد البيانات مش قابل للكتابة على السيرفر', 500);
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO('sqlite:' . data_dir() . '/homex.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    migrate($pdo);
    return $pdo;
}

function migrate(PDO $db): void {
    $db->exec(<<<SQL
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        pass_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login TEXT
    );
    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id TEXT,
        brand TEXT NOT NULL DEFAULT '',
        price REAL NOT NULL DEFAULT 0,
        original_price REAL,
        cost REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        image TEXT NOT NULL DEFAULT '',
        gallery TEXT NOT NULL DEFAULT '[]',
        description TEXT NOT NULL DEFAULT '',
        features TEXT NOT NULL DEFAULT '[]',
        specs TEXT NOT NULL DEFAULT '[]',
        warranty TEXT NOT NULL DEFAULT '',
        wattage TEXT NOT NULL DEFAULT '',
        capacity TEXT NOT NULL DEFAULT '',
        is_featured INTEGER NOT NULL DEFAULT 0,
        is_new INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        rating REAL NOT NULL DEFAULT 0,
        reviews_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        alt_phone TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        payment_method TEXT NOT NULL DEFAULT 'cod',
        subtotal REAL NOT NULL,
        shipping_fee REAL NOT NULL DEFAULT 0,
        discount REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        cost_total REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER,
        name TEXT NOT NULL,
        image TEXT NOT NULL DEFAULT '',
        price REAL NOT NULL,
        cost REAL NOT NULL DEFAULT 0,
        qty INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS dealers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        governorate TEXT NOT NULL,
        area TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        whatsapp TEXT NOT NULL DEFAULT '',
        map_url TEXT NOT NULL DEFAULT '',
        logo TEXT NOT NULL DEFAULT '',
        categories TEXT NOT NULL DEFAULT '[]',
        hours TEXT NOT NULL DEFAULT '',
        featured INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        calls INTEGER NOT NULL DEFAULT 0,
        whatsapps INTEGER NOT NULL DEFAULT 0,
        maps INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_dealers_gov ON dealers(governorate);
    CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE TABLE IF NOT EXISTS banners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image TEXT NOT NULL,
        image_mobile TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        link TEXT NOT NULL DEFAULT '',
        sort INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    SQL);

    $cols = array_column($db->query('PRAGMA table_info(orders)')->fetchAll(), 'name');
    if (!in_array('payment_status', $cols, true)) $db->exec("ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'");
    if (!in_array('payment_ref', $cols, true)) $db->exec("ALTER TABLE orders ADD COLUMN payment_ref TEXT NOT NULL DEFAULT ''");
    $ccols = array_column($db->query('PRAGMA table_info(categories)')->fetchAll(), 'name');
    if (!in_array('image', $ccols, true)) $db->exec("ALTER TABLE categories ADD COLUMN image TEXT NOT NULL DEFAULT ''");

    if (!(int)$db->query('SELECT COUNT(*) FROM categories')->fetchColumn()) {
        $seed = [
            ['kettles', 'كاتيل وغلايات'], ['irons', 'مكاوي'], ['choppers', 'كبة ومفارم'],
            ['blenders', 'خلاطات ومحضرات'], ['cooking', 'قلايات وطهي'], ['others', 'أجهزة تانية'],
        ];
        $st = $db->prepare('INSERT INTO categories (id, name, sort) VALUES (?, ?, ?)');
        foreach ($seed as $i => [$id, $name]) $st->execute([$id, $name, $i]);
    }
}

function session_boot(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('homex_admin');
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 24 * 14,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

/* ============================================================
   HTTP helpers
   ============================================================ */

function ok($data): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $msg, int $code = 400): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

/** JSON body. State-changing requests must carry our header (blocks cross-site form posts). */
function body(): array {
    if (($_SERVER['HTTP_X_HOMEX'] ?? '') !== '1') throw new ApiError('طلب غير صالح', 403);
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function str($v, int $max = 2000): string { return mb_substr(trim((string)($v ?? '')), 0, $max); }
function num($v): float { return is_numeric($v) ? round((float)$v, 2) : 0.0; }

function get_setting(string $k, $default = '') {
    $st = db()->prepare('SELECT value FROM settings WHERE key = ?');
    $st->execute([$k]);
    $v = $st->fetchColumn();
    return $v === false ? $default : $v;
}

/* ============================================================
   Auth
   ============================================================ */

function current_admin(): ?array {
    session_boot();
    if (empty($_SESSION['aid'])) return null;
    $st = db()->prepare('SELECT id, name, username, role, active FROM admins WHERE id = ?');
    $st->execute([$_SESSION['aid']]);
    $a = $st->fetch();
    if (!$a || !$a['active']) { $_SESSION = []; return null; }
    return $a;
}

function need(string $role = ''): array {
    $a = current_admin();
    if (!$a) throw new ApiError('لازم تسجل دخول الأول', 401);
    if ($role === 'owner' && $a['role'] !== 'owner') throw new ApiError('الصلاحية دي للمالك بس', 403);
    return $a;
}

function me(): array {
    $hasAdmins = (int)db()->query('SELECT COUNT(*) FROM admins')->fetchColumn() > 0;
    return ['admin' => current_admin(), 'needsSetup' => !$hasAdmins];
}

function validate_password(string $p): void {
    if (mb_strlen($p) < 8) throw new ApiError('الباسورد لازم يكون 8 حروف أو أرقام على الأقل');
}

function setup_first_admin(array $b): array {
    if ((int)db()->query('SELECT COUNT(*) FROM admins')->fetchColumn() > 0) throw new ApiError('الحساب الرئيسي معمول بالفعل', 403);
    $name = str($b['name'] ?? '', 80);
    $user = str($b['username'] ?? '', 40);
    $pass = (string)($b['password'] ?? '');
    if ($name === '' || $user === '') throw new ApiError('اكتب الاسم واسم المستخدم');
    validate_password($pass);
    db()->prepare('INSERT INTO admins (name, username, pass_hash, role) VALUES (?, ?, ?, "owner")')
        ->execute([$name, $user, password_hash($pass, PASSWORD_DEFAULT)]);
    return login(['username' => $user, 'password' => $pass]);
}

function login(array $b): array {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
    $db = db();
    $db->prepare('DELETE FROM login_attempts WHERE at < ?')->execute([time() - 900]);
    $st = $db->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ?');
    $st->execute([$ip]);
    if ((int)$st->fetchColumn() >= 8) throw new ApiError('محاولات كتير غلط. استنى 15 دقيقة وجرّب تاني', 429);

    $st = $db->prepare('SELECT * FROM admins WHERE username = ?');
    $st->execute([str($b['username'] ?? '', 40)]);
    $a = $st->fetch();
    if (!$a || !$a['active'] || !password_verify((string)($b['password'] ?? ''), $a['pass_hash'])) {
        $db->prepare('INSERT INTO login_attempts (ip, at) VALUES (?, ?)')->execute([$ip, time()]);
        usleep(400000);
        throw new ApiError('اسم المستخدم أو الباسورد غلط', 401);
    }
    if (password_needs_rehash($a['pass_hash'], PASSWORD_DEFAULT)) {
        $db->prepare('UPDATE admins SET pass_hash = ? WHERE id = ?')->execute([password_hash((string)$b['password'], PASSWORD_DEFAULT), $a['id']]);
    }
    session_boot();
    session_regenerate_id(true);
    $_SESSION['aid'] = (int)$a['id'];
    $db->prepare("UPDATE admins SET last_login = datetime('now') WHERE id = ?")->execute([$a['id']]);
    return me();
}

function logout(): void {
    session_boot();
    $_SESSION = [];
    session_destroy();
}

function change_own_password(array $b): array {
    $a = need();
    $st = db()->prepare('SELECT pass_hash FROM admins WHERE id = ?');
    $st->execute([$a['id']]);
    if (!password_verify((string)($b['current'] ?? ''), (string)$st->fetchColumn())) throw new ApiError('الباسورد الحالي غلط');
    validate_password((string)($b['next'] ?? ''));
    db()->prepare('UPDATE admins SET pass_hash = ? WHERE id = ?')->execute([password_hash((string)$b['next'], PASSWORD_DEFAULT), $a['id']]);
    return ['changed' => true];
}

function list_admins(): array {
    return db()->query('SELECT id, name, username, role, active, created_at, last_login FROM admins ORDER BY id')->fetchAll();
}

function save_admin(array $b): array {
    $me = need('owner');
    $id = (int)($b['id'] ?? 0);
    $name = str($b['name'] ?? '', 80);
    $user = str($b['username'] ?? '', 40);
    $role = ($b['role'] ?? 'staff') === 'owner' ? 'owner' : 'staff';
    $active = !empty($b['active']) ? 1 : 0;
    $pass = (string)($b['password'] ?? '');
    if ($name === '' || $user === '') throw new ApiError('اكتب الاسم واسم المستخدم');
    if ($id === $me['id'] && (!$active || $role !== 'owner')) throw new ApiError('مينفعش توقف حسابك أو تشيل صلاحية المالك منه');
    try {
        if ($id) {
            db()->prepare('UPDATE admins SET name = ?, username = ?, role = ?, active = ? WHERE id = ?')->execute([$name, $user, $role, $active, $id]);
            if ($pass !== '') {
                validate_password($pass);
                db()->prepare('UPDATE admins SET pass_hash = ? WHERE id = ?')->execute([password_hash($pass, PASSWORD_DEFAULT), $id]);
            }
        } else {
            validate_password($pass);
            db()->prepare('INSERT INTO admins (name, username, pass_hash, role, active) VALUES (?, ?, ?, ?, ?)')
                ->execute([$name, $user, password_hash($pass, PASSWORD_DEFAULT), $role, $active]);
        }
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'UNIQUE')) throw new ApiError('اسم المستخدم ده مستخدم قبل كده');
        throw $e;
    }
    return list_admins();
}

function delete_admin(int $id): array {
    $me = need('owner');
    if ($id === $me['id']) throw new ApiError('مينفعش تمسح حسابك');
    db()->prepare('DELETE FROM admins WHERE id = ?')->execute([$id]);
    return list_admins();
}

/* ============================================================
   Settings
   ============================================================ */

const PUBLIC_SETTINGS = [
    'store_name' => 'HOMEX',
    'logo' => '',
    'top_bar_text' => 'شحن لكل محافظات مصر',
    'phone' => '', 'whatsapp' => '', 'email' => '', 'address' => '',
    'facebook' => '', 'instagram' => '', 'tiktok' => '',
    'shipping_fee' => '60', 'free_shipping_over' => '0',
    'pay_cod' => '1', 'pay_vodafone' => '', 'pay_instapay' => '',
    'hero_title' => '', 'hero_subtitle' => '',
    'brand_banner_desktop' => '1', 'brand_banner_mobile' => '1', 'brand_title' => '', 'brand_subtitle' => '',
    // Policy pages (empty = the default text below)
    'page_about' => '', 'page_shipping' => '', 'page_returns' => '', 'page_privacy' => '', 'page_terms' => '',
    // Tracking
    'meta_pixel_id' => '', 'tiktok_pixel_id' => '', 'ga4_id' => '',
];

/** Starting text for the policy pages. The brand edits them from the dashboard. */
const DEFAULT_PAGES = [
    'page_about' => "{store} براند مصري للأجهزة المنزلية: كاتيل، مكاوي، كبة ومفارم، خلاطات، وأجهزة المطبخ.\n\nكل أجهزتنا عليها ضمان، ولينا مراكز صيانة معتمدة في محافظات مصر، وبنشحن لكل المحافظات.\n\nكمان تقدر تشتري منتجاتنا من التجار المعتمدين القريبين منك.",
    'page_shipping' => "بنشحن لكل محافظات مصر مع شركات شحن معتمدة.\n\nمدة التوصيل: من 2 لـ 5 أيام عمل حسب المحافظة، من وقت تأكيد الطلب.\n\nمصاريف الشحن بتظهر لك في صفحة الطلب قبل ما تأكد، ومفيش أي مصاريف تانية بعد كده.\n\nبعد ما تطلب، فريقنا هيكلمك يأكد الطلب والعنوان قبل الشحن.",
    'page_returns' => "تقدر ترجّع أو تستبدل المنتج خلال 14 يوم من استلامه، بشرط يكون بحالته الأصلية وفي كرتونته ومعاه كل ملحقاته.\n\nلو في المنتج عيب صناعة، بنستبدله أو نصلحه في مراكز الصيانة المعتمدة حسب شروط الضمان المكتوبة على المنتج.\n\nلطلب استرجاع أو استبدال كلمنا على رقم خدمة العملاء أو الواتساب ومعاك رقم الطلب.\n\nالفلوس بترجع بنفس طريقة الدفع خلال 14 يوم عمل من استلام المنتج المرتجع. لو دفعت بالكارت، الفلوس بترجع على نفس الكارت.",
    'page_privacy' => "بنجمع البيانات اللي محتاجينها لتوصيل طلبك بس: الاسم، رقم الموبايل، المحافظة، والعنوان.\n\nبنستخدم البيانات دي لتأكيد الطلب وشحنه والتواصل معاك بخصوصه، ومش بنبيعها أو نشاركها مع أي حد غير شركة الشحن اللي هتوصّل طلبك.\n\nلو دفعت بالكارت، بيانات الكارت بتتكتب مباشرة في صفحة شركة الدفع المعتمدة، وإحنا مش بنشوفها ولا بنخزّنها.\n\nممكن نستخدم أدوات قياس زي بيكسل فيسبوك وجوجل أناليتكس عشان نحسّن الإعلانات وتجربة الموقع.",
    'page_terms' => "الأسعار على الموقع بالجنيه المصري.\n\nالطلب بيتأكد بعد ما فريقنا يكلمك ويراجع البيانات. لو منتج خلص من المخزن بعد طلبك، هنبلغك ونلغي الطلب أو نقترح بديل، ولو كنت دافع بالكارت الفلوس بترجعلك كاملة.\n\nالضمان بيغطي عيوب الصناعة حسب مدة الضمان المكتوبة على كل منتج، ومش بيغطي سوء الاستخدام أو الكسر.\n\nبطلبك من الموقع انت موافق على سياسة الشحن وسياسة الاسترجاع وسياسة الخصوصية.",
];

/** Card-payment keys for each gateway. Never sent to the storefront; secrets are masked in the dashboard. */
const PAYMENT_SETTINGS = [
    'pay_card_provider' => '',   // '' (off) | paymob | kashier | fawry
    'pay_card_test' => '1',      // Kashier / Fawry test (sandbox) mode
    'paymob_public_key' => '', 'paymob_secret_key' => '', 'paymob_integration_id' => '', 'paymob_hmac' => '',
    'kashier_mid' => '', 'kashier_api_key' => '',
    'notify_email' => '',        // where new-order alerts go (dashboard only)
    'fawry_merchant_code' => '', 'fawry_secure_key' => '',
];
const SECRET_SETTINGS = ['paymob_secret_key', 'paymob_hmac', 'kashier_api_key', 'fawry_secure_key'];

function payment_settings(): array {
    $out = PAYMENT_SETTINGS;
    $st = db()->query("SELECT key, value FROM settings WHERE key IN ('" . implode("','", array_keys(PAYMENT_SETTINGS)) . "')");
    foreach ($st as $row) $out[$row['key']] = $row['value'];
    return $out;
}

/** Which gateways have every key filled in. */
function gateway_ready(string $g, ?array $p = null): bool {
    $p ??= payment_settings();
    return match ($g) {
        'paymob' => $p['paymob_public_key'] !== '' && $p['paymob_secret_key'] !== '' && ctype_digit($p['paymob_integration_id']) && $p['paymob_hmac'] !== '',
        'kashier' => $p['kashier_mid'] !== '' && $p['kashier_api_key'] !== '',
        'fawry' => $p['fawry_merchant_code'] !== '' && $p['fawry_secure_key'] !== '',
        default => false,
    };
}

/** Card payment shows at checkout only when a gateway is chosen AND its keys are filled in. */
function card_ready(): bool {
    $p = payment_settings();
    return gateway_ready($p['pay_card_provider'], $p);
}

function public_settings(): array {
    $out = PUBLIC_SETTINGS;
    foreach (db()->query('SELECT key, value FROM settings') as $row) {
        if (array_key_exists($row['key'], $out)) $out[$row['key']] = $row['value'];
    }
    // The old default mentioned cash on delivery; the brand doesn't advertise it outside checkout
    if ($out['top_bar_text'] === 'توصيل لكل المحافظات والدفع عند الاستلام') $out['top_bar_text'] = PUBLIC_SETTINGS['top_bar_text'];
    $out['pay_card'] = card_ready() ? '1' : '0';
    foreach (DEFAULT_PAGES as $k => $text) {
        if (trim($out[$k]) === '') $out[$k] = str_replace('{store}', $out['store_name'] ?: 'HOMEX', $text);
    }
    return $out;
}

function all_settings(): array {
    $out = public_settings();
    foreach (payment_settings() as $k => $v) {
        $out[$k] = in_array($k, SECRET_SETTINGS, true) && $v !== '' ? '••••••' . mb_substr($v, -4) : $v;
    }
    $base = site_base();
    foreach (['paymob', 'kashier', 'fawry'] as $g) $out["{$g}_ready"] = gateway_ready($g) ? '1' : '0';
    $out['paymob_callback_url'] = "$base/api/?r=paymob-callback";
    $out['kashier_webhook_url'] = "$base/api/?r=kashier-webhook";
    $out['fawry_callback_url'] = "$base/api/?r=fawry-callback";
    return $out;
}

function save_settings(array $b): array {
    $st = db()->prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    foreach (PUBLIC_SETTINGS as $k => $_) {
        if (!array_key_exists($k, $b)) continue;
        $v = str($b[$k], str_starts_with($k, 'page_') ? 20000 : 500);
        if (in_array($k, ['meta_pixel_id', 'tiktok_pixel_id', 'ga4_id'], true) && $v !== '' && !preg_match('/^[A-Za-z0-9\-]{4,40}$/', $v)) throw new ApiError('رقم البيكسل/التتبع فيه حروف مش مسموحة');
        $st->execute([$k, $v]);
    }
    foreach (PAYMENT_SETTINGS as $k => $_) {
        if (!array_key_exists($k, $b)) continue;
        $v = trim((string)$b[$k]);
        // A masked secret coming back unchanged means "keep the saved one"
        if (in_array($k, SECRET_SETTINGS, true) && str_starts_with($v, '••••')) continue;
        if ($k === 'notify_email' && $v !== '' && !filter_var($v, FILTER_VALIDATE_EMAIL)) throw new ApiError('إيميل الإشعارات مش صحيح');
        if ($k === 'paymob_integration_id' && $v !== '' && !ctype_digit($v)) throw new ApiError('رقم الـ Integration ID في Paymob لازم يكون أرقام بس');
        if ($k === 'pay_card_provider' && !in_array($v, ['', 'paymob', 'kashier', 'fawry'], true)) $v = '';
        $st->execute([$k, mb_substr($v, 0, 1000)]);
    }
    return all_settings();
}

/* ============================================================
   Images (stored outside webroot, streamed by PHP)
   ============================================================ */

function upload_image(string $field): array {
    if (empty($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) throw new ApiError('الصورة متاخدتش، جرّب تاني');
    $f = $_FILES[$field];
    if ($f['size'] > 8 * 1024 * 1024) throw new ApiError('الصورة أكبر من 8 ميجا');
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'][$mime] ?? null;
    if (!$ext) throw new ApiError('نوع الصورة مش مدعوم. استخدم JPG أو PNG أو WEBP');
    $name = date('Ymd') . '-' . bin2hex(random_bytes(6));

    // Downscale big photos to 1400px wide when GD is available
    $saved = false;
    if (function_exists('imagecreatefromstring') && $ext !== 'gif') {
        $src = @imagecreatefromstring(file_get_contents($f['tmp_name']));
        if ($src) {
            $w = imagesx($src); $h = imagesy($src);
            $max = ($_POST['kind'] ?? '') === 'banner' ? 2400 : 1400;
            if ($w > $max) {
                $nh = (int)round($h * $max / $w);
                $dst = imagecreatetruecolor($max, $nh);
                imagealphablending($dst, false); imagesavealpha($dst, true);
                imagecopyresampled($dst, $src, 0, 0, 0, 0, $max, $nh, $w, $h);
                $src = $dst;
            }
            $path = data_dir() . "/uploads/$name.$ext";
            $saved = match ($ext) {
                'png' => imagepng($src, $path, 7),
                'webp' => imagewebp($src, $path, 82),
                default => imagejpeg($src, $path, 84),
            };
        }
    }
    if (!$saved && !move_uploaded_file($f['tmp_name'], data_dir() . "/uploads/$name.$ext")) throw new ApiError('مقدرتش أحفظ الصورة');
    return ['url' => "/api/?r=img&f=$name.$ext"];
}

function image_thumb(string $path, string $f): string {
    $dir = data_dir() . '/uploads/s';
    $thumb = "$dir/$f";
    if (is_file($thumb)) return $thumb;
    if (!function_exists('imagecreatefromstring') || str_ends_with($f, '.gif')) return $path;
    $src = @imagecreatefromstring((string)file_get_contents($path));
    if (!$src) return $path;
    $w = imagesx($src); $h = imagesy($src); $max = 560;
    if ($w <= $max && $h <= $max) return $path;
    $r = min($max / $w, $max / $h);
    $nw = max(1, (int)round($w * $r)); $nh = max(1, (int)round($h * $r));
    $dst = imagecreatetruecolor($nw, $nh);
    imagealphablending($dst, false); imagesavealpha($dst, true);
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $ok = match (pathinfo($f, PATHINFO_EXTENSION)) {
        'png' => imagepng($dst, $thumb, 7),
        'webp' => imagewebp($dst, $thumb, 80),
        default => imagejpeg($dst, $thumb, 80),
    };
    return $ok ? $thumb : $path;
}

function serve_image(string $f): void {
    if (!preg_match('/^[0-9]{8}-[a-f0-9]{12}\.(jpg|png|webp|gif)$/', $f)) { http_response_code(404); exit; }
    $path = data_dir() . "/uploads/$f";
    if (!is_file($path)) { http_response_code(404); exit; }
    // ?s=1 → small copy (max 560px) for cards and lists, made once and cached on disk
    if (!empty($_GET['s'])) $path = image_thumb($path, $f);
    $types = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'];
    header('Content-Type: ' . $types[pathinfo($f, PATHINFO_EXTENSION)]);
    header('Cache-Control: public, max-age=31536000, immutable');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

/* ============================================================
   Catalog
   ============================================================ */

function categories(bool $withCounts = false): array {
    $sql = $withCounts
        ? 'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS count FROM categories c ORDER BY sort, name'
        : 'SELECT * FROM categories ORDER BY sort, name';
    return db()->query($sql)->fetchAll();
}

function product_out(array $p, bool $admin = false): array {
    $out = [
        'id' => (string)$p['id'],
        'name' => $p['name'],
        'category' => $p['category_id'],
        'brand' => $p['brand'],
        'price' => (float)$p['price'],
        'originalPrice' => $p['original_price'] !== null ? (float)$p['original_price'] : null,
        'stock' => (int)$p['stock'],
        'image' => $p['image'],
        'gallery' => json_decode($p['gallery'], true) ?: [],
        'description' => $p['description'],
        'features' => json_decode($p['features'], true) ?: [],
        'specs' => json_decode($p['specs'], true) ?: [],
        'warranty' => $p['warranty'],
        'wattage' => $p['wattage'],
        'capacity' => $p['capacity'],
        'isFeatured' => (bool)$p['is_featured'],
        'isNewArrival' => (bool)$p['is_new'],
        'rating' => (float)$p['rating'],
        'reviewsCount' => (int)$p['reviews_count'],
        'createdAt' => $p['created_at'],
    ];
    if ($admin) { $out['cost'] = (float)$p['cost']; $out['active'] = (bool)$p['active']; }
    return $out;
}

function catalog(): array {
    $rows = db()->query('SELECT * FROM products WHERE active = 1 ORDER BY is_featured DESC, id DESC')->fetchAll();
    return ['categories' => categories(), 'products' => array_map('product_out', $rows), 'banners' => banners(false)];
}

/* ---------- Home slider banners ---------- */

function banner_out(array $b): array {
    return [
        'id' => (int)$b['id'], 'image' => $b['image'], 'imageMobile' => $b['image_mobile'],
        'title' => $b['title'], 'link' => $b['link'], 'sort' => (int)$b['sort'], 'active' => (bool)$b['active'],
    ];
}

function banners(bool $all): array {
    $sql = 'SELECT * FROM banners ' . ($all ? '' : 'WHERE active = 1 ') . 'ORDER BY sort, id';
    return array_map('banner_out', db()->query($sql)->fetchAll());
}

function banner_image(string $v): string {
    $v = str($v, 300);
    if ($v !== '' && !preg_match('~^(/api/\?r=img&f=[\w.-]+|https://[^\s"\'<>]+)$~', $v)) throw new ApiError('رابط الصورة مش صحيح');
    return $v;
}

function save_banner(array $b): array {
    $image = banner_image((string)($b['image'] ?? ''));
    if ($image === '') throw new ApiError('ارفع صورة البانر للكمبيوتر');
    $mobile = banner_image((string)($b['imageMobile'] ?? ''));
    $link = str($b['link'] ?? '', 300);
    // allowed: product:<id> · category:<id> · /path · https://...
    if ($link !== '' && !preg_match('~^(product:\d+|category:[\w-]+|/[^\s"\'<>]*|https://[^\s"\'<>]+)$~', $link)) throw new ApiError('رابط البانر مش صحيح');
    $vals = [$image, $mobile, str($b['title'] ?? '', 120), $link, !array_key_exists('active', $b) || !empty($b['active']) ? 1 : 0];
    $id = (int)($b['id'] ?? 0);
    if ($id) {
        db()->prepare('UPDATE banners SET image=?, image_mobile=?, title=?, link=?, active=? WHERE id=?')->execute([...$vals, $id]);
    } else {
        $sort = (int)db()->query('SELECT COALESCE(MAX(sort), -1) + 1 FROM banners')->fetchColumn();
        db()->prepare('INSERT INTO banners (image, image_mobile, title, link, active, sort) VALUES (?,?,?,?,?,?)')->execute([...$vals, $sort]);
    }
    return banners(true);
}

function reorder_banners(array $b): array {
    $st = db()->prepare('UPDATE banners SET sort = ? WHERE id = ?');
    foreach (array_values(is_array($b['ids'] ?? null) ? $b['ids'] : []) as $i => $id) $st->execute([$i, (int)$id]);
    return banners(true);
}

function delete_banner(int $id): array {
    db()->prepare('DELETE FROM banners WHERE id = ?')->execute([$id]);
    return banners(true);
}

function admin_products(): array {
    $rows = db()->query('SELECT * FROM products ORDER BY id DESC')->fetchAll();
    return array_map(fn($p) => product_out($p, true), $rows);
}

function clean_list($v, int $max = 30): array {
    if (!is_array($v)) return [];
    return array_values(array_slice(array_filter(array_map(fn($x) => str($x, 300), $v), fn($x) => $x !== ''), 0, $max));
}

function save_product(array $b): array {
    $name = str($b['name'] ?? '', 200);
    if ($name === '') throw new ApiError('اكتب اسم المنتج');
    $price = num($b['price'] ?? 0);
    if ($price <= 0) throw new ApiError('اكتب سعر البيع');
    $orig = isset($b['originalPrice']) && $b['originalPrice'] !== '' && $b['originalPrice'] !== null ? num($b['originalPrice']) : null;
    if ($orig !== null && $orig <= $price) $orig = null; // only keep a real "before" price

    $specs = [];
    foreach ((array)($b['specs'] ?? []) as $s) {
        $l = str($s['label'] ?? '', 80); $v = str($s['value'] ?? '', 200);
        if ($l !== '' && $v !== '') $specs[] = ['label' => $l, 'value' => $v];
    }
    $gallery = clean_list($b['gallery'] ?? [], 12);
    $image = str($b['image'] ?? '', 500) ?: ($gallery[0] ?? '');

    $vals = [
        $name, str($b['category'] ?? '', 40) ?: null, str($b['brand'] ?? '', 80),
        $price, $orig, num($b['cost'] ?? 0), max(0, (int)($b['stock'] ?? 0)),
        $image, json_encode($gallery, JSON_UNESCAPED_UNICODE), str($b['description'] ?? '', 5000),
        json_encode(clean_list($b['features'] ?? []), JSON_UNESCAPED_UNICODE), json_encode($specs, JSON_UNESCAPED_UNICODE),
        str($b['warranty'] ?? '', 120), str($b['wattage'] ?? '', 40), str($b['capacity'] ?? '', 40),
        !empty($b['isFeatured']) ? 1 : 0, !empty($b['isNewArrival']) ? 1 : 0,
        array_key_exists('active', $b) ? (!empty($b['active']) ? 1 : 0) : 1,
        min(5, max(0, num($b['rating'] ?? 0))), max(0, (int)($b['reviewsCount'] ?? 0)),
    ];
    $id = (int)($b['id'] ?? 0);
    if ($id) {
        $vals[] = $id;
        db()->prepare("UPDATE products SET name=?, category_id=?, brand=?, price=?, original_price=?, cost=?, stock=?, image=?, gallery=?, description=?, features=?, specs=?, warranty=?, wattage=?, capacity=?, is_featured=?, is_new=?, active=?, rating=?, reviews_count=?, updated_at=datetime('now') WHERE id=?")->execute($vals);
    } else {
        db()->prepare('INSERT INTO products (name, category_id, brand, price, original_price, cost, stock, image, gallery, description, features, specs, warranty, wattage, capacity, is_featured, is_new, active, rating, reviews_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($vals);
    }
    return admin_products();
}

function delete_row(string $table, int $id): bool {
    if (!in_array($table, ['products', 'expenses'], true)) throw new ApiError('غير مسموح', 403);
    db()->prepare("DELETE FROM $table WHERE id = ?")->execute([$id]);
    return true;
}

function save_category(array $b): array {
    $name = str($b['name'] ?? '', 80);
    if ($name === '') throw new ApiError('اكتب اسم القسم');
    $id = str($b['id'] ?? '', 40);
    $sort = (int)($b['sort'] ?? 0);
    $image = str($b['image'] ?? '', 300);
    if ($image !== '' && !preg_match('~^(/api/\?r=img&f=[\w.-]+|https://[^\s"\'<>]+)$~', $image)) throw new ApiError('رابط الصورة مش صحيح');
    $st = db()->prepare('SELECT 1 FROM categories WHERE id = ?');
    $st->execute([$id]);
    if ($id !== '' && $st->fetchColumn()) {
        db()->prepare('UPDATE categories SET name = ?, sort = ?, image = ? WHERE id = ?')->execute([$name, $sort, $image, $id]);
    } else {
        $id = 'c' . substr(bin2hex(random_bytes(4)), 0, 7);
        db()->prepare('INSERT INTO categories (id, name, sort, image) VALUES (?, ?, ?, ?)')->execute([$id, $name, $sort, $image]);
    }
    return categories(true);
}

function reorder_categories(array $b): array {
    $ids = is_array($b['ids'] ?? null) ? $b['ids'] : [];
    $st = db()->prepare('UPDATE categories SET sort = ? WHERE id = ?');
    foreach (array_values($ids) as $i => $id) $st->execute([$i, str((string)$id, 40)]);
    return categories(true);
}

function delete_category(string $id): array {
    $st = db()->prepare('SELECT COUNT(*) FROM products WHERE category_id = ?');
    $st->execute([$id]);
    if ((int)$st->fetchColumn() > 0) throw new ApiError('القسم ده فيه منتجات. انقلها لقسم تاني الأول');
    db()->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
    return categories(true);
}

/* ============================================================
   Orders — prices & cost always taken from the DB, never the browser
   ============================================================ */

const GOVERNORATES = [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الشرقية', 'الدقهلية', 'الغربية', 'المنوفية',
    'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'الفيوم', 'بني سويف',
    'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد',
    'مطروح', 'شمال سيناء', 'جنوب سيناء',
];

/** Normalises an Egyptian mobile number to 01XXXXXXXXX, or null if it isn't one. */
function egypt_mobile(string $v): ?string {
    $v = strtr($v, ['٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
    $v = preg_replace('/[^0-9]/', '', $v);
    if (str_starts_with($v, '20') && strlen($v) === 12) $v = '0' . substr($v, 2);
    return preg_match('/^01[0125][0-9]{8}$/', $v) ? $v : null;
}

const ORDER_STATUSES = ['awaiting_payment', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];

function create_order(array $b): array {
    $c = (array)($b['customer'] ?? []);
    $name = preg_replace('/\s+/u', ' ', str($c['name'] ?? '', 100));
    $phone = egypt_mobile((string)($c['phone'] ?? ''));
    $alt = trim((string)($c['altPhone'] ?? '')) === '' ? '' : egypt_mobile((string)$c['altPhone']);
    $address = str($c['address'] ?? '', 500);
    $city = str($c['city'] ?? '', 60);
    $words = array_filter(explode(' ', $name), fn($w) => mb_strlen($w) >= 2);
    if (count($words) < 3) throw new ApiError('اكتب الاسم ثلاثي');
    if ($phone === null) throw new ApiError('رقم الموبايل لازم يكون رقم مصري صحيح من 11 رقم');
    if ($alt === null) throw new ApiError('رقم الموبايل الإضافي مش صحيح');
    if (!in_array($city, GOVERNORATES, true)) throw new ApiError('اختار المحافظة');
    if (mb_strlen($address) < 10) throw new ApiError('اكتب العنوان بالتفصيل');

    $items = (array)($b['items'] ?? []);
    if (!$items || count($items) > 50) throw new ApiError('السلة فاضية');

    $db = db();
    $db->beginTransaction();
    try {
        $sub = 0; $cost = 0; $lines = [];
        $get = $db->prepare('SELECT * FROM products WHERE id = ? AND active = 1');
        foreach ($items as $it) {
            $qty = max(1, min(99, (int)($it['quantity'] ?? 1)));
            $get->execute([(int)($it['productId'] ?? 0)]);
            $p = $get->fetch();
            if (!$p) throw new ApiError('في منتج في السلة مبقاش متاح، حدّث الصفحة');
            if ((int)$p['stock'] < $qty) throw new ApiError("الكمية المتاحة من «{$p['name']}» هي {$p['stock']} بس");
            $sub += $p['price'] * $qty;
            $cost += $p['cost'] * $qty;
            $lines[] = [$p, $qty];
        }
        $fee = (float)get_setting('shipping_fee', '60');
        $freeOver = (float)get_setting('free_shipping_over', '0');
        if ($freeOver > 0 && $sub >= $freeOver) $fee = 0;
        $total = $sub + $fee;

        $pm = (string)($b['paymentMethod'] ?? 'cod');
        if (!in_array($pm, ['cod', 'vodafone', 'instapay', 'card'], true)) $pm = 'cod';
        if ($pm === 'card' && !card_ready()) throw new ApiError('الدفع بالفيزا مش متاح دلوقتي، اختار طريقة دفع تانية');
        if ($pm === 'cod' && get_setting('pay_cod', '1') === '0') throw new ApiError('اختار طريقة دفع تانية');
        $code = 'HX' . date('ymd') . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
        $db->prepare('INSERT INTO orders (code, customer_name, phone, alt_phone, city, address, notes, payment_method, subtotal, shipping_fee, total, cost_total, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$code, $name, $phone, $alt, $city, $address, str($c['notes'] ?? '', 500), $pm, $sub, $fee, $total, $cost, $pm === 'card' ? 'awaiting_payment' : 'pending']);
        $oid = (int)$db->lastInsertId();
        $ins = $db->prepare('INSERT INTO order_items (order_id, product_id, name, image, price, cost, qty) VALUES (?,?,?,?,?,?,?)');
        $dec = $db->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
        foreach ($lines as [$p, $qty]) {
            $ins->execute([$oid, $p['id'], $p['name'], $p['image'], $p['price'], $p['cost'], $qty]);
            $dec->execute([$qty, $p['id']]);
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
    $res = ['code' => $code, 'subtotal' => $sub, 'shippingFee' => $fee, 'total' => $total];
    if ($pm !== 'card') notify_new_order($code);
    if ($pm === 'card') {
        try {
            $args = [$oid, $code, $name, $phone, $city, $address, $lines, $fee, $total];
            $res['payUrl'] = match (payment_settings()['pay_card_provider']) {
                'paymob' => paymob_start(...$args),
                'kashier' => kashier_start(...$args),
                'fawry' => fawry_start(...$args),
            };
        } catch (Throwable $e) {
            error_log('[homex card] ' . $e->getMessage());
            set_order_status(['id' => $oid, 'status' => 'cancelled']); // gives the stock back
            throw new ApiError('حصلت مشكلة في بوابة الدفع. جرّب تاني أو اختار الدفع عند الاستلام');
        }
    }
    return $res;
}

function admin_orders(array $q): array {
    $where = []; $args = [];
    if (!empty($q['status']) && in_array($q['status'], ORDER_STATUSES, true)) { $where[] = 'status = ?'; $args[] = $q['status']; }
    if (!empty($q['q'])) { $where[] = '(code LIKE ? OR customer_name LIKE ? OR phone LIKE ?)'; $like = '%' . $q['q'] . '%'; array_push($args, $like, $like, $like); }
    $sql = 'SELECT * FROM orders' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY id DESC LIMIT 500';
    $st = db()->prepare($sql);
    $st->execute($args);
    $orders = $st->fetchAll();
    if ($orders) {
        $ids = implode(',', array_map(fn($o) => (int)$o['id'], $orders));
        $items = [];
        foreach (db()->query("SELECT * FROM order_items WHERE order_id IN ($ids)") as $it) $items[$it['order_id']][] = $it;
        foreach ($orders as &$o) $o['items'] = $items[$o['id']] ?? [];
    }
    $counts = [];
    foreach (db()->query('SELECT status, COUNT(*) n FROM orders GROUP BY status') as $r) $counts[$r['status']] = (int)$r['n'];
    return ['orders' => $orders, 'counts' => $counts];
}

function set_order_status(array $b): array {
    $id = (int)($b['id'] ?? 0);
    $status = (string)($b['status'] ?? '');
    if (!in_array($status, ORDER_STATUSES, true)) throw new ApiError('حالة غير معروفة');
    $db = db();
    $st = $db->prepare('SELECT status FROM orders WHERE id = ?');
    $st->execute([$id]);
    $old = $st->fetchColumn();
    if ($old === false) throw new ApiError('الطلب مش موجود', 404);

    // Return stock when an order is cancelled/returned, take it again if reopened
    $wasOut = !in_array($old, ['cancelled', 'returned'], true);
    $nowOut = !in_array($status, ['cancelled', 'returned'], true);
    $db->beginTransaction();
    if ($wasOut !== $nowOut) {
        $sign = $nowOut ? '-' : '+';
        $db->prepare("UPDATE products SET stock = MAX(0, stock $sign (SELECT COALESCE(SUM(qty),0) FROM order_items WHERE order_id = ? AND product_id = products.id)) WHERE id IN (SELECT product_id FROM order_items WHERE order_id = ?)")->execute([$id, $id]);
    }
    $db->prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?")->execute([$status, $id]);
    $db->commit();
    return ['id' => $id, 'status' => $status];
}

/* ============================================================
   Accounting
   ============================================================ */

function date_range(?string $from, ?string $to): array {
    $re = '/^\d{4}-\d{2}-\d{2}$/';
    $from = ($from && preg_match($re, $from)) ? $from : date('Y-m-01');
    $to = ($to && preg_match($re, $to)) ? $to : date('Y-m-d');
    return [$from, $to];
}

function expenses(?string $from, ?string $to): array {
    [$from, $to] = date_range($from, $to);
    $st = db()->prepare('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC, id DESC');
    $st->execute([$from, $to]);
    return $st->fetchAll();
}

function save_expense(array $b): array {
    $amount = num($b['amount'] ?? 0);
    if ($amount <= 0) throw new ApiError('اكتب المبلغ');
    $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($b['date'] ?? '')) ? $b['date'] : date('Y-m-d');
    $cat = str($b['category'] ?? '', 60) ?: 'أخرى';
    $id = (int)($b['id'] ?? 0);
    if ($id) db()->prepare('UPDATE expenses SET date=?, category=?, amount=?, note=? WHERE id=?')->execute([$date, $cat, $amount, str($b['note'] ?? '', 300), $id]);
    else db()->prepare('INSERT INTO expenses (date, category, amount, note) VALUES (?,?,?,?)')->execute([$date, $cat, $amount, str($b['note'] ?? '', 300)]);
    return ['saved' => true];
}

function summary(?string $from, ?string $to): array {
    [$from, $to] = date_range($from, $to);
    $db = db();
    $range = "date(created_at, 'localtime') BETWEEN ? AND ?";

    $st = $db->prepare("SELECT status, COUNT(*) n, COALESCE(SUM(total),0) total, COALESCE(SUM(subtotal),0) sub, COALESCE(SUM(cost_total),0) cost, COALESCE(SUM(shipping_fee),0) ship FROM orders WHERE $range GROUP BY status");
    $st->execute([$from, $to]);
    $by = [];
    foreach ($st as $r) $by[$r['status']] = $r;

    $delivered = $by['delivered'] ?? ['n' => 0, 'total' => 0, 'sub' => 0, 'cost' => 0, 'ship' => 0];
    $pipeline = 0; $pipelineCount = 0;
    foreach (['pending', 'confirmed', 'shipped'] as $s) { $pipeline += (float)($by[$s]['total'] ?? 0); $pipelineCount += (int)($by[$s]['n'] ?? 0); }

    $st = $db->prepare('SELECT category, SUM(amount) amount FROM expenses WHERE date BETWEEN ? AND ? GROUP BY category ORDER BY amount DESC');
    $st->execute([$from, $to]);
    $expByCat = $st->fetchAll();
    $expTotal = array_sum(array_map(fn($e) => (float)$e['amount'], $expByCat));

    $revenue = (float)$delivered['sub'];         // product sales
    $cogs = (float)$delivered['cost'];           // cost of goods sold
    $shipping = (float)$delivered['ship'];       // shipping collected from customers
    $gross = $revenue - $cogs;
    $net = $gross + $shipping - $expTotal;

    // Daily series for the chart
    $st = $db->prepare("SELECT date(created_at, 'localtime') d, COUNT(*) n, SUM(CASE WHEN status='delivered' THEN subtotal ELSE 0 END) rev, SUM(CASE WHEN status='delivered' THEN subtotal - cost_total ELSE 0 END) profit FROM orders WHERE $range GROUP BY d ORDER BY d");
    $st->execute([$from, $to]);
    $days = $st->fetchAll();

    $st = $db->prepare("SELECT oi.name, SUM(oi.qty) qty, SUM(oi.price*oi.qty) revenue, SUM((oi.price-oi.cost)*oi.qty) profit FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status = 'delivered' AND date(o.created_at, 'localtime') BETWEEN ? AND ? GROUP BY oi.product_id, oi.name ORDER BY qty DESC LIMIT 8");
    $st->execute([$from, $to]);
    $top = $st->fetchAll();

    $stock = $db->query('SELECT COALESCE(SUM(cost*stock),0) cost, COALESCE(SUM(price*stock),0) value, SUM(CASE WHEN stock<=5 AND active=1 THEN 1 ELSE 0 END) low FROM products')->fetch();
    $allOrders = array_sum(array_map(fn($r) => (int)$r['n'], $by));

    return [
        'from' => $from, 'to' => $to,
        'orders' => ['total' => $allOrders, 'byStatus' => array_map(fn($r) => (int)$r['n'], $by), 'pipelineValue' => $pipeline, 'pipelineCount' => $pipelineCount],
        'revenue' => $revenue, 'cogs' => $cogs, 'shipping' => $shipping,
        'grossProfit' => $gross, 'expenses' => $expTotal, 'netProfit' => $net,
        'margin' => $revenue > 0 ? round($gross / $revenue * 100, 1) : 0,
        'avgOrder' => (int)$delivered['n'] > 0 ? round((float)$delivered['total'] / (int)$delivered['n'], 2) : 0,
        'deliveredCount' => (int)$delivered['n'],
        'expensesByCategory' => $expByCat,
        'days' => $days, 'topProducts' => $top,
        'stock' => ['cost' => (float)$stock['cost'], 'value' => (float)$stock['value'], 'low' => (int)$stock['low']],
    ];
}


/* ============================================================
   Authorised dealers (shops that stock HOMEX near the customer)
   ============================================================ */

function dealer_out(array $d, bool $admin = false): array {
    $o = [
        'id' => (int)$d['id'], 'name' => $d['name'], 'governorate' => $d['governorate'], 'area' => $d['area'],
        'address' => $d['address'], 'phone' => $d['phone'], 'whatsapp' => $d['whatsapp'], 'mapUrl' => $d['map_url'],
        'logo' => $d['logo'], 'categories' => json_decode($d['categories'], true) ?: [], 'hours' => $d['hours'],
        'featured' => (bool)$d['featured'],
    ];
    if ($admin) $o += ['active' => (bool)$d['active'], 'calls' => (int)$d['calls'], 'whatsapps' => (int)$d['whatsapps'], 'maps' => (int)$d['maps'], 'createdAt' => $d['created_at']];
    return $o;
}

function dealers_public(): array {
    $rows = db()->query('SELECT * FROM dealers WHERE active = 1 ORDER BY featured DESC, governorate, name')->fetchAll();
    return array_map('dealer_out', $rows);
}

function dealers_admin(): array {
    $rows = db()->query('SELECT * FROM dealers ORDER BY governorate, name')->fetchAll();
    return array_map(fn($d) => dealer_out($d, true), $rows);
}

function save_dealer(array $b): array {
    $name = str($b['name'] ?? '', 120);
    $gov = str($b['governorate'] ?? '', 60);
    if ($name === '') throw new ApiError('اكتب اسم التاجر أو المحل');
    if (!in_array($gov, GOVERNORATES, true)) throw new ApiError('اختار المحافظة');
    $phone = trim((string)($b['phone'] ?? ''));
    $wa = trim((string)($b['whatsapp'] ?? ''));
    if ($phone === '' && $wa === '') throw new ApiError('اكتب رقم تليفون أو واتساب للتاجر');
    $map = str($b['mapUrl'] ?? '', 500);
    if ($map !== '' && !preg_match('#^https://#i', $map)) throw new ApiError('لينك الخريطة لازم يبدأ بـ https://');
    $cats = clean_list($b['categories'] ?? [], 50);
    $vals = [
        $name, $gov, str($b['area'] ?? '', 80), str($b['address'] ?? '', 300),
        preg_replace('/[^0-9+]/', '', $phone), preg_replace('/[^0-9+]/', '', $wa), $map,
        str($b['logo'] ?? '', 500), json_encode($cats, JSON_UNESCAPED_UNICODE), str($b['hours'] ?? '', 120),
        !empty($b['featured']) ? 1 : 0, array_key_exists('active', $b) ? (!empty($b['active']) ? 1 : 0) : 1,
    ];
    $id = (int)($b['id'] ?? 0);
    if ($id) {
        $vals[] = $id;
        db()->prepare('UPDATE dealers SET name=?, governorate=?, area=?, address=?, phone=?, whatsapp=?, map_url=?, logo=?, categories=?, hours=?, featured=?, active=? WHERE id=?')->execute($vals);
    } else {
        db()->prepare('INSERT INTO dealers (name, governorate, area, address, phone, whatsapp, map_url, logo, categories, hours, featured, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')->execute($vals);
    }
    return dealers_admin();
}

function delete_dealer(int $id): array {
    db()->prepare('DELETE FROM dealers WHERE id = ?')->execute([$id]);
    return dealers_admin();
}

/** Counts a customer tapping call / WhatsApp / map on a dealer card — proof of value for the dealer. */
function dealer_click(array $b): bool {
    $col = ['call' => 'calls', 'whatsapp' => 'whatsapps', 'map' => 'maps'][$b['kind'] ?? ''] ?? null;
    if (!$col) return false;
    db()->prepare("UPDATE dealers SET $col = $col + 1 WHERE id = ? AND active = 1")->execute([(int)($b['id'] ?? 0)]);
    return true;
}


/* ============================================================
   Card payments — Paymob (Egypt) Intention API + Unified Checkout
   ============================================================ */

function site_base(): string {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $host = preg_replace('/[^a-z0-9.\-:]/i', '', (string)($_SERVER['HTTP_HOST'] ?? 'home-x.online'));
    return ($https ? 'https' : 'http') . "://$host";
}

function http_json(string $method, string $url, array $headers, ?array $body = null): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json', 'Accept: application/json'], $headers),
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    $data = json_decode((string)$raw, true);
    if ($raw === false || $code >= 400 || !is_array($data)) throw new RuntimeException("HTTP $code $err " . mb_substr((string)$raw, 0, 300));
    return $data;
}

/** Creates a Paymob payment intention for the order and returns the hosted checkout URL. */
function paymob_start(int $oid, string $code, string $name, string $phone, string $city, string $address, array $lines, float $fee, float $total): string {
    $p = payment_settings();
    $cents = fn(float $v) => (int)round($v * 100);
    $items = [];
    foreach ($lines as [$prod, $qty]) {
        $items[] = ['name' => mb_substr($prod['name'], 0, 50), 'amount' => $cents((float)$prod['price']), 'description' => mb_substr($prod['name'], 0, 255), 'quantity' => $qty];
    }
    if ($fee > 0) $items[] = ['name' => 'الشحن', 'amount' => $cents($fee), 'description' => 'مصاريف الشحن', 'quantity' => 1];
    $parts = explode(' ', $name);
    $first = array_shift($parts);
    $base = site_base();
    $email = filter_var(get_setting('email', ''), FILTER_VALIDATE_EMAIL) ?: 'orders@' . preg_replace('/:\d+$/', '', parse_url($base, PHP_URL_HOST) ?: 'home-x.online');

    $res = http_json('POST', 'https://accept.paymob.com/v1/intention/', ['Authorization: Token ' . $p['paymob_secret_key']], [
        'amount' => $cents($total),
        'currency' => 'EGP',
        'payment_methods' => [(int)$p['paymob_integration_id']],
        'items' => $items,
        'billing_data' => [
            'first_name' => $first, 'last_name' => implode(' ', $parts) ?: $first, 'phone_number' => '+2' . $phone, 'email' => $email,
            'street' => mb_substr($address, 0, 200), 'building' => 'NA', 'floor' => 'NA', 'apartment' => 'NA',
            'city' => $city, 'state' => $city, 'country' => 'EG',
        ],
        'special_reference' => $code,
        'notification_url' => "$base/api/?r=paymob-callback",
        'redirection_url' => "$base/api/?r=paymob-return",
    ]);
    $secret = (string)($res['client_secret'] ?? '');
    if ($secret === '') throw new RuntimeException('no client_secret in Paymob response');
    $ref = (string)($res['intention_order_id'] ?? $res['id'] ?? '');
    db()->prepare('UPDATE orders SET payment_ref = ? WHERE id = ?')->execute([$ref, $oid]);
    return 'https://accept.paymob.com/unifiedcheckout/?publicKey=' . rawurlencode($p['paymob_public_key']) . '&clientSecret=' . rawurlencode($secret);
}

/** Paymob's documented HMAC-SHA512 over the transaction fields, in this exact order. */
function paymob_hmac_valid(array $f, string $given): bool {
    $keys = ['amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id', 'integration_id',
        'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment', 'is_voided', 'order', 'owner',
        'pending', 'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success'];
    $str = '';
    foreach ($keys as $k) {
        $v = $f[$k] ?? '';
        $str .= is_bool($v) ? ($v ? 'true' : 'false') : (string)$v;
    }
    $secret = payment_settings()['paymob_hmac'];
    return $secret !== '' && $given !== '' && hash_equals(hash_hmac('sha512', $str, $secret), strtolower($given));
}

/** Marks a card order paid (→ new order to confirm) or failed (→ cancelled, stock back). Safe to call twice. */
function card_settle(string $code, string $gatewayOrder, bool $success, int $amountCents, string $txn): ?string {
    $st = db()->prepare("SELECT * FROM orders WHERE payment_method = 'card' AND (code = ? OR (payment_ref <> '' AND payment_ref = ?))");
    $st->execute([$code, $gatewayOrder]);
    $o = $st->fetch();
    if (!$o) return null;
    if ($o['payment_status'] === 'paid') return $o['code'];
    if ($success && $amountCents === (int)round($o['total'] * 100)) {
        db()->prepare("UPDATE orders SET payment_status = 'paid', payment_ref = ?, status = 'pending', updated_at = datetime('now') WHERE id = ?")->execute(["txn:$txn", $o['id']]);
        notify_new_order($o['code']);
    } elseif ($o['status'] === 'awaiting_payment') {
        db()->prepare("UPDATE orders SET payment_status = 'failed' WHERE id = ?")->execute([$o['id']]);
        set_order_status(['id' => (int)$o['id'], 'status' => 'cancelled']);
    }
    return $o['code'];
}

/** Server-to-server notification (POST JSON, hmac in the query string). */
function paymob_callback(): array {
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    $obj = $body['obj'] ?? null;
    if (($body['type'] ?? '') !== 'TRANSACTION' || !is_array($obj)) return ['ignored' => true];
    $f = [];
    foreach ($obj as $k => $v) if (!is_array($v)) $f[$k] = $v;
    $f['order'] = $obj['order']['id'] ?? '';
    foreach (['pan', 'sub_type', 'type'] as $k) $f["source_data.$k"] = $obj['source_data'][$k] ?? '';
    if (!paymob_hmac_valid($f, (string)($_GET['hmac'] ?? ''))) throw new ApiError('invalid signature', 403);
    $code = card_settle((string)($obj['order']['merchant_order_id'] ?? ''), (string)$f['order'], $obj['success'] === true && $obj['pending'] !== true, (int)$obj['amount_cents'], (string)$obj['id']);
    return ['received' => true, 'order' => $code];
}

/** The customer's browser coming back from the payment page (GET, same fields + hmac). */
function paymob_return(): void {
    // Read the raw query: PHP would turn "source_data.pan" into "source_data_pan"
    $f = [];
    foreach (explode('&', (string)($_SERVER['QUERY_STRING'] ?? '')) as $pair) {
        if ($pair === '') continue;
        [$k, $v] = array_pad(explode('=', $pair, 2), 2, '');
        $f[urldecode($k)] = urldecode($v);
    }
    $ok = paymob_hmac_valid($f, (string)($f['hmac'] ?? ''));
    $code = $ok ? card_settle((string)($f['merchant_order_id'] ?? ''), (string)($f['order'] ?? ''), ($f['success'] ?? '') === 'true' && ($f['pending'] ?? '') !== 'true', (int)($f['amount_cents'] ?? 0), (string)($f['id'] ?? '')) : null;
    back_to_store($ok && ($f['success'] ?? '') === 'true', $code);
}


/** GET request returning decoded JSON (or the raw string when not JSON). */
function http_get_json(string $url) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($raw === false || $code >= 400) throw new RuntimeException("HTTP $code");
    $d = json_decode((string)$raw, true);
    return $d ?? $raw;
}

/** Raw query string as an ordered map (keeps dots in names, unlike $_GET). */
function raw_query(): array {
    $f = [];
    foreach (explode('&', (string)($_SERVER['QUERY_STRING'] ?? '')) as $pair) {
        if ($pair === '') continue;
        [$k, $v] = array_pad(explode('=', $pair, 2), 2, '');
        $f[urldecode($k)] = urldecode($v);
    }
    return $f;
}

/** Sends the customer back to the store; "success" only if OUR database says the order is paid. */
function back_to_store(bool $paid, ?string $code): void {
    $really = false;
    if ($code) {
        $st = db()->prepare("SELECT payment_status FROM orders WHERE code = ?");
        $st->execute([$code]);
        $really = $st->fetchColumn() === 'paid';
    }
    header('Location: /?pay=' . ($really ? 'success' : 'failed') . ($code ? '&order=' . rawurlencode($code) : ''), true, 302);
    exit;
}

/* ---------------- Kashier (Hosted Payment Page) ---------------- */

function kashier_amount(float $v): string { return number_format($v, 2, '.', ''); }

function kashier_start(int $oid, string $code, string $name, string $phone, string $city, string $address, array $lines, float $fee, float $total): string {
    $p = payment_settings();
    $amount = kashier_amount($total);
    $path = "/?payment={$p['kashier_mid']}.$code.$amount.EGP";
    $hash = hash_hmac('sha256', $path, $p['kashier_api_key']);
    $base = site_base();
    db()->prepare('UPDATE orders SET payment_ref = ? WHERE id = ?')->execute([$code, $oid]);
    return 'https://checkout.kashier.io/?' . http_build_query([
        'merchantId' => $p['kashier_mid'], 'orderId' => $code, 'amount' => $amount, 'currency' => 'EGP', 'hash' => $hash,
        'mode' => $p['pay_card_test'] === '1' ? 'test' : 'live',
        'merchantRedirect' => "$base/api/?r=kashier-return", 'serverWebhook' => "$base/api/?r=kashier-webhook",
        'redirectMethod' => 'get', 'allowedMethods' => 'card,wallet', 'display' => 'ar', 'failureRedirect' => 'true',
    ]);
}

/** Kashier signs the redirect: HMAC-SHA256 of the query (without signature & mode) with the API key. */
function kashier_return(): void {
    $f = raw_query();
    $sig = (string)($f['signature'] ?? '');
    $parts = [];
    foreach ($f as $k => $v) if ($k !== 'signature' && $k !== 'mode' && $k !== 'r') $parts[] = "$k=$v";
    $ok = $sig !== '' && hash_equals(hash_hmac('sha256', implode('&', $parts), payment_settings()['kashier_api_key']), strtolower($sig));
    $paid = $ok && strtoupper((string)($f['paymentStatus'] ?? '')) === 'SUCCESS';
    $code = $ok ? card_settle((string)($f['merchantOrderId'] ?? ''), '', $paid, (int)round(((float)($f['amount'] ?? 0)) * 100), (string)($f['transactionId'] ?? '')) : null;
    back_to_store($paid, $code);
}

/** Server webhook: header x-kashier-signature = HMAC-SHA256 of data[signatureKeys] (sorted) with the API key. */
function kashier_webhook(): array {
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    $d = $body['data'] ?? null;
    if (!is_array($d)) return ['ignored' => true];
    $keys = (array)($d['signatureKeys'] ?? []);
    sort($keys);
    $parts = [];
    foreach ($keys as $k) $parts[] = $k . '=' . rawurlencode(is_scalar($d[$k] ?? '') ? (string)($d[$k] ?? '') : json_encode($d[$k]));
    $given = strtolower((string)($_SERVER['HTTP_X_KASHIER_SIGNATURE'] ?? ''));
    if ($given === '' || !hash_equals(hash_hmac('sha256', implode('&', $parts), payment_settings()['kashier_api_key']), $given)) throw new ApiError('invalid signature', 403);
    if (($body['event'] ?? '') !== 'pay') return ['ignored' => true];
    $paid = strtoupper((string)($d['status'] ?? '')) === 'SUCCESS';
    $code = card_settle((string)($d['merchantOrderId'] ?? ''), '', $paid, (int)round(((float)($d['amount'] ?? 0)) * 100), (string)($d['transactionId'] ?? ''));
    return ['received' => true, 'order' => $code];
}

/* ---------------- Fawry (FawryPay Express Checkout link) ---------------- */

function fawry_host(): string {
    return payment_settings()['pay_card_test'] === '1' ? 'https://atfawry.fawrystaging.com' : 'https://atfawry.com';
}

function fawry_start(int $oid, string $code, string $name, string $phone, string $city, string $address, array $lines, float $fee, float $total): string {
    $p = payment_settings();
    $base = site_base();
    $return = "$base/api/?r=fawry-return";
    $money = fn(float $v) => number_format($v, 2, '.', '');
    $items = [];
    foreach ($lines as [$prod, $qty]) $items[] = ['itemId' => 'P' . $prod['id'], 'description' => mb_substr($prod['name'], 0, 100), 'price' => $money((float)$prod['price']), 'quantity' => $qty];
    if ($fee > 0) $items[] = ['itemId' => 'SHIPPING', 'description' => 'مصاريف الشحن', 'price' => $money($fee), 'quantity' => 1];
    usort($items, fn($a, $b) => strcmp($a['itemId'], $b['itemId']));
    $sig = $p['fawry_merchant_code'] . $code . '' . $return;
    foreach ($items as $it) $sig .= $it['itemId'] . $it['quantity'] . $it['price'];
    $sig = hash('sha256', $sig . $p['fawry_secure_key']);
    $email = filter_var(get_setting('email', ''), FILTER_VALIDATE_EMAIL) ?: 'orders@' . (parse_url($base, PHP_URL_HOST) ?: 'home-x.online');

    $ch = curl_init(fawry_host() . '/fawrypay-api/api/payments/init');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode([
            'merchantCode' => $p['fawry_merchant_code'], 'merchantRefNum' => $code,
            'customerMobile' => $phone, 'customerEmail' => $email, 'customerName' => $name, 'customerProfileId' => '',
            'language' => 'ar-eg', 'chargeItems' => $items, 'returnUrl' => $return, 'authCaptureModePayment' => false,
            'signature' => $sig,
        ], JSON_UNESCAPED_UNICODE),
    ]);
    $raw = (string)curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $url = trim($raw, " \"\n\r\t");
    if ($http >= 400 || !preg_match('#^https://#', $url)) throw new RuntimeException("Fawry init failed ($http) " . mb_substr($raw, 0, 300));
    db()->prepare('UPDATE orders SET payment_ref = ? WHERE id = ?')->execute([$code, $oid]);
    return $url;
}

/** Never trust what comes back in the browser: ask Fawry directly for the order's status. */
function fawry_check(string $code): array {
    $p = payment_settings();
    $sig = hash('sha256', $p['fawry_merchant_code'] . $code . $p['fawry_secure_key']);
    $d = http_get_json(fawry_host() . '/ECommerceWeb/Fawry/payments/status/v2?' . http_build_query(['merchantCode' => $p['fawry_merchant_code'], 'merchantRefNumber' => $code, 'signature' => $sig]));
    if (!is_array($d)) throw new RuntimeException('bad Fawry status response');
    return $d;
}

function fawry_apply(string $code): array {
    $d = fawry_check($code);
    $status = strtoupper((string)($d['orderStatus'] ?? ''));
    if (in_array($status, ['NEW', 'UNPAID', ''], true)) return ['code' => $code, 'paid' => false, 'final' => false];
    $paid = $status === 'PAID';
    $settled = card_settle($code, '', $paid, (int)round(((float)($d['paymentAmount'] ?? $d['orderAmount'] ?? 0)) * 100), (string)($d['fawryRefNumber'] ?? ''));
    return ['code' => $settled, 'paid' => $paid, 'final' => true];
}

function fawry_return(): void {
    $code = (string)(raw_query()['merchantRefNumber'] ?? '');
    try {
        $r = $code !== '' ? fawry_apply($code) : ['code' => null, 'paid' => false];
    } catch (Throwable $e) {
        error_log('[homex fawry] ' . $e->getMessage());
        $r = ['code' => $code, 'paid' => false];
    }
    back_to_store($r['paid'], $r['code']);
}

function fawry_callback(): array {
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    $code = (string)($body['merchantRefNumber'] ?? '');
    if ($code === '') return ['ignored' => true];
    return fawry_apply($code);
}


/* ============================================================
   New-order email + export for the shipping company
   ============================================================ */

function order_with_items(string $code): ?array {
    $st = db()->prepare('SELECT * FROM orders WHERE code = ?');
    $st->execute([$code]);
    $o = $st->fetch();
    if (!$o) return null;
    $st = db()->prepare('SELECT * FROM order_items WHERE order_id = ?');
    $st->execute([$o['id']]);
    $o['items'] = $st->fetchAll();
    return $o;
}

/** Emails the store owner about a new order. Never blocks or breaks the order if mail fails. */
function notify_new_order(string $code): void {
    try {
        $to = payment_settings()['notify_email'];
        if ($to === '' || !function_exists('mail')) return;
        $o = order_with_items($code);
        if (!$o) return;
        $store = get_setting('store_name', 'HOMEX') ?: 'HOMEX';
        $pay = ['cod' => 'الدفع عند الاستلام', 'card' => 'فيزا (مدفوع)', 'vodafone' => 'فودافون كاش', 'instapay' => 'إنستاباي'][$o['payment_method']] ?? $o['payment_method'];
        $lines = array_map(fn($i) => "- {$i['name']} × {$i['qty']} = " . number_format($i['price'] * $i['qty']) . ' ج.م', $o['items']);
        $base = site_base();
        $body = "طلب جديد {$o['code']}\n\n"
            . "العميل: {$o['customer_name']}\nالموبايل: {$o['phone']}" . ($o['alt_phone'] ? " / {$o['alt_phone']}" : '') . "\n"
            . "المحافظة: {$o['city']}\nالعنوان: {$o['address']}\n" . ($o['notes'] ? "ملاحظات: {$o['notes']}\n" : '')
            . "\nالمنتجات:\n" . implode("\n", $lines) . "\n\n"
            . 'الشحن: ' . number_format((float)$o['shipping_fee']) . " ج.م\nالإجمالي: " . number_format((float)$o['total']) . " ج.م\nالدفع: $pay\n\n"
            . "افتح الطلب: $base/admin/#orders\n";
        $host = parse_url($base, PHP_URL_HOST) ?: 'home-x.online';
        $subject = '=?UTF-8?B?' . base64_encode("طلب جديد {$o['code']} - " . number_format((float)$o['total']) . " ج.م") . '?=';
        $from = '=?UTF-8?B?' . base64_encode($store) . "?= <no-reply@$host>";
        @mail($to, $subject, $body, "From: $from\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit");
    } catch (Throwable $e) {
        error_log('[homex notify] ' . $e->getMessage());
    }
}

/** CSV (opens in Excel with Arabic) of orders, filtered like the orders page. */
function export_orders(array $q): void {
    $where = []; $args = [];
    if (!empty($q['status']) && in_array($q['status'], ORDER_STATUSES, true)) { $where[] = 'status = ?'; $args[] = $q['status']; }
    else $where[] = "status <> 'awaiting_payment'";
    $st = db()->prepare('SELECT * FROM orders' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY id DESC LIMIT 5000');
    $st->execute($args);
    $orders = $st->fetchAll();
    $items = [];
    if ($orders) {
        $ids = implode(',', array_map(fn($o) => (int)$o['id'], $orders));
        foreach (db()->query("SELECT * FROM order_items WHERE order_id IN ($ids)") as $it) $items[$it['order_id']][] = $it;
    }
    $statusAr = ['awaiting_payment' => 'مستني الدفع', 'pending' => 'جديد', 'confirmed' => 'متأكد', 'shipped' => 'مع الشحن', 'delivered' => 'اتسلّم', 'cancelled' => 'ملغي', 'returned' => 'مرتجع'];
    $payAr = ['cod' => 'عند الاستلام', 'card' => 'فيزا', 'vodafone' => 'فودافون كاش', 'instapay' => 'إنستاباي'];

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="homex-orders-' . date('Y-m-d') . '.csv"');
    header('Cache-Control: no-store');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF"); // BOM so Excel reads Arabic
    fputcsv($out, ['رقم الطلب', 'التاريخ', 'الحالة', 'اسم العميل', 'الموبايل', 'موبايل إضافي', 'المحافظة', 'العنوان', 'المنتجات', 'عدد القطع', 'قيمة المنتجات', 'الشحن', 'الإجمالي', 'المطلوب تحصيله', 'طريقة الدفع', 'ملاحظات']);
    foreach ($orders as $o) {
        $its = $items[$o['id']] ?? [];
        $collect = $o['payment_method'] === 'cod' ? (float)$o['total'] : 0; // what the courier collects
        fputcsv($out, [
            $o['code'], $o['created_at'], $statusAr[$o['status']] ?? $o['status'], $o['customer_name'], $o['phone'], $o['alt_phone'],
            $o['city'], $o['address'], implode(' + ', array_map(fn($i) => "{$i['name']} ×{$i['qty']}", $its)),
            array_sum(array_map(fn($i) => (int)$i['qty'], $its)), $o['subtotal'], $o['shipping_fee'], $o['total'], $collect,
            $payAr[$o['payment_method']] ?? $o['payment_method'], $o['notes'],
        ]);
    }
    fclose($out);
    exit;
}
