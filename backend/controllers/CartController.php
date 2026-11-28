<?php
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../utils/csrf.php';
require_once __DIR__ . '/../utils/listing_media.php';
require_once __DIR__ . '/../utils/cart_rules.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('Shopping cart request error: ' . $e->getMessage());
    errorResponse('The shopping cart request could not be completed.', 500);
});

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
requireMethod('GET', 'POST');
requireAuth();
$db = getDB();
requireDatabaseRole($db, 'customer');
requireCartSchema($db);
$customerId = (int) $_SESSION['user_id'];
$action = is_string($_GET['action'] ?? null) ? $_GET['action'] : ($method === 'GET' ? 'get' : '');

if ($method === 'GET') {
    if ($action !== 'get') errorResponse('Unknown cart action.', 404);
    successResponse(cartPayload($db, $customerId));
}

if (!validateCsrfToken()) errorResponse('Invalid or missing CSRF token.', 403);
$body = getJsonBody();
match ($action) {
    'add' => addCartItem($db, $customerId, $body),
    'update' => updateCartItem($db, $customerId, $body),
    'remove' => removeCartItem($db, $customerId, $body),
    default => errorResponse('Unknown cart action.', 404),
};

function requireCartSchema(PDO $db): void {
    $columns = $db->query(
        "SELECT COUNT(DISTINCT COLUMN_NAME) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cart_items'
           AND COLUMN_NAME IN ('id', 'customer_id', 'listing_id', 'quantity', 'added_at', 'updated_at')"
    );
    $unique = $db->query(
        "SELECT COUNT(*) FROM (
           SELECT INDEX_NAME FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cart_items'
             AND INDEX_NAME = 'uq_cart_items_customer_listing' AND NON_UNIQUE = 0
           GROUP BY INDEX_NAME
           HAVING COUNT(*) = 2
             AND SUM(CASE WHEN SEQ_IN_INDEX = 1 AND COLUMN_NAME = 'customer_id' THEN 1 ELSE 0 END) = 1
             AND SUM(CASE WHEN SEQ_IN_INDEX = 2 AND COLUMN_NAME = 'listing_id' THEN 1 ELSE 0 END) = 1
         ) required_unique_index"
    );
    $foreignKeys = $db->query(
        "SELECT COUNT(DISTINCT CONSTRAINT_NAME) FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cart_items'
           AND ((COLUMN_NAME = 'customer_id' AND REFERENCED_TABLE_NAME = 'users' AND REFERENCED_COLUMN_NAME = 'id')
             OR (COLUMN_NAME = 'listing_id' AND REFERENCED_TABLE_NAME = 'book_listings' AND REFERENCED_COLUMN_NAME = 'id'))"
    );
    if ((int) $columns->fetchColumn() !== 6 || (int) $unique->fetchColumn() !== 1 || (int) $foreignKeys->fetchColumn() !== 2) {
        errorResponse('The shopping cart is unavailable until its database migration is applied.', 503, ['code' => 'migration_required']);
    }
}

function loadCurrentListing(PDO $db, int $listingId, bool $lock = false): array|false {
    $sql = "SELECT b.id, b.title, b.author, b.price, b.`format`, b.`source`, b.stock_quantity,
                   b.listing_status, b.publication_status, b.availability, b.archived_at,
                   b.cover_image_path, b.seller_id,
                   CASE WHEN b.`source` = 'bookify' THEN 'Bookify' ELSE COALESCE(NULLIF(sp.store_name, ''), NULLIF(CONCAT_WS(' ', seller.first_name, seller.last_name), '')) END AS seller_name,
                   seller.role AS seller_role, seller.account_status AS seller_account_status, seller.is_verified AS seller_is_verified,
                   CASE WHEN EXISTS (SELECT 1 FROM seller_applications sa WHERE sa.user_id = b.seller_id AND sa.status = 'approved') THEN 1 ELSE 0 END AS seller_application_approved,
                   creator.role AS creator_role
            FROM book_listings b
            LEFT JOIN seller_profiles sp ON sp.user_id = b.seller_id
            LEFT JOIN users seller ON seller.id = b.seller_id
            LEFT JOIN users creator ON creator.id = b.created_by
            WHERE b.id = ? LIMIT 1" . ($lock ? ' FOR UPDATE' : '');
    $stmt = $db->prepare($sql);
    $stmt->execute([$listingId]);
    return $stmt->fetch();
}

function cartPayload(PDO $db, int $customerId): array {
    $stmt = $db->prepare(
        "SELECT ci.id AS cart_item_id, ci.listing_id, ci.quantity,
                b.id, b.title, b.author, b.price, b.`format`, b.`source`, b.stock_quantity,
                b.listing_status, b.publication_status, b.availability, b.archived_at,
                b.cover_image_path, b.seller_id,
                CASE WHEN b.`source` = 'bookify' THEN 'Bookify' ELSE COALESCE(NULLIF(sp.store_name, ''), NULLIF(CONCAT_WS(' ', seller.first_name, seller.last_name), '')) END AS seller_name,
                seller.role AS seller_role, seller.account_status AS seller_account_status, seller.is_verified AS seller_is_verified,
                CASE WHEN EXISTS (SELECT 1 FROM seller_applications sa WHERE sa.user_id = b.seller_id AND sa.status = 'approved') THEN 1 ELSE 0 END AS seller_application_approved,
                creator.role AS creator_role
         FROM cart_items ci
         LEFT JOIN book_listings b ON b.id = ci.listing_id
         LEFT JOIN seller_profiles sp ON sp.user_id = b.seller_id
         LEFT JOIN users seller ON seller.id = b.seller_id
         LEFT JOIN users creator ON creator.id = b.created_by
         WHERE ci.customer_id = ? ORDER BY ci.added_at DESC, ci.id DESC"
    );
    $stmt->execute([$customerId]);
    $rows = $stmt->fetchAll();
    $items = [];
    $subtotal = 0.0;
    $itemCount = 0;
    foreach ($rows as $row) {
        $quantity = (int) $row['quantity'];
        $exists = $row['id'] !== null;
        $eligibility = $exists
            ? evaluateCartListingEligibility($row, $quantity)
            : ['eligible' => false, 'reason' => 'This listing is no longer available.'];
        $price = $exists ? (float) $row['price'] : null;
        $rowItem = [
            'id' => (int) $row['cart_item_id'],
            'listing_id' => (int) $row['listing_id'],
            'quantity' => $quantity,
            'title' => $row['title'],
            'author' => $row['author'],
            'seller_name' => $row['seller_name'],
            'seller_id' => $row['source'] === 'seller' ? (int) $row['seller_id'] : null,
            'format' => $row['format'],
            'price' => $price,
            'cover_url' => $exists ? listingImageUrl((int) $row['listing_id'], $row['cover_image_path']) : null,
            'eligible' => $eligibility['eligible'],
            'can_increase' => $eligibility['eligible'] && (int) $row['stock_quantity'] > $quantity,
            'reason' => $eligibility['reason'],
            'subtotal' => $price === null ? null : round($price * $quantity, 2),
        ];
        $items[] = $rowItem;
        $itemCount += $quantity;
        if ($eligibility['eligible'] && $price !== null) $subtotal += $price * $quantity;
    }
    return ['items' => $items, 'item_count' => $itemCount, 'subtotal' => round($subtotal, 2)];
}

function cartListingId(array $body): int {
    $id = filter_var($body['listing_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) errorResponse('A valid listing is required.', 422);
    return (int) $id;
}

function requireEligibleCartListing(array|false $listing, int $quantity): array {
    if (!$listing) errorResponse('Book not found.', 404);
    $eligibility = evaluateCartListingEligibility($listing, $quantity);
    if (!$eligibility['eligible']) errorResponse((string) $eligibility['reason'], 409, ['code' => 'listing_unavailable']);
    return $listing;
}

function addCartItem(PDO $db, int $customerId, array $body): never {
    $listingId = cartListingId($body);
    $increment = parseCartQuantity($body['quantity'] ?? 1);
    if ($increment === null) errorResponse('Quantity must be a positive whole number.', 422);
    $db->beginTransaction();
    try {
        $listing = loadCurrentListing($db, $listingId, true);
        $existing = $db->prepare('SELECT id, quantity FROM cart_items WHERE customer_id = ? AND listing_id = ? FOR UPDATE');
        $existing->execute([$customerId, $listingId]);
        $item = $existing->fetch();
        $quantity = (int) ($item['quantity'] ?? 0) + $increment;
        requireEligibleCartListing($listing, $quantity);
        if ($item) {
            $update = $db->prepare('UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ? AND customer_id = ?');
            $update->execute([$quantity, (int) $item['id'], $customerId]);
        } else {
            $insert = $db->prepare('INSERT INTO cart_items (customer_id, listing_id, quantity, added_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())');
            $insert->execute([$customerId, $listingId, $quantity]);
        }
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    successResponse(cartPayload($db, $customerId));
}

function updateCartItem(PDO $db, int $customerId, array $body): never {
    $itemId = filter_var($body['cart_item_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $quantity = parseCartQuantity($body['quantity'] ?? null);
    if ($itemId === false || $quantity === null) errorResponse('A valid cart item and positive quantity are required.', 422);
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT listing_id FROM cart_items WHERE id = ? AND customer_id = ? LIMIT 1');
        $stmt->execute([(int) $itemId, $customerId]);
        $item = $stmt->fetch();
        if (!$item) errorResponse('Cart item not found.', 404);
        $listing = loadCurrentListing($db, (int) $item['listing_id'], true);
        $lockItem = $db->prepare('SELECT id FROM cart_items WHERE id = ? AND customer_id = ? FOR UPDATE');
        $lockItem->execute([(int) $itemId, $customerId]);
        if (!$lockItem->fetch()) errorResponse('Cart item not found.', 404);
        requireEligibleCartListing($listing, $quantity);
        $update = $db->prepare('UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ? AND customer_id = ?');
        $update->execute([$quantity, (int) $itemId, $customerId]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
    successResponse(cartPayload($db, $customerId));
}

function removeCartItem(PDO $db, int $customerId, array $body): never {
    $itemId = filter_var($body['cart_item_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($itemId === false) errorResponse('A valid cart item is required.', 422);
    $stmt = $db->prepare('DELETE FROM cart_items WHERE id = ? AND customer_id = ?');
    $stmt->execute([(int) $itemId, $customerId]);
    if ($stmt->rowCount() < 1) errorResponse('Cart item not found.', 404);
    successResponse(cartPayload($db, $customerId));
}
