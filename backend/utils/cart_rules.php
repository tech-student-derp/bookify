<?php
declare(strict_types=1);

function parseCartQuantity(mixed $raw): ?int {
    if (is_int($raw)) return $raw >= 1 && $raw <= 4294967295 ? $raw : null;
    if (!is_string($raw) || $raw === '' || !ctype_digit($raw)) return null;
    $value = filter_var($raw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 4294967295]]);
    return $value === false ? null : (int) $value;
}

/** Validate a current listing snapshot for a cart quantity. This never reserves stock. */
function evaluateCartListingEligibility(array $listing, int $quantity): array {
    if ($quantity < 1) return ['eligible' => false, 'reason' => 'Quantity must be a positive whole number.'];
    if (($listing['format'] ?? null) !== 'Physical') return ['eligible' => false, 'reason' => 'E-books are not available in the cart yet.'];
    if (($listing['listing_status'] ?? null) !== 'approved') return ['eligible' => false, 'reason' => 'This listing is not approved for sale.'];
    if (($listing['publication_status'] ?? null) !== 'published') return ['eligible' => false, 'reason' => 'This listing is not published.'];
    if (($listing['archived_at'] ?? null) !== null) return ['eligible' => false, 'reason' => 'This listing has been archived.'];
    if (($listing['availability'] ?? null) !== 'available') return ['eligible' => false, 'reason' => 'This listing is currently unavailable.'];

    if (($listing['source'] ?? null) === 'seller') {
        if (($listing['seller_role'] ?? null) !== 'seller'
            || ($listing['seller_account_status'] ?? null) !== 'active'
            || (int) ($listing['seller_is_verified'] ?? 0) !== 1
            || (int) ($listing['seller_application_approved'] ?? 0) !== 1) {
            return ['eligible' => false, 'reason' => 'This seller is not currently eligible to sell.'];
        }
    } elseif (($listing['source'] ?? null) === 'bookify') {
        if (!in_array($listing['creator_role'] ?? null, ['staff', 'admin'], true)) {
            return ['eligible' => false, 'reason' => 'This listing is not available for purchase.'];
        }
    } else {
        return ['eligible' => false, 'reason' => 'This listing is not available for purchase.'];
    }

    $stock = (int) ($listing['stock_quantity'] ?? 0);
    if ($stock < 1) return ['eligible' => false, 'reason' => 'This book is out of stock.'];
    if ($quantity > $stock) return ['eligible' => false, 'reason' => "Only {$stock} copies are currently available.", 'stock_quantity' => $stock];

    return ['eligible' => true, 'reason' => null, 'stock_quantity' => $stock];
}
