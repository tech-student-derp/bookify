<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/utils/cart_rules.php';

function assertCartEligibility(array $result, bool $eligible, ?string $reason, string $label): void {
    if (($result['eligible'] ?? null) !== $eligible || ($result['reason'] ?? null) !== $reason) {
        fwrite(STDERR, "FAIL: {$label}\n");
        exit(1);
    }
    echo "PASS: {$label}\n";
}

$sellerListing = [
    'format' => 'Physical', 'listing_status' => 'approved', 'publication_status' => 'published',
    'archived_at' => null, 'availability' => 'available', 'source' => 'seller',
    'seller_role' => 'seller', 'seller_account_status' => 'active', 'seller_is_verified' => 1,
    'seller_application_approved' => 1, 'stock_quantity' => 3,
];
assertCartEligibility(evaluateCartListingEligibility($sellerListing, 2), true, null, 'allows eligible physical listing');
assertCartEligibility(evaluateCartListingEligibility([...$sellerListing, 'listing_status' => 'suspended'], 1), false, 'This listing is not approved for sale.', 'rejects suspended listing');
assertCartEligibility(evaluateCartListingEligibility([...$sellerListing, 'listing_status' => 'rejected'], 1), false, 'This listing is not approved for sale.', 'rejects rejected listing');
assertCartEligibility(evaluateCartListingEligibility([...$sellerListing, 'publication_status' => 'unpublished'], 1), false, 'This listing is not published.', 'rejects unpublished listing');
assertCartEligibility(evaluateCartListingEligibility([...$sellerListing, 'availability' => 'unavailable'], 1), false, 'This listing is currently unavailable.', 'rejects unavailable listing');
assertCartEligibility(evaluateCartListingEligibility([...$sellerListing, 'archived_at' => '2026-11-28 10:00:00'], 1), false, 'This listing has been archived.', 'rejects archived listing');
assertCartEligibility(evaluateCartListingEligibility([...$sellerListing, 'format' => 'E-book'], 1), false, 'E-books are not available in the cart yet.', 'rejects e-books');
assertCartEligibility(evaluateCartListingEligibility([...$sellerListing, 'stock_quantity' => 0], 1), false, 'This book is out of stock.', 'rejects empty inventory');
assertCartEligibility(evaluateCartListingEligibility($sellerListing, 4), false, 'Only 3 copies are currently available.', 'rejects quantity over stock');
assertCartEligibility(evaluateCartListingEligibility([...$sellerListing, 'seller_application_approved' => 0], 1), false, 'This seller is not currently eligible to sell.', 'rejects unapproved seller');
assertCartEligibility(evaluateCartListingEligibility([...$sellerListing, 'source' => 'bookify', 'creator_role' => 'staff'], 1), true, null, 'allows eligible Bookify physical listing');
assertCartEligibility(evaluateCartListingEligibility([...$sellerListing, 'source' => 'bookify', 'creator_role' => 'customer'], 1), false, 'This listing is not available for purchase.', 'rejects invalid Bookify creator');

foreach ([1 => 1, '2' => 2, 4294967295 => 4294967295, '4294967295' => 4294967295] as $raw => $expected) {
    if (parseCartQuantity($raw) !== $expected) { fwrite(STDERR, 'FAIL: parses positive integer quantity' . PHP_EOL); exit(1); }
}
echo "PASS: parses positive integer quantities\n";
foreach ([0, -1, '0', '-2', '1.5', '1x', true, 4294967296, '4294967296'] as $invalid) {
    if (parseCartQuantity($invalid) !== null) { fwrite(STDERR, 'FAIL: rejects invalid quantity' . PHP_EOL); exit(1); }
}
echo "PASS: rejects invalid quantity values\n";
