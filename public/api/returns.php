<?php
/**
 * Return / exchange requests.
 * Customer (from /p/returns): finds the order with its code + phone, picks the items, type, reason,
 * a note and up to 3 photos. The dashboard («الاسترجاع والاستبدال») approves or rejects it.
 */
declare(strict_types=1);

const RETURN_REASONS = ['عيب صناعة', 'المنتج وصل مكسور أو متضرر', 'المنتج مختلف عن اللي طلبته', 'ناقص حاجة من العلبة', 'اللون أو المقاس مش مناسب', 'غيّرت رأيي', 'سبب تاني'];
const RETURN_STATUSES = ['pending', 'approved', 'rejected', 'done'];

function returns_migrate(PDO $db): void {
    $db->exec("
    CREATE TABLE IF NOT EXISTS return_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ref TEXT NOT NULL UNIQUE,
        order_id INTEGER NOT NULL,
        order_code TEXT NOT NULL,
        customer_name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL,
        items TEXT NOT NULL DEFAULT '[]',
        reason TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        images TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pending',
        admin_note TEXT NOT NULL DEFAULT '',
        decided_by TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_returns_status ON return_requests(status);
    CREATE INDEX IF NOT EXISTS idx_returns_order ON return_requests(order_id);
    CREATE TABLE IF NOT EXISTS return_attempts (ip TEXT NOT NULL, at INTEGER NOT NULL);
    ");
}

/** Last 10 digits, so 01012345678, +201012345678 and 201012345678 all match. */
function phone_key(string $p): string {
    $d = preg_replace('/\D+/', '', strtr($p, ['٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']));
    return substr((string)$d, -10);
}

function returns_throttle(): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
    $db = db();
    $db->prepare('DELETE FROM return_attempts WHERE at < ?')->execute([time() - 3600]);
    $st = $db->prepare('SELECT COUNT(*) FROM return_attempts WHERE ip = ? AND at > ?');
    $st->execute([$ip, time() - 900]);
    if ((int)$st->fetchColumn() >= 12) throw new ApiError('محاولات كتير. استنى ربع ساعة وجرّب تاني', 429);
    $db->prepare('INSERT INTO return_attempts (ip, at) VALUES (?, ?)')->execute([$ip, time()]);
}

/** Order found by code + the phone it was placed with (or the alternate phone). */
function returns_find_order(string $code, string $phone): array {
    if (($_SERVER['HTTP_X_HOMEX'] ?? '') !== '1') throw new ApiError('طلب غير صالح', 403);
    returns_throttle();
    $code = strtoupper(trim(str($code, 30)));
    $key = phone_key($phone);
    if ($code === '' || strlen($key) < 10) throw new ApiError('اكتب رقم الطلب ورقم الموبايل اللي طلبت بيه');
    $o = order_with_items($code);
    if (!$o || ($key !== phone_key((string)$o['phone']) && $key !== phone_key((string)$o['alt_phone']))) {
        throw new ApiError('مش لاقيين طلب بالرقم ده والموبايل ده. راجع رقم الطلب (مكتوب في رسالة التأكيد) ورقم الموبايل اللي طلبت بيه');
    }
    if (in_array($o['status'], ['awaiting_payment', 'cancelled'], true)) throw new ApiError('الطلب ده ملغي أو لسه مادفعش، ومينفعش يتعمل عليه استرجاع');
    return $o;
}

function return_out(array $r, bool $admin = false): array {
    $o = [
        'ref' => $r['ref'], 'orderCode' => $r['order_code'], 'type' => $r['type'],
        'items' => json_decode($r['items'], true) ?: [], 'reason' => $r['reason'], 'note' => $r['note'],
        'images' => json_decode($r['images'], true) ?: [], 'status' => $r['status'], 'adminNote' => $r['admin_note'],
        'createdAt' => utc_to_cairo($r['created_at']), 'updatedAt' => utc_to_cairo($r['updated_at']),
    ];
    if ($admin) $o += ['id' => (int)$r['id'], 'orderId' => (int)$r['order_id'], 'name' => $r['customer_name'], 'phone' => $r['phone'], 'decidedBy' => $r['decided_by']];
    return $o;
}

/** Step 1 — show the order's items and any request already made on it. */
function returns_lookup(array $b): array {
    $o = returns_find_order((string)($b['code'] ?? ''), (string)($b['phone'] ?? ''));
    $st = db()->prepare('SELECT * FROM return_requests WHERE order_id = ? ORDER BY id DESC');
    $st->execute([$o['id']]);
    return [
        'code' => $o['code'], 'status' => $o['status'], 'name' => $o['customer_name'],
        'delivered' => $o['status'] === 'delivered' || $o['status'] === 'returned',
        'items' => array_map(fn($i) => ['id' => (int)$i['id'], 'name' => $i['name'], 'image' => $i['image'], 'qty' => (int)$i['qty']], $o['items']),
        'requests' => array_map('return_out', $st->fetchAll()),
        'reasons' => RETURN_REASONS,
    ];
}

/** Saves one uploaded photo (field name) like the dashboard uploader does → /api/?r=img&f=… */
function returns_save_photo(array $f): string {
    if ($f['error'] !== UPLOAD_ERR_OK) throw new ApiError('صورة من الصور متاخدتش، جرّب تاني');
    if ($f['size'] > 8 * 1024 * 1024) throw new ApiError('الصورة أكبر من 8 ميجا');
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime] ?? null;
    if (!$ext) throw new ApiError('الصور لازم تكون JPG أو PNG أو WEBP');
    $name = date('Ymd') . '-' . bin2hex(random_bytes(6));
    $path = data_dir() . "/uploads/$name.$ext";
    $saved = false;
    if (function_exists('imagecreatefromstring')) {
        $src = @imagecreatefromstring((string)file_get_contents($f['tmp_name']));
        if (!$src) throw new ApiError('الملف ده مش صورة سليمة');
        $w = imagesx($src); $h = imagesy($src); $max = 1600;
        if ($w > $max || $h > $max) {
            $r = min($max / $w, $max / $h);
            $dst = imagecreatetruecolor((int)round($w * $r), (int)round($h * $r));
            imagecopyresampled($dst, $src, 0, 0, 0, 0, imagesx($dst), imagesy($dst), $w, $h);
            $src = $dst;
        }
        // re-encoding also strips anything hidden in the file (and the phone's location data)
        $saved = $ext === 'png' ? imagepng($src, $path, 7) : ($ext === 'webp' ? imagewebp($src, $path, 82) : imagejpeg($src, $path, 84));
    }
    if (!$saved && !move_uploaded_file($f['tmp_name'], $path)) throw new ApiError('مقدرتش أحفظ الصورة');
    return "/api/?r=img&f=$name.$ext";
}

/** Step 2 — multipart form: code, phone, type, items (JSON array of order item ids), reason, note, photos[] */
function returns_submit(): array {
    $o = returns_find_order((string)($_POST['code'] ?? ''), (string)($_POST['phone'] ?? ''));
    $type = ($_POST['type'] ?? '') === 'exchange' ? 'exchange' : (($_POST['type'] ?? '') === 'return' ? 'return' : '');
    if ($type === '') throw new ApiError('اختار عايز ترجّع المنتج ولا تستبدله');
    $ids = array_map('intval', (array)(json_decode((string)($_POST['items'] ?? '[]'), true) ?: []));
    $picked = array_values(array_filter($o['items'], fn($i) => in_array((int)$i['id'], $ids, true)));
    if (!$picked) throw new ApiError('اختار المنتج اللي عايز ترجّعه أو تستبدله');
    $reason = (string)($_POST['reason'] ?? '');
    if (!in_array($reason, RETURN_REASONS, true)) throw new ApiError('اختار سبب الاسترجاع أو الاستبدال');
    $note = trim(str((string)($_POST['note'] ?? ''), 1000));
    if (mb_strlen($note) < 5) throw new ApiError('اكتب ملاحظة قصيرة توضح المشكلة');
    $open = db()->prepare("SELECT ref FROM return_requests WHERE order_id = ? AND status IN ('pending','approved')");
    $open->execute([$o['id']]);
    if ($ref = $open->fetchColumn()) throw new ApiError("عندك طلب مفتوح على الأوردر ده برقم {$ref}، هنتواصل معاك بخصوصه");

    $files = [];
    if (!empty($_FILES['photos']['name']) && is_array($_FILES['photos']['name'])) {
        foreach ($_FILES['photos']['name'] as $i => $_) {
            if (($_FILES['photos']['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
            $files[] = ['tmp_name' => $_FILES['photos']['tmp_name'][$i], 'error' => $_FILES['photos']['error'][$i], 'size' => $_FILES['photos']['size'][$i]];
        }
    }
    if (count($files) > 3) throw new ApiError('أقصى حاجة 3 صور');
    $images = array_map('returns_save_photo', $files);

    $ref = 'R' . date('ymd') . strtoupper(bin2hex(random_bytes(2)));
    $now = gmdate('Y-m-d H:i:s');
    $items = array_map(fn($i) => ['name' => $i['name'], 'qty' => (int)$i['qty'], 'image' => $i['image']], $picked);
    db()->prepare('INSERT INTO return_requests (ref, order_id, order_code, customer_name, phone, type, items, reason, note, images, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([$ref, $o['id'], $o['code'], $o['customer_name'], $o['phone'], $type, json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $reason, $note, json_encode($images, JSON_UNESCAPED_SLASHES), 'pending', $now, $now]);
    return ['ref' => $ref, 'type' => $type];
}

/* ---------- dashboard ---------- */

function admin_returns(array $q): array {
    $status = in_array($q['status'] ?? '', RETURN_STATUSES, true) ? $q['status'] : 'pending';
    $st = db()->prepare('SELECT * FROM return_requests WHERE status = ? ORDER BY id DESC LIMIT 300');
    $st->execute([$status]);
    $counts = [];
    foreach (db()->query('SELECT status, COUNT(*) n FROM return_requests GROUP BY status') as $r) $counts[$r['status']] = (int)$r['n'];
    return ['requests' => array_map(fn($r) => return_out($r, true), $st->fetchAll()), 'counts' => $counts];
}

function admin_return_update(array $b): array {
    $id = (int)($b['id'] ?? 0);
    $status = (string)($b['status'] ?? '');
    if (!in_array($status, RETURN_STATUSES, true)) throw new ApiError('حالة مش معروفة');
    $note = str((string)($b['note'] ?? ''), 1000);
    $st = db()->prepare('SELECT * FROM return_requests WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    if (!$r) throw new ApiError('الطلب مش موجود', 404);
    db()->prepare('UPDATE return_requests SET status = ?, admin_note = ?, decided_by = ?, updated_at = ? WHERE id = ?')
        ->execute([$status, $note, actor_name(), gmdate('Y-m-d H:i:s'), $id]);
    return admin_returns(['status' => (string)($b['view'] ?? $status)]);
}
