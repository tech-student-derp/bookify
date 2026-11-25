<?php
declare(strict_types=1);

const SELLER_ID_MAX_BYTES = 5 * 1024 * 1024;

final class SellerIdValidationException extends RuntimeException {}

/** Validate a Philippine mobile number without changing the account profile. */
function validateSellerApplicationPhone(string $phone): bool {
    return function_exists('isValidPhoneNumber') && isValidPhoneNumber($phone);
}

/**
 * Validate image content and extension. Kept separate from HTTP upload checks so
 * the image validation can be exercised with synthetic files in CLI tests.
 * @return array{mime:string,extension:string,size:int}
 */
function inspectSellerIdDocument(string $path, string $originalName): array {
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if (!in_array($extension, ['jpg', 'jpeg', 'png'], true)) {
        throw new SellerIdValidationException('Upload a JPG, JPEG, or PNG image of your government-issued ID.');
    }

    $size = @filesize($path);
    if (!is_int($size) || $size < 1) {
        throw new SellerIdValidationException('The ID image is empty or could not be read.');
    }
    if ($size > SELLER_ID_MAX_BYTES) {
        throw new SellerIdValidationException('The ID image must be 5 MB or smaller.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($path);
    $expectedMime = match ($extension) {
        'jpg', 'jpeg' => 'image/jpeg',
        'png' => 'image/png',
    };
    $image = @getimagesize($path);
    if ($mime !== $expectedMime || !$image || ($image['mime'] ?? null) !== $expectedMime) {
        throw new SellerIdValidationException('The file extension and image content must match a valid JPG, JPEG, or PNG image.');
    }

    return ['mime' => $expectedMime, 'extension' => $expectedMime === 'image/jpeg' ? 'jpg' : 'png', 'size' => $size];
}

/** @return array{tmp_name:string,extension:string,mime:string,size:int} */
function validateSellerIdUpload(mixed $file): array {
    if (!is_array($file) || !is_string($file['tmp_name'] ?? null)
        || !is_string($file['name'] ?? null) || !is_int($file['error'] ?? null)) {
        throw new SellerIdValidationException('A government-issued ID image is required.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        $message = match ($file['error']) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The ID image must be 5 MB or smaller.',
            UPLOAD_ERR_PARTIAL => 'The ID image upload was interrupted. Please try again.',
            UPLOAD_ERR_NO_FILE => 'A government-issued ID image is required.',
            default => 'The ID image upload failed. Please try again.',
        };
        throw new SellerIdValidationException($message);
    }

    return ['tmp_name' => $file['tmp_name']] + inspectSellerIdDocument($file['tmp_name'], $file['name']);
}

/** Return a verified private directory outside the current web root. */
function sellerIdStorageDirectory(): string {
    $configured = trim((string) ($_ENV['BOOKIFY_PRIVATE_STORAGE_PATH'] ?? getenv('BOOKIFY_PRIVATE_STORAGE_PATH') ?: ''));
    $directory = $configured !== ''
        ? $configured
        : sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'bookify-private' . DIRECTORY_SEPARATOR . 'seller-ids';

    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Private seller ID storage is unavailable.');
    }
    if (DIRECTORY_SEPARATOR !== '\\' && !@chmod($directory, 0700)) {
        throw new RuntimeException('Private seller ID storage is unavailable.');
    }
    $realDirectory = realpath($directory);
    $documentRoot = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''));
    if ($realDirectory === false || ($documentRoot !== false && isPathInside($realDirectory, $documentRoot))) {
        throw new RuntimeException('Private seller ID storage is unavailable.');
    }
    return $realDirectory;
}

function isPathInside(string $path, string $parent): bool {
    $path = strtolower(str_replace('\\', '/', rtrim($path, '\\/')));
    $parent = strtolower(str_replace('\\', '/', rtrim($parent, '\\/')));
    return $path === $parent || str_starts_with($path, $parent . '/');
}

/** @param array{tmp_name:string,extension:string,mime:string,size:int} $upload */
function storeSellerIdDocument(array $upload): string {
    $key = bin2hex(random_bytes(16)) . '.' . $upload['extension'];
    $destination = sellerIdStorageDirectory() . DIRECTORY_SEPARATOR . $key;
    if (!move_uploaded_file($upload['tmp_name'], $destination)) {
        throw new RuntimeException('Private seller ID storage is unavailable.');
    }
    if (DIRECTORY_SEPARATOR !== '\\' && !@chmod($destination, 0600)) {
        @unlink($destination);
        throw new RuntimeException('Private seller ID storage is unavailable.');
    }
    return $key;
}

function hasSellerApplicationVerificationColumns(PDO $db): bool {
    $stmt = $db->prepare(
        "SELECT COUNT(DISTINCT COLUMN_NAME) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seller_applications'
           AND COLUMN_NAME IN ('phone_number', 'id_document_key')"
    );
    $stmt->execute();
    return (int) $stmt->fetchColumn() === 2;
}
