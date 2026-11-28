# Phase 7 — Security and Integration Remediation Report

**Date:** 2026-11-28
**Scope:** Remediation of findings in [the Phase 7 independent audit](PHASE_7_SECURITY_COMPATIBILITY_AUDIT.md). The existing Phase 7 architecture and working-tree changes were preserved.

## Executive summary

The four implementation defects and the incomplete listing-history view identified by the audit have been addressed in source:

- Legacy listing images now use the permission-checked media endpoint. Direct static requests under `/uploads/books` are denied by Apache rules.
- The public catalog checks for all required Phase 7 columns and the media table, and returns a safe `503 migration_required` response when those objects are absent.
- Listing notification read validation accepts the timestamped key generated for listing reviews.
- Sellers cannot archive, edit, or change inventory for suspended listings; staff retains the moderation controls.
- Listing detail history includes moderation, publication, restoration, archive, submission, and inventory actions in newest-first order.
- Private-file cleanup logs failures and checks whether an image or e-book key is still referenced before deletion. Existing legacy upload paths are not deleted by this cleanup path.

The migration was **not** applied to the live `bookify` database. The final read-only check confirmed `bookify` is still selected, has zero listing rows, is missing the five Phase 7 metadata columns, and has no `book_listing_media` table. Those missing objects are why the catalog correctly returns the migration-required response.

## Findings and remediation

### H1 — Legacy image URLs bypass listing visibility checks

**Original result:** FAIL — High. Direct static URLs could expose images for listings that were pending, rejected, suspended, archived, or unavailable.

**Remediation:** `listingImageUrl()` now emits the permission-checked endpoint URL only for a generated private image key or a safe legacy `/uploads/books/...` image path. Legacy paths reject traversal, unsupported extensions, and symlink escapes. `ListingMediaController.php` applies the same owner/staff or public-visibility checks before resolving either kind of file; legacy image bytes are checked against their actual MIME and image contents. `uploads/.htaccess` denies direct HTTP access to the `books` subtree, while other upload directories remain available.

**Result:** PASS by source inspection and local HTTP checks. Apache configuration validation returned `Syntax OK`; a request to `/uploads/books/...` was denied with HTTP 403, while an existing seller-logo URL outside that subtree returned HTTP 200. No upload was moved or deleted.

**Evidence:** [listing_media.php](../backend/utils/listing_media.php#L5), [ListingMediaController.php](../backend/controllers/ListingMediaController.php#L40), [uploads/.htaccess](../uploads/.htaccess#L19).

### H2 — Catalog code fails against the pre-migration schema

**Original result:** FAIL — High integration priority. Catalog queries selected Phase 7 columns without checking whether the migration had created them.

**Remediation:** `CatalogController.php` checks the six required listing columns and `book_listing_media` before running catalog queries. If either requirement is missing, it returns HTTP 503 with a stable `migration_required` code and a generic message. The exception handler also avoids sending raw SQL details to clients.

**Result:** PASS for fail-closed behavior. A local request against the current pre-migration database returned the controlled 503 JSON response without SQL details. Catalog browsing remains unavailable until the migration is separately approved and applied.

**Evidence:** [CatalogController.php](../backend/controllers/CatalogController.php#L28), [migration-required response](../backend/controllers/CatalogController.php#L37).

### M1 — Listing notifications cannot be marked read

**Original result:** FAIL — Medium. Generated listing review keys include a submission timestamp, but the read endpoint rejected the suffix.

**Remediation:** The key validator now accepts `listing_review:<positive-id>:<14-digit-timestamp>` and the legacy `listing_review:<positive-id>` form. Other notification key validation remains constrained to known types and positive numeric IDs.

**Result:** PASS by source-level validation of the generated and accepted formats. No account or notification record was changed.

**Evidence:** [Phase4Controller.php](../backend/controllers/Phase4Controller.php#L197), [read-key validation](../backend/controllers/Phase4Controller.php#L227).

### M2 — Sellers could archive suspended listings and strand them

**Original result:** FAIL — Medium. A seller could archive a suspended listing, after which normal seller and staff workflows could not recover it.

**Remediation:** The server rejects seller archive requests for suspended listings. The seller UI hides edit, archive, and inventory controls for suspended rows. Staff/admin suspension and restoration remain governed by the existing moderation endpoint.

**Result:** PASS for preventing new suspended-and-archived states through seller actions. The live database contains no listings. Any such record discovered in another environment would need an authorized staff recovery plan before release; this remediation does not rewrite existing data.

**Evidence:** [archive guard](../backend/controllers/ListingController.php#L354), [seller controls](../src/pages/seller/SellerListingsPage.tsx#L184).

### M3 — Listing review history omitted lifecycle actions

**Original result:** NEEDS VERIFICATION — Medium. The listing detail history omitted suspension, restoration, publication, and unpublication events, and the general audit feed did not label them.

**Remediation:** The listing detail query includes creation, submission, draft save, review decisions, suspension, restoration, publication, unpublication, archive, and inventory events. It orders by event time and audit ID descending. The existing general audit feed maps these listing actions to readable labels; no duplicate audit storage was introduced.

**Result:** PASS by source inspection. The current UI presents the returned events chronologically, newest first. No browser workflow was run.

**Evidence:** [listing history query](../backend/controllers/AdminController.php#L522), [general audit labels and ordering](../backend/controllers/Phase4Controller.php#L170), [history display](../src/pages/backoffice/ManagementSections.tsx#L141).

### M4 — Replaced-file cleanup failures were silent

**Original result:** NEEDS VERIFICATION — Medium. Unlink errors were suppressed, and cleanup did not check for shared references.

**Remediation:** Cleanup helpers record the file type, listing ID, key, and failure reason in the PHP error log. Before deleting a generated private key, the controller checks the listing cover/media references or e-book reference across records. If the reference query fails, cleanup logs the problem and retains the file. Cleanup is limited to generated private keys; legacy upload paths are not removed.

**Result:** PASS by source inspection. No listing upload was deleted during this task. Filesystem error behavior was not forced at runtime.

**Evidence:** [reference check](../backend/controllers/ListingController.php#L607), [cleanup logging](../backend/utils/private_listing_files.php#L64).

## Remaining audit items

These items were outside the requested remediation priorities and remain open:

- **M5 — PDF/EPUB validation is limited:** the existing checks do not fully validate documents or scan for malware. No malware-scanning feature was found or added. Revisit before implementing e-book downloads.
- **L1 — Private-storage runtime path and Windows ACLs:** configuration presence and effective filesystem permissions were not verified as part of this task. Verify them in the target deployment environment without exposing secret values.
- **L2 — Bookify-created e-books:** the Bookify listing form remains physical-only because it has no private e-book upload flow. Confirm that this remains the intended product behavior.
- The local Apache rule was checked on XAMPP. Any deployment server that does not honor this `.htaccess` file must enforce the same `/uploads/books` access denial in its server configuration.
- No browser-based seller/admin workflow or authenticated listing lifecycle test was performed. No test account was used.

## Verification performed

- **Production build:** `npm.cmd run build` — PASS. Vite emitted its existing large-chunk advisory (>500 kB); build completed successfully.
- **Focused ESLint:** seller listing UI and back-office history component — PASS.
- **PHP syntax:** all seven affected PHP files — PASS.
- **Apache configuration:** `httpd.exe -t` — `Syntax OK`.
- **HTTP checks:** static `/uploads/books` access denied; an unrelated seller-logo path remained accessible. Catalog returned the expected safe migration-required response on the pre-migration schema.
- **Disposable MariaDB compatibility check:** the Phase 7 migration was applied twice to a temporary schema based on the current listing table definition. The legacy `pending` status remained valid; the new enum values, media table, foreign key, and composite index were checked; a disposable FK cascade fixture behaved as expected. Temporary schema was removed and its absence verified. This did not alter `bookify`.
- **Live database read-only check:** selected database `bookify`; `book_listings` row count 0; Phase 7 metadata columns absent; `book_listing_media` absent; no temporary `bookify_phase7_*` schemas remained.
- **Diff check:** `git diff --check` — PASS. Git emitted only line-ending normalization notices for existing modified files.

## Files changed for remediation

- `backend/controllers/AdminController.php`
- `backend/controllers/CatalogController.php`
- `backend/controllers/ListingController.php`
- `backend/controllers/ListingMediaController.php`
- `backend/controllers/Phase4Controller.php`
- `backend/utils/listing_media.php`
- `backend/utils/private_listing_files.php`
- `src/pages/seller/SellerListingsPage.tsx`
- `uploads/.htaccess`
- `docs/PHASE_7_SECURITY_REMEDIATION_REPORT.md` (this report)

## Recommendation

The reported code blockers are remediated, but the live database is still pre-migration. Keep the migration unapplied until its separate approval is given. After deployment, rerun the security audit against the migrated schema and verify the server-level `/uploads/books` denial in the target hosting configuration. An independent follow-up security audit is recommended before the Phase 7 rollout is considered complete.
