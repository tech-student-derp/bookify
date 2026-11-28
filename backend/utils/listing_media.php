<?php
declare(strict_types=1);

/** Accept only safe legacy image paths from the former public books directory. */
function isLegacyListingImagePath(mixed $value): bool {
    if (!is_string($value) || $value === '' || str_contains($value, '\\')) return false;
    $relativePath = str_starts_with($value, '/') ? substr($value, 1) : $value;
    $prefix = 'uploads/books/';
    if (!str_starts_with($relativePath, $prefix)) return false;

    $filePath = substr($relativePath, strlen($prefix));
    $segments = explode('/', $filePath);
    foreach ($segments as $segment) {
        if ($segment === '' || $segment === '.' || $segment === '..'
            || preg_match('/^[A-Za-z0-9._-]+$/D', $segment) !== 1) {
            return false;
        }
    }

    return in_array(strtolower(pathinfo($filePath, PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'webp'], true);
}

/** Resolve a legacy image without allowing traversal or symlinks outside uploads/books. */
function resolveLegacyListingImagePath(string $value): ?string {
    if (!isLegacyListingImagePath($value)) return null;

    $relativePath = str_starts_with($value, '/') ? substr($value, 1) : $value;
    $filePath = substr($relativePath, strlen('uploads/books/'));
    $projectRoot = realpath(dirname(__DIR__, 2));
    if ($projectRoot === false) return null;

    $uploadsDirectory = realpath($projectRoot . DIRECTORY_SEPARATOR . 'uploads');
    $booksDirectory = realpath($projectRoot . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'books');
    if ($uploadsDirectory === false || $booksDirectory === false
        || $booksDirectory === $uploadsDirectory
        || !privateListingPathInside($booksDirectory, $uploadsDirectory)) {
        return null;
    }
    $resolved = realpath($booksDirectory . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $filePath));
    if ($resolved === false || $resolved === $booksDirectory
        || !privateListingPathInside($resolved, $booksDirectory)
        || !is_file($resolved) || !is_readable($resolved)) {
        return null;
    }

    $normalizedRoot = rtrim(str_replace('\\', '/', $booksDirectory), '/') . '/';
    $normalizedResolved = str_replace('\\', '/', $resolved);
    if (DIRECTORY_SEPARATOR === '\\') {
        $normalizedRoot = strtolower($normalizedRoot);
        $normalizedResolved = strtolower($normalizedResolved);
    }
    if (!str_starts_with($normalizedResolved, $normalizedRoot)) return null;

    return $resolved;
}

/** Convert every supported listing image key into a permission-checked endpoint URL. */
function listingImageUrl(int $listingId, mixed $storedKey, ?int $mediaId = null): ?string {
    if (!isPrivateListingImageKey($storedKey) && !isLegacyListingImagePath($storedKey)) return null;
    return $mediaId === null
        ? '/backend/controllers/ListingMediaController.php?listing_id=' . $listingId . '&kind=cover'
        : '/backend/controllers/ListingMediaController.php?listing_id=' . $listingId . '&media_id=' . $mediaId;
}
