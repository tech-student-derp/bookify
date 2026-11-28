<?php
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/private_listing_files.php';
require_once __DIR__ . '/../utils/listing_media.php';
require_once __DIR__ . '/../utils/listing_visibility.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('Catalog query error: ' . $e->getMessage());
    errorResponse('The book catalog could not be loaded.', 500);
});

requireMethod('GET');
$db = getDB();
if (!hasAccountStatusColumn($db)) {
    errorResponse('Apply the Phase 2 database migration before enabling public book listings.', 503);
}
$exists = $db->prepare("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
$exists->execute(['book_listings']);
if ((int) $exists->fetchColumn() !== 1) {
    errorResponse('Apply the Phase 2 database migration before enabling public book listings.', 503);
}
$phase7Columns = $db->query(
    "SELECT COUNT(DISTINCT COLUMN_NAME) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'book_listings'
       AND COLUMN_NAME IN ('publisher', 'language', 'ebook_file_format', 'ebook_authorized_at', 'submitted_at', 'archived_at', 'isbn', 'stock_quantity')"
);
$phase7Media = $db->query(
    "SELECT COUNT(*) FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'book_listing_media'"
);
if ((int) $phase7Columns->fetchColumn() !== 8 || (int) $phase7Media->fetchColumn() !== 1) {
    errorResponse('The catalog is temporarily unavailable while its database schema is updated.', 503, ['code' => 'migration_required']);
}
$sellerProfiles = $db->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seller_profiles'");
if ((int) $sellerProfiles->fetchColumn() !== 1) {
    errorResponse('The catalog is temporarily unavailable while its database schema is updated.', 503, ['code' => 'migration_required']);
}

$visibility = publicListingVisibilitySql('b');

$idRaw = $_GET['id'] ?? null;
if ($idRaw !== null) {
    $id = filter_var($idRaw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) errorResponse('Invalid book id.', 422);
    $stmt = $db->prepare(
        "SELECT b.id, b.title, b.author, b.publisher, b.language, b.isbn, b.ebook_file_format, b.price, b.`condition`, b.`format`, b.category,
                b.cover_image_path AS cover_url, b.description,
                CASE WHEN b.`source` = 'bookify' THEN 'Bookify' ELSE COALESCE(NULLIF(sp.store_name, ''), NULLIF(CONCAT_WS(' ', seller.first_name, seller.last_name), '')) END AS seller_name,
                CASE WHEN b.`source` = 'seller' THEN b.seller_id ELSE NULL END AS seller_id,
                (b.`format` = 'Physical' AND b.stock_quantity > 0) AS can_add_to_cart,
                b.`source`, 'Available' AS availability
         FROM book_listings b
         LEFT JOIN seller_profiles sp ON sp.user_id = b.seller_id
         LEFT JOIN users seller ON seller.id = b.seller_id
         WHERE {$visibility} AND b.id = ? LIMIT 1"
    );
    $stmt->execute([(int) $id]);
    $book = $stmt->fetch();
    if (!$book) errorResponse('Book not found.', 404);
    $book['id'] = (int) $book['id'];
    $book['price'] = (float) $book['price'];
    $book['seller_id'] = $book['seller_id'] === null ? null : (int) $book['seller_id'];
    $book['can_add_to_cart'] = (bool) $book['can_add_to_cart'];
    $book['cover_url'] = listingImageUrl((int) $book['id'], $book['cover_url']);
    $mediaTable = $db->query(
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'book_listing_media'"
    );
    $book['images'] = [];
    if ((int) $mediaTable->fetchColumn() === 1) {
        $images = $db->prepare('SELECT id, media_type, file_path, sort_order FROM book_listing_media WHERE listing_id = ? ORDER BY media_type, sort_order, id');
        $images->execute([(int) $book['id']]);
        $book['images'] = $images->fetchAll();
        foreach ($book['images'] as &$image) $image['file_path'] = listingImageUrl((int) $book['id'], $image['file_path'], (int) $image['id']);
        unset($image);
    }
    successResponse(['book' => $book]);
}

$search = isset($_GET['q']) && is_string($_GET['q']) ? trim($_GET['q']) : '';
if (strlen($search) > 100) errorResponse('Search text is too long.', 422);
$category = isset($_GET['category']) && is_string($_GET['category']) ? trim($_GET['category']) : '';
$condition = isset($_GET['condition']) && is_string($_GET['condition']) ? $_GET['condition'] : '';
$format = isset($_GET['format']) && is_string($_GET['format']) ? $_GET['format'] : '';
if ($category !== '' && strlen($category) > 100) errorResponse('Invalid category filter.', 422);
if ($condition !== '' && !in_array($condition, ['New', 'Like New', 'Very Good', 'Good', 'Acceptable', 'Pre-owned'], true)) errorResponse('Invalid condition filter.', 422);
if ($format !== '' && !in_array($format, ['Physical', 'E-book'], true)) errorResponse('Invalid format filter.', 422);
$minPrice = $_GET['min_price'] ?? '';
$maxPrice = $_GET['max_price'] ?? '';
foreach (['minimum' => $minPrice, 'maximum' => $maxPrice] as $label => $price) {
    if ($price !== '' && (!is_numeric($price) || (float) $price < 0 || (float) $price > 99999999.99)) errorResponse("Invalid {$label} price.", 422);
}
if ($minPrice !== '' && $maxPrice !== '' && (float) $minPrice > (float) $maxPrice) errorResponse('Minimum price cannot exceed maximum price.', 422);

$where = [$visibility];
$params = [];
if ($search !== '') { $where[] = '(b.title LIKE ? OR b.author LIKE ?)'; $params[] = '%' . $search . '%'; $params[] = '%' . $search . '%'; }
if ($category !== '') { $where[] = 'b.category = ?'; $params[] = $category; }
if ($condition !== '') { $where[] = 'b.`condition` = ?'; $params[] = $condition; }
if ($format !== '') { $where[] = 'b.`format` = ?'; $params[] = $format; }
if ($minPrice !== '') { $where[] = 'b.price >= ?'; $params[] = (float) $minPrice; }
if ($maxPrice !== '') { $where[] = 'b.price <= ?'; $params[] = (float) $maxPrice; }
$whereSql = implode(' AND ', $where);

$sort = is_string($_GET['sort'] ?? null) ? $_GET['sort'] : 'newest';
$orderBy = match ($sort) {
    'price_asc' => 'b.price ASC, b.id DESC',
    'price_desc' => 'b.price DESC, b.id DESC',
    'newest' => 'b.created_at DESC, b.id DESC',
    default => errorResponse('Invalid sort option.', 422),
};
$page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$perPage = filter_var($_GET['per_page'] ?? 12, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 24]]);
if ($page === false || $perPage === false) errorResponse('Invalid pagination parameters.', 422);
$offset = ((int) $page - 1) * (int) $perPage;

$countStmt = $db->prepare('SELECT COUNT(*) FROM book_listings b WHERE ' . $whereSql);
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();
$stmt = $db->prepare(
    "SELECT b.id, b.title, b.author, b.publisher, b.language, b.price, b.`condition`, b.`format`, b.category,
            b.cover_image_path AS cover_url, b.description,
            CASE WHEN b.`source` = 'bookify' THEN 'Bookify' ELSE COALESCE(NULLIF(sp.store_name, ''), NULLIF(CONCAT_WS(' ', seller.first_name, seller.last_name), '')) END AS seller_name,
            CASE WHEN b.`source` = 'seller' THEN b.seller_id ELSE NULL END AS seller_id,
            (b.`format` = 'Physical' AND b.stock_quantity > 0) AS can_add_to_cart,
            b.`source`, 'Available' AS availability
     FROM book_listings b
     LEFT JOIN seller_profiles sp ON sp.user_id = b.seller_id
     LEFT JOIN users seller ON seller.id = b.seller_id
     WHERE {$whereSql} ORDER BY {$orderBy} LIMIT ? OFFSET ?"
);
foreach ($params as $index => $value) {
    $stmt->bindValue($index + 1, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
}
$stmt->bindValue(count($params) + 1, (int) $perPage, PDO::PARAM_INT);
$stmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);
$stmt->execute();
$books = $stmt->fetchAll();
foreach ($books as &$book) {
    $book['id'] = (int) $book['id'];
    $book['price'] = (float) $book['price'];
    $book['seller_id'] = $book['seller_id'] === null ? null : (int) $book['seller_id'];
    $book['can_add_to_cart'] = (bool) $book['can_add_to_cart'];
    $book['cover_url'] = listingImageUrl((int) $book['id'], $book['cover_url']);
}
unset($book);

$categoryStmt = $db->prepare("SELECT DISTINCT b.category FROM book_listings b WHERE {$visibility} ORDER BY b.category");
$categoryStmt->execute();
$categories = $categoryStmt->fetchAll(PDO::FETCH_COLUMN);

successResponse(['books' => $books, 'categories' => $categories, 'total' => $total, 'page' => (int) $page, 'per_page' => (int) $perPage]);
