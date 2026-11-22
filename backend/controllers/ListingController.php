<?php
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/csrf.php';
require_once __DIR__ . '/../utils/audit.php';
require_once __DIR__ . '/../middleware/auth.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('Seller listing submission error: ' . $e->getMessage());
    errorResponse('The listing could not be submitted.', 500);
});

requireMethod('POST');
requireAuth();
$db = getDB();
requireDatabaseRole($db, 'seller');
if (!hasAccountStatusColumn($db)) errorResponse('Apply the Phase 2 database migration before submitting listings.', 503);
$table = $db->prepare("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
$table->execute(['book_listings']);
if ((int) $table->fetchColumn() !== 1) errorResponse('Apply the Phase 2 database migration before submitting listings.', 503);
if (!validateCsrfToken()) errorResponse('Invalid or missing CSRF token.', 403);

$sellerId = (int) $_SESSION['user_id'];
$sellerCheck = $db->prepare(
    "SELECT COUNT(*) FROM users u INNER JOIN seller_applications a ON a.user_id = u.id
     WHERE u.id = ? AND u.role = 'seller' AND u.account_status = 'active'
       AND u.is_verified = 1 AND a.status = 'approved'"
);
$sellerCheck->execute([$sellerId]);
if ((int) $sellerCheck->fetchColumn() < 1) errorResponse('Only active, verified, approved sellers can submit listings.', 403);

$body = getJsonBody();
$readText = static function (string $key, int $limit = 255) use ($body): string {
    $value = $body[$key] ?? '';
    if (!is_string($value)) errorResponse('Invalid listing data.', 422);
    $value = trim(strip_tags($value));
    if (strlen($value) > $limit) errorResponse('One or more listing fields are too long.', 422);
    return $value;
};
$title = $readText('title');
$author = $readText('author');
$category = $readText('category', 100);
$description = $readText('description', 10000);
$cover = $readText('cover_image_path', 500);
$condition = $body['condition'] ?? '';
$format = $body['format'] ?? '';
$price = $body['price'] ?? null;
if ($title === '' || $author === '' || $category === '') errorResponse('Title, author, and category are required.', 422);
if (!in_array($condition, ['New', 'Pre-owned'], true)) errorResponse('Choose a valid book condition.', 422);
if (!in_array($format, ['Physical', 'E-book'], true)) errorResponse('Choose a valid book format.', 422);
if (!is_numeric($price) || (float) $price <= 0 || (float) $price > 99999999.99) errorResponse('Enter a valid book price.', 422);
if ($cover !== '' && (!preg_match('#^/?uploads/books/[A-Za-z0-9._/-]+$#', $cover) || str_contains($cover, '..'))) {
    errorResponse('Cover image must be a local path under uploads/books.', 422);
}

$db->beginTransaction();
try {
    $stmt = $db->prepare(
        "INSERT INTO book_listings
         (title, author, description, cover_image_path, category, price, `condition`, `format`, `source`,
          seller_id, created_by, listing_status, publication_status, availability)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'seller', ?, ?, 'pending', 'draft', 'available')"
    );
    $stmt->execute([$title, $author, $description !== '' ? $description : null, $cover !== '' ? $cover : null, $category, number_format((float) $price, 2, '.', ''), $condition, $format, $sellerId, $sellerId]);
    $listingId = (int) $db->lastInsertId();
    recordAdminAudit($db, $sellerId, 'listing.submit', 'book_listing', $listingId);
    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    throw $e;
}

successResponse(['message' => 'Listing submitted for review.', 'listing_id' => $listingId], 201);
