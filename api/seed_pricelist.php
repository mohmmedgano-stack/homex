<?php
/**
 * One-time import of the HOMEX 2026 price list (10 products) — runs once from migrate(),
 * skips any product whose model code is already in the store, and never edits or deletes anything.
 * Photos are the ones printed in the price list, in /products/.
 * Only facts from the price list are used: name, model code, consumer price, size/capacity in the name.
 */
declare(strict_types=1);

function seed_pricelist_2026(PDO $db): void {
    $flag = $db->prepare("SELECT value FROM settings WHERE key = 'seed_pricelist_2026'");
    $flag->execute();
    if ($flag->fetchColumn() !== false) return;

    $cats = [];
    foreach ($db->query('SELECT id, name FROM categories')->fetchAll() as $c) $cats[$c['name']] = $c['id'];
    $cat = fn(string $name) => $cats[$name] ?? null;

    // [model code, name, consumer price, category name, capacity/size, link name, short description]
    $items = [
        ['HX-T43S1', 'شاشة HOMEX 43 بوصة سمارت', 10049, 'شاشات', '43 بوصة', 'homex-43-inch-smart-tv-hx-t43s1',
            'شاشة HOMEX مقاس 43 بوصة سمارت، موديل HX-T43S1.'],
        ['HX-T32N1', 'شاشة HOMEX 32 بوصة عادية', 5170, 'شاشات', '32 بوصة', 'homex-32-inch-tv-hx-t32n1',
            'شاشة HOMEX مقاس 32 بوصة عادية (مش سمارت)، موديل HX-T32N1.'],
        ['HX-FP2600', 'محضر طعام HOMEX', 2499, 'خلاطات ومحضرات', '', 'homex-food-processor-hx-fp2600',
            'محضر طعام HOMEX موديل HX-FP2600.'],
        ['HX-B2200', 'خلاط HOMEX', 1999, 'خلاطات ومحضرات', '', 'homex-blender-hx-b2200',
            'خلاط HOMEX موديل HX-B2200.'],
        ['HX-C2000', 'كبة HOMEX سعة 9 لتر', 1749, 'كبة ومفارم', '9 لتر', 'homex-9l-chopper-hx-c2000',
            'كبة HOMEX سعة 9 لتر، موديل HX-C2000.'],
        ['HX-K1400', 'كاتيل HOMEX 2 في 1', 1149, 'كاتيل وغلايات', '', 'homex-2-in-1-kettle-hx-k1400',
            'كاتيل HOMEX 2 في 1، موديل HX-K1400.'],
        ['HX-SI2200', 'مكواة بخار HOMEX', 1099, 'مكاوي', '', 'homex-steam-iron-hx-si2200',
            'مكواة بخار HOMEX موديل HX-SI2200.'],
        ['HX-H1500', 'هاند بلندر HOMEX', 1049, 'خلاطات ومحضرات', '', 'homex-hand-blender-hx-h1500',
            'هاند بلندر HOMEX موديل HX-H1500.'],
        ['HX-VC500', 'قطاعة خضار HOMEX', 999, 'كبة ومفارم', '', 'homex-vegetable-chopper-hx-vc500',
            'قطاعة خضار HOMEX موديل HX-VC500.'],
        ['HX-CM400', 'كنكة قهوة كهربائية HOMEX', 249, 'أجهزة تانية', '', 'homex-electric-coffee-maker-hx-cm400',
            'كنكة HOMEX كهربائية لعمل القهوة، موديل HX-CM400.'],
    ];

    $exists = $db->prepare('SELECT id FROM products WHERE sku = ? OR model_no = ? LIMIT 1');
    $ins = $db->prepare('INSERT INTO products (name, category_id, brand, price, original_price, cost, stock, image, gallery, description, features, specs, warranty, wattage, capacity, is_featured, is_new, active, rating, reviews_count, created_by, updated_by, sku, slug, options)
        VALUES (?, ?, ?, ?, NULL, 0, 10, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 1, 0, 0, ?, ?, ?, ?, ?)');
    $by = 'قائمة أسعار 2026';
    $db->beginTransaction();
    try {
        foreach ($items as [$code, $name, $price, $catName, $cap, $slug, $desc]) {
            $exists->execute([$code, $code]);
            if ($exists->fetchColumn()) continue;
            $img = '/products/' . strtolower($code) . '.webp';
            $specs = [['label' => 'الماركة', 'value' => 'HOMEX'], ['label' => 'الموديل', 'value' => $code]];
            if ($cap !== '') $specs[] = ['label' => str_contains($cap, 'بوصة') ? 'المقاس' : 'السعة', 'value' => $cap];
            $ins->execute([
                $name, $cat($catName), 'HOMEX', $price, $img, json_encode([$img], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $desc,
                '[]', json_encode($specs, JSON_UNESCAPED_UNICODE), '', '', $cap, $by, $by, $code, $slug, '[]',
            ]);
            $pid = (int)$db->lastInsertId();
            $db->prepare("INSERT INTO stock_moves (product_id, product_name, change, stock_after, reason, note, ref, admin_name, created_at) VALUES (?,?,?,?,?,?,?,?,?)")
                ->execute([$pid, $name, 10, 10, 'opening', 'رصيد أول المدة (مؤقت من استيراد قائمة الأسعار)', '', $by, cairo_now()]);
        }
        $db->prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seed_pricelist_2026', ?)")->execute([gmdate('c')]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        error_log('[homex seed] ' . $e->getMessage());
    }
}
