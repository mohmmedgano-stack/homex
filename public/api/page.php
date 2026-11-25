<?php
/** /product/12-slug and /p/slug → index.html with that page's own meta tags (see .htaccess). */
declare(strict_types=1);
require __DIR__ . '/lib.php';
try { monitor_begin('PAGE ' . (isset($_GET['home']) ? 'home' : (isset($_GET['page']) ? 'page' : (isset($_GET['id']) ? 'product' : 'other')))); } catch (Throwable $e) {}
try {
    if (($_GET['sitemap'] ?? '') === '1') { sitemap_xml(); exit; }
    if (($_GET['feed'] ?? '') === 'catalog') { catalog_feed(); exit; }
    if (($_GET['llms'] ?? '') === '1') { llms_txt(); exit; }
    if (($_GET['home'] ?? '') === '1') { render_home_html(); exit; }
    if (isset($_GET['page'])) { render_page_html((string)$_GET['page']); exit; }
    render_product_html((int)($_GET['id'] ?? 0));
} catch (Throwable $e) {
    error_log('[homex page] ' . $e->getMessage());
    app_log('error', 'server', $e->getMessage(), ['route' => 'PAGE', 'file' => basename($e->getFile()) . ':' . $e->getLine()]);
    readfile(dirname(__DIR__) . '/index.html');
}
