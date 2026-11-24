# Bookify Phase 3: Store Profile & Upload Infrastructure

**Implementation review:** November 24, 2026
**Status:** Code implemented; database-backed workflows require the Phase 3 migration

## Scope and existing implementation

The repository already contained the seller store settings interface and its PHP/API implementation. This milestone review confirmed and retained those implementations rather than adding a second profile feature:

- `src/pages/seller/SellerSettingsPage.tsx` loads and edits store identity, biography, and optional pickup details; it shows loading, field validation, success, and error feedback.
- `src/services/sellerProfileApi.ts` connects the interface to the PHP controller with session credentials and CSRF headers.
- `backend/controllers/SellerProfileController.php` scopes records to the authenticated session user, rechecks the active seller role in the database, validates fields, and audits profile operations.
- Logo and banner processing checks upload status, size, detected MIME type, image parsing, and dimensions. It accepts JPEG, PNG, and WebP only, uses server-generated filenames, persists paths, and removes replaced files only after the database commit. `uploads/.htaccess` disables script execution.
- Seller profile fields, including pickup address, are nullable where appropriate for digital-only sellers.
- The overview uses **Completed Orders** in its fourth metric card. Its roadmap now marks Phases 2 and 3 completed.

## Database dependency

The controller's `seller_profiles` table was previously defined only inside the unexecuted Phase 5 seller ecosystem migration. Added `database/migrations/2026_11_24_phase3_store_profiles.sql` as an additive, idempotent Phase 3 migration for that table. The Phase 5 migration was not changed or executed. Its existing `CREATE TABLE IF NOT EXISTS seller_profiles` remains compatible with this Phase 3 schema.

Apply the Phase 3 migration manually to the existing `bookify` database using phpMyAdmin or the MariaDB client after confirming the intended XAMPP database connection. Do not run the Phase 5 migration as part of Phase 3.

## Verification

- `npm.cmd run build` â€” passed (`tsc -b` and Vite production build; 626 modules). Vite reports the existing large JavaScript chunk warning.
- PHP lint across `backend/**/*.php` using XAMPP PHP 8.2.12 â€” passed.
- `git diff --check` â€” passed.
- Apache `AuthController.php?action=csrf` â€” returned HTTP 200 and a CSRF token.
- Apache `SellerProfileController.php?action=get` without a session â€” returned HTTP 401, confirming logged-out API rejection.
- Vite proxy `AuthController.php?action=csrf` — returned HTTP 200 through `/backend/*`.
- Vite proxy `SellerProfileController.php?action=get` without a session — returned HTTP 401 through `/backend/*`.

## Not verified in this environment

The profile migration was intentionally not executed. Consequently, authenticated seller create/edit, duplicate-name behavior, upload validation and persistence, file replacement/removal, and live database constraints were not exercised. Customer/admin/staff login routing and authenticated seller route behavior were not browser-tested; source inspection confirms the existing `ProtectedRoute` redirects logged-out users to `/login` and disallowed roles to `/dashboard`.

After applying only the Phase 3 migration, start Apache and MySQL through XAMPP and run `npm run dev`. Sign in as an approved seller, visit `/seller/store-settings`, create and edit a profile, upload valid JPEG/PNG/WebP logo and banner images, and check that oversized, unsupported, malformed, or out-of-dimension images are rejected. Verify the saved paths and fields in `seller_profiles`, replace/remove images, and check role redirects with logged-out and customer accounts.
