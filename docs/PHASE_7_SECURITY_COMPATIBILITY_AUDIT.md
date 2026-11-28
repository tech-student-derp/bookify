# Phase 7 — Independent Security and Compatibility Audit

**Date:** 2026-11-28  
**Scope:** Read-only source, migration, and live schema review. The Phase 7 migration was not applied.

## Executive summary

The seller listing controller derives the seller ID from the authenticated session and scopes reads and writes to that seller's listings. Back-office review endpoints re-check staff/admin roles in the database, validate actions and listing states server-side, and take reviewer IDs from the authenticated session. These controls passed source inspection.

The public catalog query itself filters listings by approval, publication, availability, archive state, and seller eligibility. New private image keys also use a permission-checked endpoint. However, legacy static URLs under /uploads remain directly accessible, and the Bookify listing form still accepts such a path for a listing that is pending review. That bypasses the visibility checks for its image. This is the main security blocker.

The local live database is bookify on MariaDB 10.4.32. It matches the migration's expected pre-state for the inspected listing fields: InnoDB, utf8mb4_unicode_ci, an unsigned integer listing key, Phase 1 archive/inventory fields, and the earlier listing-status values. The five Phase 7 columns and book_listing_media table are absent. The table currently contains zero listing rows. No database statements that change state were run.

The migration is structurally compatible and contains no drop or data-update statements. The migration itself does not need a rewrite based on the observed schema. The full Phase 7 rollout should be postponed until the image visibility bypass and related integration defects are addressed and re-audited.

## Read-only live schema snapshot

- Database: bookify
- Server: 10.4.32-MariaDB
- book_listings engine/collation: InnoDB / utf8mb4_unicode_ci
- id: int(10) unsigned
- listing_status: enum('pending','approved','rejected','suspended'), NOT NULL DEFAULT 'pending'
- stock_quantity: int(10) unsigned, NOT NULL DEFAULT 1
- archived_at: datetime NULL
- ebook_file_path: varchar(500) NULL
- Missing: publisher, language, ebook_file_format, ebook_authorized_at, submitted_at, and book_listing_media
- book_listings row count: 0

The migration's precondition that ebook_file_path exists is met. The live database has no existing listing rows whose statuses or content could be changed by the enum alteration.

## Security and compatibility matrix

| Area | Result | Finding |
| --- | --- | --- |
| Seller authentication and ownership scoping | PASS | Seller IDs come from the authenticated session; listing queries include seller ownership and source checks. |
| Seller-controlled status changes | PASS | The seller submits only draft/submit intent; the server assigns the resulting listing status and makes edited listings unpublished pending review. |
| Staff/admin authorization and reviewer identity | PASS | Role requirements and current database roles are checked server-side; reviewer IDs come from the authenticated session. |
| Review decision validation | PASS | The endpoint allowlists decisions and checks the current listing state before updating it. |
| Seller changes to review history | PASS | The inspected seller routes append audit entries; no seller endpoint updates or deletes audit rows. |
| Catalog listing-row visibility | PASS | Public catalog SQL requires approved, published, available, unarchived listings and checks seller eligibility. |
| Image visibility for new private media keys | PASS | The image endpoint checks owner/staff access or the same public visibility conditions. |
| Image visibility for legacy static URLs | FAIL | Static files under uploads bypass the image endpoint and its listing-state checks. |
| Public e-book path/contact exposure through catalog JSON | PASS | Catalog queries do not return ebook_file_path or seller contact details. |
| Current code with the live pre-migration schema | FAIL | CatalogController selects Phase 7 columns without a Phase 7 schema check; those columns are currently absent. |
| Upload validation and private storage | PASS / NEEDS VERIFICATION | Server-side checks are present; PDF/EPUB checks are limited, and runtime storage configuration/Windows ACLs were not verified. |
| Migration compatibility with current live schema | PASS | Existing enum values are retained and the required parent key type/engine match. |
| Listing notification mark-as-read flow | FAIL | Generated listing notification keys contain a timestamp that the read endpoint rejects. |

## High-priority findings

### H1 — Legacy image URLs bypass listing visibility checks

**Classification: FAIL — High**

New private images use random opaque keys and ListingMediaController checks the listing state before public streaming. The helper returns every non-private key unchanged, including legacy URLs. Apache's uploads rules grant direct access to image and PDF files. A direct static URL therefore remains readable without checking whether its listing is pending, rejected, suspended, archived, or unavailable.

The Bookify creation endpoint accepts a path under uploads/books and creates the listing as pending_review. If that path names an existing image, the image is already publicly reachable even though its listing is not approved. Legacy PDF files in the same static tree could also be directly reachable if any old e-book reference points there.

The live database currently has no listing rows, and the uploads scan found no files under uploads/books; this means no current affected listing was observed. The code path remains a release blocker for existing or future data.

Evidence:

- [listing_media.php:12](../backend/utils/listing_media.php#L12) returns non-private stored values unchanged.
- [AdminController.php:552](../backend/controllers/AdminController.php#L552) accepts uploads/books paths.
- [AdminController.php:561](../backend/controllers/AdminController.php#L561) creates the Bookify listing in pending_review.
- [ListingMediaController.php:39](../backend/controllers/ListingMediaController.php#L39) gates only opaque private image keys.
- [uploads/.htaccess:13](../uploads/.htaccess#L13) and [uploads/.htaccess:14](../uploads/.htaccess#L14) grant direct static access to image and PDF extensions.

**Recommended fix:** Route legacy and newly submitted listing images through the permission-checked media endpoint, or move them to private storage and migrate their references. Do not allow a pending Bookify listing to use a directly public static path. Confirm whether any historical e-book files are stored under uploads before enabling downloads.

### H2 — Catalog code is incompatible with the current pre-migration schema

**Classification: FAIL — High integration priority**

The live database does not have publisher or language. CatalogController checks only for Phase 2 tables/status fields, then selects both columns. With the current source and current live schema, catalog requests will fail with an unknown-column database error. The seller and admin listing endpoints have Phase 7 schema checks, but the public catalog does not.

Applying the migration adds the missing columns and resolves this specific mismatch. Deployment must apply the migration before serving this version of the catalog code, or the catalog should return a clear migration-required response.

Evidence:

- [CatalogController.php:19](../backend/controllers/CatalogController.php#L19) checks Phase 2 readiness only.
- [CatalogController.php:42](../backend/controllers/CatalogController.php#L42) selects publisher and language for detail requests.
- [CatalogController.php:108](../backend/controllers/CatalogController.php#L108) selects publisher and language for catalog results.
- [ListingController.php:61](../backend/controllers/ListingController.php#L61) through [ListingController.php:90](../backend/controllers/ListingController.php#L90) shows the separate seller schema gate.

## Medium-priority findings

### M1 — Listing notifications cannot be marked read

**Classification: FAIL — Medium**

With submitted_at present, buildNotifications creates keys shaped like listing_review:<id>:<timestamp>. markNotificationRead accepts only a type and numeric ID, so it rejects those listing keys with 422. The notification UI sends the generated key to this endpoint.

Evidence:

- [Phase4Controller.php:197](../backend/controllers/Phase4Controller.php#L197) constructs timestamped listing keys.
- [Phase4Controller.php:226](../backend/controllers/Phase4Controller.php#L226) rejects keys with the timestamp suffix.
- [Phase4Sections.tsx:33](../src/pages/backoffice/Phase4Sections.tsx#L33) calls the mark-read API.

**Recommended fix:** Make the key format produced by the query and accepted by the read endpoint agree. Keep a resubmission-specific key if read state must reset on each seller resubmission.

### M2 — A seller can archive a suspended listing and strand it

**Classification: FAIL — Medium workflow issue**

The seller UI shows Archive for every non-archived listing, including suspended listings. The archive handler does not reject suspended status. After archiving, the seller unarchive handler rejects suspended listings, the staff listing query excludes archived rows, and moderation rejects archived rows. The listing remains hidden, but the normal staff UI has no recovery path.

Evidence:

- [SellerListingsPage.tsx:194](../src/pages/seller/SellerListingsPage.tsx#L194) exposes Archive for non-archived listings.
- [ListingController.php:357](../backend/controllers/ListingController.php#L357) archives without a suspended-status guard.
- [ListingController.php:378](../backend/controllers/ListingController.php#L378) refuses to unarchive a suspended listing.
- [AdminController.php:452](../backend/controllers/AdminController.php#L452) excludes archived listings from staff results.
- [AdminController.php:593](../backend/controllers/AdminController.php#L593) rejects moderation of archived listings.

**Recommended fix:** Block seller archiving for suspended listings, or provide an authorized staff recovery path for archived suspended records.

### M3 — Listing review history is not a complete moderation history

**Classification: NEEDS VERIFICATION — Medium**

Admin audit entries are written for listing decisions, but the listing-details history query shows only submission, draft, unarchive-submit, approve, reject, and revision-request actions. It omits suspend, restore, publish, and unpublish. The general audit feed also does not label all new action names. The audit records remain in the database, but staff may not see the full lifecycle in the listing review panel.

Evidence:

- [AdminController.php:520](../backend/controllers/AdminController.php#L520) filters the listing history action set.
- [ManagementSections.tsx:141](../src/pages/backoffice/ManagementSections.tsx#L141) presents that response as Review history.
- [AdminController.php:634](../backend/controllers/AdminController.php#L634) appends moderation decisions to admin_audit_logs.
- [Phase4Controller.php:170](../backend/controllers/Phase4Controller.php#L170) maps only a subset of listing actions to specific activity labels.

**Recommended fix:** Confirm whether this panel is intended to show the complete listing lifecycle. If so, include status and publication actions and label the newer audit actions.

### M4 — Replaced-file cleanup is best-effort and silent on failure

**Classification: NEEDS VERIFICATION — Medium**

Replaced covers, media, and e-books are deleted after the database transaction commits. The cleanup helpers suppress unlink errors and do not log failures, so permission or filesystem errors can leave private orphan files without a way to identify them. The media foreign-key cascade deletes database rows only; it does not remove files from private storage.

Evidence:

- [ListingController.php:312](../backend/controllers/ListingController.php#L312) through [ListingController.php:314](../backend/controllers/ListingController.php#L314) performs post-commit deletion.
- [private_listing_files.php:56](../backend/utils/private_listing_files.php#L56) through [private_listing_files.php:63](../backend/utils/private_listing_files.php#L63) silently ignores e-book cleanup errors.
- [private_listing_files.php:90](../backend/utils/private_listing_files.php#L90) through [private_listing_files.php:97](../backend/utils/private_listing_files.php#L97) silently ignores image cleanup errors.
- [2026_11_28_phase7_seller_listing_moderation.sql:26](../database/migrations/2026_11_28_phase7_seller_listing_moderation.sql#L26) through [2026_11_28_phase7_seller_listing_moderation.sql:27](../database/migrations/2026_11_28_phase7_seller_listing_moderation.sql#L27) cascades media-row deletion, not filesystem deletion.

**Recommended fix:** Log failed cleanup and provide a safe orphan-file reconciliation/retention process before storage volume grows.

### M5 — PDF and EPUB checks are not full document validation

**Classification: NEEDS VERIFICATION — Medium before any download feature**

PDF validation checks MIME, extension, and the %PDF- prefix. EPUB validation checks the MIME allowlist and first ZIP local-file header/mimetype entry. Neither path validates the full document/archive or scans for malware. No malware scanning implementation was found. This is less exposed while the application has no e-book download flow, but it should be addressed before users can download uploaded files.

Evidence:

- [ListingController.php:565](../backend/controllers/ListingController.php#L565) through [ListingController.php:577](../backend/controllers/ListingController.php#L577) checks the filename extension, MIME, size, and PDF signature.
- [ListingController.php:580](../backend/controllers/ListingController.php#L580) through [ListingController.php:592](../backend/controllers/ListingController.php#L592) checks only the EPUB first entry.
- [PHASE_7_SELLER_LISTING_MODERATION_REPORT.md:75](PHASE_7_SELLER_LISTING_MODERATION_REPORT.md#L75) says there is no e-book download flow.

**Recommended fix:** Before implementing downloads, add full format validation and an appropriate malware-scanning/quarantine step. Do not describe the current checks as malware scanning.

## Low-priority verification and product questions

### L1 — Runtime private-storage path and Windows ACLs were not verified

**Classification: NEEDS VERIFICATION — Low**

The helper resolves the configured path and rejects a real path inside DOCUMENT_ROOT. It skips chmod on Windows, however, and relies on inherited filesystem ACLs. This audit did not inspect secret environment values, invoke the helper (which creates directories), or verify the effective Apache DOCUMENT_ROOT and Windows ACLs.

Evidence: [private_listing_files.php:13](../backend/utils/private_listing_files.php#L13) through [private_listing_files.php:32](../backend/utils/private_listing_files.php#L32), and [private_listing_files.php:49](../backend/utils/private_listing_files.php#L49) through [private_listing_files.php:51](../backend/utils/private_listing_files.php#L51).

**Recommended verification:** Check the effective Apache private-storage configuration and filesystem ACLs in the deployment environment without printing secret values.

### L2 — Bookify-created e-books are no longer accepted by the existing form

**Classification: NEEDS VERIFICATION — Low/product decision**

The Bookify listing form disables e-books, and its endpoint returns 422 for E-book because that form cannot upload a private digital file. This is consistent with avoiding unprotected e-book paths, but it removes an option that the earlier form exposed. Confirm that Bookify-created listings are intended to be physical-only and that seller submissions are the supported e-book route.

Evidence: [ManagementSections.tsx:104](../src/pages/backoffice/ManagementSections.tsx#L104) and [AdminController.php:550](../backend/controllers/AdminController.php#L550).

## Migration review

### Safety and compatibility

The migration adds nullable metadata columns, extends listing_status while retaining all four values in the live enum, and creates a media table. It contains no DROP statement and no UPDATE/DELETE of listing rows. The existing default remains pending; new seller/Bookify submissions set their workflow state explicitly. Existing pending rows would remain recognized by the application. The live database currently has zero listing rows.

The new media FK uses INT UNSIGNED for listing_id, matching the live book_listings.id type, and references its primary key. The parent table is InnoDB. The new table is also InnoDB and uses the existing utf8mb4_unicode_ci convention. Its composite index begins with listing_id and supports the media lookup/order pattern.

MariaDB supports ALTER TABLE ADD COLUMN IF NOT EXISTS in versions well before 10.4; the MariaDB 10.0.2 release notes document that syntax. MariaDB's CREATE TABLE IF NOT EXISTS skips creation when a same-named table exists and reports a note; it does not verify that the existing table has the expected definition. See the [MariaDB 10.0.2 changelog](https://mariadb.com/docs/release-notes/community-server/changelogs/changelogs-mariadb-100-series/mariadb-1002-changelog), [ALTER TABLE reference](https://mariadb.com/docs/server/reference/sql-statements/data-definition/alter/alter-table), and [CREATE TABLE reference](https://mariadb.com/docs/server/server-usage/tables/create-table).

### Risks and execution notes

- The migration assumes the Phase 2/5/Phase 1 prerequisites. The live schema meets the inspected prerequisites, including ebook_file_path.
- DDL statements are separate checkpoints; the migration does not provide an all-or-nothing rollback. Inspect the schema if any statement fails.
- IF NOT EXISTS makes a normal rerun tolerant of already-added objects, but it does not repair a pre-existing column/table with the wrong type, index, or foreign key. Verify definitions with SHOW CREATE TABLE and information_schema before treating a partially applied migration as complete.
- The migration has no explicit ALGORITHM or LOCK clause. MariaDB documents metadata locks and operation-specific online DDL behavior; schedule the enum alteration with an appropriate maintenance window and backup. See the [MariaDB ALTER TABLE reference](https://mariadb.com/docs/server/reference/sql-statements/data-definition/alter/alter-table) and [InnoDB online DDL overview](https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-online-ddl/innodb-online-ddl-overview).
- No migration warnings were observed because the migration was not run.

**Migration file assessment:** PASS for syntax/design against the observed MariaDB 10.4.32 starting schema. No SQL rewrite is indicated from this audit.

## Existing functionality compatibility

- Seller listing list/detail/edit flows are ownership-scoped. Seller updates force draft or pending_review and publication_status=draft; inventory updates change availability but not listing approval or publication state.
- Admin and staff moderation endpoints are role-checked and state-checked. Approve/reject/revision, suspend/restore, publish/unpublish are not accepted solely because the frontend displays a button.
- Public catalog rows use the intended approval, publication, availability, archive, and seller-account checks. New private media uses equivalent public checks.
- Bookify-created listings now enter pending_review. Existing rows and statuses are preserved by the migration. Bookify-created E-books are disabled as described above.
- Seller archive/unarchive generally keeps archived content hidden and sends restored listings back through review. The suspended-listing archive edge case is a recovery gap.
- Listing actions are appended to admin_audit_logs. However, the detail history and audit feed do not display every new action.
- Listing review notifications are generated for both legacy pending and pending_review states, but mark-as-read currently rejects the new timestamped key format.
- No browser workflow, upload, or moderation request was run. Build/lint checks were not rerun because this was a read-only audit.

## Recommendation

**POSTPONE approval of the Phase 7 rollout until the high-priority image visibility bypass is fixed and the notification/history/archive findings are reviewed.** The migration itself matches the live schema and does not need revision based on the current database. After the code issues are resolved, apply the migration before deploying code that selects Phase 7 columns, then verify the enum, all five columns, media table definition, index, and FK.

No application code, database rows/schema, or uploaded files were changed during this audit. Existing working-tree changes were preserved.
