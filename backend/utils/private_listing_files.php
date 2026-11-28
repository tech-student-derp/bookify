<?php
declare(strict_types=1);

/** Resolve private e-book storage outside the web root. The database stores only an opaque filename. */
function privateListingEbookDirectory(): string {
    return privateListingSubdirectory('ebooks');
}

function privateListingImageDirectory(): string {
    return privateListingSubdirectory('book-images');
}

function privateListingSubdirectory(string $name): string {
    $configured = trim((string) ($_ENV['BOOKIFY_PRIVATE_STORAGE_PATH'] ?? getenv('BOOKIFY_PRIVATE_STORAGE_PATH') ?: ''));
    $base = $configured !== ''
        ? $configured
        : sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'bookify-private';
    $directory = rtrim($base, '\\/') . DIRECTORY_SEPARATOR . $name;

    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Private e-book storage is unavailable.');
    }
    if (DIRECTORY_SEPARATOR !== '\\' && !@chmod($directory, 0700)) {
        throw new RuntimeException('Private e-book storage is unavailable.');
    }

    $realDirectory = realpath($directory);
    $documentRoot = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''));
    if ($realDirectory === false || ($documentRoot !== false && privateListingPathInside($realDirectory, $documentRoot))) {
        throw new RuntimeException('Private e-book storage is unavailable.');
    }
    return $realDirectory;
}

function privateListingPathInside(string $path, string $parent): bool {
    $normalize = static fn (string $value): string => strtolower(str_replace('\\', '/', rtrim($value, '\\/')));
    $path = $normalize($path);
    $parent = $normalize($parent);
    return $path === $parent || str_starts_with($path, $parent . '/');
}

function isPrivateListingEbookKey(mixed $value): bool {
    return is_string($value) && preg_match('/^[a-f0-9]{48}\.(pdf|epub)$/D', $value) === 1;
}

function isPrivateListingImageKey(mixed $value): bool {
    return is_string($value) && preg_match('/^image_[a-f0-9]{48}\.(jpg|png|webp)$/D', $value) === 1;
}

/** Store a validated upload under a random key; this key must never be returned to public APIs. */
function storePrivateListingEbook(array $upload): string {
    $key = bin2hex(random_bytes(24)) . '.' . strtolower($upload['extension']);
    $destination = privateListingEbookDirectory() . DIRECTORY_SEPARATOR . $key;
    if (!move_uploaded_file($upload['tmp_name'], $destination)) {
        throw new RuntimeException('Private e-book storage is unavailable.');
    }
    if (DIRECTORY_SEPARATOR !== '\\' && !@chmod($destination, 0600)) {
        if (!@unlink($destination)) error_log('Bookify private listing cleanup failed: type=ebook file=' . $key . ' reason=chmod_failed_unlink_failed');
        throw new RuntimeException('Private e-book storage is unavailable.');
    }
    return $key;
}

function removePrivateListingFile(string $directory, string $key, string $type, ?int $listingId): bool {
    try {
        if (!is_dir($directory) || !is_readable($directory)) {
            error_log('Bookify private listing cleanup failed: type=' . $type . ' listing_id=' . ($listingId ?? 0) . ' file=' . $key . ' reason=directory_unavailable');
            return false;
        }
        $path = $directory . DIRECTORY_SEPARATOR . $key;
        if (!file_exists($path)) return true;
        if (!is_file($path)) {
            error_log('Bookify private listing cleanup failed: type=' . $type . ' listing_id=' . ($listingId ?? 0) . ' file=' . $key . ' reason=not_a_file');
            return false;
        }
        if (!@unlink($path)) {
            error_log('Bookify private listing cleanup failed: type=' . $type . ' listing_id=' . ($listingId ?? 0) . ' file=' . $key . ' reason=unlink_failed');
            return false;
        }
        return true;
    } catch (Throwable $e) {
        error_log('Bookify private listing cleanup failed: type=' . $type . ' listing_id=' . ($listingId ?? 0) . ' file=' . $key . ' reason=' . get_class($e));
        return false;
    }
}

function deletePrivateListingEbook(?string $key, ?int $listingId = null): bool {
    if (!isPrivateListingEbookKey($key)) return true;
    try {
        return removePrivateListingFile(privateListingEbookDirectory(), $key, 'ebook', $listingId);
    } catch (Throwable $e) {
        error_log('Bookify private listing cleanup failed: type=ebook listing_id=' . ($listingId ?? 0) . ' file=' . $key . ' reason=' . get_class($e));
        return false;
    }
}

function privateListingEbookExists(mixed $key): bool {
    if (!isPrivateListingEbookKey($key)) return false;
    try {
        $path = privateListingEbookDirectory() . DIRECTORY_SEPARATOR . $key;
        return is_file($path) && is_readable($path);
    } catch (Throwable) {
        return false;
    }
}

/** Store book images privately until the listing passes server-side visibility checks. */
function storePrivateListingImage(array $upload): string {
    $key = 'image_' . bin2hex(random_bytes(24)) . '.' . strtolower($upload['extension']);
    $destination = privateListingImageDirectory() . DIRECTORY_SEPARATOR . $key;
    if (!move_uploaded_file($upload['tmp_name'], $destination)) {
        throw new RuntimeException('Private book image storage is unavailable.');
    }
    if (DIRECTORY_SEPARATOR !== '\\' && !@chmod($destination, 0600)) {
        if (!@unlink($destination)) error_log('Bookify private listing cleanup failed: type=image file=' . $key . ' reason=chmod_failed_unlink_failed');
        throw new RuntimeException('Private book image storage is unavailable.');
    }
    return $key;
}

function deletePrivateListingImage(?string $key, ?int $listingId = null): bool {
    if (!isPrivateListingImageKey($key)) return true;
    try {
        return removePrivateListingFile(privateListingImageDirectory(), $key, 'image', $listingId);
    } catch (Throwable $e) {
        error_log('Bookify private listing cleanup failed: type=image listing_id=' . ($listingId ?? 0) . ' file=' . $key . ' reason=' . get_class($e));
        return false;
    }
}
