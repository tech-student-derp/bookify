# Bookify Phase 1: Seller Listing Management Report

**Implementation review:** November 25, 2026  
**Status:** Frontend and backend code implemented; database integration unverified  
**Scope:** Seller-scoped book listing creation, editing, inventory, cover images, archiving, and staff moderation compatibility

---

## 1. Executive Summary

Bookify's dedicated seller listings page was a placeholder, while the backend supported only seller listing submission. This phase extends the existing PHP/PDO and React application with seller-scoped listing retrieval and management.

Approved sellers can view, search, filter, and paginate their own listings; create and edit book details; update available inventory; upload or replace cover images; and archive or restore listings. New listings, edited listings, and restored listings use the existing staff review workflow. Editing a published listing hides it from the catalog by returning it to `pending` / `draft` until staff review.

The migration was created but not executed. MySQL refused the connection during this work, so live database operations and migration state could not be confirmed.

## 2. Initial Inspection Findings

The existing seller approval and moderation workflow was preserved:

1. A customer submits a seller application through `SellerApplicationController.php`.
2. Staff or an administrator reviews the application through `AdminController.php`.
3. Approved sellers submit listings through `ListingController.php`.
4. Seller listings begin with `listing_status = 'pending'` and `publication_status = 'draft'`.
5. Staff approve or reject listings; approved and published listings become visible through `CatalogController.php`.

The seller listing page had no live data or controls. There were no seller-scoped list, detail, edit, inventory, archive, or book-cover upload operations.

The Phase 2 migration defines listing moderation and publication fields. The Phase 5 seller ecosystem migration adds `stock_quantity` and e-book path support. The new migration adds only the missing ISBN, archive timestamp, condition values, and supporting indexes.

## 3. Implementation

### Seller interface

`src/pages/seller/SellerListingsPage.tsx` now provides:

- A paginated seller listing grid with book title, cover, author, price, condition, format, inventory, availability, and publication/review status.
- Search across title, author, category, and ISBN; filters for pending review, published, rejected, suspended, and archived listings.
- Create and edit forms for title, author, description, category, optional ISBN, condition, format, price, inventory, and cover image.
- Inline inventory adjustment with non-negative whole-number validation.
- Staff feedback for rejected listings.
- Loading, error, success, and meaningful empty states.
- Confirmation before archiving. Restore sends the listing back for staff review.

Book formats use existing database values (`Physical` and `E-book`), shown as “Physical Book” and “E-book” in the interface. E-book file delivery is not part of this phase.

### Backend operations

`backend/controllers/ListingController.php` now supports:

| Method | Action | Purpose |
|---|---|---|
| GET | `list` / `mine` | Search, filter, and paginate the authenticated seller's listings |
| GET | `details` | Retrieve one listing owned by the authenticated seller |
| POST | `create` | Create a listing in pending review state |
| POST | `update` | Update listing fields and return it to pending review |
| POST | `inventory` | Change stock and availability |
| POST | `archive` | Hide a listing while retaining its database record |
| POST | `unarchive` | Restore an archived listing to pending review |

The default POST action remains `create` for compatibility with the earlier submission endpoint.

### Staff and catalog compatibility

Staff approval/rejection logic and existing moderation status values remain intact. `AdminController.php` accepts the expanded condition values for Bookify listings. `CatalogController.php` and `MarketplacePage.tsx` support filtering and displaying those values. `ManagementSections.tsx` and `adminApi.ts` were updated so the back-office listing interface continues to handle them.

## 4. Database Changes

Added `database/migrations/2026_11_25_phase1_seller_listing_management.sql`, which:

- Adds nullable `isbn` to `book_listings`.
- Adds nullable `archived_at` to preserve listing and moderation records when sellers archive a listing.
- Expands the condition enum to `New`, `Like New`, `Very Good`, `Good`, and `Acceptable`, retaining `Pre-owned` for existing data compatibility.
- Adds indexes for ISBN and seller archive queries.

Inventory storage already exists in the Phase 5 seller ecosystem migration as `stock_quantity`. The new migration assumes the Phase 2 back-office and Phase 5 seller ecosystem schema migrations have been applied. **No SQL was executed and no database was modified.** Confirm the target schema and prerequisites before applying migrations manually.

## 5. Security and Data Integrity

- All listing operations require an authenticated, active, verified seller with an approved seller application.
- The seller ID comes from the authenticated session. Reads and writes include seller ownership and `source = 'seller'` constraints; client-supplied seller IDs are not used.
- State-changing actions validate the existing session-bound CSRF token.
- SQL uses PDO prepared statements. User-provided text, condition, format, price, ISBN format, and inventory are validated server-side.
- Cover uploads accept JPEG, PNG, and WebP only, up to 5 MB. The backend checks uploaded-file status, detected MIME type, parsed image data, and dimensions before moving the image to `uploads/books` under a random server-generated filename.
- Listing changes and audit entries are written transactionally. Failed create/update operations remove newly staged cover files.
- Sellers cannot edit or restore listings suspended by staff. Inventory updates do not bypass listing moderation.
- Archive is a soft archive: it hides the listing without deleting listing or order-related records. Restoring it requires staff approval before publication.

## 6. Files Changed

**Modified**

- `backend/controllers/ListingController.php`
- `backend/controllers/AdminController.php`
- `backend/controllers/CatalogController.php`
- `src/pages/seller/SellerListingsPage.tsx`
- `src/pages/MarketplacePage.tsx`
- `src/pages/backoffice/ManagementSections.tsx`
- `src/services/adminApi.ts`

**Added**

- `src/services/sellerListingApi.ts`
- `database/migrations/2026_11_25_phase1_seller_listing_management.sql`

## 7. Verification

- `npm.cmd run build` — passed; TypeScript compilation and Vite production build completed (628 modules). Vite reports the existing large JavaScript chunk warning.
- ESLint on changed frontend files — passed.
- Full repository ESLint — still reports existing findings in `src/components/TypewriterText.tsx`, `src/contexts/AuthContext.tsx`, `src/pages/dashboard/DashboardPage.tsx`, and `src/pages/seller/SellerSettingsPage.tsx`. The new seller listings page has no remaining lint findings.
- PHP syntax checks for `ListingController.php`, `AdminController.php`, and `CatalogController.php` — passed.
- Existing PHP tests (`email_otp_test.php`, `email_verification_mail_test.php`, and `turnstile_test.php`) — passed.
- `git diff --check` — passed.

## 8. Not Verified and Known Limitations

The local MySQL server refused the connection. Consequently, the migration state and database-backed listing operations could not be verified. Seller ownership enforcement, create/edit/archive transactions, inventory updates, upload persistence, and the staff moderation round trip were not exercised against a live database.

ISBN validation checks ISBN-10/ISBN-13 shape but does not verify checksum digits. Cover images are optional. E-book upload, protected download, and fulfillment remain outside this phase.

## 9. Recommended Follow-up

After confirming and applying prerequisite migrations plus the new seller listing migration in a controlled environment, test with at least two approved sellers. Verify that each seller can access only their own listings; exercise invalid fields and image uploads; confirm stock-zero availability; and confirm create, edit, restore, and staff approval/rejection states through the live catalog. Add database-backed automated tests for ownership and moderation behavior when the local test database is available.
