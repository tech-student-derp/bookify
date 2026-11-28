<?php
declare(strict_types=1);

/** Shared catalog visibility predicate. The alias is an internal SQL identifier, never request input. */
function publicListingVisibilitySql(string $alias = 'b'): string {
    if (preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/D', $alias) !== 1) {
        throw new InvalidArgumentException('Invalid listing table alias.');
    }

    return "{$alias}.listing_status = 'approved'
        AND {$alias}.publication_status = 'published'
        AND {$alias}.availability = 'available'
        AND {$alias}.archived_at IS NULL
        AND (({$alias}.`source` = 'bookify' AND EXISTS (
            SELECT 1 FROM users creator
            WHERE creator.id = {$alias}.created_by AND creator.role IN ('staff', 'admin')
        )) OR ({$alias}.`source` = 'seller' AND EXISTS (
            SELECT 1 FROM users seller
            JOIN seller_applications application ON application.user_id = seller.id
            WHERE seller.id = {$alias}.seller_id AND seller.role = 'seller'
              AND seller.account_status = 'active' AND seller.is_verified = 1
              AND application.status = 'approved'
        )))";
}
