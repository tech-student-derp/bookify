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
    error_log('Seller listing request error: ' . $e->getMessage());
    errorResponse('The listing request could not be completed.', 500);
});

$action = is_string($_GET['action'] ?? null) ? $_GET['action'] : 'create';
if ($action === 'list' || $action === 'mine' || $action === 'details') {
    requireMethod('GET');
} else {
    requireMethod('POST');
}

requireAuth();
$db = getDB();
requireDatabaseRole($db, 'seller');
requireListingManagementSchema($db);
requireApprovedSeller($db);

$sellerId = (int) $_SESSION['user_id'];
if ($action !== 'list' && $action !== 'mine' && $action !== 'details' && !validateCsrfToken()) {
    errorResponse('Invalid or missing CSRF token.', 403);
}

match ($action) {
    'list', 'mine' => listSellerListings($db, $sellerId),
    'details' => getSellerListing($db, $sellerId),
    'create' => createSellerListing($db, $sellerId),
    'update' => updateSellerListing($db, $sellerId),
    'inventory' => updateSellerInventory($db, $sellerId),
    'archive' => archiveSellerListing($db, $sellerId),
    'unarchive' => unarchiveSellerListing($db, $sellerId),
    default => errorResponse('Unknown seller listing action.', 404),
};

function requireApprovedSeller(PDO $db): void {
    $stmt = $db->prepare(
        "SELECT COUNT(*) FROM users u
         INNER JOIN seller_applications a ON a.user_id = u.id
         WHERE u.id = ? AND u.role = 'seller' AND u.account_status = 'active'
           AND u.is_verified = 1 AND a.status = 'approved'"
    );
    $stmt->execute([(int) $_SESSION['user_id']]);
    if ((int) $stmt->fetchColumn() < 1) {
        errorResponse('Only active, verified, approved sellers can manage listings.', 403);
    }
}

function requireListingManagementSchema(PDO $db): void {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );
    $stmt->execute(['book_listings']);
    if ((int) $stmt->fetchColumn() !== 1 || !hasAccountStatusColumn($db)) {
        errorResponse('Apply the Bookify back-office schema migrations before managing listings.', 503);
    }
    $columns = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME IN (?, ?, ?)'
    );
    $columns->execute(['book_listings', 'isbn', 'stock_quantity', 'archived_at']);
    if ((int) $columns->fetchColumn() !== 3) {
        errorResponse('Apply database/migrations/2026_11_25_phase1_seller_listing_management.sql before managing listings.', 503);
    }
}

function listingPage(): array {
    $page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $perPage = filter_var($_GET['per_page'] ?? 12, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 50]]);
    if ($page === false || $perPage === false) errorResponse('Invalid pagination parameters.', 422);
    return [(int) $page, (int) $perPage, ((int) $page - 1) * (int) $perPage];
}

function listSellerListings(PDO $db, int $sellerId): never {
    [$page, $perPage, $offset] = listingPage();
    $search = is_string($_GET['q'] ?? null) ? trim($_GET['q']) : '';
    if (strlen($search) > 100) errorResponse('Search text is too long.', 422);
    $status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'all';
    $allowed = ['all', 'draft', 'pending', 'published', 'rejected', 'suspended', 'archived'];
    if (!in_array($status, $allowed, true)) errorResponse('Invalid listing status filter.', 422);

    $where = ['source = \'seller\'', 'seller_id = :seller_id'];
    $params = [':seller_id' => $sellerId];
    if ($search !== '') {
        $where[] = '(title LIKE :title_query OR author LIKE :author_query OR category LIKE :category_query OR isbn LIKE :isbn_query)';
        $term = '%' . $search . '%';
        $params[':title_query'] = $term;
        $params[':author_query'] = $term;
        $params[':category_query'] = $term;
        $params[':isbn_query'] = $term;
    }
    switch ($status) {
        case 'draft': $where[] = "listing_status = 'pending' AND publication_status = 'draft' AND archived_at IS NULL"; break;
        case 'pending': $where[] = "listing_status = 'pending' AND archived_at IS NULL"; break;
        case 'published': $where[] = "listing_status = 'approved' AND publication_status = 'published' AND archived_at IS NULL"; break;
        case 'rejected': $where[] = "listing_status = 'rejected' AND archived_at IS NULL"; break;
        case 'suspended': $where[] = "listing_status = 'suspended' AND archived_at IS NULL"; break;
        case 'archived': $where[] = 'archived_at IS NOT NULL'; break;
    }
    $whereSql = implode(' AND ', $where);
    $count = $db->prepare("SELECT COUNT(*) FROM book_listings WHERE {$whereSql}");
    foreach ($params as $key => $value) $count->bindValue($key, $value, PDO::PARAM_STR);
    $count->execute();
    $total = (int) $count->fetchColumn();

    $stmt = $db->prepare(
        "SELECT id, title, author, description, cover_image_path, category, isbn, price,
                `condition`, `format`, stock_quantity, availability, listing_status,
                publication_status, moderation_reason, archived_at, created_at, updated_at
         FROM book_listings WHERE {$whereSql}
         ORDER BY updated_at DESC, id DESC LIMIT :limit OFFSET :offset"
    );
    foreach ($params as $key => $value) $stmt->bindValue($key, $value, PDO::PARAM_STR);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    successResponse(['listings' => $stmt->fetchAll(), 'total' => $total, 'page' => $page, 'per_page' => $perPage]);
}

function getSellerListing(PDO $db, int $sellerId): never {
    $id = listingId($_GET['id'] ?? null);
    $stmt = $db->prepare(
        "SELECT id, title, author, description, cover_image_path, category, isbn, price,
                `condition`, `format`, stock_quantity, availability, listing_status,
                publication_status, moderation_reason, archived_at
         FROM book_listings WHERE id = ? AND seller_id = ? AND source = 'seller' LIMIT 1"
    );
    $stmt->execute([$id, $sellerId]);
    $listing = $stmt->fetch();
    if (!$listing) errorResponse('Listing not found.', 404);
    successResponse(['listing' => $listing]);
}

function createSellerListing(PDO $db, int $sellerId): never {
    $body = listingBody();
    $values = validateListingData($body);
    $cover = receiveCoverUpload($sellerId);
    $stock = $values['stock_quantity'];
    $db->beginTransaction();
    try {
        $stmt = $db->prepare(
            "INSERT INTO book_listings
             (title, author, description, cover_image_path, category, isbn, price, `condition`, `format`, `source`,
              seller_id, created_by, listing_status, publication_status, availability, stock_quantity)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'seller', ?, ?, 'pending', 'draft', ?, ?)"
        );
        $stmt->execute([
            $values['title'], $values['author'], $values['description'], $cover, $values['category'],
            $values['isbn'], $values['price'], $values['condition'], $values['format'], $sellerId, $sellerId,
            $stock > 0 ? 'available' : 'unavailable', $stock,
        ]);
        $id = (int) $db->lastInsertId();
        recordAdminAudit($db, $sellerId, 'listing.submit', 'book_listing', $id);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        deleteListingCover($cover);
        throw $e;
    }
    successResponse(['message' => 'Listing submitted for staff review.', 'listing_id' => $id], 201);
}

function updateSellerListing(PDO $db, int $sellerId): never {
    $body = listingBody();
    $id = listingId($body['id'] ?? null);
    $values = validateListingData($body);
    $current = ownedListing($db, $id, $sellerId);
    if ($current['archived_at'] !== null) errorResponse('Unarchive this listing before editing it.', 409);
    if ($current['listing_status'] === 'suspended') errorResponse('This listing was suspended by staff and cannot be edited.', 403);
    $newCover = receiveCoverUpload($sellerId);
    $cover = $newCover ?? $current['cover_image_path'];
    $stock = $values['stock_quantity'];
    $db->beginTransaction();
    try {
        $current = ownedListing($db, $id, $sellerId, true);
        if ($current['archived_at'] !== null || $current['listing_status'] === 'suspended') {
            $db->rollBack();
            deleteListingCover($newCover);
            errorResponse('This listing can no longer be edited.', 409);
        }
        $stmt = $db->prepare(
            "UPDATE book_listings SET title = ?, author = ?, description = ?, cover_image_path = ?,
             category = ?, isbn = ?, price = ?, `condition` = ?, `format` = ?, stock_quantity = ?,
             availability = ?, listing_status = 'pending', publication_status = 'draft',
             moderation_reason = NULL, reviewed_by = NULL, reviewed_at = NULL
             WHERE id = ? AND seller_id = ? AND `source` = 'seller' AND archived_at IS NULL AND listing_status <> 'suspended'"
        );
        $stmt->execute([
            $values['title'], $values['author'], $values['description'], $cover, $values['category'],
            $values['isbn'], $values['price'], $values['condition'], $values['format'], $stock,
            $stock > 0 ? 'available' : 'unavailable', $id, $sellerId,
        ]);
        recordAdminAudit($db, $sellerId, 'listing.update_submit_review', 'book_listing', $id);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        deleteListingCover($newCover);
        throw $e;
    }
    if ($newCover !== null && $current['cover_image_path'] !== $newCover) deleteListingCover($current['cover_image_path']);
    successResponse(['message' => 'Listing updated and submitted for staff review.']);
}

function updateSellerInventory(PDO $db, int $sellerId): never {
    $body = listingBody();
    $id = listingId($body['id'] ?? null);
    $stock = validateStock($body['stock_quantity'] ?? null);
    $db->beginTransaction();
    try {
        $listing = ownedListing($db, $id, $sellerId, true);
        if ($listing['listing_status'] === 'suspended') { $db->rollBack(); errorResponse('This listing was suspended by staff and cannot be changed.', 403); }
        $stmt = $db->prepare(
            "UPDATE book_listings SET stock_quantity = ?, availability = ?
             WHERE id = ? AND seller_id = ? AND `source` = 'seller'"
        );
        $stmt->execute([$stock, $stock > 0 ? 'available' : 'unavailable', $id, $sellerId]);
        recordAdminAudit($db, $sellerId, 'listing.inventory_update', 'book_listing', $id, ['stock_quantity' => $stock]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    successResponse(['message' => 'Inventory updated.', 'stock_quantity' => $stock]);
}

function archiveSellerListing(PDO $db, int $sellerId): never {
    $body = listingBody();
    $id = listingId($body['id'] ?? null);
    $db->beginTransaction();
    try {
        ownedListing($db, $id, $sellerId, true);
        $stmt = $db->prepare(
            "UPDATE book_listings SET archived_at = NOW(), publication_status = 'unpublished', availability = 'unavailable'
             WHERE id = ? AND seller_id = ? AND `source` = 'seller' AND archived_at IS NULL"
        );
        $stmt->execute([$id, $sellerId]);
        if ($stmt->rowCount() !== 1) { $db->rollBack(); errorResponse('This listing is already archived.', 409); }
        recordAdminAudit($db, $sellerId, 'listing.archive', 'book_listing', $id);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    successResponse(['message' => 'Listing archived.']);
}

function unarchiveSellerListing(PDO $db, int $sellerId): never {
    $body = listingBody();
    $id = listingId($body['id'] ?? null);
    $db->beginTransaction();
    try {
        $listing = ownedListing($db, $id, $sellerId, true);
        if ($listing['archived_at'] === null) { $db->rollBack(); errorResponse('This listing is not archived.', 409); }
        if ($listing['listing_status'] === 'suspended') { $db->rollBack(); errorResponse('This listing was suspended by staff and cannot be restored.', 403); }
        $stmt = $db->prepare(
            "UPDATE book_listings SET archived_at = NULL, listing_status = 'pending', publication_status = 'draft',
             availability = IF(stock_quantity > 0, 'available', 'unavailable'), moderation_reason = NULL,
             reviewed_by = NULL, reviewed_at = NULL
             WHERE id = ? AND seller_id = ? AND `source` = 'seller' AND archived_at IS NOT NULL"
        );
        $stmt->execute([$id, $sellerId]);
        recordAdminAudit($db, $sellerId, 'listing.unarchive_submit_review', 'book_listing', $id);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    successResponse(['message' => 'Listing restored and submitted for staff review.']);
}

function listingBody(): array {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_starts_with(strtolower($contentType), 'multipart/form-data')) return $_POST;
    return getJsonBody();
}

function validateListingData(array $body): array {
    $text = static function (string $key, int $max, bool $required = false) use ($body): string {
        $value = $body[$key] ?? '';
        if (!is_string($value)) errorResponse('Invalid listing data.', 422);
        $value = trim(strip_tags($value));
        if (strlen($value) > $max) errorResponse('One or more listing fields are too long.', 422);
        if ($required && $value === '') errorResponse('Complete all required listing fields.', 422, ['errors' => [$key => 'This field is required.']]);
        return $value;
    };
    $title = $text('title', 255, true);
    $author = $text('author', 255, true);
    $description = $text('description', 10000);
    $category = $text('category', 100, true);
    $isbn = $text('isbn', 20);
    if ($isbn !== '' && !preg_match('/^(?:[0-9]{9}[0-9Xx]|[0-9]{13})$/D', str_replace([' ', '-'], '', $isbn))) {
        errorResponse('Enter a valid 10- or 13-character ISBN.', 422, ['errors' => ['isbn' => 'Use a valid ISBN-10 or ISBN-13.']]);
    }
    $condition = $body['condition'] ?? '';
    $conditions = ['New', 'Like New', 'Very Good', 'Good', 'Acceptable', 'Pre-owned'];
    if (!is_string($condition) || !in_array($condition, $conditions, true)) errorResponse('Choose a valid book condition.', 422);
    $format = $body['format'] ?? '';
    if (!is_string($format) || !in_array($format, ['Physical', 'E-book'], true)) errorResponse('Choose a valid book format.', 422);
    $priceRaw = $body['price'] ?? null;
    if (!is_string($priceRaw) && !is_int($priceRaw) && !is_float($priceRaw)) errorResponse('Enter a valid book price.', 422);
    $priceText = (string) $priceRaw;
    if (!preg_match('/^[0-9]+(?:\.[0-9]{1,2})?$/D', $priceText) || (float) $priceText <= 0 || (float) $priceText > 99999999.99) errorResponse('Enter a valid book price.', 422);
    $price = number_format((float) $priceText, 2, '.', '');
    if ((float) $price <= 0 || (float) $price > 99999999.99) errorResponse('Enter a valid book price.', 422);
    $stock = validateStock($body['stock_quantity'] ?? null);
    return [
        'title' => $title, 'author' => $author, 'description' => $description !== '' ? $description : null,
        'category' => $category, 'isbn' => $isbn !== '' ? str_replace([' ', '-'], '', $isbn) : null,
        'condition' => $condition, 'format' => $format, 'price' => $price, 'stock_quantity' => $stock,
    ];
}

function validateStock(mixed $value): int {
    if (is_string($value) && $value !== '' && ctype_digit($value)) $value = (int) $value;
    if (!is_int($value) || $value < 0 || $value > 2147483647) {
        errorResponse('Inventory must be a non-negative whole number.', 422, ['errors' => ['stock_quantity' => 'Enter a non-negative whole number.']]);
    }
    return $value;
}

function listingId(mixed $value): int {
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) errorResponse('A valid listing id is required.', 422);
    return (int) $id;
}

function ownedListing(PDO $db, int $id, int $sellerId, bool $lock = false): array {
    $stmt = $db->prepare(
        "SELECT id, cover_image_path, archived_at, listing_status, publication_status, stock_quantity
         FROM book_listings WHERE id = ? AND seller_id = ? AND `source` = 'seller' LIMIT 1" . ($lock ? ' FOR UPDATE' : '')
    );
    $stmt->execute([$id, $sellerId]);
    $listing = $stmt->fetch();
    if (!$listing) errorResponse('Listing not found.', 404);
    return $listing;
}

function receiveCoverUpload(int $sellerId): ?string {
    $file = $_FILES['cover_image'] ?? null;
    if ($file === null || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
    if (!is_array($file) || !isset($file['tmp_name'], $file['error'], $file['size'])
        || !is_string($file['tmp_name']) || !is_int($file['error']) || !is_int($file['size'])) {
        errorResponse('Invalid cover upload.', 422);
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) errorResponse('The cover upload failed. Please try again.', 422);
    if ((int) $file['size'] < 1 || (int) $file['size'] > 5 * 1024 * 1024) errorResponse('Cover images must be 5 MB or smaller.', 422);
    $imageInfo = @getimagesize($file['tmp_name']);
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!$imageInfo || !isset($extensions[$mime]) || ($imageInfo['mime'] ?? '') !== $mime) {
        errorResponse('Cover images must be valid JPEG, PNG, or WebP files.', 422);
    }
    if ($imageInfo[0] < 100 || $imageInfo[1] < 100 || $imageInfo[0] > 8000 || $imageInfo[1] > 8000) {
        errorResponse('Cover images must be between 100 and 8000 pixels in each dimension.', 422);
    }
    $directory = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'books';
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        errorResponse('Book cover storage is unavailable.', 500);
    }
    $filename = 'book_' . $sellerId . '_' . bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($file['tmp_name'], $directory . DIRECTORY_SEPARATOR . $filename)) {
        errorResponse('The cover image could not be saved.', 500);
    }
    return '/uploads/books/' . $filename;
}

function deleteListingCover(?string $path): void {
    if (!is_string($path) || !preg_match('#^/uploads/books/book_[0-9]+_[a-f0-9]{32}\.(jpg|png|webp)$#D', $path)) return;
    $file = dirname(__DIR__, 2) . str_replace('/', DIRECTORY_SEPARATOR, $path);
    if (is_file($file)) @unlink($file);
}
