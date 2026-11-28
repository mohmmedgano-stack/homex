<?php
/** /product/12-slug and /p/slug → index.html with that page's own meta tags (see .htaccess). */
declare(strict_types=1);
require __DIR__ . '/lib.php';
try { monitor_begin('PAGE ' . (isset($_GET['home']) ? 'home' : (isset($_GET['page']) ? 'page' : (isset($_GET['id']) ? 'product' : 'other')))); } catch (Throwable $e) {}
try {
    if (($_GET['sitemap'] ?? '') === '1') { sitemap_xml(); exit; }
    if (($_GET['feed'] ?? '') === 'catalog') { catalog_feed(); exit; }
    if (($_GET['llms'] ?? '') === '1') { llms_txt(); exit; }
    if (($_GET['home'] ?? '') === '1') { pagecache_render('home.html', 'render_home_html'); exit; }
    if (isset($_GET['page'])) {
        $slug = (string)$_GET['page'];
        pagecache_render(preg_match('/^[a-z0-9-]{1,60}$/', $slug) ? "page-$slug.html" : 'x', fn() => render_page_html($slug));
        exit;
    }
    $id = (int)($_GET['id'] ?? 0);
    pagecache_render("product-$id.html", fn() => render_product_html($id));
} catch (Throwable $e) {
    error_log('[homex page] ' . $e->getMessage());
    app_log('error', 'server', $e->getMessage(), ['route' => 'PAGE', 'file' => basename($e->getFile()) . ':' . $e->getLine()]);
    readfile(dirname(__DIR__) . '/index.html');
}
