# Phase 7 — Seller Listing and Human Moderation Report

**Date:** 2026-11-28  
**Implementation status:** Code prepared; database migration not applied to the live `bookify` database.

## 1. Existing architecture discovered

- The seller UI is React and TypeScript. Seller listing management is in `src/pages/seller/SellerListingsPage.tsx` and calls `backend/controllers/ListingController.php` through `src/services/sellerListingApi.ts`.
- PHP uses PDO, session authentication, database-backed role checks, CSRF validation on writes, and prepared statements.
- Staff and administrators use `backend/controllers/AdminController.php` and the existing back-office listing section in `src/pages/backoffice/ManagementSections.tsx`.
- The public marketplace reads `backend/controllers/CatalogController.php`.
- Existing listing review events can use `admin_audit_logs`; this table already records listing actions and actor IDs. No separate review-history table was added.
- The live schema already includes the Phase 1 seller listing fields and the earlier e-book path reference. Its earlier listing status enum did not include drafts, revision requests, or the new review state.

## 2. Files created and modified

**Created**

- `database/migrations/2026_11_28_phase7_seller_listing_moderation.sql`
- `backend/controllers/ListingMediaController.php`
- `backend/utils/listing_media.php`
- `backend/utils/private_listing_files.php`
- This report.

**Modified**

- `backend/controllers/ListingController.php`
- `backend/controllers/AdminController.php`
- `backend/controllers/CatalogController.php`
- `backend/controllers/Phase4Controller.php`
- `src/pages/seller/SellerListingsPage.tsx`
- `src/pages/backoffice/ManagementSections.tsx`
- `src/pages/MarketplacePage.tsx`
- `src/services/sellerListingApi.ts`
- `src/services/adminApi.ts`

## 3. Database changes

The new additive migration adds publisher and language metadata, e-book format and rights-confirmation timestamps, and a submission timestamp. It expands `listing_status` with `draft`, `pending_review`, and `needs_revision` while preserving the legacy `pending` and `suspended` values. It creates `book_listing_media` for back-cover, additional, and interior-preview images, with a foreign key to `book_listings` and cascade cleanup if a listing is ever hard-deleted.

Review decisions and comments continue to use the existing `reviewed_by`, `reviewed_at`, `moderation_reason`, and `admin_audit_logs` structures. No duplicate review-history table was introduced. New writes explicitly set their state; the existing enum default remains `pending` for compatibility.

The migration was run against a disposable temporary database built from the live `book_listings` table definition. MariaDB accepted the DDL, the new states and fields were present, the media foreign-key cleanup worked, and representative seller create/update/review SQL and public visibility filtering passed. The temporary database was dropped after the checks.

**The live `bookify` schema was not changed.** Seller and moderation endpoints that need the new schema return a migration-required response until this migration is separately approved and applied.

## 4. Seller listing functionality

- Sellers can save incomplete drafts or submit completed listings for human review.
- The seller listing page filters drafts, pending review, approved, rejected, needs revision, suspended, and archived listings. It shows submission or creation dates and reviewer feedback.
- The form includes title, author, publisher, category, language, optional ISBN, description, seller price, listing type, and physical condition and quantity.
- E-book submissions accept PDF or EPUB, require an ownership/authorization confirmation, and keep the book file in private storage. An uploaded file can be replaced during editing.
- Sellers can submit a front cover, back cover, up to six additional photos, and up to six interior previews. New images replace the existing images in the selected group.
- Physical inventory changes remain seller-owned and are rejected for e-books.

Drafts may contain incomplete values, but the server enforces required book fields, positive price, physical inventory, and e-book requirements when submitting. Seller and listing IDs come from the authenticated session and ownership-scoped queries.

The seller continues to set the book price. No payment, delivery fee, commission settlement, or refund behavior was added or changed; the existing proposed commission reporting remains separate from delivery fees.

## 5. Staff and administrator moderation

- Staff and administrators can inspect listing details, seller information, uploaded images, e-book file presence and format, rights-confirmation state, submission date, and review history.
- They can approve, reject, or request revisions for seller submissions. Reject and revision decisions require a reason. Approval checks required listing fields, physical stock or a valid private e-book file and rights confirmation, plus the seller’s active, verified, approved state.
- Decisions update the current reviewer fields and append an audit event with actor, decision, comments, and timestamp. Earlier review events remain available in the listing history.
- Back-office listing-review notifications now include the new states and treat each resubmission as a new notification event.
- Existing suspend, restore, publish, and unpublish actions remain available for their existing states.
- Bookify-created listings now enter review rather than being published directly. The existing Bookify creation form does not support private e-book uploads, so e-books cannot be submitted through that form.

## 6. Public catalog behavior

Catalog queries require an approved, published, available, unarchived listing. Seller listings also require an active, verified seller with an approved application. The public API does not select or return the private e-book file key or private seller contact details.

New cover and preview images are stored outside the web root under random opaque keys. `ListingMediaController.php` serves them only to their seller, active staff/administrators, or public visitors when the listing passes the catalog visibility checks. The marketplace detail view displays approved additional photos and previews.

There is no checkout or e-book download/delivery flow yet. An approved e-book may appear in the catalog, but its file remains private and cannot be downloaded.

## 7. Security and compatibility measures

- Prepared SQL statements, CSRF-protected writes, session-derived IDs, seller ownership checks, role checks, transactions, and server-side status validation are retained or extended.
- New listing images and e-book files are stored outside the Apache document root. Image uploads validate actual MIME, image decoding, dimensions, and per-file size. E-books validate extension, MIME, size, and file signature; EPUB validation checks the required first ZIP entry.
- Private storage rejects paths inside the configured web root. E-book keys are never returned by seller, staff, admin, or catalog APIs.
- MariaDB 10.4 compatibility was checked by running the migration against a temporary copy of the current table definition.

The PHP CLI configuration currently reports `upload_max_filesize=40M` and `post_max_size=40M`. The application therefore caps a single e-book at 30 MB and combined selected files at 35 MB. The active Apache PHP configuration should be checked again on deployment.

## 8. Checks performed

| Check | Result |
| --- | --- |
| `npm.cmd run build` | PASS; Vite reports a JavaScript chunk larger than 500 kB. |
| Focused ESLint on changed React/TypeScript files | PASS. |
| PHP syntax checks for changed controllers and utilities | PASS. |
| `git diff --check` | PASS; Git prints line-ending normalization notices for edited files. |
| Migration and representative listing SQL in a disposable MariaDB database | PASS; temporary database removed. |
| Browser seller/admin lifecycle test | NOT TESTED; no browser automation tool or dedicated test accounts were available. |
| Live database migration or live listing workflow | NOT TESTED; the live schema and records were left unchanged. |

No account, listing, or other live database records were created or modified.

## 9. Limitations and unfinished functionality

- The new migration must be reviewed and applied before the implemented listing workflows can run against the live database.
- Checkout, payment, purchase authorization, e-book downloads, and delivery remain out of scope. No payment gateway or delivery behavior was added.
- The current PHP installation has no ZIP extension. EPUB validation checks the ZIP header and required first `mimetype` entry, but does not fully inspect archive integrity or malware-scan the file. PDF validation checks MIME and its signature, not every internal object.
- Existing legacy files already stored under `/uploads/books` were not moved. They retain their existing public URLs; newly uploaded seller images use the private, approval-gated route.
- Existing e-book references that are not private opaque keys cannot be approved as new submissions. A seller may need to upload the file again and confirm distribution rights.
- Existing image groups can be replaced by uploading a new group, but there is no separate “remove this image group” control.
- Browser behavior, session permissions, and actual upload/review flows still require dedicated seller and staff/admin test accounts after the migration is applied.

## 10. Recommended next steps

1. Review and explicitly authorize application of the new migration to the live database; keep the existing verified backup available.
2. Apply it during the approved database change window, then verify the enum, added columns, media table, indexes, and foreign key.
3. Use dedicated test seller and staff/admin accounts to exercise draft, submit, approve, reject, revision, archive, image visibility, and ownership restrictions without using ordinary accounts.
4. Before enabling real e-book delivery, implement purchase-scoped download access and stronger archive/content validation, plus a retention and cleanup policy for replaced private files.
5. Run browser checks at desktop and mobile widths and verify the public catalog never serves images for pending, rejected, archived, or unavailable listings.
