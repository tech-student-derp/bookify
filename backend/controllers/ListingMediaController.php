<?php
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/private_listing_files.php';
require_once __DIR__ . '/../utils/listing_media.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('Listing image request error: ' . $e->getMessage());
    errorResponse('The book image could not be loaded.', 500);
});

requireMethod('GET');
$listingId = filter_var($_GET['listing_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if ($listingId === false) errorResponse('Book image not found.', 404);
$db = getDB();
$listingStmt = $db->prepare(
    'SELECT id, cover_image_path, `source`, seller_id, created_by, listing_status, publication_status, availability, archived_at
     FROM book_listings WHERE id = ? LIMIT 1'
);
$listingStmt->execute([(int) $listingId]);
$listing = $listingStmt->fetch();
if (!$listing) errorResponse('Book image not found.', 404);

$mediaId = filter_var($_GET['media_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$kind = $_GET['kind'] ?? null;
if ($mediaId !== false && $mediaId !== null) {
    $imageStmt = $db->prepare('SELECT file_path FROM book_listing_media WHERE id = ? AND listing_id = ? LIMIT 1');
    $imageStmt->execute([(int) $mediaId, (int) $listingId]);
    $fileKey = $imageStmt->fetchColumn();
} elseif ($kind === 'cover') {
    $fileKey = $listing['cover_image_path'];
} else {
    errorResponse('Book image not found.', 404);
}
if (!isPrivateListingImageKey($fileKey) && !isLegacyListingImagePath($fileKey)) {
    errorResponse('Book image not found.', 404);
}

$authorized = false;
$userId = filter_var($_SESSION['user_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if ($userId !== false) {
    $roleStmt = $db->prepare("SELECT role, account_status FROM users WHERE id = ? LIMIT 1");
    $roleStmt->execute([(int) $userId]);
    $user = $roleStmt->fetch();
    if ($user && $user['account_status'] === 'active') {
        $authorized = in_array($user['role'], ['admin', 'staff'], true)
            || ($user['role'] === 'seller' && (int) $listing['seller_id'] === (int) $userId);
    }
}

if (!$authorized) {
    $visibilityStmt = $db->prepare(
        "SELECT COUNT(*) FROM book_listings b
         WHERE b.id = ? AND b.listing_status = 'approved' AND b.publication_status = 'published'
           AND b.availability = 'available' AND b.archived_at IS NULL
           AND ((b.`source` = 'bookify' AND EXISTS (
                SELECT 1 FROM users creator WHERE creator.id = b.created_by AND creator.role IN ('staff','admin')
           )) OR (b.`source` = 'seller' AND EXISTS (
                SELECT 1 FROM users seller JOIN seller_applications application ON application.user_id = seller.id
                WHERE seller.id = b.seller_id AND seller.role = 'seller' AND seller.account_status = 'active'
                  AND seller.is_verified = 1 AND application.status = 'approved'
           )))"
    );
    $visibilityStmt->execute([(int) $listingId]);
    $authorized = (int) $visibilityStmt->fetchColumn() === 1;
}
if (!$authorized) errorResponse('Book image not found.', 404);

$path = isPrivateListingImageKey($fileKey)
    ? privateListingImageDirectory() . DIRECTORY_SEPARATOR . $fileKey
    : resolveLegacyListingImagePath($fileKey);
if ($path === null) errorResponse('Book image not found.', 404);
if (!is_file($path) || !is_readable($path)) errorResponse('Book image not found.', 404);
$extension = strtolower(pathinfo($fileKey, PATHINFO_EXTENSION));
$mime = match ($extension) {
    'jpg', 'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp',
    default => null,
};
if ($mime === null) errorResponse('Book image not found.', 404);
if (isLegacyListingImagePath($fileKey)) {
    $actualMime = (new finfo(FILEINFO_MIME_TYPE))->file($path);
    $imageInfo = @getimagesize($path);
    if ($actualMime !== $mime || !$imageInfo || ($imageInfo['mime'] ?? null) !== $mime) {
        errorResponse('Book image not found.', 404);
    }
}

while (ob_get_level() > 0) ob_end_clean();
header('Content-Type: ' . $mime);
header('Content-Disposition: inline; filename="book-image.' . $extension . '"');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
header('Content-Length: ' . filesize($path));
readfile($path);
exit;
