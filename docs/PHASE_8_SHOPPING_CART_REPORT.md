# Phase 8 — Shopping Cart and Seller Attribution Report

Date: 2026-11-28

## Summary

The marketplace product detail page previously displayed “Add to cart · unavailable” because its button was hard-disabled in the shared product detail component. It did not check listing status, publication status, availability, stock, seller approval, source, or customer authentication. The public catalog already filtered listings to approved, published, available, unarchived books and verified eligible sellers, but the product response did not include seller identity or cart eligibility.

A read-only check of the live `bookify` database found no listing whose title matched “Shrek”. Therefore the exact record-level state of the Shrek listing (status, stock, source, or seller state) cannot be verified. The global UI defect was verifiable: the old Add to Cart button was explicitly disabled regardless of listing data.

The customer cart now has a persistent-table migration, authenticated customer endpoints, current listing/price/stock checks, and responsive cart and navigation UI. The migration was tested on a separate disposable MariaDB schema and was **not applied** to the live `bookify` database. The live database still has no `cart_items` table, so cart API calls return a controlled `503 migration_required` response until the migration is separately approved and applied.

Seller listings now return the seller’s public store name (falling back to the seller’s first and last name) and seller ID. On the product detail page, the “Sold by” name links to a public seller storefront showing the store bio and currently visible books. The endpoint does not return email, phone, pickup details, or e-book storage references.

## Investigation

- `src/components/MarketplaceProductDetail.tsx`: the previous cart button used a literal `disabled` attribute and an “unavailable” label.
- `backend/controllers/CatalogController.php`: public listings already require approved, published, available, unarchived status. Seller listings also require a seller role, active account, verified user, and approved seller application. Bookify listings require a staff/admin creator.
- Live schema inspection confirmed `users.id`, `book_listings.id`, `book_listings.seller_id`, and `book_listings.created_by` are `INT UNSIGNED`; `stock_quantity` is `INT UNSIGNED`; `format` is `ENUM('Physical','E-book')`; listing status, publication status, availability, and archive fields are present. `seller_profiles.user_id`, `store_name`, and `bio` are present. `cart_items` is absent.
- Existing `orders` and `order_items` tables were inspected and left unchanged. No checkout or order dependency was found for the cart.

## Implementation

### Persistent cart and validation

- Added `database/migrations/2026_11_28_phase8_shopping_cart.sql`. It creates only `cart_items`, with a customer/listing unique key, quantity constraint, supporting listing index, and cascading foreign keys to `users` and `book_listings`.
- Added `backend/controllers/CartController.php`. It requires a verified session and rechecks the active database role as `customer`; customer IDs come only from the session. Writes require the existing CSRF header. SQL uses prepared statements.
- Cart add and quantity update re-read listing state, seller eligibility, format, and live stock under a transaction and row lock. Repeated adds increment the one customer/listing row. The cart stores no price snapshot and does not change `stock_quantity`; each response joins the current listing price.
- The eligibility helper in `backend/utils/cart_rules.php` rejects e-books, non-approved, unpublished, archived, unavailable, out-of-stock, over-quantity, ineligible-seller, and ineligible-creator listings. Quantity parsing accepts only positive whole numbers within the database integer range.
- The cart schema readiness check verifies the expected columns, unique customer/listing key, and foreign keys. If the migration is missing or incomplete, the endpoint responds with a controlled migration-required error.

### Marketplace, cart, and seller storefront UI

- The product detail Add to Cart control is enabled only for a physical listing that the catalog marks as in stock and only works for an authenticated customer. E-books and unavailable listings remain unavailable. Other visitors are directed to sign in.
- Added a protected `/cart` route with loading, error, empty, and unavailable-item states; cover, title, seller, current unit price, quantity controls, remove action, eligible-items subtotal, and continue-browsing link. Checkout is explicitly unavailable and does not create an order.
- Added a customer-only navbar cart link and live item count, updated from cart API responses.
- Added `backend/controllers/SellerStorefrontController.php` and public `/sellers/:sellerId`. It only shows active, verified, approved sellers and their catalog-visible listings.
- The seller name on the product detail page is now the public store name (with a user-name fallback) and is clickable to the seller’s storefront. Marketplace catalog cards also display the returned seller name.
- Listing visibility SQL is shared from `backend/utils/listing_visibility.php`, so the storefront follows the catalog’s existing publication and seller checks.

## Database changes

Only one migration file was added: `database/migrations/2026_11_28_phase8_shopping_cart.sql`. It creates a separate cart table and does not alter existing book, order, payment, or inventory tables. Prerequisites are the existing `users` and `book_listings` InnoDB tables with unsigned integer primary keys.

The migration has not been applied to `bookify`. A disposable schema test confirmed the migration creates successfully and that repeated listing entries resolve to one row, quantity increment works, and deleting either the referenced listing or customer cascades the cart row. The test database was removed afterward. Live schema inspection still reports `cart_items` absent.

## Security and scope

- Customer identity is derived from the authenticated session; the frontend cannot select another customer’s cart.
- Database role and active account checks are server-side. Email verification remains required by the existing auth middleware.
- Cart writes use CSRF validation, prepared statements, positive integer quantities, transactions, and consistent listing-then-cart row locking for add/update.
- Every cart change checks current seller/listing eligibility and current stock. Cart viewing uses the current price and current status. No price snapshot is trusted.
- Adding items does not reserve or deduct stock. E-book files, private storage paths, and seller contact/pickup fields are not returned by the new cart/storefront APIs.
- No order, payment, delivery, refund, commission, or checkout behavior was added. Existing `orders` and `order_items` were not changed.

## Verification

- `npm.cmd run build` — PASS. The generated main bundle exceeds Vite’s 500 kB advisory threshold; build completed successfully.
- Focused ESLint for the changed React/TypeScript components and pages — PASS.
- PHP syntax checks for `CatalogController.php`, `CartController.php`, `SellerStorefrontController.php`, `cart_rules.php`, and `listing_visibility.php` — PASS.
- `php tests/cart-eligibility.test.php` — PASS for eligible seller/Bookify books, prohibited listing states, e-books, seller eligibility, stock limits, and quantity validation.
- Disposable MariaDB migration check — PASS for table creation, unique customer/listing behavior, incrementing quantity, rejection of zero quantity, current-price lookup after a price update, item removal/emptying, and customer/listing foreign-key cascades. The live database was not modified.
- `git diff --check` — PASS. Git displayed line-ending conversion notices for existing modified files; no whitespace errors were reported.
- No browser or authenticated-account test was performed. No test customer account was used.

## Remaining limitations and manual verification

1. Apply the Phase 8 migration to a development database only after separate approval. Until then, the cart endpoint intentionally reports that the schema is unavailable.
2. Sign in with a dedicated verified customer account and add the same available physical book twice. Confirm the navbar count and cart quantity both increase without duplicate rows.
3. Try a quantity above current stock and confirm the server rejects it. Lower the quantity after reducing stock; confirm a listing that becomes unavailable shows a reason and can be removed.
4. Change a listing’s price after it is in the cart and reload the cart; it should display the current price rather than the earlier one.
5. Remove all cart rows and confirm the empty state and continue-browsing action.
6. Confirm e-books remain unavailable in the cart, and click the seller name on a public seller listing to open that seller’s profile.

The listing-specific Shrek state remains unverifiable until a matching listing exists in the database. No migration, customer account creation, listing creation, or browser session was performed for this report.
