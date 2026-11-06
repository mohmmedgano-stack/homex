<?php
declare(strict_types=1);

// Store timestamps in UTC (SQLite datetime('now')); show and group them in Egypt time.
date_default_timezone_set('Africa/Cairo');

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
    CREATE TABLE IF NOT EXISTS order_attempts (ip TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        order_id INTEGER NOT NULL DEFAULT 0,
        name TEXT NOT NULL,
        city TEXT NOT NULL DEFAULT '',
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, status);
    CREATE TABLE IF NOT EXISTS stock_moves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL DEFAULT '',
        change INTEGER NOT NULL,
        stock_after INTEGER NOT NULL DEFAULT 0,
        reason TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        ref TEXT NOT NULL DEFAULT '',
        admin_name TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_moves_product ON stock_moves(product_id, id);
    CREATE TABLE IF NOT EXISTS activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL,
        admin_name TEXT NOT NULL,
        action TEXT NOT NULL,
        summary TEXT NOT NULL,
        entity TEXT NOT NULL DEFAULT '',
        entity_id TEXT NOT NULL DEFAULT '',
        ip TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_activity_admin ON activity(admin_id, id);
    CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity(entity, entity_id);
    CREATE TABLE IF NOT EXISTS pages (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        in_footer INTEGER NOT NULL DEFAULT 1,
        builtin INTEGER NOT NULL DEFAULT 0,
        sort INTEGER NOT NULL DEFAULT 0
    );
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
    if (!in_array('email', $cols, true)) $db->exec("ALTER TABLE orders ADD COLUMN email TEXT NOT NULL DEFAULT ''");
    if (!in_array('token', $cols, true)) $db->exec("ALTER TABLE orders ADD COLUMN token TEXT NOT NULL DEFAULT ''");
    if (!in_array('source', $cols, true)) $db->exec("ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'web'");
    if (!in_array('channel', $cols, true)) $db->exec("ALTER TABLE orders ADD COLUMN channel TEXT NOT NULL DEFAULT ''");
    if (!in_array('discount', $cols, true)) $db->exec("ALTER TABLE orders ADD COLUMN discount REAL NOT NULL DEFAULT 0");
    if (!in_array('created_by', $cols, true)) $db->exec("ALTER TABLE orders ADD COLUMN created_by TEXT NOT NULL DEFAULT ''");
    $pcols = array_column($db->query('PRAGMA table_info(products)')->fetchAll(), 'name');
    if (!in_array('sku', $pcols, true)) $db->exec("ALTER TABLE products ADD COLUMN sku TEXT NOT NULL DEFAULT ''");
    if (!in_array('slug', $pcols, true)) $db->exec("ALTER TABLE products ADD COLUMN slug TEXT NOT NULL DEFAULT ''");
    if (!in_array('created_by', $pcols, true)) $db->exec("ALTER TABLE products ADD COLUMN created_by TEXT NOT NULL DEFAULT ''");
    if (!in_array('updated_by', $pcols, true)) $db->exec("ALTER TABLE products ADD COLUMN updated_by TEXT NOT NULL DEFAULT ''");
    $ecols = array_column($db->query('PRAGMA table_info(expenses)')->fetchAll(), 'name');
    if (!in_array('created_by', $ecols, true)) $db->exec("ALTER TABLE expenses ADD COLUMN created_by TEXT NOT NULL DEFAULT ''");
    $ccols = array_column($db->query('PRAGMA table_info(categories)')->fetchAll(), 'name');
    if (!in_array('image', $ccols, true)) $db->exec("ALTER TABLE categories ADD COLUMN image TEXT NOT NULL DEFAULT ''");

    // Footer pages: seed the 5 standard ones once, carrying over any text already saved in settings
    if (!(int)$db->query('SELECT COUNT(*) FROM pages')->fetchColumn()) {
        $old = $db->query("SELECT key, value FROM settings WHERE key LIKE 'page_%'")->fetchAll(PDO::FETCH_KEY_PAIR);
        $st = $db->prepare('INSERT INTO pages (slug, title, content, in_footer, builtin, sort) VALUES (?, ?, ?, 1, 1, ?)');
        foreach (BUILTIN_PAGES as $i => [$slug, $title]) $st->execute([$slug, $title, trim((string)($old["page_$slug"] ?? '')), $i]);
    }

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
        'samesite' => 'Lax',
    ]);
    session_start();
}

/* ============================================================
   HTTP helpers
   ============================================================ */

function ok($data): void {
    if (!empty($GLOBALS['activity_ctx'])) {
        $ctx = $GLOBALS['activity_ctx'];
        $GLOBALS['activity_ctx'] = null;
        try { activity_after($ctx, $data); } catch (Throwable $e) { error_log('[homex] activity: ' . $e->getMessage()); }
    }
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
    static $cached = null;
    if ($cached !== null) return $cached;
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return $cached = (is_array($data) ? $data : []);
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
    $rows = db()->query('SELECT id, name, username, role, active, created_at, last_login FROM admins ORDER BY id')->fetchAll();
    foreach ($rows as &$x) { $x['created_at'] = utc_to_cairo((string)$x['created_at']); $x['last_login'] = $x['last_login'] ? utc_to_cairo((string)$x['last_login']) : null; }
    return $rows;
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
    'hero_title' => '', 'hero_subtitle' => '', 'footer_pages_title' => 'خدمة العملاء',
    'brand_banner_desktop' => '1', 'brand_banner_mobile' => '1', 'brand_title' => '', 'brand_subtitle' => '',
    // Policy pages (empty = the default text below)
    'page_about' => '', 'page_shipping' => '', 'page_returns' => '', 'page_privacy' => '', 'page_terms' => '',
    // Tracking
    'meta_pixel_id' => '', 'tiktok_pixel_id' => '', 'ga4_id' => '',
];

/** Starting text for the policy pages. The brand edits them from the dashboard. */
const BUILTIN_PAGES = [
    ['about', 'من نحن'], ['shipping', 'سياسة الشحن والتوصيل'], ['returns', 'سياسة الاسترجاع والاستبدال'],
    ['privacy', 'سياسة الخصوصية'], ['terms', 'الشروط والأحكام'],
];

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
    'wa_notify_phone' => '', 'wa_notify_apikey' => '',   // WhatsApp alert for new orders (CallMeBot)
    // Customer messages after ordering
    'customer_email_on' => '1',
    'smtp_host' => '', 'smtp_port' => '465', 'smtp_user' => '', 'smtp_pass' => '',
    'wa_cloud_on' => '0', 'wa_cloud_phone_id' => '', 'wa_cloud_token' => '', 'wa_cloud_template' => 'order_confirmation', 'wa_cloud_lang' => 'ar',
    'fawry_merchant_code' => '', 'fawry_secure_key' => '',
];
const SECRET_SETTINGS = ['paymob_secret_key', 'paymob_hmac', 'kashier_api_key', 'fawry_secure_key', 'wa_notify_apikey', 'smtp_pass', 'wa_cloud_token'];

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
    $out['pages'] = site_pages(false, $out['store_name']);
    return $out;
}

/* ---------- Site pages (footer «خدمة العملاء») ---------- */

function site_pages(bool $admin = false, string $store = 'HOMEX'): array {
    $rows = db()->query('SELECT * FROM pages ORDER BY sort, title')->fetchAll();
    $out = [];
    foreach ($rows as $p) {
        $content = $p['content'];
        if (!$admin && trim($content) === '' && isset(DEFAULT_PAGES['page_' . $p['slug']])) {
            $content = str_replace('{store}', $store ?: 'HOMEX', DEFAULT_PAGES['page_' . $p['slug']]);
        }
        $item = ['slug' => $p['slug'], 'title' => $p['title'], 'content' => $content, 'inFooter' => (bool)$p['in_footer'], 'builtin' => (bool)$p['builtin']];
        if ($admin) $item['defaultContent'] = isset(DEFAULT_PAGES['page_' . $p['slug']]) ? str_replace('{store}', $store ?: 'HOMEX', DEFAULT_PAGES['page_' . $p['slug']]) : '';
        $out[] = $item;
    }
    return $out;
}

function save_page(array $b): array {
    $title = str($b['title'] ?? '', 80);
    if ($title === '') throw new ApiError('اكتب عنوان الصفحة');
    $content = str($b['content'] ?? '', 30000);
    $slug = strtolower(str($b['slug'] ?? '', 40));
    $exists = false;
    if ($slug !== '') {
        $st = db()->prepare('SELECT 1 FROM pages WHERE slug = ?');
        $st->execute([$slug]);
        $exists = (bool)$st->fetchColumn();
    }
    $inFooter = !array_key_exists('inFooter', $b) || !empty($b['inFooter']) ? 1 : 0;
    if ($exists) {
        db()->prepare('UPDATE pages SET title = ?, content = ?, in_footer = ? WHERE slug = ?')->execute([$title, $content, $inFooter, $slug]);
    } else {
        if ($slug === '' ) $slug = 'page-' . substr(bin2hex(random_bytes(3)), 0, 5);
        if (!preg_match('/^[a-z0-9][a-z0-9-]{1,39}$/', $slug)) throw new ApiError('رابط الصفحة لازم يكون حروف إنجليزي صغيرة وأرقام وشَرطة بس');
        $sort = (int)db()->query('SELECT COALESCE(MAX(sort), -1) + 1 FROM pages')->fetchColumn();
        db()->prepare('INSERT INTO pages (slug, title, content, in_footer, builtin, sort) VALUES (?, ?, ?, ?, 0, ?)')->execute([$slug, $title, $content, $inFooter, $sort]);
    }
    return site_pages(true, public_settings()['store_name']);
}

function delete_page(string $slug): array {
    $st = db()->prepare('SELECT builtin FROM pages WHERE slug = ?');
    $st->execute([$slug]);
    $b = $st->fetchColumn();
    if ($b === false) throw new ApiError('الصفحة مش موجودة', 404);
    if ((int)$b) throw new ApiError('الصفحة دي أساسية (شركات الدفع بتطلبها)، تقدر تخفيها من الفوتر بس متتمسحش');
    db()->prepare('DELETE FROM pages WHERE slug = ?')->execute([$slug]);
    return site_pages(true, public_settings()['store_name']);
}

function reorder_pages(array $b): array {
    $st = db()->prepare('UPDATE pages SET sort = ? WHERE slug = ?');
    foreach (array_values(is_array($b['slugs'] ?? null) ? $b['slugs'] : []) as $i => $slug) $st->execute([$i, str((string)$slug, 40)]);
    return site_pages(true, public_settings()['store_name']);
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
        if ($k === 'wa_notify_phone' && $v !== '') {
            $v = wa_intl($v);
            if (!preg_match('/^\d{10,15}$/', $v)) throw new ApiError('رقم واتساب الإشعارات مش صحيح');
        }
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
        'slug' => $p['slug'] ?? '',
    ];
    if ($admin) { $out['cost'] = (float)$p['cost']; $out['active'] = (bool)$p['active']; $out['sku'] = $p['sku'] ?? ''; }
    // Who added / last edited — visible to the owner only
    if ($admin && (current_admin()['role'] ?? '') === 'owner') {
        $out['createdBy'] = $p['created_by'] ?? '';
        $out['updatedBy'] = $p['updated_by'] ?? '';
        $out['updatedAt'] = $p['updated_at'] ?? '';
    }
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
    $by = current_admin()['name'] ?? '';
    $vals[] = $by;
    if ($id) {
        $vals[] = $id;
        $oldStock = (int)(act_row('SELECT stock FROM products WHERE id = ?', [$id])['stock'] ?? 0);
        db()->prepare("UPDATE products SET name=?, category_id=?, brand=?, price=?, original_price=?, cost=?, stock=?, image=?, gallery=?, description=?, features=?, specs=?, warranty=?, wattage=?, capacity=?, is_featured=?, is_new=?, active=?, rating=?, reviews_count=?, updated_by=?, updated_at=datetime('now') WHERE id=?")->execute($vals);
        $newStock = (int)($b['stock'] ?? 0);
        if ($newStock !== $oldStock) stock_move($id, $name, $newStock - $oldStock, $newStock, 'edit', 'تعديل من شاشة المنتج');
    } else {
        $vals[] = $by;
        db()->prepare('INSERT INTO products (name, category_id, brand, price, original_price, cost, stock, image, gallery, description, features, specs, warranty, wattage, capacity, is_featured, is_new, active, rating, reviews_count, created_by, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($vals);
        $id = (int)db()->lastInsertId();
        if ((int)($b['stock'] ?? 0) > 0) stock_move($id, $name, (int)$b['stock'], (int)$b['stock'], 'opening', 'رصيد أول المدة');
    }
    if (array_key_exists('slug', $b)) {
        $slug = trim((string)preg_replace('/[^a-z0-9]+/', '-', strtolower(str((string)$b['slug'], 80))), '-');
        db()->prepare('UPDATE products SET slug = ? WHERE id = ?')->execute([$slug, $id]);
    }
    if (array_key_exists('sku', $b)) {
        $sku = str((string)$b['sku'], 60);
        if ($sku !== '' && act_row('SELECT id FROM products WHERE sku = ? AND id <> ?', [$sku, $id])) throw new ApiError("الباركود/الكود «{$sku}» متسجل على منتج تاني");
        db()->prepare('UPDATE products SET sku = ? WHERE id = ?')->execute([$sku, $id]);
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
    order_guard($b);
    $c = (array)($b['customer'] ?? []);
    $name = preg_replace('/\s+/u', ' ', str($c['name'] ?? '', 100));
    $phone = egypt_mobile((string)($c['phone'] ?? ''));
    $alt = trim((string)($c['altPhone'] ?? '')) === '' ? '' : egypt_mobile((string)$c['altPhone']);
    $address = str($c['address'] ?? '', 500);
    $city = str($c['city'] ?? '', 60);
    $email = strtolower(str($c['email'] ?? '', 120));
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ApiError('الإيميل مكتوب غلط');
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
        $token = bin2hex(random_bytes(8));
        $db->prepare('INSERT INTO orders (code, customer_name, phone, alt_phone, city, address, notes, payment_method, subtotal, shipping_fee, total, cost_total, status, email, token) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$code, $name, $phone, $alt, $city, $address, str($c['notes'] ?? '', 500), $pm, $sub, $fee, $total, $cost, $pm === 'card' ? 'awaiting_payment' : 'pending', $email, $token]);
        $oid = (int)$db->lastInsertId();
        $ins = $db->prepare('INSERT INTO order_items (order_id, product_id, name, image, price, cost, qty) VALUES (?,?,?,?,?,?,?)');
        $dec = $db->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
        foreach ($lines as [$p, $qty]) {
            $ins->execute([$oid, $p['id'], $p['name'], $p['image'], $p['price'], $p['cost'], $qty]);
            $dec->execute([$qty, $p['id']]);
            stock_move((int)$p['id'], $p['name'], -$qty, (int)$p['stock'] - $qty, 'web_order', '', $code, 'عميل الموقع');
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
    order_guard_record($phone);
    $res = ['code' => $code, 'token' => $token, 'subtotal' => $sub, 'shippingFee' => $fee, 'total' => $total];
    if ($pm !== 'card') { notify_new_order($code); notify_customer($code); }
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
    if (($q['source'] ?? '') === 'pos') $where[] = "source = 'pos'";
    elseif (($q['source'] ?? '') === 'web') $where[] = "source != 'pos'";
    $sql = 'SELECT * FROM orders' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY id DESC LIMIT 500';
    $st = db()->prepare($sql);
    $st->execute($args);
    $orders = $st->fetchAll();
    if ($orders) {
        $ids = implode(',', array_map(fn($o) => (int)$o['id'], $orders));
        $items = [];
        foreach (db()->query("SELECT * FROM order_items WHERE order_id IN ($ids)") as $it) $items[$it['order_id']][] = $it;
        foreach ($orders as &$o) { $o['items'] = $items[$o['id']] ?? []; $o['created_at'] = utc_to_cairo($o['created_at']); $o['updated_at'] = utc_to_cairo($o['updated_at'] ?? ''); }
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
        $oc = (string)(act_row('SELECT code FROM orders WHERE id = ?', [$id])['code'] ?? '');
        foreach ($db->query('SELECT oi.product_id, oi.name, SUM(oi.qty) q, p.stock FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ' . $id . ' GROUP BY oi.product_id') as $m) {
            $reason = $nowOut ? 'reopen' : ($status === 'returned' ? 'return' : 'cancel');
            stock_move((int)$m['product_id'], (string)$m['name'], ($nowOut ? -1 : 1) * (int)$m['q'], (int)$m['stock'], $reason, '', $oc);
        }
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
    $rows = $st->fetchAll();
    if ((current_admin()['role'] ?? '') !== 'owner') foreach ($rows as &$x) unset($x['created_by']);
    return $rows;
}

function save_expense(array $b): array {
    $amount = num($b['amount'] ?? 0);
    if ($amount <= 0) throw new ApiError('اكتب المبلغ');
    $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($b['date'] ?? '')) ? $b['date'] : date('Y-m-d');
    $cat = str($b['category'] ?? '', 60) ?: 'أخرى';
    $id = (int)($b['id'] ?? 0);
    if ($id) db()->prepare('UPDATE expenses SET date=?, category=?, amount=?, note=? WHERE id=?')->execute([$date, $cat, $amount, str($b['note'] ?? '', 300), $id]);
    else db()->prepare('INSERT INTO expenses (date, category, amount, note, created_by) VALUES (?,?,?,?,?)')->execute([$date, $cat, $amount, str($b['note'] ?? '', 300), current_admin()['name'] ?? '']);
    return ['saved' => true];
}

function summary(?string $from, ?string $to): array {
    [$from, $to] = date_range($from, $to);
    $db = db();
    $range = "date(created_at, '" . tz_mod() . "') BETWEEN ? AND ?";

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
    $st = $db->prepare("SELECT date(created_at, '" . tz_mod() . "') d, COUNT(*) n, SUM(CASE WHEN status='delivered' THEN subtotal ELSE 0 END) rev, SUM(CASE WHEN status='delivered' THEN subtotal - cost_total ELSE 0 END) profit FROM orders WHERE $range GROUP BY d ORDER BY d");
    $st->execute([$from, $to]);
    $days = $st->fetchAll();

    $st = $db->prepare("SELECT oi.name, SUM(oi.qty) qty, SUM(oi.price*oi.qty) revenue, SUM((oi.price-oi.cost)*oi.qty) profit FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status = 'delivered' AND date(o.created_at, '" . tz_mod() . "') BETWEEN ? AND ? GROUP BY oi.product_id, oi.name ORDER BY qty DESC LIMIT 8");
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
        notify_customer($o['code']);
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
    if ($really && $code) {
        $o = order_with_items($code);
        header('Location: ' . order_link($o, false) . '&pay=success', true, 302);
        exit;
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
function wa_intl(string $n): string {
    $d = preg_replace('/\D/', '', $n);
    if (str_starts_with($d, '00')) $d = substr($d, 2);
    elseif (str_starts_with($d, '0')) $d = '2' . $d;   // Egyptian 01xxxxxxxxx
    return $d;
}

/** Sends a WhatsApp message to the owner's number through CallMeBot. Returns '' on success, or the error. */
function wa_send(string $text): string {
    $p = payment_settings();
    $phone = wa_intl($p['wa_notify_phone']); $key = trim($p['wa_notify_apikey']);
    if ($phone === '' || $key === '') return 'رقم الواتساب أو كود التفعيل مش متسجلين';
    $url = 'https://api.callmebot.com/whatsapp.php?' . http_build_query(['phone' => '+' . $phone, 'text' => $text, 'apikey' => $key]);
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_USERAGENT => 'homex-store']);
    $res = (string)curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err !== '') return 'مقدرناش نوصل لخدمة الواتساب: ' . $err;
    if ($code >= 400 || stripos($res, 'APIKey is invalid') !== false || stripos($res, 'error') !== false && stripos($res, 'queued') === false) {
        return 'خدمة الواتساب رفضت الرسالة — اتأكد من الرقم وكود التفعيل';
    }
    return '';
}

function wa_test(): array {
    $err = wa_send('✅ تجربة إشعارات ' . (get_setting('store_name', 'HOMEX') ?: 'HOMEX') . ': لما ييجي طلب جديد هتوصلك رسالة زي دي.');
    if ($err !== '') throw new ApiError($err);
    return ['sent' => true];
}

function notify_new_order(string $code): void {
    try {
        $o = order_with_items($code);
        if (!$o) return;
        $p = payment_settings();
        $to = $p['notify_email'];
        $wa = $p['wa_notify_phone'] !== '' && $p['wa_notify_apikey'] !== '';
        if ($to === '' && !$wa) return;
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
        $waText = "🛒 *طلب جديد {$o['code']}* — $store\n\n" . $body;

        // Send after the customer already got their answer, so a slow mail/WhatsApp service never delays checkout
        $ocode = $o['code'] . ' - ' . number_format((float)$o['total']) . ' ج.م';
        register_shutdown_function(function () use ($to, $ocode, $body, $wa, $waText) {
            if (function_exists('litespeed_finish_request')) @litespeed_finish_request();
            elseif (function_exists('fastcgi_finish_request')) @fastcgi_finish_request();
            try {
                if ($to !== '') { $e = send_mail($to, "طلب جديد $ocode", '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.8;text-align:right">' . nl2br(htmlspecialchars($body, ENT_QUOTES, 'UTF-8')) . '</div>', $body); if ($e !== '') error_log('[homex mail owner] ' . $e); }
                if ($wa) { $e = wa_send($waText); if ($e !== '') error_log('[homex wa] ' . $e); }
            } catch (Throwable $e) {
                error_log('[homex notify] ' . $e->getMessage());
            }
        });
    } catch (Throwable $e) {
        error_log('[homex notify] ' . $e->getMessage());
    }
}

/** Newest order id + how many are waiting for confirmation — the dashboard polls this for the new-order alert. */
function orders_pulse(): array {
    // Unpaid card checkouts don't count until the payment succeeds
    $real = "status != 'awaiting_payment' AND source != 'pos'";
    $last = db()->query("SELECT id, code, customer_name, total, city FROM orders WHERE status = 'pending' AND source != 'pos' ORDER BY updated_at DESC, id DESC LIMIT 1")->fetch() ?: null;
    $count = (int)db()->query("SELECT COUNT(*) FROM orders WHERE $real")->fetchColumn();
    $pending = (int)db()->query("SELECT COUNT(*) FROM orders WHERE status = 'pending'")->fetchColumn();
    return ['count' => $count, 'pending' => $pending, 'last' => $last ? ['id' => (int)$last['id'], 'code' => $last['code'], 'name' => $last['customer_name'], 'total' => (float)$last['total'], 'city' => $last['city']] : null];
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
            $o['code'], utc_to_cairo($o['created_at']), $statusAr[$o['status']] ?? $o['status'], $o['customer_name'], $o['phone'], $o['alt_phone'],
            $o['city'], $o['address'], implode(' + ', array_map(fn($i) => "{$i['name']} ×{$i['qty']}", $its)),
            array_sum(array_map(fn($i) => (int)$i['qty'], $its)), $o['subtotal'], $o['shipping_fee'], $o['total'], $collect,
            $payAr[$o['payment_method']] ?? $o['payment_method'], $o['notes'],
        ]);
    }
    fclose($out);
    exit;
}


/* ============================================================
   Activity log — who did what in the dashboard (owner-only view)
   ============================================================ */

const ACTIVITY_STATUS = [
    'awaiting_payment' => 'مستني الدفع', 'pending' => 'جديد', 'confirmed' => 'اتأكد', 'shipped' => 'اتشحن',
    'delivered' => 'اتسلّم', 'cancelled' => 'اتلغى', 'returned' => 'مرتجع',
];

const ACTIVITY_SETTING_LABELS = [
    'store_name' => 'اسم المتجر', 'logo' => 'اللوجو', 'top_bar_text' => 'شريط الإعلان', 'phone' => 'التليفون', 'whatsapp' => 'الواتساب',
    'email' => 'الإيميل', 'address' => 'العنوان', 'facebook' => 'فيسبوك', 'instagram' => 'إنستجرام', 'tiktok' => 'تيك توك',
    'shipping_fee' => 'مصاريف الشحن', 'free_shipping_over' => 'الشحن المجاني', 'pay_cod' => 'الدفع عند الاستلام',
    'hero_title' => 'عنوان الأقسام', 'hero_subtitle' => 'جملة الأقسام', 'brand_title' => 'عنوان بانر HOMEX', 'brand_subtitle' => 'جملة بانر HOMEX',
    'brand_banner_desktop' => 'بانر HOMEX على الكمبيوتر', 'brand_banner_mobile' => 'بانر HOMEX على الموبايل', 'footer_pages_title' => 'عنوان عمود الفوتر',
    'meta_pixel_id' => 'بيكسل فيسبوك', 'tiktok_pixel_id' => 'بيكسل تيك توك', 'ga4_id' => 'جوجل أناليتكس',
    'pay_card_provider' => 'شركة الدفع بالكارت', 'pay_card_test' => 'وضع التجربة للدفع', 'notify_email' => 'إيميل تنبيه الطلبات',
];

function log_activity(?array $a, string $action, string $summary, string $entity = '', string $eid = ''): void {
    if (!$a) return;
    $at = (new DateTime('now', new DateTimeZone('Africa/Cairo')))->format('Y-m-d H:i:s');
    db()->prepare('INSERT INTO activity (admin_id, admin_name, action, summary, entity, entity_id, ip, created_at) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([(int)$a['id'], (string)$a['name'], $action, mb_substr($summary, 0, 600), $entity, $eid, (string)($_SERVER['REMOTE_ADDR'] ?? ''), $at]);
}

function act_row(string $sql, array $args) {
    $st = db()->prepare($sql);
    $st->execute($args);
    return $st->fetch() ?: null;
}

/** Called by the router before an admin action runs: remembers who is acting and what the record looked like before. */
function activity_begin(string $route): void {
    $logged = ['POST login', 'POST logout', 'POST password'];
    if (!str_contains($route, ' admin/') && !in_array($route, $logged, true)) return;
    if (str_starts_with($route, 'GET ') && $route !== 'GET admin/orders-export') return;
    if (in_array($route, ['POST admin/upload'], true)) return;

    $a = current_admin();
    $b = str_starts_with($route, 'POST ') ? body() : $_GET;
    $before = null;
    switch ($route) {
        case 'POST admin/product':
        case 'POST admin/product-delete':
            $before = act_row('SELECT * FROM products WHERE id = ?', [(int)($b['id'] ?? 0)]); break;
        case 'POST admin/category':
        case 'POST admin/category-delete':
            $before = act_row('SELECT * FROM categories WHERE id = ?', [(string)($b['id'] ?? '')]); break;
        case 'POST admin/dealer':
        case 'POST admin/dealer-delete':
            $before = act_row('SELECT * FROM dealers WHERE id = ?', [(int)($b['id'] ?? 0)]); break;
        case 'POST admin/order-status':
            $before = act_row('SELECT id, code, status, customer_name FROM orders WHERE id = ?', [(int)($b['id'] ?? 0)]); break;
        case 'POST admin/expense':
        case 'POST admin/expense-delete':
            $before = act_row('SELECT * FROM expenses WHERE id = ?', [(int)($b['id'] ?? 0)]); break;
        case 'POST admin/admin':
        case 'POST admin/admin-delete':
            $before = act_row('SELECT id, name, username, role, active FROM admins WHERE id = ?', [(int)($b['id'] ?? 0)]); break;
        case 'POST admin/banner':
        case 'POST admin/banner-delete':
            $before = act_row('SELECT * FROM banners WHERE id = ?', [(int)($b['id'] ?? 0)]); break;
        case 'POST admin/page':
        case 'POST admin/page-delete':
            $before = act_row('SELECT * FROM pages WHERE slug = ?', [(string)($b['slug'] ?? '')]); break;
        case 'POST admin/settings':
            $before = all_settings(); break;
        case 'GET admin/orders-export':
            log_activity($a, 'orders.export', 'صدّر الطلبات Excel' . (!empty($b['status']) ? ' (' . (ACTIVITY_STATUS[$b['status']] ?? $b['status']) . ')' : ''), 'order');
            return;
    }
    $GLOBALS['activity_ctx'] = ['route' => $route, 'admin' => $a, 'body' => $b, 'before' => $before];
}

function fmt_money($v): string { return number_format((float)$v, 0, '.', ',') . ' ج.م'; }

function activity_after(array $ctx, $result): void {
    $r = $ctx['route']; $b = $ctx['body']; $old = $ctx['before'];
    $a = $ctx['admin'] ?: current_admin();
    $name = fn($v) => '«' . mb_substr(trim((string)$v), 0, 80) . '»';
    switch ($r) {
        case 'POST login': log_activity(current_admin(), 'auth.login', 'سجّل دخول'); return;
        case 'POST logout': log_activity($a, 'auth.logout', 'سجّل خروج'); return;
        case 'POST password': log_activity($a, 'auth.password', 'غيّر الباسورد بتاعه'); return;

        case 'POST admin/product':
            if ($old) {
                $ch = [];
                $pairs = ['price' => ['السعر', 'price', true], 'cost' => ['التكلفة', 'cost', true], 'stock' => ['المخزن', 'stock', false]];
                foreach ($pairs as $col => [$lbl, $key, $money]) {
                    $nv = $col === 'stock' ? (int)($b[$key] ?? 0) : num($b[$key] ?? 0);
                    if ((float)$old[$col] != (float)$nv) $ch[] = $lbl . ' ' . ($money ? fmt_money($old[$col]) : (int)$old[$col]) . ' ← ' . ($money ? fmt_money($nv) : $nv);
                }
                if (trim((string)$old['name']) !== str($b['name'] ?? '', 200)) $ch[] = 'الاسم كان ' . $name($old['name']);
                if ((string)$old['category_id'] !== (string)($b['category'] ?? '')) $ch[] = 'نقله لقسم تاني';
                $act = array_key_exists('active', $b) ? (!empty($b['active']) ? 1 : 0) : 1;
                if ((int)$old['active'] !== $act) $ch[] = $act ? 'أظهره في المتجر' : 'خفاه من المتجر';
                if ((int)$old['is_featured'] !== (!empty($b['isFeatured']) ? 1 : 0)) $ch[] = !empty($b['isFeatured']) ? 'حطه في البانر' : 'شاله من البانر';
                log_activity($a, 'product.update', 'عدّل المنتج ' . $name($b['name'] ?? '') . ($ch ? ' — ' . implode('، ', $ch) : ''), 'product', (string)$old['id']);
            } else {
                $nid = (string)db()->query('SELECT MAX(id) FROM products')->fetchColumn();
                log_activity($a, 'product.create', 'ضاف منتج جديد ' . $name($b['name'] ?? '') . ' بسعر ' . fmt_money($b['price'] ?? 0) . '، مخزن ' . (int)($b['stock'] ?? 0), 'product', $nid);
            }
            return;
        case 'POST admin/product-delete':
            if ($old) log_activity($a, 'product.delete', 'مسح المنتج ' . $name($old['name']), 'product', (string)$old['id']);
            return;

        case 'POST admin/category':
            log_activity($a, $old ? 'category.update' : 'category.create', $old
                ? 'عدّل القسم ' . $name($b['name'] ?? '') . (trim((string)$old['name']) !== trim((string)($b['name'] ?? '')) ? ' (كان ' . $name($old['name']) . ')' : '') . (((string)$old['image']) !== (string)($b['image'] ?? '') ? ' وغيّر صورته' : '')
                : 'ضاف قسم جديد ' . $name($b['name'] ?? ''), 'category', (string)($b['id'] ?? ''));
            return;
        case 'POST admin/category-delete':
            if ($old) log_activity($a, 'category.delete', 'مسح القسم ' . $name($old['name']), 'category', (string)$old['id']);
            return;
        case 'POST admin/categories-order': log_activity($a, 'category.order', 'غيّر ترتيب الأقسام', 'category'); return;

        case 'POST admin/dealer':
            log_activity($a, $old ? 'dealer.update' : 'dealer.create', ($old ? 'عدّل بيانات التاجر ' : 'ضاف تاجر جديد ') . $name($b['name'] ?? '') . ' — ' . str($b['governorate'] ?? '', 40), 'dealer', (string)($old['id'] ?? ''));
            return;
        case 'POST admin/dealer-delete':
            if ($old) log_activity($a, 'dealer.delete', 'مسح التاجر ' . $name($old['name']), 'dealer', (string)$old['id']);
            return;

        case 'POST admin/order-status':
            if ($old) {
                $to = (string)($b['status'] ?? '');
                log_activity($a, 'order.status', 'غيّر حالة الطلب ' . $old['code'] . ' (' . $old['customer_name'] . ') من «' . (ACTIVITY_STATUS[$old['status']] ?? $old['status']) . '» لـ «' . (ACTIVITY_STATUS[$to] ?? $to) . '»', 'order', (string)$old['id']);
            }
            return;

        case 'POST admin/expense':
            log_activity($a, $old ? 'expense.update' : 'expense.create', ($old ? 'عدّل مصروف ' : 'سجّل مصروف ') . $name(str($b['category'] ?? '', 60) ?: 'أخرى') . ' بمبلغ ' . fmt_money($b['amount'] ?? 0) . ($old && (float)$old['amount'] != num($b['amount'] ?? 0) ? ' (كان ' . fmt_money($old['amount']) . ')' : ''), 'expense', (string)($old['id'] ?? ''));
            return;
        case 'POST admin/expense-delete':
            if ($old) log_activity($a, 'expense.delete', 'مسح مصروف ' . $name($old['category']) . ' بمبلغ ' . fmt_money($old['amount']) . ' بتاريخ ' . $old['date'], 'expense', (string)$old['id']);
            return;

        case 'POST admin/settings':
            $after = all_settings(); $ch = [];
            foreach ($b as $k => $_) {
                if (!is_string($k) || !array_key_exists($k, $after) || !is_array($old) || ($old[$k] ?? null) === $after[$k]) continue;
                if (str_starts_with($k, 'page_') || str_ends_with($k, '_ready')) continue;
                $ch[] = ACTIVITY_SETTING_LABELS[$k] ?? (in_array($k, SECRET_SETTINGS, true) ? 'مفاتيح شركة الدفع' : $k);
            }
            $ch = array_values(array_unique($ch));
            if ($ch) log_activity($a, 'settings.update', 'عدّل إعدادات المتجر: ' . implode('، ', array_slice($ch, 0, 8)) . (count($ch) > 8 ? ' و' . (count($ch) - 8) . ' تانيين' : ''), 'settings');
            return;

        case 'POST admin/admin':
            $role = (($b['role'] ?? 'staff') === 'owner') ? 'مالك' : 'موظف';
            if ($old) {
                $ch = [];
                if ($old['role'] !== ((($b['role'] ?? 'staff') === 'owner') ? 'owner' : 'staff')) $ch[] = 'الصلاحية بقت ' . $role;
                if ((int)$old['active'] !== (!empty($b['active']) ? 1 : 0)) $ch[] = !empty($b['active']) ? 'فعّل الحساب' : 'وقّف الحساب';
                if ((string)($b['password'] ?? '') !== '') $ch[] = 'غيّر الباسورد';
                log_activity($a, 'user.update', 'عدّل حساب ' . $name($b['name'] ?? '') . ($ch ? ' — ' . implode('، ', $ch) : ''), 'user', (string)$old['id']);
            } else {
                log_activity($a, 'user.create', 'عمل حساب جديد ' . $name($b['name'] ?? '') . ' (' . $role . ')', 'user');
            }
            return;
        case 'POST admin/admin-delete':
            if ($old) log_activity($a, 'user.delete', 'مسح حساب ' . $name($old['name']), 'user', (string)$old['id']);
            return;

        case 'POST admin/banner':
            $label = trim((string)($b['title'] ?? '')) !== '' ? $name($b['title']) : '';
            if ($old && count($b) && array_key_exists('active', $b) && (int)$old['active'] !== (!empty($b['active']) ? 1 : 0) && $old['image'] === ($b['image'] ?? '')) {
                log_activity($a, 'banner.update', (!empty($b['active']) ? 'أظهر البانر ' : 'خفى البانر ') . $label, 'banner', (string)$old['id']);
            } else {
                log_activity($a, $old ? 'banner.update' : 'banner.create', ($old ? 'عدّل البانر ' : 'ضاف بانر جديد ') . $label, 'banner', (string)($old['id'] ?? ''));
            }
            return;
        case 'POST admin/banner-delete':
            if ($old) log_activity($a, 'banner.delete', 'مسح البانر ' . ($old['title'] !== '' ? $name($old['title']) : ''), 'banner', (string)$old['id']);
            return;
        case 'POST admin/banners-order': log_activity($a, 'banner.order', 'غيّر ترتيب البانرات', 'banner'); return;

        case 'POST admin/page':
            if ($old && (int)$old['in_footer'] !== (!array_key_exists('inFooter', $b) || !empty($b['inFooter']) ? 1 : 0) && $old['content'] === str($b['content'] ?? '', 30000)) {
                log_activity($a, 'page.update', (!empty($b['inFooter']) ? 'أظهر صفحة ' : 'خفى صفحة ') . $name($b['title'] ?? '') . ' في الفوتر', 'page', (string)$old['slug']);
            } else {
                log_activity($a, $old ? 'page.update' : 'page.create', ($old ? 'عدّل صفحة ' : 'ضاف صفحة جديدة ') . $name($b['title'] ?? ''), 'page', (string)($old['slug'] ?? ($b['slug'] ?? '')));
            }
            return;
        case 'POST admin/page-delete':
            if ($old) log_activity($a, 'page.delete', 'مسح صفحة ' . $name($old['title']), 'page', (string)$old['slug']);
            return;
        case 'POST admin/pages-order': log_activity($a, 'page.order', 'غيّر ترتيب صفحات الفوتر', 'page'); return;
    }
}

function activity_list(array $q): array {
    $where = []; $args = [];
    if (!empty($q['admin'])) { $where[] = 'admin_id = ?'; $args[] = (int)$q['admin']; }
    if (!empty($q['entity'])) { $where[] = 'entity = ?'; $args[] = str($q['entity'], 20); }
    if (isset($q['entity_id']) && $q['entity_id'] !== '') { $where[] = 'entity_id = ?'; $args[] = str($q['entity_id'], 40); }
    if (!empty($q['before'])) { $where[] = 'id < ?'; $args[] = (int)$q['before']; }
    if (!empty($q['q'])) { $where[] = 'summary LIKE ?'; $args[] = '%' . str($q['q'], 80) . '%'; }
    $limit = min(100, max(10, (int)($q['limit'] ?? 50)));
    $st = db()->prepare('SELECT id, admin_id, admin_name, action, summary, entity, entity_id, created_at FROM activity' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . " ORDER BY id DESC LIMIT $limit");
    $st->execute($args);
    $rows = $st->fetchAll();
    $counts = db()->query("SELECT admin_id, COUNT(*) AS n, MAX(created_at) AS last FROM activity GROUP BY admin_id")->fetchAll();
    return ['items' => $rows, 'more' => count($rows) === $limit, 'perAdmin' => $counts];
}


/* ============================================================
   Customer side: order page link, confirmation email (SMTP), WhatsApp (Cloud API)
   ============================================================ */

function order_token(array $o): string {
    if (($o['token'] ?? '') !== '') return $o['token'];
    if (empty($o['id'])) return 'test';
    $t = bin2hex(random_bytes(8));
    db()->prepare('UPDATE orders SET token = ? WHERE id = ?')->execute([$t, $o['id']]);
    return $t;
}

function order_link(array $o, bool $absolute = true): string {
    return ($absolute ? site_base() : '') . '/o/' . rawurlencode($o['code']) . '?t=' . order_token($o);
}

/** Public order page data — needs the secret token from the confirmation link. */
function order_view(string $code, string $t): array {
    $o = order_with_items(str($code, 30));
    if (!$o || $t === '' || !hash_equals(order_token($o), $t)) throw new ApiError('الطلب مش موجود', 404);
    return [
        'code' => $o['code'], 'status' => $o['status'], 'createdAt' => utc_to_cairo($o['created_at']),
        'name' => $o['customer_name'], 'phone' => $o['phone'], 'altPhone' => $o['alt_phone'], 'email' => $o['email'] ?? '',
        'city' => $o['city'], 'address' => $o['address'], 'notes' => $o['notes'],
        'paymentMethod' => $o['payment_method'], 'paid' => ($o['payment_status'] ?? '') === 'paid',
        'subtotal' => (float)$o['subtotal'], 'shippingFee' => (float)$o['shipping_fee'], 'total' => (float)$o['total'],
        'items' => array_map(fn($i) => ['name' => $i['name'], 'image' => $i['image'], 'price' => (float)$i['price'], 'qty' => (int)$i['qty']], $o['items']),
    ];
}

/* ---------- email ---------- */

function abs_url(string $u): string {
    if ($u === '') return '';
    if (str_starts_with($u, 'http')) return $u;
    return site_base() . $u;
}

function mail_from(): array {
    $p = payment_settings();
    $host = parse_url(site_base(), PHP_URL_HOST) ?: 'home-x.online';
    $addr = $p['smtp_user'] !== '' && filter_var($p['smtp_user'], FILTER_VALIDATE_EMAIL) ? $p['smtp_user'] : "no-reply@$host";
    return [$addr, get_setting('store_name', 'HOMEX') ?: 'HOMEX'];
}

/** Sends an email through the store's mailbox (SMTP) when it's set up, otherwise PHP mail(). Returns '' or the error. */
function send_mail(string $to, string $subject, string $html, string $text, string $replyTo = ''): string {
    $p = payment_settings();
    [$fromAddr, $fromName] = mail_from();
    $b = 'b' . bin2hex(random_bytes(8));
    $enc = fn($s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
    $headers = [
        'From: ' . $enc($fromName) . " <$fromAddr>",
        'MIME-Version: 1.0',
        "Content-Type: multipart/alternative; boundary=\"$b\"",
    ];
    if ($replyTo !== '') $headers[] = "Reply-To: $replyTo";
    $body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text))
        . "--$b\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--$b--\r\n";

    if ($p['smtp_host'] !== '' && $p['smtp_user'] !== '' && $p['smtp_pass'] !== '') {
        return smtp_send($p['smtp_host'], (int)($p['smtp_port'] ?: 465), $p['smtp_user'], $p['smtp_pass'], $fromAddr, $to,
            array_merge(["To: $to", 'Subject: ' . $enc($subject), 'Date: ' . date('r'), 'Message-ID: <' . bin2hex(random_bytes(10)) . '@' . (explode('@', $fromAddr)[1] ?? 'home-x.online') . '>'], $headers), $body);
    }
    if (!function_exists('mail')) return 'خدمة الإيميل مش متاحة على السيرفر';
    return @mail($to, $enc($subject), $body, implode("\r\n", $headers)) ? '' : 'السيرفر رفض يبعت الإيميل';
}

function smtp_send(string $host, int $port, string $user, string $pass, string $from, string $to, array $headers, string $body): string {
    $ssl = $port === 465;
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $fp = @stream_socket_client(($ssl ? 'ssl://' : 'tcp://') . "$host:$port", $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) return "مقدرناش نتصل بسيرفر الإيميل ($errstr)";
    stream_set_timeout($fp, 15);
    $read = function () use ($fp) { $out = ''; while (($l = fgets($fp, 515)) !== false) { $out .= $l; if (strlen($l) < 4 || $l[3] === ' ') break; } return $out; };
    $cmd = function (string $c, array $ok) use ($fp, $read) { fwrite($fp, $c . "\r\n"); $r = $read(); if (!in_array((int)substr($r, 0, 3), $ok, true)) throw new RuntimeException(trim($r)); return $r; };
    try {
        $r = $read(); if ((int)substr($r, 0, 3) !== 220) throw new RuntimeException(trim($r));
        $me = parse_url(site_base(), PHP_URL_HOST) ?: 'localhost';
        $cmd("EHLO $me", [250]);
        if (!$ssl) {
            $cmd('STARTTLS', [220]);
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('TLS failed');
            $cmd("EHLO $me", [250]);
        }
        $cmd('AUTH LOGIN', [334]);
        $cmd(base64_encode($user), [334]);
        try { $cmd(base64_encode($pass), [235]); } catch (RuntimeException $e) { throw new RuntimeException('AUTH: الإيميل أو الباسورد بتاع صندوق البريد غلط'); }
        $cmd("MAIL FROM:<$from>", [250]);
        $cmd("RCPT TO:<$to>", [250, 251]);
        $cmd('DATA', [354]);
        $data = implode("\r\n", $headers) . "\r\n\r\n" . preg_replace('/^\./m', '..', $body);
        $cmd($data . "\r\n.", [250]);
        $cmd('QUIT', [221]);
        fclose($fp);
        return '';
    } catch (Throwable $e) {
        @fclose($fp);
        $m = $e->getMessage();
        return str_starts_with($m, 'AUTH:') ? substr($m, 6) : 'سيرفر الإيميل رفض الرسالة: ' . mb_substr($m, 0, 120);
    }
}

function money_ar($v): string { return number_format((float)$v, 0, '.', ',') . ' ج.م'; }

function order_email_html(array $o): array {
    $store = get_setting('store_name', 'HOMEX') ?: 'HOMEX';
    $logo = get_setting('logo', '') ?: '/logo.png';
    $link = order_link($o);
    $pay = ['cod' => 'الدفع عند الاستلام', 'card' => 'فيزا / ماستركارد' . (($o['payment_status'] ?? '') === 'paid' ? ' (مدفوع)' : '')][$o['payment_method']] ?? $o['payment_method'];
    $first = explode(' ', trim($o['customer_name']))[0] ?? '';
    $h = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
    $rows = '';
    foreach ($o['items'] as $i) {
        $img = $i['image'] !== '' ? abs_url($i['image'] . (str_starts_with($i['image'], '/api/?r=img') ? '&s=1' : '')) : '';
        $rows .= '<tr><td style="padding:12px 0;border-bottom:1px solid #eceef1;width:64px">'
            . ($img ? '<img src="' . $h($img) . '" width="56" height="56" style="border-radius:8px;object-fit:cover;display:block;border:1px solid #eceef1" alt="">' : '')
            . '</td><td style="padding:12px 12px;border-bottom:1px solid #eceef1;font-size:15px;color:#1c1f24"><b>' . $h($i['name']) . '</b><br><span style="color:#6b7280;font-size:13px">الكمية: ' . (int)$i['qty'] . '</span></td>'
            . '<td style="padding:12px 0;border-bottom:1px solid #eceef1;font-size:15px;color:#1c1f24;white-space:nowrap;text-align:left"><b>' . money_ar($i['price'] * $i['qty']) . '</b></td></tr>';
    }
    $paidLine = ($o['payment_status'] ?? '') === 'paid'
        ? '<tr><td style="color:#0e9f6e;padding:4px 0">اتدفع</td><td style="color:#0e9f6e;text-align:left;padding:4px 0">' . money_ar($o['total']) . '</td></tr>'
        : '<tr><td style="color:#6b7280;padding:4px 0">هتدفع عند الاستلام</td><td style="color:#6b7280;text-align:left;padding:4px 0">' . money_ar($o['total']) . '</td></tr>';
    $contact = array_filter([get_setting('phone', ''), get_setting('whatsapp', '') ? 'واتساب ' . get_setting('whatsapp', '') : '']);
    $html = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        . '<body style="margin:0;background:#f3f4f6;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">'
        . '<tr><td style="background:#1c1f24;padding:22px 28px"><table width="100%" role="presentation"><tr><td><img src="' . $h(abs_url($logo)) . '" height="34" alt="' . $h($store) . '" style="display:block;height:34px"></td>'
        . '<td style="text-align:left;color:#9ca3af;font-size:13px">طلب رقم<br><b style="color:#fff;font-size:15px">' . $h($o['code']) . '</b></td></tr></table></td></tr>'
        . '<tr><td style="padding:28px">'
        . '<h1 style="margin:0 0 8px;font-size:22px;color:#1c1f24">شكراً يا ' . $h($first) . '، طلبك وصلنا ✅</h1>'
        . '<p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.8">بنجهّز طلبك دلوقتي، وفريقنا هيكلمك على <b dir="ltr">' . $h($o['phone']) . '</b> يأكد معاك قبل الشحن.</p>'
        . '<a href="' . $h($link) . '" style="display:inline-block;background:#f47a20;color:#fff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:10px;font-size:15px">عرض الطلب</a>'
        . '<h2 style="margin:30px 0 4px;font-size:17px;color:#1c1f24">ملخص الطلب</h2>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $rows . '</table>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:15px;color:#1c1f24">'
        . '<tr><td style="color:#6b7280;padding:4px 0">المنتجات</td><td style="text-align:left;padding:4px 0">' . money_ar($o['subtotal']) . '</td></tr>'
        . '<tr><td style="color:#6b7280;padding:4px 0">الشحن</td><td style="text-align:left;padding:4px 0">' . money_ar($o['shipping_fee']) . '</td></tr>'
        . '<tr><td style="padding:10px 0;border-top:1px solid #eceef1;font-size:17px"><b>الإجمالي</b></td><td style="padding:10px 0;border-top:1px solid #eceef1;text-align:left;font-size:19px"><b>' . money_ar($o['total']) . '</b></td></tr>'
        . $paidLine . '</table>'
        . '<h2 style="margin:28px 0 10px;font-size:17px;color:#1c1f24">بيانات التوصيل</h2>'
        . '<p style="margin:0;color:#374151;font-size:15px;line-height:1.9">' . $h($o['customer_name']) . '<br>' . $h($o['address']) . '<br>' . $h($o['city']) . '، مصر<br><span dir="ltr">' . $h($o['phone']) . '</span></p>'
        . '<h2 style="margin:22px 0 6px;font-size:17px;color:#1c1f24">طريقة الدفع</h2><p style="margin:0;color:#374151;font-size:15px">' . $h($pay) . '</p>'
        . '</td></tr>'
        . '<tr><td style="background:#f9fafb;padding:18px 28px;color:#6b7280;font-size:13px;line-height:1.8;border-top:1px solid #eceef1">'
        . 'عندك سؤال عن طلبك؟ رد على الإيميل ده' . ($contact ? ' أو كلمنا: <span dir="ltr">' . $h(implode(' · ', $contact)) . '</span>' : '') . '<br>'
        . '<a href="' . $h(site_base()) . '" style="color:#c4580a">' . $h($store) . '</a></td></tr>'
        . '</table></td></tr></table></body></html>';
    $text = "شكراً يا {$first}، طلبك {$o['code']} وصلنا.\n\n" . implode("\n", array_map(fn($i) => "- {$i['name']} × {$i['qty']}", $o['items']))
        . "\n\nالإجمالي: " . money_ar($o['total']) . "\nالدفع: $pay\nالعنوان: {$o['address']}، {$o['city']}\n\nتابع طلبك: $link\n";
    return [$html, $text];
}

/* ---------- WhatsApp Business (Cloud API) ---------- */

function wa_cloud_send(string $toPhone, array $params, ?array $cfg = null): string {
    $p = $cfg ?? payment_settings();
    if ($p['wa_cloud_phone_id'] === '' || $p['wa_cloud_token'] === '') return 'بيانات واتساب بيزنس ناقصة';
    $to = wa_intl($toPhone);
    $payload = [
        'messaging_product' => 'whatsapp', 'to' => $to, 'type' => 'template',
        'template' => [
            'name' => $p['wa_cloud_template'] ?: 'order_confirmation',
            'language' => ['code' => $p['wa_cloud_lang'] ?: 'ar'],
            'components' => [['type' => 'body', 'parameters' => array_map(fn($v) => ['type' => 'text', 'text' => mb_substr((string)$v, 0, 300)], $params)]],
        ],
    ];
    $ch = curl_init('https://graph.facebook.com/v21.0/' . rawurlencode($p['wa_cloud_phone_id']) . '/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $p['wa_cloud_token'], 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $res = json_decode((string)curl_exec($ch), true);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err !== '') return 'مقدرناش نوصل لواتساب: ' . $err;
    if ($code >= 400 || !empty($res['error'])) return 'واتساب رفض الرسالة: ' . mb_substr((string)($res['error']['error_data']['details'] ?? $res['error']['message'] ?? "HTTP $code"), 0, 200);
    return '';
}

function wa_order_params(array $o): array {
    $first = explode(' ', trim($o['customer_name']))[0] ?? '';
    return [$first, $o['code'], money_ar($o['total']), order_link($o)];
}

/** Confirmation to the customer (email + WhatsApp). Runs after the response is sent; failures are only logged. */
function notify_customer(string $code): void {
    register_shutdown_function(function () use ($code) {
        if (function_exists('litespeed_finish_request')) @litespeed_finish_request();
        elseif (function_exists('fastcgi_finish_request')) @fastcgi_finish_request();
        try {
            $o = order_with_items($code);
            if (!$o) return;
            $p = payment_settings();
            if (($o['email'] ?? '') !== '' && $p['customer_email_on'] !== '0') {
                [$html, $text] = order_email_html($o);
                $e = send_mail($o['email'], 'تم استلام طلبك ' . $o['code'] . ' — ' . (get_setting('store_name', 'HOMEX') ?: 'HOMEX'), $html, $text, $p['notify_email'] ?: get_setting('email', ''));
                if ($e !== '') error_log("[homex mail] {$o['code']}: $e");
            }
            if ($p['wa_cloud_on'] === '1') {
                $e = wa_cloud_send($o['phone'], wa_order_params($o));
                if ($e !== '') error_log("[homex wa-cloud] {$o['code']}: $e");
            }
        } catch (Throwable $e) {
            error_log('[homex notify-customer] ' . $e->getMessage());
        }
    });
}

/* ---------- dashboard test buttons ---------- */

function test_email(array $b): array {
    $to = strtolower(str($b['to'] ?? '', 120));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) throw new ApiError('اكتب إيميل صحيح للتجربة');
    $demo = ['code' => 'HX-TEST', 'token' => 'test', 'customer_name' => 'عميل تجربة', 'phone' => '01000000000', 'city' => 'القاهرة', 'address' => 'عنوان تجربة',
        'payment_method' => 'cod', 'payment_status' => 'unpaid', 'subtotal' => 1250, 'shipping_fee' => 60, 'total' => 1310,
        'items' => [['name' => 'غلاية كهربائية (تجربة)', 'image' => '', 'price' => 1250, 'qty' => 1]], 'id' => 0];
    [$html, $text] = order_email_html($demo);
    $e = send_mail($to, 'تجربة إيميل تأكيد الطلب — ' . (get_setting('store_name', 'HOMEX') ?: 'HOMEX'), $html, $text);
    if ($e !== '') throw new ApiError($e);
    return ['sent' => true];
}

function test_wa_cloud(array $b): array {
    $to = (string)($b['to'] ?? '');
    if (!preg_match('/^\d{10,15}$/', wa_intl($to))) throw new ApiError('اكتب رقم موبايل صحيح للتجربة');
    $e = wa_cloud_send($to, ['عميل', 'HX-TEST', money_ar(1310), site_base()]);
    if ($e !== '') throw new ApiError($e);
    return ['sent' => true];
}


/* ============================================================
   Inventory & point of sale (sales made outside the website)
   ============================================================ */

const STOCK_REASONS = [
    'opening' => 'رصيد أول المدة', 'edit' => 'تعديل من شاشة المنتج', 'web_order' => 'طلب من الموقع', 'pos_sale' => 'بيع من الكاشير',
    'cancel' => 'إلغاء طلب', 'return' => 'مرتجع', 'delete' => 'مسح طلب', 'reopen' => 'إعادة فتح طلب', 'restock' => 'استلام بضاعة', 'damaged' => 'تالف / هالك',
    'out' => 'صرف (هدية/عينة/استخدام)', 'count' => 'تسوية جرد',
];
const POS_PAYMENTS = ['cash' => 'كاش', 'card' => 'فيزا / ماكينة', 'wallet' => 'محفظة (فودافون كاش...)', 'instapay' => 'إنستاباي', 'credit' => 'آجل'];
const POS_CHANNELS = ['shop' => 'المحل / المعرض', 'dealer' => 'تاجر جملة', 'facebook' => 'فيسبوك / إنستجرام', 'whatsapp' => 'واتساب', 'phone' => 'تليفون', 'other' => 'أخرى'];

function cairo_now(): string { return (new DateTime('now', new DateTimeZone('Africa/Cairo')))->format('Y-m-d H:i:s'); }

function stock_move(int $pid, string $name, int $change, int $after, string $reason, string $note = '', string $ref = '', ?string $by = null): void {
    if ($change === 0) return;
    db()->prepare('INSERT INTO stock_moves (product_id, product_name, change, stock_after, reason, note, ref, admin_name, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        ->execute([$pid, $name, $change, max(0, $after), $reason, mb_substr($note, 0, 200), $ref, $by ?? (current_admin()['name'] ?? ''), cairo_now()]);
}

/** Cashier sale: deducts stock right away and books the sale as a delivered (paid) order, so it shows in the accounts. */
function pos_sale(array $b): array {
    $items = (array)($b['items'] ?? []);
    if (!$items) throw new ApiError('ضيف منتجات للفاتورة الأول');
    if (count($items) > 100) throw new ApiError('الفاتورة فيها منتجات كتير');
    $pay = (string)($b['paymentMethod'] ?? 'cash');
    if (!isset(POS_PAYMENTS[$pay])) $pay = 'cash';
    $channel = (string)($b['channel'] ?? 'shop');
    if (!isset(POS_CHANNELS[$channel])) $channel = 'shop';
    $name = str($b['customerName'] ?? '', 100) ?: 'عميل ' . POS_CHANNELS[$channel];
    $phone = preg_replace('/\D/', '', (string)($b['customerPhone'] ?? ''));
    $phone = mb_substr($phone, 0, 15);
    $note = str($b['note'] ?? '', 300);
    $discount = max(0, num($b['discount'] ?? 0));
    $by = current_admin()['name'] ?? '';

    $db = db();
    $db->beginTransaction();
    try {
        $sub = 0; $cost = 0; $lines = [];
        $get = $db->prepare('SELECT * FROM products WHERE id = ?');
        $merged = [];
        foreach ($items as $it) {
            $pid = (int)($it['productId'] ?? 0);
            $qty = (int)($it['qty'] ?? 0);
            if ($qty < 1 || $qty > 9999) throw new ApiError('الكمية لازم تكون رقم صحيح');
            $price = isset($it['price']) ? num($it['price']) : null;
            if ($price !== null && $price < 0) throw new ApiError('السعر مش صحيح');
            if (isset($merged[$pid])) { $merged[$pid]['qty'] += $qty; continue; }
            $merged[$pid] = ['qty' => $qty, 'price' => $price];
        }
        foreach ($merged as $pid => $m) {
            $get->execute([$pid]);
            $p = $get->fetch();
            if (!$p) throw new ApiError('في منتج في الفاتورة مش موجود، حدّث الصفحة');
            if ((int)$p['stock'] < $m['qty']) throw new ApiError("المخزن فيه {$p['stock']} بس من «{$p['name']}»");
            $price = $m['price'] ?? (float)$p['price'];
            $sub += $price * $m['qty'];
            $cost += (float)$p['cost'] * $m['qty'];
            $lines[] = [$p, $m['qty'], $price];
        }
        if ($discount > $sub) throw new ApiError('الخصم أكبر من قيمة الفاتورة');
        $total = $sub - $discount;
        $code = 'POS' . date('ymd') . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
        $now = gmdate('Y-m-d H:i:s');   // orders are stored in UTC like web orders
        // subtotal is stored after discount so profit reports stay right
        $db->prepare("INSERT INTO orders (code, customer_name, phone, alt_phone, city, address, notes, payment_method, subtotal, shipping_fee, total, cost_total, status, email, token, source, channel, discount, created_by, payment_status, created_at, updated_at)
                      VALUES (?,?,?,?,?,?,?,?,?,0,?,?,'delivered','',?, 'pos', ?, ?, ?, ?, ?, ?)")
            ->execute([$code, $name, $phone, '', '', '', $note, $pay, $total, $total, $cost, bin2hex(random_bytes(8)), $channel, $discount, $by, $pay === 'credit' ? 'unpaid' : 'paid', $now, $now]);
        $oid = (int)$db->lastInsertId();
        $ins = $db->prepare('INSERT INTO order_items (order_id, product_id, name, image, price, cost, qty) VALUES (?,?,?,?,?,?,?)');
        $dec = $db->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
        foreach ($lines as [$p, $qty, $price]) {
            $ins->execute([$oid, $p['id'], $p['name'], $p['image'], $price, $p['cost'], $qty]);
            $dec->execute([$qty, $p['id']]);
            stock_move((int)$p['id'], $p['name'], -$qty, (int)$p['stock'] - $qty, 'pos_sale', '', $code, $by);
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
    log_activity(current_admin(), 'pos.sale', 'باع من الكاشير فاتورة ' . $code . ' بـ ' . fmt_money($total) . ' (' . POS_PAYMENTS[$pay] . ' — ' . POS_CHANNELS[$channel] . ') — ' . implode('، ', array_map(fn($l) => $l[0]['name'] . ' × ' . $l[1], $lines)), 'order', (string)$oid);
    return pos_receipt($code);
}

function utc_to_cairo(string $utc): string {
    if ($utc === '') return '';
    try { return (new DateTime($utc, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Africa/Cairo'))->format('Y-m-d H:i'); }
    catch (Throwable $e) { return $utc; }
}

function pos_receipt(string $code): array {
    $o = order_with_items($code);
    if (!$o) throw new ApiError('الفاتورة مش موجودة', 404);
    return [
        'id' => (int)$o['id'], 'code' => $o['code'], 'createdAt' => utc_to_cairo($o['created_at']), 'cashier' => $o['created_by'] ?? '',
        'customerName' => $o['customer_name'], 'customerPhone' => $o['phone'], 'note' => $o['notes'],
        'paymentMethod' => $o['payment_method'], 'paymentLabel' => POS_PAYMENTS[$o['payment_method']] ?? $o['payment_method'],
        'channel' => $o['channel'] ?? '', 'channelLabel' => POS_CHANNELS[$o['channel'] ?? ''] ?? '',
        'discount' => (float)($o['discount'] ?? 0), 'subtotal' => (float)$o['subtotal'] + (float)($o['discount'] ?? 0), 'total' => (float)$o['total'],
        'status' => $o['status'],
        'items' => array_map(fn($i) => ['name' => $i['name'], 'qty' => (int)$i['qty'], 'price' => (float)$i['price']], $o['items']),
    ];
}

/** Cashier screen footer: today's (or a given day's) sales from the cashier. */
function pos_day(array $q): array {
    $day = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($q['date'] ?? '')) ? $q['date'] : substr(cairo_now(), 0, 10);
    $tz = new DateTimeZone('Africa/Cairo');
    $from = (new DateTime("$day 00:00:00", $tz))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $to = (new DateTime("$day 23:59:59", $tz))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $st = db()->prepare("SELECT id, code, customer_name, payment_method, channel, total, status, created_by, created_at FROM orders WHERE source = 'pos' AND created_at BETWEEN ? AND ? ORDER BY id DESC");
    $st->execute([$from, $to]);
    $rows = $st->fetchAll();
    foreach ($rows as &$row) $row['created_at'] = utc_to_cairo($row['created_at']);
    unset($row);
    $by = []; $total = 0; $count = 0;
    foreach ($rows as $r) {
        if (in_array($r['status'], ['cancelled', 'returned'], true)) continue;
        $by[$r['payment_method']] = ($by[$r['payment_method']] ?? 0) + (float)$r['total'];
        $total += (float)$r['total']; $count++;
    }
    return ['date' => $day, 'count' => $count, 'total' => $total, 'byPayment' => $by, 'sales' => $rows, 'payments' => POS_PAYMENTS, 'channels' => POS_CHANNELS];
}

function pos_void(array $b): array {
    $o = act_row("SELECT id, code, status FROM orders WHERE id = ? AND source = 'pos'", [(int)($b['id'] ?? 0)]);
    if (!$o) throw new ApiError('الفاتورة مش موجودة', 404);
    if (in_array($o['status'], ['cancelled', 'returned'], true)) throw new ApiError('الفاتورة دي اترجعت قبل كده');
    set_order_status(['id' => (int)$o['id'], 'status' => 'returned']);
    log_activity(current_admin(), 'pos.return', 'رجّع فاتورة الكاشير ' . $o['code'] . ' والكمية رجعت المخزن', 'order', (string)$o['id']);
    return pos_day([]);
}

/** Manual stock changes: goods received, damaged, given out, or a stock-count correction. */
function stock_adjust(array $b): array {
    $p = act_row('SELECT id, name, stock FROM products WHERE id = ?', [(int)($b['productId'] ?? 0)]);
    if (!$p) throw new ApiError('المنتج مش موجود', 404);
    $mode = (string)($b['mode'] ?? '');
    $qty = (int)($b['qty'] ?? -1);
    if ($qty < 0 || $qty > 100000) throw new ApiError('اكتب كمية صحيحة');
    $note = str($b['note'] ?? '', 200);
    $old = (int)$p['stock'];
    switch ($mode) {
        case 'restock': if ($qty < 1) throw new ApiError('اكتب الكمية اللي وصلت'); $new = $old + $qty; break;
        case 'damaged':
        case 'out':
            if ($qty < 1) throw new ApiError('اكتب الكمية');
            if ($qty > $old) throw new ApiError("المخزن فيه $old بس");
            $new = $old - $qty; break;
        case 'count': $new = $qty; break;
        default: throw new ApiError('نوع الحركة مش معروف');
    }
    if ($new === $old) return ['stock' => $old];
    db()->prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?")->execute([$new, $p['id']]);
    stock_move((int)$p['id'], $p['name'], $new - $old, $new, $mode, $note);
    log_activity(current_admin(), 'stock.' . $mode, STOCK_REASONS[$mode] . ' — «' . $p['name'] . '» ' . ($new > $old ? '+' : '') . ($new - $old) . " (المخزن $old ← $new)" . ($note ? " — $note" : ''), 'product', (string)$p['id']);
    return ['stock' => $new];
}

function stock_moves_list(array $q): array {
    $where = []; $args = [];
    if (!empty($q['product'])) { $where[] = 'product_id = ?'; $args[] = (int)$q['product']; }
    if (!empty($q['before'])) { $where[] = 'id < ?'; $args[] = (int)$q['before']; }
    $st = db()->prepare('SELECT * FROM stock_moves' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY id DESC LIMIT 80');
    $st->execute($args);
    return ['moves' => $st->fetchAll(), 'reasons' => STOCK_REASONS];
}


/** Find cashier invoices by number, customer name or phone (any date) — for reprinting. */
function pos_search(array $q): array {
    $t = str($q['q'] ?? '', 60);
    $sql = "SELECT id, code, customer_name, phone, payment_method, channel, total, status, created_by, created_at FROM orders WHERE source = 'pos'";
    $args = [];
    if ($t !== '') { $sql .= ' AND (code LIKE ? OR customer_name LIKE ? OR phone LIKE ?)'; $like = "%$t%"; $args = [$like, $like, $like]; }
    $st = db()->prepare($sql . ' ORDER BY id DESC LIMIT 40');
    $st->execute($args);
    $rows = $st->fetchAll();
    foreach ($rows as &$r) $r['created_at'] = utc_to_cairo($r['created_at']);
    return ['sales' => $rows, 'payments' => POS_PAYMENTS, 'channels' => POS_CHANNELS];
}

/** Gives products without a barcode an in-store EAN-13 (prefix 2 = for internal use), so labels can be printed. */
function auto_skus(array $b): array {
    $ids = array_map('intval', (array)($b['ids'] ?? []));
    $st = db()->prepare("UPDATE products SET sku = ? WHERE id = ? AND sku = ''");
    foreach ($ids as $id) {
        $base = '20' . str_pad((string)$id, 10, '0', STR_PAD_LEFT);   // 12 digits
        $sum = 0;
        for ($i = 0; $i < 12; $i++) $sum += (int)$base[$i] * ($i % 2 ? 3 : 1);
        $code = $base . ((10 - $sum % 10) % 10);
        if (act_row('SELECT id FROM products WHERE sku = ? AND id <> ?', [$code, $id])) continue;
        $st->execute([$code, $id]);
    }
    return admin_products();
}


/** Permanently removes an order (owner only). Items still counted as sold go back to stock first. */
function delete_order(array $b): array {
    $o = act_row('SELECT * FROM orders WHERE id = ?', [(int)($b['id'] ?? 0)]);
    if (!$o) throw new ApiError('الطلب مش موجود', 404);
    $db = db();
    $db->beginTransaction();
    try {
        if (!in_array($o['status'], ['cancelled', 'returned'], true)) {
            $items = $db->prepare('SELECT oi.product_id, oi.name, SUM(oi.qty) q FROM order_items oi WHERE oi.order_id = ? GROUP BY oi.product_id');
            $items->execute([$o['id']]);
            $up = $db->prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
            foreach ($items->fetchAll() as $m) {
                $up->execute([(int)$m['q'], (int)$m['product_id']]);
                $after = (int)(act_row('SELECT stock FROM products WHERE id = ?', [(int)$m['product_id']])['stock'] ?? 0);
                if ($m['product_id']) stock_move((int)$m['product_id'], (string)$m['name'], (int)$m['q'], $after, 'delete', '', $o['code']);
            }
        }
        $db->prepare('DELETE FROM order_items WHERE order_id = ?')->execute([$o['id']]);
        $db->prepare('DELETE FROM orders WHERE id = ?')->execute([$o['id']]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
    log_activity(current_admin(), 'order.delete', 'مسح الطلب ' . $o['code'] . ' (' . $o['customer_name'] . ' — ' . fmt_money($o['total']) . ')' . (!in_array($o['status'], ['cancelled', 'returned'], true) ? ' والكمية رجعت المخزن' : ''), 'order', (string)$o['id']);
    return ['deleted' => (int)$o['id']];
}


/** SQLite modifier that shifts a UTC timestamp to Egypt time, e.g. '+120 minutes' (follows summer time). */
function tz_mod(): string {
    $m = intdiv((new DateTime('now', new DateTimeZone('Africa/Cairo')))->getOffset(), 60);
    return ($m >= 0 ? '+' : '') . $m . ' minutes';
}


/**
 * Stops bots and pranksters from flooding fake orders (each order reserves stock):
 * hidden honeypot field, max 4 orders / 10 min and 12 / day per IP, max 3 / day per phone.
 */
function order_guard(array $b): void {
    if (trim((string)($b['website'] ?? '')) !== '') throw new ApiError('حصل خطأ، جرّب تاني', 400);   // honeypot: real people never fill it
    $db = db();
    $ip = (string)($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '');
    $now = time();
    $db->prepare('DELETE FROM order_attempts WHERE at < ?')->execute([$now - 86400]);
    $q = fn(string $sql, array $a) => (function () use ($db, $sql, $a) { $st = $db->prepare($sql); $st->execute($a); return (int)$st->fetchColumn(); })();
    try { $phone = preg_replace('/\D/', '', egypt_mobile((string)($b['customer']['phone'] ?? ''))); } catch (Throwable $e) { $phone = ''; }
    if ($q('SELECT COUNT(*) FROM order_attempts WHERE ip = ? AND at > ?', [$ip, $now - 600]) >= 4
        || $q('SELECT COUNT(*) FROM order_attempts WHERE ip = ? AND at > ?', [$ip, $now - 86400]) >= 12
        || ($phone !== '' && $q('SELECT COUNT(*) FROM order_attempts WHERE phone = ? AND at > ?', [$phone, $now - 86400]) >= 3)) {
        throw new ApiError('عملت طلبات كتير في وقت قصير. لو محتاج تطلب تاني كلمنا على الواتساب.', 429);
    }
}

/** Counted only for orders that went through, so a customer fixing typos is never blocked. */
function order_guard_record(string $phone): void {
    db()->prepare('INSERT INTO order_attempts (ip, phone, at) VALUES (?, ?, ?)')
        ->execute([(string)($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? ''), preg_replace('/\D/', '', $phone), time()]);
}


/* ============================================================
   Product pages for crawlers & link previews (WhatsApp/Facebook don't run JS)
   ============================================================ */

function product_url(array $p): string {
    return site_base() . '/product/' . (int)$p['id'] . (($p['slug'] ?? '') !== '' ? '-' . $p['slug'] : '');
}

/** index.html with the product's title, description, image, canonical and schema.org Product data baked in. */
function render_product_html(int $id): void {
    $html = (string)@file_get_contents(dirname(__DIR__) . '/index.html');
    $p = act_row('SELECT * FROM products WHERE id = ? AND active = 1', [$id]);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    if (!$p || $html === '') { http_response_code($p ? 200 : 404); echo $html; return; }
    $store = get_setting('store_name', 'HOMEX') ?: 'HOMEX';
    $h = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
    $url = product_url($p);
    $img = abs_url((string)$p['image']);
    $desc = trim(preg_replace('/\s+/u', ' ', (string)$p['description']));
    $desc = mb_substr($desc !== '' ? $desc : $p['name'] . ' من ' . $store . ' بضمان حقيقي وشحن لكل محافظات مصر', 0, 160);
    $title = $p['name'] . ' بسعر ' . number_format((float)$p['price']) . ' ج.م | ' . $store;
    $reviews = act_row("SELECT COUNT(*) n, AVG(rating) a FROM reviews WHERE product_id = ? AND status = 'approved'", [$id]) ?: ['n' => 0, 'a' => null];
    $ld = [
        '@context' => 'https://schema.org', '@type' => 'Product', 'name' => $p['name'], 'image' => [$img], 'description' => $desc,
        'sku' => ($p['sku'] ?? '') ?: 'HX' . $p['id'], 'brand' => ['@type' => 'Brand', 'name' => $p['brand'] ?: $store],
        'offers' => ['@type' => 'Offer', 'url' => $url, 'priceCurrency' => 'EGP', 'price' => (string)(float)$p['price'],
            'availability' => (int)$p['stock'] > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', 'itemCondition' => 'https://schema.org/NewCondition'],
    ];
    if ((int)$reviews['n'] > 0) $ld['aggregateRating'] = ['@type' => 'AggregateRating', 'ratingValue' => round((float)$reviews['a'], 1), 'reviewCount' => (int)$reviews['n']];
    $meta = '<title>' . $h($title) . '</title>'
        . '<meta name="description" content="' . $h($desc) . '" />'
        . '<meta property="og:type" content="product" /><meta property="og:title" content="' . $h($p['name']) . '" />'
        . '<meta property="og:description" content="' . $h($desc) . '" /><meta property="og:url" content="' . $h($url) . '" />'
        . '<meta property="og:image" content="' . $h($img) . '" /><meta property="product:price:amount" content="' . (float)$p['price'] . '" />'
        . '<meta property="product:price:currency" content="EGP" /><link rel="canonical" href="' . $h($url) . '" />'
        . '<script type="application/ld+json">' . json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>';
    // drop the generic tags of the home page, then add the product's
    $html = preg_replace('~<title>.*?</title>|<meta (name="description"|property="og:(title|description|type|url|image(:width|:height)?)")[^>]*>|<link rel="canonical"[^>]*>~su', '', $html);
    echo str_replace('</head>', $meta . "\n</head>", $html);
}

function sitemap_xml(): void {
    header('Content-Type: application/xml; charset=utf-8');
    $b = site_base();
    $urls = [[$b . '/', '1.0']];
    foreach (db()->query("SELECT id, slug, updated_at FROM products WHERE active = 1 ORDER BY id DESC") as $p) $urls[] = [product_url($p), '0.8', substr((string)$p['updated_at'], 0, 10)];
    foreach (db()->query("SELECT slug FROM pages WHERE in_footer = 1") as $pg) $urls[] = [$b . '/p/' . $pg['slug'], '0.3'];
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($urls as $u) echo '  <url><loc>' . htmlspecialchars($u[0], ENT_XML1) . '</loc>' . (!empty($u[2]) ? "<lastmod>{$u[2]}</lastmod>" : '') . "<priority>{$u[1]}</priority></url>\n";
    echo "</urlset>\n";
}


function product_reviews(int $pid): array {
    $st = db()->prepare("SELECT id, name, city, rating, comment, created_at FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY id DESC LIMIT 50");
    $st->execute([$pid]);
    $items = array_map(fn($r) => ['id' => (int)$r['id'], 'name' => $r['name'], 'city' => $r['city'], 'rating' => (int)$r['rating'], 'comment' => $r['comment'], 'createdAt' => utc_to_cairo($r['created_at'])], $st->fetchAll());
    $agg = act_row("SELECT COUNT(*) n, AVG(rating) a FROM reviews WHERE product_id = ? AND status = 'approved'", [$pid]);
    return ['items' => $items, 'count' => (int)($agg['n'] ?? 0), 'avg' => round((float)($agg['a'] ?? 0), 1)];
}
