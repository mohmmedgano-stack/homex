<?php
/**
 * «قايمة جهاز العروسة» — a gift list.
 * The bride picks products and quantities and gets two links: a public one to share (/w/CODE) and a private
 * one to edit it (/w/CODE?k=TOKEN). Family and friends open the public link, buy a gift, and can have it
 * delivered to her address without ever seeing it. Each product shows how many are still needed.
 */
declare(strict_types=1);

function registry_migrate(PDO $db): void {
    $db->exec("
    CREATE TABLE IF NOT EXISTS registries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        token TEXT NOT NULL,
        title TEXT NOT NULL,
        bride_name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        wedding_date TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS registry_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registry_id INTEGER NOT NULL REFERENCES registries(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1,
        sort INTEGER NOT NULL DEFAULT 0,
        UNIQUE(registry_id, product_id)
    );
    CREATE TABLE IF NOT EXISTS registry_attempts (ip TEXT NOT NULL, at INTEGER NOT NULL);
    ");
    $cols = array_column($db->query('PRAGMA table_info(orders)')->fetchAll(), 'name');
    if (!in_array('registry_id', $cols, true)) $db->exec('ALTER TABLE orders ADD COLUMN registry_id INTEGER');
}

function registry_throttle(int $max = 20): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
    $db = db();
    $db->prepare('DELETE FROM registry_attempts WHERE at < ?')->execute([time() - 3600]);
    $st = $db->prepare('SELECT COUNT(*) FROM registry_attempts WHERE ip = ? AND at > ?');
    $st->execute([$ip, time() - 900]);
    if ((int)$st->fetchColumn() >= $max) throw new ApiError('محاولات كتير. استنى شوية وجرّب تاني', 429);
    $db->prepare('INSERT INTO registry_attempts (ip, at) VALUES (?, ?)')->execute([$ip, time()]);
}

function registry_row(string $code): ?array {
    $st = db()->prepare('SELECT * FROM registries WHERE code = ? AND active = 1');
    $st->execute([strtoupper(trim($code))]);
    return $st->fetch() ?: null;
}

/** Pieces already bought from this list, per product (cancelled / returned / unpaid orders don't count) */
function registry_bought(int $rid): array {
    $st = db()->prepare("SELECT oi.product_id, SUM(oi.qty) n FROM orders o JOIN order_items oi ON oi.order_id = o.id
        WHERE o.registry_id = ? AND o.status NOT IN ('cancelled','returned','awaiting_payment') GROUP BY oi.product_id");
    $st->execute([$rid]);
    $out = [];
    foreach ($st->fetchAll() as $r) $out[(int)$r['product_id']] = (int)$r['n'];
    return $out;
}

function registry_out(array $r, bool $owner = false): array {
    $items = db()->prepare('SELECT ri.qty, ri.product_id, p.* FROM registry_items ri JOIN products p ON p.id = ri.product_id WHERE ri.registry_id = ? AND p.active = 1 ORDER BY ri.sort, ri.id');
    $items->execute([$r['id']]);
    $bought = registry_bought((int)$r['id']);
    $list = [];
    foreach ($items->fetchAll() as $row) {
        $list[] = ['product' => product_out($row), 'wanted' => (int)$row['qty'], 'bought' => min((int)$row['qty'], $bought[(int)$row['product_id']] ?? 0)];
    }
    $first = trim(explode(' ', trim((string)$r['bride_name']))[0] ?? '');
    $o = ['code' => $r['code'], 'title' => $r['title'], 'brideName' => $first, 'weddingDate' => $r['wedding_date'], 'message' => $r['message'], 'items' => $list];
    if ($owner) $o += ['token' => $r['token'], 'fullName' => $r['bride_name'], 'phone' => $r['phone'], 'city' => $r['city'], 'address' => $r['address']];
    return $o;
}

/** Validates the bride's details + chosen items (used by create and update) */
function registry_input(array $b): array {
    $title = trim(str((string)($b['title'] ?? ''), 80));
    $name = preg_replace('/\s+/u', ' ', trim(str((string)($b['brideName'] ?? ''), 80)));
    $phone = egypt_mobile((string)($b['phone'] ?? ''));
    $city = str((string)($b['city'] ?? ''), 60);
    $address = trim(str((string)($b['address'] ?? ''), 500));
    $date = (string)($b['weddingDate'] ?? '');
    $msg = trim(str((string)($b['message'] ?? ''), 300));
    if (mb_strlen($name) < 2) throw new ApiError('اكتبي اسم العروسة');
    if ($title === '') $title = 'جهاز ' . explode(' ', $name)[0];
    if ($phone === null) throw new ApiError('رقم الموبايل لازم يكون رقم مصري صحيح من 11 رقم');
    if (!in_array($city, GOVERNORATES, true)) throw new ApiError('اختاري المحافظة');
    if (mb_strlen($address) < 10) throw new ApiError('اكتبي العنوان بالتفصيل عشان الهدايا توصل');
    if ($date !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) $date = '';
    $items = [];
    foreach (array_slice((array)($b['items'] ?? []), 0, 60) as $i => $it) {
        $pid = (int)($it['productId'] ?? 0);
        $qty = max(1, min(20, (int)($it['qty'] ?? 1)));
        if ($pid > 0) $items[$pid] = [$qty, $i];
    }
    if (!$items) throw new ApiError('اختاري منتج واحد على الأقل للقايمة');
    $ok = db()->query('SELECT id FROM products WHERE active = 1 AND id IN (' . implode(',', array_map('intval', array_keys($items))) . ')')->fetchAll(PDO::FETCH_COLUMN);
    $items = array_intersect_key($items, array_flip(array_map('intval', $ok)));
    if (!$items) throw new ApiError('المنتجات دي مبقتش متاحة');
    return [$title, $name, $phone, $city, $address, $date, $msg, $items];
}

function registry_save_items(int $rid, array $items): void {
    $db = db();
    $db->prepare('DELETE FROM registry_items WHERE registry_id = ?')->execute([$rid]);
    $ins = $db->prepare('INSERT INTO registry_items (registry_id, product_id, qty, sort) VALUES (?,?,?,?)');
    foreach ($items as $pid => [$qty, $sort]) $ins->execute([$rid, $pid, $qty, $sort]);
}

function registry_create(array $b): array {
    if (($_SERVER['HTTP_X_HOMEX'] ?? '') !== '1') throw new ApiError('طلب غير صالح', 403);
    if (($b['website'] ?? '') !== '') throw new ApiError('طلب غير صالح', 403); // bots fill hidden fields
    registry_throttle(6);
    [$title, $name, $phone, $city, $address, $date, $msg, $items] = registry_input($b);
    $db = db();
    $now = gmdate('Y-m-d H:i:s');
    do { $code = strtoupper(substr(str_replace(['0', 'O', '1', 'I'], '', bin2hex(random_bytes(6))), 0, 6)); } while (registry_row($code));
    $token = bin2hex(random_bytes(12));
    $db->beginTransaction();
    $db->prepare('INSERT INTO registries (code, token, title, bride_name, phone, city, address, wedding_date, message, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([$code, $token, $title, $name, $phone, $city, $address, $date, $msg, $now, $now]);
    registry_save_items((int)$db->lastInsertId(), $items);
    $db->commit();
    return registry_out(registry_row($code), true);
}

function registry_get(array $q): array {
    $r = registry_row((string)($q['code'] ?? ''));
    if (!$r) throw new ApiError('القايمة دي مش موجودة أو اتقفلت', 404);
    $owner = isset($q['k']) && hash_equals($r['token'], (string)$q['k']);
    if (isset($q['k']) && !$owner) registry_throttle();
    return registry_out($r, $owner);
}

function registry_update(array $b): array {
    if (($_SERVER['HTTP_X_HOMEX'] ?? '') !== '1') throw new ApiError('طلب غير صالح', 403);
    $r = registry_row((string)($b['code'] ?? ''));
    if (!$r || !hash_equals($r['token'], (string)($b['k'] ?? ''))) { registry_throttle(); throw new ApiError('اللينك ده مش بيسمح بالتعديل', 403); }
    [$title, $name, $phone, $city, $address, $date, $msg, $items] = registry_input($b);
    db()->prepare('UPDATE registries SET title=?, bride_name=?, phone=?, city=?, address=?, wedding_date=?, message=?, updated_at=? WHERE id=?')
        ->execute([$title, $name, $phone, $city, $address, $date, $msg, gmdate('Y-m-d H:i:s'), $r['id']]);
    registry_save_items((int)$r['id'], $items);
    return registry_out(registry_row($r['code']), true);
}

/* ---------- dashboard ---------- */
function admin_registries(): array {
    $rows = db()->query('SELECT * FROM registries ORDER BY id DESC LIMIT 300')->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $o = registry_out($r, true);
        $orders = db()->prepare("SELECT code, customer_name, total, status, created_at FROM orders WHERE registry_id = ? ORDER BY id DESC");
        $orders->execute([$r['id']]);
        $o['id'] = (int)$r['id']; $o['active'] = (int)$r['active'] === 1; $o['createdAt'] = utc_to_cairo($r['created_at']);
        $o['orders'] = $orders->fetchAll();
        unset($o['token']);
        $out[] = $o;
    }
    return ['registries' => $out];
}
