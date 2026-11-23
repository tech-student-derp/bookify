<?php
/**
 * Bookify — Seller Store Profile & Upload Controller
 *
 * Dedicated controller for seller storefront identity and pickup address management.
 * Enforces session-derived seller identity, CSRF validation, strict input validation,
 * secure image uploads with MIME sniffing, dimension checks, and path traversal protection.
 */
declare(strict_types=1);

ob_start();
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/csrf.php';
require_once __DIR__ . '/../utils/validation.php';
require_once __DIR__ . '/../utils/audit.php';
require_once __DIR__ . '/../middleware/auth.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('Seller profile API error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    errorResponse('An unexpected error occurred while processing the seller store profile.', 500);
});

// Guard: Authentication, Seller Role & Active Account
requireAuth();
$db = getDB();
requireDatabaseRole($db, 'seller');
requireActiveAccount($db);

$sellerId = (int) $_SESSION['user_id'];

// Verify user record in database
$userStmt = $db->prepare('SELECT id, first_name, last_name, email, contact_number, is_verified, role, account_status FROM users WHERE id = ? LIMIT 1');
$userStmt->execute([$sellerId]);
$sellerUser = $userStmt->fetch(PDO::FETCH_ASSOC);

if (!$sellerUser || $sellerUser['role'] !== 'seller') {
    errorResponse('Only approved sellers can access the store profile.', 403);
}
if (($sellerUser['account_status'] ?? 'active') !== 'active') {
    errorResponse('This account is suspended.', 403);
}

$action = is_string($_GET['action'] ?? null) ? $_GET['action'] : 'get';

match ($action) {
    'get' => handleGetProfile($db, $sellerId, $sellerUser),
    'create', 'update', 'save' => handleSaveProfile($db, $sellerId, $sellerUser),
    'upload-logo' => handleUploadLogo($db, $sellerId, $sellerUser),
    'upload-banner' => handleUploadBanner($db, $sellerId, $sellerUser),
    'remove-logo' => handleRemoveLogo($db, $sellerId),
    'remove-banner' => handleRemoveBanner($db, $sellerId),
    default => errorResponse('Unknown seller profile action.', 404),
};

/**
 * Retrieve the authenticated seller's store profile and user summary.
 */
function handleGetProfile(PDO $db, int $sellerId, array $sellerUser): never {
    requireMethod('GET');

    $stmt = $db->prepare(
        'SELECT user_id, store_name, bio, logo_path, banner_path,
                pickup_address_line, pickup_barangay, pickup_city, pickup_province,
                pickup_region, pickup_postal_code, pickup_contact,
                created_at, updated_at
         FROM seller_profiles
         WHERE user_id = ?
         LIMIT 1'
    );
    $stmt->execute([$sellerId]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);

    successResponse([
        'has_profile' => $profile !== false,
        'profile' => $profile !== false ? $profile : null,
        'user' => [
            'id' => (int) $sellerUser['id'],
            'first_name' => $sellerUser['first_name'],
            'last_name' => $sellerUser['last_name'],
            'email' => $sellerUser['email'],
            'contact_number' => $sellerUser['contact_number'],
            'is_verified' => (bool) $sellerUser['is_verified'],
        ],
    ]);
}

/**
 * Create or update the authenticated seller's store profile.
 */
function handleSaveProfile(PDO $db, int $sellerId, array $sellerUser): never {
    requireMethod('POST');
    if (!validateCsrfToken()) {
        errorResponse('Invalid or missing CSRF token.', 403);
    }

    $body = getJsonBody();
    $errors = [];

    // 1. Store Name (Required)
    $storeName = trim(strip_tags((string) ($body['store_name'] ?? '')));
    if ($storeName === '') {
        $errors['store_name'] = 'Store name is required.';
    } elseif (mb_strlen($storeName) < 2) {
        $errors['store_name'] = 'Store name must be at least 2 characters.';
    } elseif (mb_strlen($storeName) > 150) {
        $errors['store_name'] = 'Store name cannot exceed 150 characters.';
    } else {
        // Enforce uniqueness across sellers
        $checkUnique = $db->prepare('SELECT user_id FROM seller_profiles WHERE store_name = ? AND user_id != ? LIMIT 1');
        $checkUnique->execute([$storeName, $sellerId]);
        if ($checkUnique->fetch()) {
            errorResponse('This store name is already in use by another seller. Please choose a different name.', 409, [
                'errors' => ['store_name' => 'This store name is already taken.'],
            ]);
        }
    }

    // 2. Store Biography (Optional, max 5000 chars)
    $bioRaw = $body['bio'] ?? null;
    $bio = is_string($bioRaw) ? trim(strip_tags($bioRaw)) : null;
    if ($bio === '') $bio = null;
    if ($bio !== null && mb_strlen($bio) > 5000) {
        $errors['bio'] = 'Biography cannot exceed 5000 characters.';
    }

    // 3. Pickup Address Line (Optional, max 255 chars)
    $pickupAddressRaw = $body['pickup_address_line'] ?? null;
    $pickupAddress = is_string($pickupAddressRaw) ? trim(strip_tags($pickupAddressRaw)) : null;
    if ($pickupAddress === '') $pickupAddress = null;
    if ($pickupAddress !== null && mb_strlen($pickupAddress) > 255) {
        $errors['pickup_address_line'] = 'Pickup address line cannot exceed 255 characters.';
    }

    // 4. Pickup Barangay (Optional, max 120 chars)
    $pickupBarangayRaw = $body['pickup_barangay'] ?? null;
    $pickupBarangay = is_string($pickupBarangayRaw) ? trim(strip_tags($pickupBarangayRaw)) : null;
    if ($pickupBarangay === '') $pickupBarangay = null;
    if ($pickupBarangay !== null && mb_strlen($pickupBarangay) > 120) {
        $errors['pickup_barangay'] = 'Barangay cannot exceed 120 characters.';
    }

    // 5. Pickup City (Optional, max 120 chars)
    $pickupCityRaw = $body['pickup_city'] ?? null;
    $pickupCity = is_string($pickupCityRaw) ? trim(strip_tags($pickupCityRaw)) : null;
    if ($pickupCity === '') $pickupCity = null;
    if ($pickupCity !== null && mb_strlen($pickupCity) > 120) {
        $errors['pickup_city'] = 'City cannot exceed 120 characters.';
    }

    // 6. Pickup Province (Optional, max 120 chars)
    $pickupProvinceRaw = $body['pickup_province'] ?? null;
    $pickupProvince = is_string($pickupProvinceRaw) ? trim(strip_tags($pickupProvinceRaw)) : null;
    if ($pickupProvince === '') $pickupProvince = null;
    if ($pickupProvince !== null && mb_strlen($pickupProvince) > 120) {
        $errors['pickup_province'] = 'Province cannot exceed 120 characters.';
    }

    // 7. Pickup Region (Optional, max 120 chars)
    $pickupRegionRaw = $body['pickup_region'] ?? null;
    $pickupRegion = is_string($pickupRegionRaw) ? trim(strip_tags($pickupRegionRaw)) : null;
    if ($pickupRegion === '') $pickupRegion = null;
    if ($pickupRegion !== null && mb_strlen($pickupRegion) > 120) {
        $errors['pickup_region'] = 'Region cannot exceed 120 characters.';
    }

    // 8. Pickup Postal Code (Optional, max 12 chars, digits/alphanumeric)
    $pickupPostalRaw = $body['pickup_postal_code'] ?? null;
    $pickupPostal = is_string($pickupPostalRaw) ? trim(strip_tags($pickupPostalRaw)) : null;
    if ($pickupPostal === '') $pickupPostal = null;
    if ($pickupPostal !== null) {
        if (mb_strlen($pickupPostal) > 12) {
            $errors['pickup_postal_code'] = 'Postal code cannot exceed 12 characters.';
        } elseif (!preg_match('/^[\w\s-]{3,12}$/', $pickupPostal)) {
            $errors['pickup_postal_code'] = 'Enter a valid postal code (e.g. 1000).';
        }
    }

    // 9. Pickup Contact Number (Optional, max 20 chars, Philippine mobile format)
    $pickupContactRaw = $body['pickup_contact'] ?? null;
    $pickupContact = is_string($pickupContactRaw) ? trim(strip_tags($pickupContactRaw)) : null;
    if ($pickupContact === '') $pickupContact = null;
    if ($pickupContact !== null) {
        if (mb_strlen($pickupContact) > 20) {
            $errors['pickup_contact'] = 'Contact number cannot exceed 20 characters.';
        } elseif (!isValidPhoneNumber($pickupContact)) {
            $errors['pickup_contact'] = 'Enter a valid Philippine mobile number (e.g. 09171234567 or +639171234567).';
        }
    }

    if (!empty($errors)) {
        errorResponse('Please correct the highlighted form errors.', 422, ['errors' => $errors]);
    }

    $db->beginTransaction();
    try {
        // Check if profile exists
        $checkStmt = $db->prepare('SELECT user_id FROM seller_profiles WHERE user_id = ? FOR UPDATE');
        $checkStmt->execute([$sellerId]);
        $exists = (bool) $checkStmt->fetchColumn();

        if ($exists) {
            $stmt = $db->prepare(
                'UPDATE seller_profiles SET
                    store_name = ?,
                    bio = ?,
                    pickup_address_line = ?,
                    pickup_barangay = ?,
                    pickup_city = ?,
                    pickup_province = ?,
                    pickup_region = ?,
                    pickup_postal_code = ?,
                    pickup_contact = ?,
                    updated_at = NOW()
                 WHERE user_id = ?'
            );
            $stmt->execute([
                $storeName,
                $bio,
                $pickupAddress,
                $pickupBarangay,
                $pickupCity,
                $pickupProvince,
                $pickupRegion,
                $pickupPostal,
                $pickupContact,
                $sellerId,
            ]);
        } else {
            $stmt = $db->prepare(
                'INSERT INTO seller_profiles
                    (user_id, store_name, bio, pickup_address_line, pickup_barangay, pickup_city, pickup_province, pickup_region, pickup_postal_code, pickup_contact, created_at, updated_at)
                 VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())'
            );
            $stmt->execute([
                $sellerId,
                $storeName,
                $bio,
                $pickupAddress,
                $pickupBarangay,
                $pickupCity,
                $pickupProvince,
                $pickupRegion,
                $pickupPostal,
                $pickupContact,
            ]);
        }

        // Update user contact_number if user has none and pickup_contact was provided
        if ($pickupContact !== null && empty($sellerUser['contact_number'])) {
            $updateUser = $db->prepare('UPDATE users SET contact_number = ? WHERE id = ?');
            $updateUser->execute([$pickupContact, $sellerId]);
        }

        recordAdminAudit($db, $sellerId, $exists ? 'seller_profile.update' : 'seller_profile.create', 'seller_profile', $sellerId, [
            'store_name' => $storeName,
        ]);

        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }

    // Retrieve fresh profile
    $getStmt = $db->prepare('SELECT * FROM seller_profiles WHERE user_id = ? LIMIT 1');
    $getStmt->execute([$sellerId]);
    $updatedProfile = $getStmt->fetch(PDO::FETCH_ASSOC);

    successResponse([
        'message' => 'Store profile saved successfully.',
        'profile' => $updatedProfile,
    ]);
}

/**
 * Upload and replace the seller's store logo.
 */
function handleUploadLogo(PDO $db, int $sellerId, array $sellerUser): never {
    requireMethod('POST');
    if (!validateCsrfToken()) {
        errorResponse('Invalid or missing CSRF token.', 403);
    }

    $file = $_FILES['logo'] ?? $_FILES['file'] ?? null;
    if (!$file || !is_array($file)) {
        errorResponse('No logo file was uploaded.', 400);
    }

    $uploadedPath = processImageUpload(
        file: $file,
        sellerId: $sellerId,
        type: 'logo',
        maxBytes: 2 * 1024 * 1024, // 2MB
        minDim: [50, 50],
        maxDim: [3000, 3000]
    );

    // Update profile in database
    $db->beginTransaction();
    try {
        $checkStmt = $db->prepare('SELECT logo_path FROM seller_profiles WHERE user_id = ? FOR UPDATE');
        $checkStmt->execute([$sellerId]);
        $row = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($row !== false) {
            // Delete old logo file if present
            deleteOldUploadFile($row['logo_path'] ?? null);

            $update = $db->prepare('UPDATE seller_profiles SET logo_path = ?, updated_at = NOW() WHERE user_id = ?');
            $update->execute([$uploadedPath, $sellerId]);
        } else {
            // Create initial profile with default store name
            $defaultName = trim($sellerUser['first_name'] . ' ' . $sellerUser['last_name']) . "'s Store";
            $storeName = ensureUniqueStoreName($db, $defaultName, $sellerId);
            $insert = $db->prepare('INSERT INTO seller_profiles (user_id, store_name, logo_path, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())');
            $insert->execute([$sellerId, $storeName, $uploadedPath]);
        }

        recordAdminAudit($db, $sellerId, 'seller_profile.logo_upload', 'seller_profile', $sellerId, [
            'logo_path' => $uploadedPath,
        ]);

        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        // Clean up newly uploaded file on DB failure
        deleteOldUploadFile($uploadedPath);
        throw $e;
    }

    successResponse([
        'message' => 'Store logo uploaded successfully.',
        'logo_path' => $uploadedPath,
    ]);
}

/**
 * Upload and replace the seller's store banner.
 */
function handleUploadBanner(PDO $db, int $sellerId, array $sellerUser): never {
    requireMethod('POST');
    if (!validateCsrfToken()) {
        errorResponse('Invalid or missing CSRF token.', 403);
    }

    $file = $_FILES['banner'] ?? $_FILES['file'] ?? null;
    if (!$file || !is_array($file)) {
        errorResponse('No banner file was uploaded.', 400);
    }

    $uploadedPath = processImageUpload(
        file: $file,
        sellerId: $sellerId,
        type: 'banner',
        maxBytes: 5 * 1024 * 1024, // 5MB
        minDim: [200, 60],
        maxDim: [4000, 2000]
    );

    // Update profile in database
    $db->beginTransaction();
    try {
        $checkStmt = $db->prepare('SELECT banner_path FROM seller_profiles WHERE user_id = ? FOR UPDATE');
        $checkStmt->execute([$sellerId]);
        $row = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($row !== false) {
            // Delete old banner file if present
            deleteOldUploadFile($row['banner_path'] ?? null);

            $update = $db->prepare('UPDATE seller_profiles SET banner_path = ?, updated_at = NOW() WHERE user_id = ?');
            $update->execute([$uploadedPath, $sellerId]);
        } else {
            // Create initial profile with default store name
            $defaultName = trim($sellerUser['first_name'] . ' ' . $sellerUser['last_name']) . "'s Store";
            $storeName = ensureUniqueStoreName($db, $defaultName, $sellerId);
            $insert = $db->prepare('INSERT INTO seller_profiles (user_id, store_name, banner_path, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())');
            $insert->execute([$sellerId, $storeName, $uploadedPath]);
        }

        recordAdminAudit($db, $sellerId, 'seller_profile.banner_upload', 'seller_profile', $sellerId, [
            'banner_path' => $uploadedPath,
        ]);

        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        // Clean up newly uploaded file on DB failure
        deleteOldUploadFile($uploadedPath);
        throw $e;
    }

    successResponse([
        'message' => 'Store banner uploaded successfully.',
        'banner_path' => $uploadedPath,
    ]);
}

/**
 * Remove store logo.
 */
function handleRemoveLogo(PDO $db, int $sellerId): never {
    requireMethod('POST');
    if (!validateCsrfToken()) {
        errorResponse('Invalid or missing CSRF token.', 403);
    }

    $db->beginTransaction();
    try {
        $checkStmt = $db->prepare('SELECT logo_path FROM seller_profiles WHERE user_id = ? FOR UPDATE');
        $checkStmt->execute([$sellerId]);
        $row = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($row && !empty($row['logo_path'])) {
            deleteOldUploadFile($row['logo_path']);
            $update = $db->prepare('UPDATE seller_profiles SET logo_path = NULL, updated_at = NOW() WHERE user_id = ?');
            $update->execute([$sellerId]);
        }

        recordAdminAudit($db, $sellerId, 'seller_profile.logo_remove', 'seller_profile', $sellerId);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }

    successResponse(['message' => 'Store logo removed successfully.']);
}

/**
 * Remove store banner.
 */
function handleRemoveBanner(PDO $db, int $sellerId): never {
    requireMethod('POST');
    if (!validateCsrfToken()) {
        errorResponse('Invalid or missing CSRF token.', 403);
    }

    $db->beginTransaction();
    try {
        $checkStmt = $db->prepare('SELECT banner_path FROM seller_profiles WHERE user_id = ? FOR UPDATE');
        $checkStmt->execute([$sellerId]);
        $row = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($row && !empty($row['banner_path'])) {
            deleteOldUploadFile($row['banner_path']);
            $update = $db->prepare('UPDATE seller_profiles SET banner_path = NULL, updated_at = NOW() WHERE user_id = ?');
            $update->execute([$sellerId]);
        }

        recordAdminAudit($db, $sellerId, 'seller_profile.banner_remove', 'seller_profile', $sellerId);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }

    successResponse(['message' => 'Store banner removed successfully.']);
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload & File Validation Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process, validate, and move an uploaded image.
 *
 * @return string Relative URL path (e.g. /uploads/sellers/logos/logo_1_abc.webp)
 */
function processImageUpload(array $file, int $sellerId, string $type, int $maxBytes, array $minDim, array $maxDim): string {
    // 1. Check upload error code
    $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($error !== UPLOAD_ERR_OK) {
        match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => errorResponse('File exceeds server maximum upload size.', 422),
            UPLOAD_ERR_PARTIAL => errorResponse('File upload was interrupted. Please try again.', 422),
            UPLOAD_ERR_NO_FILE => errorResponse('No file was received.', 400),
            default => errorResponse('Failed to receive uploaded file.', 500),
        };
    }

    // 2. Check byte size
    $size = (int) ($file['size'] ?? 0);
    if ($size <= 0 || $size > $maxBytes) {
        $mb = number_format($maxBytes / (1024 * 1024), 0);
        errorResponse("Uploaded image cannot exceed {$mb}MB.", 422);
    }

    // 3. Validate real MIME type via Fileinfo (not the client-supplied header)
    $tmpName = (string) ($file['tmp_name'] ?? '');
    if (!is_uploaded_file($tmpName)) {
        errorResponse('Invalid upload source.', 400);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    if ($finfo === false) {
        errorResponse('Server failed to initialize file scanner.', 500);
    }
    $mimeType = finfo_file($finfo, $tmpName);
    finfo_close($finfo);

    $allowedMimes = [
        'image/jpeg' => '.jpg',
        'image/png' => '.png',
        'image/webp' => '.webp',
    ];

    if (!isset($allowedMimes[$mimeType])) {
        errorResponse('Only JPEG, PNG, and WebP image formats are permitted.', 422);
    }
    $ext = $allowedMimes[$mimeType];

    // 4. Validate image parseability and dimensions via getimagesize
    $imageInfo = @getimagesize($tmpName);
    if ($imageInfo === false) {
        errorResponse('The uploaded file is corrupt or not a valid image.', 422);
    }

    [$width, $height] = $imageInfo;
    [$minW, $minH] = $minDim;
    [$maxW, $maxH] = $maxDim;

    if ($width < $minW || $height < $minH) {
        errorResponse("Image dimensions are too small. Minimum required: {$minW}x{$minH}px.", 422);
    }
    if ($width > $maxW || $height > $maxH) {
        errorResponse("Image dimensions are too large. Maximum permitted: {$maxW}x{$maxH}px.", 422);
    }

    // 5. Generate secure server-controlled filename
    $randomToken = bin2hex(random_bytes(10));
    $filename = "{$type}_{$sellerId}_{$randomToken}{$ext}";

    // Target directory
    $subDir = $type === 'logo' ? 'logos' : 'banners';
    $projectRoot = dirname(__DIR__, 2);
    $targetDir = "{$projectRoot}/uploads/sellers/{$subDir}";

    if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
        errorResponse('Server failed to create upload destination directory.', 500);
    }

    $destinationPath = "{$targetDir}/{$filename}";

    // 6. Move uploaded file
    if (!move_uploaded_file($tmpName, $destinationPath)) {
        errorResponse('Failed to store the uploaded image.', 500);
    }

    // Return web-accessible path
    return "/uploads/sellers/{$subDir}/{$filename}";
}

/**
 * Safely delete an existing upload file if it resides within the uploads directory.
 */
function deleteOldUploadFile(?string $relativePath): void {
    if (!$relativePath || !is_string($relativePath)) return;

    $trimmed = ltrim($relativePath, '/\\');
    if (!str_starts_with($trimmed, 'uploads/sellers/')) return;
    if (str_contains($trimmed, '..')) return;

    $projectRoot = dirname(__DIR__, 2);
    $fullPath = "{$projectRoot}/{$trimmed}";
    $realPath = realpath($fullPath);
    $realBase = realpath("{$projectRoot}/uploads/sellers");

    if ($realPath !== false && $realBase !== false && str_starts_with($realPath, $realBase)) {
        if (is_file($realPath)) {
            @unlink($realPath);
        }
    }
}

/**
 * Ensure fallback store name is unique if initializing via image upload.
 */
function ensureUniqueStoreName(PDO $db, string $candidateName, int $sellerId): string {
    $name = $candidateName;
    $suffix = 1;
    while (true) {
        $stmt = $db->prepare('SELECT user_id FROM seller_profiles WHERE store_name = ? AND user_id != ? LIMIT 1');
        $stmt->execute([$name, $sellerId]);
        if (!$stmt->fetch()) {
            return $name;
        }
        $suffix++;
        $name = "{$candidateName} {$suffix}";
    }
}
