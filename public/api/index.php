<?php
/**
 * HOMEX API — single entry point: /api/?r=<route>
 * Storage: SQLite + uploads kept OUTSIDE the web root (survives every deploy).
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

$r = $_GET['r'] ?? '';
$m = $_SERVER['REQUEST_METHOD'];

try {
    if ($m === 'GET' && in_array($r, ['catalog', 'settings', 'me'], true)) daily_backup();
    try { activity_begin("$m $r"); } catch (ApiError $e) { throw $e; } catch (Throwable $e) { error_log("[homex] activity: " . $e->getMessage()); }
    switch ("$m $r") {
        /* ---------- public ---------- */
        case 'GET settings':   ok(public_settings()); break;
        case 'GET catalog':    ok(catalog()); break;
        case 'POST order':     ok(create_order(body())); break;
        case 'GET img':        serve_image($_GET['f'] ?? ''); break;
        case 'GET dealers':    ok(dealers_public()); break;
        case 'GET review-form': ok(review_form((string)($_GET['code'] ?? ''), (string)($_GET['t'] ?? ''))); break;
        case 'POST review':    ok(review_submit(body())); break;
        case 'GET reviews':    ok(product_reviews((int)($_GET['product'] ?? 0))); break;
        case 'GET order-view': ok(order_view((string)($_GET['code'] ?? ''), (string)($_GET['t'] ?? ''))); break;
        case 'POST paymob-callback': ok(paymob_callback()); break;
        case 'GET paymob-return': paymob_return(); break;
        case 'GET kashier-return': kashier_return(); break;
        case 'POST kashier-webhook': ok(kashier_webhook()); break;
        case 'GET fawry-return': fawry_return(); break;
        case 'POST fawry-callback': ok(fawry_callback()); break;
        case 'POST coupon-check': ok(coupon_check(body())); break;
        case 'POST cart-save':  ok(cart_save(body())); break;
        case 'POST dealer-click': ok(dealer_click(body())); break;

        /* ---------- auth ---------- */
        case 'GET me':         ok(me()); break;
        case 'POST setup':     ok(setup_first_admin(body())); break;
        case 'POST login':     ok(login(body())); break;
        case 'POST logout':    logout(); ok(true); break;
        case 'POST password':  ok(change_own_password(body())); break;

        /* ---------- admin: products & categories ---------- */
        case 'GET admin/products':     need(); ok(admin_products()); break;
        case 'POST admin/product':     need(); ok(save_product(body())); break;
        case 'POST admin/product-delete': need(); ok(delete_row('products', (int)(body()['id'] ?? 0))); break;
        case 'POST admin/upload':      need(); ok(upload_image('img')); break;
        case 'GET admin/categories':   need(); ok(categories(true)); break;
        case 'POST admin/category':    need(); ok(save_category(body())); break;
        case 'POST admin/categories-order': need(); ok(reorder_categories(body())); break;
        case 'POST admin/category-delete': need(); ok(delete_category((string)(body()['id'] ?? ''))); break;

        case 'GET admin/reviews':      need(); ok(reviews_admin($_GET)); break;
        case 'POST admin/review':      need(); ok(review_moderate(body())); break;
        case 'GET admin/coupons':      need(); ok(coupons_admin()); break;
        case 'POST admin/coupon':      need('owner'); ok(save_coupon(body())); break;
        case 'POST admin/coupon-delete': need('owner'); ok(delete_coupon((int)(body()['id'] ?? 0))); break;
        case 'GET admin/carts':        need(); ok(carts_admin($_GET)); break;
        case 'POST admin/cart':        need(); ok(cart_update(body())); break;
        case 'GET admin/orders-pulse': need(); ok(orders_pulse()); break;
        case 'POST admin/wa-test':     need('owner'); ok(wa_test()); break;
        case 'POST admin/email-test':  need('owner'); ok(test_email(body())); break;
        case 'POST admin/capi-test':   need('owner'); ok(capi_test(body())); break;
        case 'POST admin/wa-cloud-test': need('owner'); ok(test_wa_cloud(body())); break;
        case 'GET admin/backups':      need('owner'); ok(list_backups()); break;
        case 'POST admin/backup-now':  need('owner'); $n = make_backup('manual'); log_activity(current_admin(), 'backup.create', 'عمل نسخة احتياطية يدوي ' . $n, 'backup'); ok(list_backups()); break;
        case 'GET admin/backup-download': need('owner'); download_backup((string)($_GET['f'] ?? '')); break;
        case 'GET admin/images-download': need('owner'); download_images(); break;
        case 'POST admin/backup-restore': need('owner'); ok(restore_backup()); break;
        case 'GET admin/activity':     need('owner'); ok(activity_list($_GET)); break;

        /* ---------- admin: cashier & inventory ---------- */
        case 'POST admin/pos-sale':     need(); ok(pos_sale(body())); break;
        case 'GET admin/pos-day':       need(); ok(pos_day($_GET)); break;
        case 'GET admin/pos-receipt':   need(); ok(pos_receipt((string)($_GET['code'] ?? ''))); break;
        case 'GET admin/pos-search':   need(); ok(pos_search($_GET)); break;
        case 'POST admin/auto-skus':   need(); ok(auto_skus(body())); break;
        case 'POST admin/pos-return':   need(); ok(pos_void(body())); break;
        case 'POST admin/stock-adjust': need(); ok(stock_adjust(body())); break;
        case 'GET admin/stock-moves':   need(); ok(stock_moves_list($_GET)); break;

        /* ---------- admin: site pages ---------- */
        case 'GET admin/pages':        need(); ok(site_pages(true, public_settings()['store_name'])); break;
        case 'POST admin/page':        need(); ok(save_page(body())); break;
        case 'POST admin/page-delete': need(); ok(delete_page((string)(body()['slug'] ?? ''))); break;
        case 'POST admin/pages-order': need(); ok(reorder_pages(body())); break;

        /* ---------- admin: home slider ---------- */
        case 'GET admin/banners':      need(); ok(banners(true)); break;
        case 'POST admin/banner':      need(); ok(save_banner(body())); break;
        case 'POST admin/banner-delete': need(); ok(delete_banner((int)(body()['id'] ?? 0))); break;
        case 'POST admin/banners-order': need(); ok(reorder_banners(body())); break;

        /* ---------- admin: dealers ---------- */
        case 'GET admin/dealers':      need(); ok(dealers_admin()); break;
        case 'POST admin/dealer':      need(); ok(save_dealer(body())); break;
        case 'POST admin/dealer-delete': need(); ok(delete_dealer((int)(body()['id'] ?? 0))); break;

        /* ---------- admin: orders ---------- */
        case 'GET admin/orders':       need(); ok(admin_orders($_GET)); break;
        case 'POST admin/order-status': need(); ok(set_order_status(body())); break;
        case 'POST admin/order-tracking': need(); ok(set_tracking(body())); break;
        case 'POST admin/bosta-create': need(); ok(bosta_create(body())); break;
        case 'GET admin/bosta-districts': need(); ok(bosta_districts($_GET)); break;
        case 'POST admin/bosta-test':  need('owner'); ok(bosta_test()); break;
        case 'POST admin/order-delete': need('owner'); ok(delete_order(body())); break;
        case 'GET admin/orders-export': need(); export_orders($_GET); break;

        /* ---------- admin: accounting ---------- */
        case 'GET admin/summary':      need(); ok(summary($_GET['from'] ?? null, $_GET['to'] ?? null)); break;
        case 'GET admin/expenses':     need(); ok(expenses($_GET['from'] ?? null, $_GET['to'] ?? null)); break;
        case 'POST admin/expense':     need(); ok(save_expense(body())); break;
        case 'POST admin/expense-delete': need(); ok(delete_row('expenses', (int)(body()['id'] ?? 0))); break;

        /* ---------- admin: settings & users (owner only) ---------- */
        case 'GET admin/settings':     need(); ok(all_settings()); break;
        case 'POST admin/settings':    need('owner'); ok(save_settings(body())); break;
        case 'GET admin/admins':       need('owner'); ok(list_admins()); break;
        case 'POST admin/admin':       need('owner'); ok(save_admin(body())); break;
        case 'POST admin/admin-delete': need('owner'); ok(delete_admin((int)(body()['id'] ?? 0))); break;

        default: fail('مسار غير معروف', 404);
    }
} catch (ApiError $e) {
    fail($e->getMessage(), $e->getCode() ?: 400);
} catch (Throwable $e) {
    error_log('[homex] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    fail('حصل خطأ في السيرفر، جرّب تاني', 500);
}
