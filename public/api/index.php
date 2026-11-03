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
    switch ("$m $r") {
        /* ---------- public ---------- */
        case 'GET settings':   ok(public_settings()); break;
        case 'GET catalog':    ok(catalog()); break;
        case 'POST order':     ok(create_order(body())); break;
        case 'GET img':        serve_image($_GET['f'] ?? ''); break;
        case 'GET dealers':    ok(dealers_public()); break;
        case 'POST paymob-callback': ok(paymob_callback()); break;
        case 'GET paymob-return': paymob_return(); break;
        case 'GET kashier-return': kashier_return(); break;
        case 'POST kashier-webhook': ok(kashier_webhook()); break;
        case 'GET fawry-return': fawry_return(); break;
        case 'POST fawry-callback': ok(fawry_callback()); break;
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

        /* ---------- admin: dealers ---------- */
        case 'GET admin/dealers':      need(); ok(dealers_admin()); break;
        case 'POST admin/dealer':      need(); ok(save_dealer(body())); break;
        case 'POST admin/dealer-delete': need(); ok(delete_dealer((int)(body()['id'] ?? 0))); break;

        /* ---------- admin: orders ---------- */
        case 'GET admin/orders':       need(); ok(admin_orders($_GET)); break;
        case 'POST admin/order-status': need(); ok(set_order_status(body())); break;
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
