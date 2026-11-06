<?php
/** /product/12-slug → index.html with that product's meta tags (see .htaccess). */
declare(strict_types=1);
require __DIR__ . '/lib.php';
try {
    if (($_GET['sitemap'] ?? '') === '1') { sitemap_xml(); exit; }
    if (($_GET['feed'] ?? '') === 'catalog') { catalog_feed(); exit; }
    render_product_html((int)($_GET['id'] ?? 0));
} catch (Throwable $e) {
    error_log('[homex page] ' . $e->getMessage());
    readfile(dirname(__DIR__) . '/index.html');
}
