<?php
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/listing_media.php';
require_once __DIR__ . '/../utils/listing_visibility.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('Public seller storefront error: ' . $e->getMessage());
    errorResponse('The seller storefront could not be loaded.', 500);
});

requireMethod('GET');
$sellerId = filter_var($_GET['seller_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if ($sellerId === false) errorResponse('Seller not found.', 404);
$db = getDB();
$profileStmt = $db->prepare(
    "SELECT u.id, COALESCE(NULLIF(sp.store_name, ''), NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), '')) AS store_name,
            sp.bio
     FROM users u
     JOIN seller_applications sa ON sa.user_id = u.id AND sa.status = 'approved'
     LEFT JOIN seller_profiles sp ON sp.user_id = u.id
     WHERE u.id = ? AND u.role = 'seller' AND u.account_status = 'active'
       AND u.is_verified = 1 LIMIT 1"
);
$profileStmt->execute([(int) $sellerId]);
$profile = $profileStmt->fetch();
if (!$profile) errorResponse('Seller not found.', 404);

$visibility = publicListingVisibilitySql('b');
$listingStmt = $db->prepare(
    "SELECT b.id, b.title, b.author, b.publisher, b.language, b.isbn, b.price, b.`condition`, b.`format`, b.category,
            b.cover_image_path, b.description, b.`source`, b.seller_id
     FROM book_listings b
     WHERE {$visibility} AND b.`source` = 'seller' AND b.seller_id = ?
     ORDER BY b.created_at DESC, b.id DESC"
);
$listingStmt->execute([(int) $sellerId]);
$books = $listingStmt->fetchAll();
foreach ($books as &$book) {
    $book['id'] = (int) $book['id'];
    $book['seller_id'] = (int) $book['seller_id'];
    $book['price'] = (float) $book['price'];
    $book['seller_name'] = $profile['store_name'];
    $book['cover_url'] = listingImageUrl($book['id'], $book['cover_image_path']);
    unset($book['cover_image_path']);
}
unset($book);
$profile['id'] = (int) $profile['id'];
successResponse(['seller' => $profile, 'books' => $books]);
