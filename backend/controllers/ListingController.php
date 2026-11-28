<?php
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/csrf.php';
require_once __DIR__ . '/../utils/audit.php';
require_once __DIR__ . '/../utils/private_listing_files.php';
require_once __DIR__ . '/../utils/listing_media.php';
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
    $workflowColumns = $db->prepare(
        "SELECT COUNT(DISTINCT COLUMN_NAME) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'book_listings'
           AND COLUMN_NAME IN ('publisher', 'language', 'ebook_file_format', 'ebook_authorized_at', 'submitted_at')"
    );
    $workflowColumns->execute();
    $mediaTable = $db->prepare(
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'book_listing_media'"
    );
    $mediaTable->execute();
    if ((int) $workflowColumns->fetchColumn() !== 5 || (int) $mediaTable->fetchColumn() !== 1) {
        errorResponse('Apply database/migrations/2026_11_28_phase7_seller_listing_moderation.sql before managing listings.', 503);
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
    $allowed = ['all', 'draft', 'pending_review', 'approved', 'rejected', 'needs_revision', 'suspended', 'archived'];
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
        case 'draft': $where[] = "listing_status = 'draft' AND archived_at IS NULL"; break;
        case 'pending_review': $where[] = "listing_status IN ('pending_review', 'pending') AND archived_at IS NULL"; break;
        case 'approved': $where[] = "listing_status = 'approved' AND archived_at IS NULL"; break;
        case 'rejected': $where[] = "listing_status = 'rejected' AND archived_at IS NULL"; break;
        case 'needs_revision': $where[] = "listing_status = 'needs_revision' AND archived_at IS NULL"; break;
        case 'suspended': $where[] = "listing_status = 'suspended' AND archived_at IS NULL"; break;
        case 'archived': $where[] = 'archived_at IS NOT NULL'; break;
    }
    $whereSql = implode(' AND ', $where);
    $count = $db->prepare("SELECT COUNT(*) FROM book_listings WHERE {$whereSql}");
    foreach ($params as $key => $value) $count->bindValue($key, $value, PDO::PARAM_STR);
    $count->execute();
    $total = (int) $count->fetchColumn();

    $stmt = $db->prepare(
        "SELECT id, title, author, publisher, description, cover_image_path, category, language, isbn, price,
                `condition`, `format`, stock_quantity, availability, listing_status,
                publication_status, moderation_reason, archived_at, submitted_at, created_at, updated_at,
                ebook_file_path,
                ebook_file_format, (ebook_authorized_at IS NOT NULL) AS ebook_rights_confirmed
         FROM book_listings WHERE {$whereSql}
         ORDER BY updated_at DESC, id DESC LIMIT :limit OFFSET :offset"
    );
    foreach ($params as $key => $value) $stmt->bindValue($key, $value, PDO::PARAM_STR);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $listings = $stmt->fetchAll();
    foreach ($listings as &$listing) {
        $listing['cover_image_path'] = listingImageUrl((int) $listing['id'], $listing['cover_image_path']);
        $listing['has_ebook_file'] = privateListingEbookExists($listing['ebook_file_path']);
        unset($listing['ebook_file_path']);
        $listing['ebook_rights_confirmed'] = (bool) $listing['ebook_rights_confirmed'];
    }
    unset($listing);
    successResponse(['listings' => $listings, 'total' => $total, 'page' => $page, 'per_page' => $perPage]);
}

function getSellerListing(PDO $db, int $sellerId): never {
    $id = listingId($_GET['id'] ?? null);
    $stmt = $db->prepare(
        "SELECT id, title, author, publisher, description, cover_image_path, category, language, isbn, price,
                `condition`, `format`, stock_quantity, availability, listing_status,
                publication_status, moderation_reason, archived_at, submitted_at,
                ebook_file_path,
                ebook_file_format, (ebook_authorized_at IS NOT NULL) AS ebook_rights_confirmed
         FROM book_listings WHERE id = ? AND seller_id = ? AND source = 'seller' LIMIT 1"
    );
    $stmt->execute([$id, $sellerId]);
    $listing = $stmt->fetch();
    if (!$listing) errorResponse('Listing not found.', 404);
    $listing['cover_image_path'] = listingImageUrl($id, $listing['cover_image_path']);
    $listing['has_ebook_file'] = privateListingEbookExists($listing['ebook_file_path']);
    unset($listing['ebook_file_path']);
    $listing['ebook_rights_confirmed'] = (bool) $listing['ebook_rights_confirmed'];
    $mediaStmt = $db->prepare('SELECT id, media_type, file_path, sort_order FROM book_listing_media WHERE listing_id = ? ORDER BY media_type, sort_order, id');
    $mediaStmt->execute([$id]);
    $listing['media'] = $mediaStmt->fetchAll();
    foreach ($listing['media'] as &$media) $media['file_path'] = listingImageUrl($id, $media['file_path'], (int) $media['id']);
    unset($media);
    successResponse(['listing' => $listing]);
}

function createSellerListing(PDO $db, int $sellerId): never {
    saveSellerListing($db, $sellerId, null);
}

function updateSellerListing(PDO $db, int $sellerId): never {
    validateListingUploadRequestSize();
    $body = listingBody();
    $id = listingId($body['id'] ?? null);
    saveSellerListing($db, $sellerId, $id);
}

function saveSellerListing(PDO $db, int $sellerId, ?int $id): never {
    validateListingUploadRequestSize();
    $body = listingBody();
    $intent = listingIntent($body);
    $values = validateListingData($body, $intent === 'submit');
    $current = $id === null ? null : ownedListing($db, $id, $sellerId);
    if ($current !== null && $current['archived_at'] !== null) errorResponse('Unarchive this listing before editing it.', 409);
    if ($current !== null && $current['listing_status'] === 'suspended') errorResponse('This listing was suspended by staff and cannot be edited.', 403);

    $coverUploads = validateListingImageUploads('cover_image', 1);
    $backUploads = validateListingImageUploads('back_cover', 1);
    $additionalUploads = validateListingImageUploads('additional_images', 6);
    $previewUploads = validateListingImageUploads('interior_previews', 6);
    $ebookUpload = validatePrivateEbookUpload();
    $existingEbook = $current['ebook_file_path'] ?? null;
    if ($intent === 'submit' && $values['format'] === 'E-book') {
        if (!$values['ebook_rights_confirmed']) errorResponse('Confirm that you have the rights to distribute this e-book before submitting.', 422, ['errors' => ['ebook_rights_confirmed' => 'Confirmation is required.']]);
        if ($ebookUpload === null && !privateListingEbookExists($existingEbook)) {
            errorResponse('Upload the digital book file before submitting this e-book.', 422, ['errors' => ['ebook_file' => 'A PDF or EPUB file is required.']]);
        }
    }

    $storedImages = [];
    $removedImages = [];
    $storedEbook = null;
    $newCover = null;
    $db->beginTransaction();
    try {
        if ($id !== null) {
            $current = ownedListing($db, $id, $sellerId, true);
            if ($current['archived_at'] !== null || $current['listing_status'] === 'suspended') {
                $db->rollBack();
                errorResponse('This listing can no longer be edited.', 409);
            }
            $existingEbook = $current['ebook_file_path'];
        }

        foreach ($coverUploads as $upload) $newCover = storeListingImage($upload);
        $cover = $newCover ?? ($current['cover_image_path'] ?? null);
        $mediaUploads = [
            'back_cover' => $backUploads,
            'additional' => $additionalUploads,
            'interior_preview' => $previewUploads,
        ];
        foreach ($mediaUploads as $mediaType => $uploads) {
            if ($id !== null && $uploads !== []) {
                $oldMedia = $db->prepare('SELECT file_path FROM book_listing_media WHERE listing_id = ? AND media_type = ?');
                $oldMedia->execute([$id, $mediaType]);
                foreach ($oldMedia->fetchAll(PDO::FETCH_COLUMN) as $oldPath) $removedImages[] = $oldPath;
                $deleteMedia = $db->prepare('DELETE FROM book_listing_media WHERE listing_id = ? AND media_type = ?');
                $deleteMedia->execute([$id, $mediaType]);
            }
            foreach ($uploads as $upload) $storedImages[] = ['type' => $mediaType, 'path' => storeListingImage($upload)];
        }
        if ($ebookUpload !== null) $storedEbook = storePrivateListingEbook($ebookUpload);

        $ebookKey = $values['format'] === 'E-book' ? ($storedEbook ?? $existingEbook) : null;
        $ebookFormat = $values['format'] === 'E-book'
            ? ($ebookUpload['extension'] ?? ($current['ebook_file_format'] ?? null))
            : null;
        $ebookFormat = is_string($ebookFormat) ? strtoupper($ebookFormat) : null;
        $status = $intent === 'submit' ? 'pending_review' : 'draft';
        $availability = $values['format'] === 'E-book' || $values['stock_quantity'] > 0 ? 'available' : 'unavailable';

        if ($id === null) {
            $stmt = $db->prepare(
                "INSERT INTO book_listings
                 (title, author, publisher, description, cover_image_path, ebook_file_path, ebook_file_format,
                  ebook_authorized_at, category, language, isbn, price, `condition`, `format`, `source`, seller_id,
                  created_by, listing_status, publication_status, availability, stock_quantity, submitted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, IF(? = 1, NOW(), NULL), ?, ?, ?, ?, ?, ?, 'seller', ?, ?, ?, 'draft', ?, ?, IF(? = 1, NOW(), NULL))"
            );
            $stmt->execute([
                $values['title'], $values['author'], $values['publisher'], $values['description'], $cover,
                $ebookKey, $ebookFormat, $values['ebook_rights_confirmed'] && $values['format'] === 'E-book' ? 1 : 0,
                $values['category'], $values['language'], $values['isbn'], $values['price'], $values['condition'],
                $values['format'], $sellerId, $sellerId, $status, $availability, $values['stock_quantity'],
                $intent === 'submit' ? 1 : 0,
            ]);
            $id = (int) $db->lastInsertId();
        } else {
            $stmt = $db->prepare(
                "UPDATE book_listings SET title = ?, author = ?, publisher = ?, description = ?, cover_image_path = ?,
                 ebook_file_path = ?, ebook_file_format = ?, ebook_authorized_at = IF(? = 1, NOW(), NULL), category = ?, language = ?, isbn = ?,
                 price = ?, `condition` = ?, `format` = ?, stock_quantity = ?, availability = ?, listing_status = ?,
                 publication_status = 'draft', submitted_at = IF(? = 1, NOW(), submitted_at),
                 moderation_reason = IF(? = 1, NULL, moderation_reason), reviewed_by = IF(? = 1, NULL, reviewed_by),
                 reviewed_at = IF(? = 1, NULL, reviewed_at)
                 WHERE id = ? AND seller_id = ? AND `source` = 'seller' AND archived_at IS NULL AND listing_status <> 'suspended'")
            ;
            $stmt->execute([
                $values['title'], $values['author'], $values['publisher'], $values['description'], $cover,
                $ebookKey, $ebookFormat, $values['format'] === 'E-book' && $values['ebook_rights_confirmed'] ? 1 : 0,
                $values['category'], $values['language'], $values['isbn'],
                $values['price'], $values['condition'], $values['format'], $values['stock_quantity'], $availability,
                $status, $intent === 'submit' ? 1 : 0, $intent === 'submit' ? 1 : 0, $intent === 'submit' ? 1 : 0,
                $intent === 'submit' ? 1 : 0, $id, $sellerId,
            ]);
            if ($stmt->rowCount() !== 1) throw new RuntimeException('The listing could not be updated.');
        }

        if ($storedImages !== []) {
            $mediaStmt = $db->prepare('INSERT INTO book_listing_media (listing_id, media_type, file_path, sort_order) VALUES (?, ?, ?, ?)');
            $orders = [];
            foreach ($storedImages as $image) {
                $orders[$image['type']] = ($orders[$image['type']] ?? 0) + 1;
                $mediaStmt->execute([$id, $image['type'], $image['path'], $orders[$image['type']]]);
            }
        }
        recordAdminAudit($db, $sellerId, $intent === 'submit' ? 'listing.submit' : 'listing.save_draft', 'book_listing', $id, ['format' => $values['format']]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        cleanupUnreferencedPrivateListingFile($db, $newCover, 'image', $id);
        foreach ($storedImages as $image) cleanupUnreferencedPrivateListingFile($db, $image['path'], 'image', $id);
        cleanupUnreferencedPrivateListingFile($db, $storedEbook, 'ebook', $id);
        throw $e;
    }

    if ($current !== null && $newCover !== null && $current['cover_image_path'] !== $newCover) {
        cleanupUnreferencedPrivateListingFile($db, $current['cover_image_path'], 'image', $id);
    }
    if ($current !== null && is_string($existingEbook) && $existingEbook !== '' && $existingEbook !== $ebookKey) {
        cleanupUnreferencedPrivateListingFile($db, $existingEbook, 'ebook', $id);
    }
    foreach ($removedImages as $removedImage) cleanupUnreferencedPrivateListingFile($db, $removedImage, 'image', $id);
    successResponse([
        'message' => $intent === 'submit' ? 'Listing submitted for human review.' : 'Draft saved.',
        'listing_id' => $id,
    ], $current === null ? 201 : 200);
}

function listingIntent(array $body): string {
    $intent = $body['intent'] ?? 'submit';
    if (!is_string($intent) || !in_array($intent, ['draft', 'submit'], true)) errorResponse('Choose whether to save a draft or submit for review.', 422);
    return $intent;
}

function updateSellerInventory(PDO $db, int $sellerId): never {
    $body = listingBody();
    $id = listingId($body['id'] ?? null);
    $stock = validateStock($body['stock_quantity'] ?? null);
    $db->beginTransaction();
    try {
        $listing = ownedListing($db, $id, $sellerId, true);
        if ($listing['listing_status'] === 'suspended') { $db->rollBack(); errorResponse('This listing was suspended by staff and cannot be changed.', 403); }
        if ($listing['format'] !== 'Physical') { $db->rollBack(); errorResponse('Inventory changes are only available for physical books.', 422); }
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
        $listing = ownedListing($db, $id, $sellerId, true);
        if ($listing['listing_status'] === 'suspended') {
            $db->rollBack();
            errorResponse('Suspended listings are managed by staff and cannot be archived by sellers.', 403);
        }
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
            "UPDATE book_listings SET archived_at = NULL, listing_status = 'pending_review', publication_status = 'draft', submitted_at = NOW(),
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
    successResponse(['message' => 'Listing restored and submitted for human review.']);
}

function listingBody(): array {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_starts_with(strtolower($contentType), 'multipart/form-data')) return $_POST;
    return getJsonBody();
}

function iniSizeBytes(string|false $setting): int {
    if (!is_string($setting) || trim($setting) === '') return 0;
    $setting = trim($setting);
    $unit = strtolower(substr($setting, -1));
    $value = (float) $setting;
    return (int) match ($unit) {
        'g' => $value * 1024 * 1024 * 1024,
        'm' => $value * 1024 * 1024,
        'k' => $value * 1024,
        default => $value,
    };
}

function listingUploadRequestLimit(): int {
    $limit = 35 * 1024 * 1024;
    $postLimit = iniSizeBytes(ini_get('post_max_size'));
    return $postLimit > 0 ? min($limit, max(0, $postLimit - 1024 * 1024)) : $limit;
}

function validateListingUploadRequestSize(): void {
    $postLimit = iniSizeBytes(ini_get('post_max_size'));
    $contentLength = filter_var($_SERVER['CONTENT_LENGTH'] ?? null, FILTER_VALIDATE_INT);
    if ($postLimit > 0 && $contentLength !== false && $contentLength > $postLimit) {
        errorResponse('The upload exceeds this server’s request-size limit. Please select smaller files.', 413);
    }
    $total = 0;
    foreach ($_FILES as $file) {
        $sizes = $file['size'] ?? 0;
        $flatten = static function (mixed $value) use (&$flatten, &$total): void {
            if (is_array($value)) { foreach ($value as $nested) $flatten($nested); return; }
            if (is_numeric($value)) $total += (int) $value;
        };
        $flatten($sizes);
    }
    if ($total > listingUploadRequestLimit()) {
        errorResponse('Keep the combined selected uploads under 35 MB.', 413);
    }
}

function validateListingData(array $body, bool $forSubmission): array {
    $text = static function (string $key, int $max, bool $required = false) use ($body): string {
        $value = $body[$key] ?? '';
        if (!is_string($value)) errorResponse('Invalid listing data.', 422);
        $value = trim(strip_tags($value));
        if (strlen($value) > $max) errorResponse('One or more listing fields are too long.', 422);
        if ($required && $value === '') errorResponse('Complete all required listing fields.', 422, ['errors' => [$key => 'This field is required.']]);
        return $value;
    };
    $title = $text('title', 255, $forSubmission);
    $author = $text('author', 255, $forSubmission);
    $publisher = $text('publisher', 255);
    $description = $text('description', 10000);
    $category = $text('category', 100, $forSubmission);
    $language = $text('language', 100);
    $isbn = $text('isbn', 20);
    if ($isbn !== '' && !preg_match('/^(?:[0-9]{9}[0-9Xx]|[0-9]{13})$/D', str_replace([' ', '-'], '', $isbn))) {
        errorResponse('Enter a valid 10- or 13-character ISBN.', 422, ['errors' => ['isbn' => 'Use a valid ISBN-10 or ISBN-13.']]);
    }
    $condition = $body['condition'] ?? 'New';
    $conditions = ['New', 'Like New', 'Very Good', 'Good', 'Acceptable', 'Pre-owned'];
    if (!is_string($condition) || !in_array($condition, $conditions, true)) errorResponse('Choose a valid book condition.', 422);
    $format = $body['format'] ?? 'Physical';
    if (!is_string($format) || !in_array($format, ['Physical', 'E-book'], true)) errorResponse('Choose a valid book format.', 422);
    $priceRaw = $body['price'] ?? null;
    if (($priceRaw === null || $priceRaw === '') && !$forSubmission) $priceRaw = '0';
    if (!is_string($priceRaw) && !is_int($priceRaw) && !is_float($priceRaw)) errorResponse('Enter a valid book price.', 422);
    $priceText = (string) $priceRaw;
    if (!preg_match('/^[0-9]+(?:\.[0-9]{1,2})?$/D', $priceText) || (float) $priceText < 0 || (float) $priceText > 99999999.99 || ($forSubmission && (float) $priceText <= 0)) {
        errorResponse('Enter a valid book price greater than zero before submitting.', 422, ['errors' => ['price' => 'Enter a price greater than zero.']]);
    }
    $price = number_format((float) $priceText, 2, '.', '');
    $stockRaw = $body['stock_quantity'] ?? null;
    if (($stockRaw === null || $stockRaw === '') && !$forSubmission) $stockRaw = '0';
    if ($format === 'E-book') {
        $condition = 'New';
        $stock = 1;
    } else {
        $stock = validateStock($stockRaw);
        if ($forSubmission && $stock < 1) {
            errorResponse('Add at least one physical book to inventory before submitting.', 422, ['errors' => ['stock_quantity' => 'At least one copy is required.']]);
        }
    }
    $rightsConfirmed = ($body['ebook_rights_confirmed'] ?? '') === '1';
    return [
        'title' => $title, 'author' => $author, 'publisher' => $publisher !== '' ? $publisher : null,
        'description' => $description !== '' ? $description : null, 'category' => $category,
        'language' => $language !== '' ? $language : null,
        'isbn' => $isbn !== '' ? str_replace([' ', '-'], '', $isbn) : null,
        'condition' => $condition, 'format' => $format, 'price' => $price, 'stock_quantity' => $stock,
        'ebook_rights_confirmed' => $rightsConfirmed,
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
        "SELECT id, cover_image_path, ebook_file_path, ebook_file_format, format, archived_at, listing_status, publication_status, stock_quantity
         FROM book_listings WHERE id = ? AND seller_id = ? AND `source` = 'seller' LIMIT 1" . ($lock ? ' FOR UPDATE' : '')
    );
    $stmt->execute([$id, $sellerId]);
    $listing = $stmt->fetch();
    if (!$listing) errorResponse('Listing not found.', 404);
    return $listing;
}

function validateListingImageUploads(string $field, int $maxFiles): array {
    $raw = $_FILES[$field] ?? null;
    if ($raw === null) return [];
    $uploads = [];
    if (is_array($raw['name'] ?? null)) {
        foreach (array_keys($raw['name']) as $index) {
            $uploads[] = [
                'name' => $raw['name'][$index] ?? '', 'tmp_name' => $raw['tmp_name'][$index] ?? '',
                'error' => $raw['error'][$index] ?? UPLOAD_ERR_NO_FILE, 'size' => $raw['size'][$index] ?? 0,
            ];
        }
    } else {
        $uploads[] = $raw;
    }
    $valid = [];
    foreach ($uploads as $file) {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
        if (!isset($file['tmp_name'], $file['error'], $file['size']) || !is_string($file['tmp_name']) || !is_int($file['error'])) {
            errorResponse('Invalid image upload.', 422);
        }
        if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) errorResponse('An image upload failed. Please try again.', 422);
        $size = filter_var($file['size'], FILTER_VALIDATE_INT);
        if ($size === false || $size < 1 || $size > 5 * 1024 * 1024) errorResponse('Book images must be 5 MB or smaller.', 422);
        $imageInfo = @getimagesize($file['tmp_name']);
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!$imageInfo || !isset($extensions[$mime]) || ($imageInfo['mime'] ?? '') !== $mime) errorResponse('Book images must be valid JPEG, PNG, or WebP files.', 422);
        if ($imageInfo[0] < 100 || $imageInfo[1] < 100 || $imageInfo[0] > 8000 || $imageInfo[1] > 8000) {
            errorResponse('Book images must be between 100 and 8000 pixels in each dimension.', 422);
        }
        $valid[] = ['tmp_name' => $file['tmp_name'], 'extension' => $extensions[$mime]];
    }
    if (count($valid) > $maxFiles) errorResponse('Too many images were selected for this image group.', 422);
    return $valid;
}

function validatePrivateEbookUpload(): ?array {
    $file = $_FILES['ebook_file'] ?? null;
    if ($file === null || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
    if (!is_array($file) || !is_string($file['tmp_name'] ?? null) || !is_string($file['name'] ?? null) || !is_int($file['error'] ?? null)) {
        errorResponse('Invalid e-book upload.', 422);
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) errorResponse('The e-book upload failed. Please try again.', 422);
    $size = filter_var($file['size'] ?? null, FILTER_VALIDATE_INT);
    $maxEbookBytes = min(30 * 1024 * 1024, listingUploadRequestLimit());
    if ($size === false || $size < 1 || $size > $maxEbookBytes) errorResponse('PDF and EPUB files must be 30 MB or smaller and fit within the server request limit.', 422);
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if ($extension === 'pdf' && $mime === 'application/pdf') {
        $handle = fopen($file['tmp_name'], 'rb');
        $signature = $handle === false ? '' : fread($handle, 5);
        if (is_resource($handle)) fclose($handle);
        if ($signature !== '%PDF-') errorResponse('Upload a valid PDF e-book.', 422);
        return ['tmp_name' => $file['tmp_name'], 'extension' => 'pdf'];
    }
    if ($extension === 'epub' && in_array($mime, ['application/epub+zip', 'application/zip', 'application/octet-stream'], true) && hasEpubMimetypeHeader($file['tmp_name'])) {
        return ['tmp_name' => $file['tmp_name'], 'extension' => 'epub'];
    }
    errorResponse('E-book files must be valid PDF or EPUB files.', 422, ['errors' => ['ebook_file' => 'Choose a PDF or EPUB file.']]);
}

function hasEpubMimetypeHeader(string $path): bool {
    $handle = @fopen($path, 'rb');
    if ($handle === false) return false;
    $header = fread($handle, 30);
    if (!is_string($header) || strlen($header) !== 30) { fclose($handle); return false; }
    $fields = unpack('Vsignature/vversion/vflags/vmethod/vtime/vdate/Vcrc/Vcompressed/Vuncompressed/vfilename/vextra', $header);
    if (!is_array($fields) || $fields['signature'] !== 0x04034b50 || $fields['method'] !== 0 || $fields['filename'] !== 8
        || $fields['compressed'] !== $fields['uncompressed']) { fclose($handle); return false; }
    $filename = fread($handle, 8);
    if (is_int($fields['extra']) && $fields['extra'] > 0) fseek($handle, $fields['extra'], SEEK_CUR);
    $content = is_string($filename) && $filename === 'mimetype' ? fread($handle, (int) $fields['uncompressed']) : false;
    fclose($handle);
    return $filename === 'mimetype' && $content === 'application/epub+zip';
}

function storeListingImage(array $upload): string {
    return storePrivateListingImage($upload);
}

function cleanupUnreferencedPrivateListingFile(PDO $db, mixed $key, string $type, ?int $listingId): void {
    if ($type === 'image' && !isPrivateListingImageKey($key)) return;
    if ($type === 'ebook' && !isPrivateListingEbookKey($key)) return;

    try {
        if ($type === 'image') {
            $stmt = $db->prepare(
                'SELECT EXISTS(SELECT 1 FROM book_listings WHERE cover_image_path = ?)
                 OR EXISTS(SELECT 1 FROM book_listing_media WHERE file_path = ?)'
            );
            $stmt->execute([$key, $key]);
        } else {
            $stmt = $db->prepare('SELECT EXISTS(SELECT 1 FROM book_listings WHERE ebook_file_path = ?)');
            $stmt->execute([$key]);
        }
        if ((int) $stmt->fetchColumn() !== 0) return;
    } catch (Throwable $e) {
        error_log('Bookify private listing cleanup skipped: type=' . $type . ' listing_id=' . ($listingId ?? 0) . ' file=' . (string) $key . ' reason=reference_check_failed_' . get_class($e));
        return;
    }

    if ($type === 'image') deletePrivateListingImage((string) $key, $listingId);
    else deletePrivateListingEbook((string) $key, $listingId);
}
