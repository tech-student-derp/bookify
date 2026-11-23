# Bookify Phase 3 Store Profile Report

**Review date:** November 23, 2026
**Status:** Existing implementation reviewed; database-dependent verification blocked

## Implemented

- Seller profile API actions for retrieval, create/update, logo/banner upload, and logo/banner removal are present in `backend/controllers/SellerProfileController.php`.
- The controller uses the authenticated session user ID, checks the current database role and active account, and requires CSRF tokens for write actions.
- Profile fields are validated server-side. Pickup fields are nullable, so an address is not required for digital-only sellers.
- Logo and banner uploads enforce 2 MB and 5 MB limits, use Fileinfo MIME detection plus image parsing/dimension checks, and generate server-controlled names. Upload paths are constrained during deletion, and `uploads/.htaccess` blocks script execution.
- Seller settings UI and typed API calls are present, including load/error states, previews, field validation, and save/upload/remove feedback.
- Seller overview now lists Total Listings, Active Listings, Pending Orders, and Completed Orders. Completed Orders remains an empty Phase 5 metric; no earnings calculations were added.
- Replacement/removal now commits the profile path change before deleting the old file. If database persistence fails during upload, the new file is cleaned up. If old-file cleanup fails, an orphan file may remain, while the database retains a valid path.

## Tests performed in this review

- `npm.cmd run build`: passed (`tsc -b` and Vite production build; 626 modules). Vite emitted its existing large-chunk warning.
- PHP syntax check with XAMPP PHP 8.2.12 for every `backend/**/*.php`: passed.
- `git diff --check`: passed.
- Static code review covered controller ownership/authorization, CSRF, input checks, upload checks, transaction ordering, API wrappers, and settings page states.

## Not tested in this review

- Browser-driven profile create/update, uploads, previews, or removals.
- Live authorization/API behavior for seller, customer, admin, or staff accounts.
- Customer dashboard, marketplace, catalog, and admin/staff runtime regressions. The build only verifies compilation, not these workflows.

## Blocked: live schema and database behavior

Read-only connection attempts using both the project PHP configuration and XAMPP MariaDB client failed during authentication:

`auth_gssapi_client` plugin could not be loaded / authentication method unknown to the client.

The project config targets `localhost:3306`, database `bookify`, user `root`. The local client is MariaDB 10.4.32. Its configured plugin directory (`C:/xampp/mysql/lib/plugin/`) is absent from this installation, and no `auth_gssapi_client` file was found under `C:/xampp/mysql`. The error indicates the server requests GSSAPI client authentication that the available clients cannot load. The exact server account/plugin configuration cannot be confirmed without authenticating; therefore it is not possible to determine from current access whether the server-side account setting is intentional or stale.

No credentials, authentication settings, database records, or migrations were changed. These schema items remain **unverified**: `seller_profiles`; seller columns in `book_listings` and `order_items`; related indexes and foreign keys; and agreement with `2026_11_23_phase5_seller_ecosystem.sql`. The Phase 1 and Phase 3 report statements about migration execution conflict and are not treated as proof.

## Manual verification required

An administrator should confirm which authentication plugin the `root` account is intended to use and provide a client/driver compatible with that configuration, without weakening authentication. After read-only access works, inspect the required schema and constraints before relying on Phase 3 against the active database. Then run authenticated browser checks for profile operations and role boundaries.
