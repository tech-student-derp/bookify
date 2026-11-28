<?php
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/listing_visibility.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('Public statistics query error: ' . $e->getMessage());
    errorResponse('Marketplace statistics are temporarily unavailable.', 503);
});

requireMethod('GET');
$db = getDB();
$visibility = publicListingVisibilitySql('b');

$stmt = $db->query(
    "SELECT
        (SELECT COUNT(DISTINCT b.id)
         FROM book_listings b
         WHERE {$visibility}) AS total_books,
        (SELECT COUNT(DISTINCT seller.id)
         FROM users seller
         INNER JOIN seller_applications application ON application.user_id = seller.id
         WHERE seller.role = 'seller'
           AND seller.account_status = 'active'
           AND seller.is_verified = 1
           AND application.status = 'approved') AS active_sellers,
        (SELECT COUNT(DISTINCT LOWER(TRIM(b.language)))
         FROM book_listings b
         WHERE {$visibility}
           AND b.language IS NOT NULL
           AND TRIM(b.language) <> '') AS available_languages"
);
$statistics = $stmt->fetch();

successResponse([
    'total_books' => (int) $statistics['total_books'],
    'active_sellers' => (int) $statistics['active_sellers'],
    'available_languages' => (int) $statistics['available_languages'],
]);
