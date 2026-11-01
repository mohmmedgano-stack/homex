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
    CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    SQL);

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
    'top_bar_text' => 'توصيل لكل المحافظات والدفع عند الاستلام',
    'phone' => '', 'whatsapp' => '', 'email' => '', 'address' => '',
    'facebook' => '', 'instagram' => '', 'tiktok' => '',
    'shipping_fee' => '60', 'free_shipping_over' => '0',
    'pay_cod' => '1', 'pay_vodafone' => '', 'pay_instapay' => '',
    'hero_title' => '', 'hero_subtitle' => '',
];

function public_settings(): array {
    $out = PUBLIC_SETTINGS;
    foreach (db()->query('SELECT key, value FROM settings') as $row) {
        if (array_key_exists($row['key'], $out)) $out[$row['key']] = $row['value'];
    }
    return $out;
}

function all_settings(): array { return public_settings(); }

function save_settings(array $b): array {
    $st = db()->prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    foreach (PUBLIC_SETTINGS as $k => $_) {
        if (array_key_exists($k, $b)) $st->execute([$k, str($b[$k], 500)]);
    }
    return public_settings();
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
            $max = 1400;
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

function serve_image(string $f): void {
    if (!preg_match('/^[0-9]{8}-[a-f0-9]{12}\.(jpg|png|webp|gif)$/', $f)) { http_response_code(404); exit; }
    $path = data_dir() . "/uploads/$f";
    if (!is_file($path)) { http_response_code(404); exit; }
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
    return ['categories' => categories(), 'products' => array_map('product_out', $rows)];
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
    if ($id !== '' && db()->query("SELECT 1 FROM categories WHERE id = " . db()->quote($id))->fetchColumn()) {
        db()->prepare('UPDATE categories SET name = ?, sort = ? WHERE id = ?')->execute([$name, $sort, $id]);
    } else {
        $id = 'c' . substr(bin2hex(random_bytes(4)), 0, 7);
        db()->prepare('INSERT INTO categories (id, name, sort) VALUES (?, ?, ?)')->execute([$id, $name, $sort]);
    }
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

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];

function create_order(array $b): array {
    $c = (array)($b['customer'] ?? []);
    $name = str($c['name'] ?? '', 100);
    $phone = preg_replace('/[^0-9+]/', '', (string)($c['phone'] ?? ''));
    $address = str($c['address'] ?? '', 500);
    if ($name === '' || strlen($phone) < 10 || $address === '') throw new ApiError('اكتب الاسم ورقم الموبايل والعنوان صح');

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
        if (!in_array($pm, ['cod', 'vodafone', 'instapay'], true)) $pm = 'cod';
        $code = 'HX' . date('ymd') . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
        $db->prepare('INSERT INTO orders (code, customer_name, phone, alt_phone, city, address, notes, payment_method, subtotal, shipping_fee, total, cost_total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$code, $name, $phone, str($c['altPhone'] ?? '', 20), str($c['city'] ?? '', 60), $address, str($c['notes'] ?? '', 500), $pm, $sub, $fee, $total, $cost]);
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
    return ['code' => $code, 'subtotal' => $sub, 'shippingFee' => $fee, 'total' => $total];
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
