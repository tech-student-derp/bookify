# Phase 7 — Seller Listing UX Enhancement Report

**Date:** 2026-11-28
**Scope:** Seller category/language dropdowns and an unsaved customer-facing listing preview.

## Inspection and database findings

Inspected the seller listing form and API, `ListingController.php` validation and save flow, the catalog controller and marketplace detail view, the relevant listing schema/migrations, and the existing marketplace styles.

The current `bookify` schema has `book_listings.category VARCHAR(100) NOT NULL` and `language VARCHAR(100) NULL`. The existing listing model already stores both values, including arbitrary text. ISBN and e-book format metadata are also present. The base `database/bookify.sql` does not define `book_listings`; its current shape was checked from the migrations and live schema. No new column, table, or migration is needed; no migration was applied.

## Changes

### Category and language controls

- Replaced free-text category and language fields with predefined dropdowns and an `Other` choice.
- Categories include fiction and nonfiction subjects such as Fantasy, Mystery & Thriller, Romance, Biography & Memoir, Education & Textbooks, and Filipino Literature.
- Languages include Filipino, English, Cebuano, Hiligaynon, Ilocano, Waray, Mandarin Chinese, Japanese, Korean, Spanish, French, and others.
- Selecting `Other` reveals a custom text field. Existing values outside the predefined lists open as `Other` with their current text filled in, so editing does not silently replace legacy values.
- The API continues storing the actual category and language text in the existing columns. It sends explicit custom-value flags. Server validation checks listed values, validates custom text up to the existing 100-character limit, requires a category for submission, and keeps language optional. Requests from older clients without custom flags retain valid legacy values.
- Frontend and backend option lists are checked for agreement by the test suite.

### Marketplace detail preview

- Extracted the existing marketplace product-detail markup into a shared component used by both `MarketplacePage.tsx` and the seller preview.
- The preview is built from the current unsaved form state. It displays title, author, publisher, category, language, ISBN, description, price, condition, physical stock, format, and e-book format where applicable.
- Selected cover, back-cover, additional, and interior images use local object URLs. Existing seller images use their permission-checked URLs. Replacing an image group in the form also replaces that group in the preview.
- E-book previews show only PDF/EPUB format metadata. They do not include private storage paths, download links, or file references.
- The first submit action only opens the preview. Sellers can return to editing with form state intact or cancel. Only “Confirm & submit for review” calls the existing CSRF-protected seller API and moderation workflow.
- The catalog detail response now includes ISBN and e-book format metadata for approved product pages. These are non-private fields; the query still does not select private e-book file paths.

## Tests and checks

- `npm.cmd run build` — PASS. Vite reports the existing large JavaScript chunk advisory (>500 kB).
- Focused ESLint for the seller form, marketplace page, shared detail component, preview builder, taxonomy options, and UX tests — PASS.
- PHP syntax checks for `ListingController.php`, `CatalogController.php`, the taxonomy utility, and the PHP taxonomy test — PASS.
- `php tests/listing-taxonomy.test.php` — PASS, including preset, custom, legacy, optional language, Unicode length, and invalid-choice cases.
- `node --test tests/seller-listing-ux.test.mjs` — PASS, 5 tests covering option agreement, legacy/custom dropdown mapping, API payload values, unsaved preview fields/images, image-group replacement, and omission of e-book paths/status.
- MariaDB round-trip check — PASS. Three preset/custom/legacy category and language values were validated, inserted, and read back from a disposable schema using matching `VARCHAR(100)` columns. The temporary schema was dropped and its absence verified. No live listing records were written.
- Read-only live schema inspection confirmed the category/language column types. No schema migration was run.
- `git diff --check` — PASS. Git reports line-ending normalization notices for existing files.

## Files inspected

- `src/pages/seller/SellerListingsPage.tsx`
- `src/services/sellerListingApi.ts`
- `src/pages/MarketplacePage.tsx`
- `src/App.css`
- `backend/controllers/ListingController.php`
- `backend/controllers/CatalogController.php`
- `database/bookify.sql` and relevant migrations
- Current `bookify` schema, read-only

## Files changed

- `src/pages/seller/SellerListingsPage.tsx`
- `src/pages/MarketplacePage.tsx`
- `src/services/sellerListingApi.ts`
- `src/components/MarketplaceProductDetail.tsx` (new shared detail component)
- `src/data/listingTaxonomy.ts` (new dropdown options and payload helper)
- `src/utils/sellerListingPreview.ts` (new preview data builder)
- `backend/controllers/ListingController.php`
- `backend/controllers/CatalogController.php`
- `backend/utils/listing_taxonomy.php` (new server validation utility)
- `tests/seller-listing-ux.test.mjs` (new)
- `tests/listing-taxonomy.test.php` (new)
- This report

## Limitations

- Browser interaction and a real authenticated seller submission were not tested. The automated preview tests cover preview data construction and payload handling, not browser rendering or modal interaction.
- The test run did not create or change accounts or live listing records.
- The preview uses the same customer detail component and CSS, but its status notice and confirmation controls are seller-only.
