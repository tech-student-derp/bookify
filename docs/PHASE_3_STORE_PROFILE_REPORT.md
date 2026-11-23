# BOOKIFY — PHASE 3: STORE PROFILE & UPLOAD INFRASTRUCTURE REPORT

**Author:** Senior Full-Stack Engineer & Software Architect  
**Project:** Bookify Online Book Marketplace (Academic Information Management)  
**Date:** November 23, 2026  
**Status:** Completed & Validated  
**Scope:** Seller Store Profile Management, Secure Image Upload Infrastructure, Frontend Settings UI  

---

## 1. EXECUTIVE SUMMARY

Phase 3 implements the complete seller store profile management system. Sellers can now create, view, and update their storefront identity including store name, biography, logo, banner, and optional courier pickup address — all through a functional frontend interface backed by a secure PHP API with session-derived identity, CSRF protection, and MIME-validated image uploads.

### Core Deliverables:
1. **Backend Controller:** `SellerProfileController.php` with 6 endpoints for profile CRUD and image upload/removal.
2. **Secure Upload Pipeline:** MIME-sniffed, dimension-validated image uploads with server-generated filenames and `.htaccess` execution prevention.
3. **Frontend API Service:** `sellerProfileApi.ts` providing typed fetch wrappers for all seller profile operations.
4. **Functional Settings UI:** `SellerSettingsPage.tsx` replacing the Phase 2 placeholder with a complete form-driven interface.
5. **Zero Build Errors:** Clean `tsc -b && vite build` compilation (626 modules, 0 errors).
6. **No Schema Changes Required:** The `seller_profiles` table from the Phase 1 migration is used as-is.

---

## 2. FILES CREATED AND MODIFIED

### New Files

| File | Purpose |
| :--- | :--- |
| [`backend/controllers/SellerProfileController.php`](file:///c:/xampp/htdocs/bookify/backend/controllers/SellerProfileController.php) | PHP backend controller for all seller profile API endpoints |
| [`src/services/sellerProfileApi.ts`](file:///c:/xampp/htdocs/bookify/src/services/sellerProfileApi.ts) | TypeScript API service with typed interfaces for seller profile operations |
| [`uploads/.htaccess`](file:///c:/xampp/htdocs/bookify/uploads/.htaccess) | Apache directive preventing script execution in the uploads directory |
| `uploads/sellers/logos/` | Directory for seller logo image storage |
| `uploads/sellers/banners/` | Directory for seller banner image storage |

### Modified Files

| File | Change |
| :--- | :--- |
| [`src/pages/seller/SellerSettingsPage.tsx`](file:///c:/xampp/htdocs/bookify/src/pages/seller/SellerSettingsPage.tsx) | Replaced Phase 2 placeholder with functional store profile management UI |
| [`vite.config.ts`](file:///c:/xampp/htdocs/bookify/vite.config.ts) | Added `/uploads` proxy rule to serve uploaded images through Vite dev server |

### Unmodified (Reused As-Is)

| File | Reused For |
| :--- | :--- |
| `backend/middleware/auth.php` | `requireAuth()`, `requireDatabaseRole()`, `requireActiveAccount()` |
| `backend/utils/csrf.php` | `generateCsrfToken()`, `validateCsrfToken()` |
| `backend/utils/response.php` | `successResponse()`, `errorResponse()`, `requireMethod()`, `getJsonBody()` |
| `backend/utils/validation.php` | `sanitizeString()`, `isValidPhoneNumber()` |
| `backend/utils/audit.php` | `recordAdminAudit()` |
| `src/services/authApi.ts` | `getCsrfToken()` for CSRF header injection |

---

## 3. DATABASE CHANGES

**None.** The `seller_profiles` table created by the Phase 1 migration (`database/migrations/2026_11_23_phase5_seller_ecosystem.sql`) provides all required columns. No additional migrations were necessary.

The Phase 1 migration was executed against the live `bookify` database as a prerequisite for this phase.

---

## 4. API ENDPOINTS

All endpoints are served via `/backend/controllers/SellerProfileController.php`.

### Authentication & Authorization (All Endpoints)

Every request passes through:
1. `requireAuth()` — rejects unauthenticated users with 401
2. `requireDatabaseRole($db, 'seller')` — verifies role directly against the `users` table, not just session cache
3. `requireActiveAccount($db)` — rejects suspended accounts with 403
4. Direct `users` table verification of `role = 'seller'` and `account_status = 'active'`

Seller identity is **always** derived from `$_SESSION['user_id']`. No frontend-supplied user ID is ever trusted.

### Endpoint Reference

| Action | Method | CSRF | Description |
| :--- | :--- | :--- | :--- |
| `?action=get` | GET | No | Retrieve the authenticated seller's profile and user summary |
| `?action=save` | POST | Yes | Create or update the seller's store profile (text fields) |
| `?action=upload-logo` | POST | Yes | Upload/replace the store logo (multipart/form-data) |
| `?action=upload-banner` | POST | Yes | Upload/replace the store banner (multipart/form-data) |
| `?action=remove-logo` | POST | Yes | Delete the current store logo file and clear the DB reference |
| `?action=remove-banner` | POST | Yes | Delete the current store banner file and clear the DB reference |

### Response Format

All responses follow the existing Bookify convention:

```json
{
  "success": true,
  "message": "Store profile saved successfully.",
  "profile": { ... }
}
```

Error responses include field-level validation errors when applicable:

```json
{
  "success": false,
  "message": "Please correct the highlighted form errors.",
  "errors": {
    "store_name": "Store name is required.",
    "pickup_contact": "Enter a valid Philippine mobile number."
  }
}
```

---

## 5. UPLOAD SECURITY MEASURES

### 5.1 File Validation Pipeline

Each uploaded image passes through a 6-step validation pipeline:

| Step | Check | Rejection |
| :--- | :--- | :--- |
| 1 | PHP upload error code (`UPLOAD_ERR_OK`) | Rejects interrupted, oversized, or missing uploads |
| 2 | Byte size limit (Logo: 2 MB, Banner: 5 MB) | 422 with descriptive message |
| 3 | `is_uploaded_file()` verification | Rejects non-upload file pointers |
| 4 | Real MIME type via `finfo_file(FILEINFO_MIME_TYPE)` | Only `image/jpeg`, `image/png`, `image/webp` accepted |
| 5 | `getimagesize()` dimension validation | Logo: 50×50 – 3000×3000 px; Banner: 200×60 – 4000×2000 px |
| 6 | Server-generated filename (`{type}_{sellerId}_{hex}` + content-derived extension) | No client-controlled filenames |

### 5.2 Storage Security

- **Upload directory:** `uploads/sellers/{logos|banners}/`
- **`.htaccess` protection:** Disables `ExecCGI`, removes handlers for all script extensions (`.php`, `.phtml`, `.cgi`, `.py`, etc.), and only permits direct serving of image MIME types.
- **Path traversal prevention:** `deleteOldUploadFile()` validates that the resolved `realpath()` falls within `uploads/sellers/` before deletion. Strings containing `..` are rejected.
- **Old file cleanup:** When a logo/banner is replaced, the previous file is deleted. If the database transaction fails after file upload, the newly uploaded file is cleaned up.

### 5.3 Vite Dev Proxy

The Vite dev server config was updated to proxy `/uploads` requests to Apache:

```ts
'/uploads': {
  target: 'http://localhost',
  changeOrigin: true,
  rewrite: (path) => `/bookify${path}`,
}
```

---

## 6. VALIDATION RULES

### Store Profile Text Fields

| Field | Required | Max Length | Additional Validation |
| :--- | :--- | :--- | :--- |
| `store_name` | Yes | 150 chars | Min 2 chars; unique across all sellers |
| `bio` | No | 5,000 chars | Sanitized via `strip_tags()` |
| `pickup_address_line` | No | 255 chars | — |
| `pickup_barangay` | No | 120 chars | — |
| `pickup_city` | No | 120 chars | — |
| `pickup_province` | No | 120 chars | — |
| `pickup_region` | No | 120 chars | — |
| `pickup_postal_code` | No | 12 chars | Alphanumeric pattern `/^[\w\s-]{3,12}$/` |
| `pickup_contact` | No | 20 chars | Philippine mobile: `/^(\+?63\|0)9\d{9}$/` |

### Frontend Validation

Client-side validation mirrors the backend rules for immediate feedback. All fields are re-validated server-side — the backend is authoritative.

---

## 7. QA RESULTS

### Build Verification

```
> bookify@0.0.0 build
> tsc -b && vite build

✓ 626 modules transformed.
dist/index.html                     1.04 kB │ gzip:   0.55 kB
dist/assets/index-DL2tViIP.css     74.31 kB │ gzip:  14.92 kB
dist/assets/index-B00RMzbk.js   1,487.62 kB │ gzip: 383.95 kB
✓ built in 1.69s
```

- TypeScript errors: **0**
- Vite build errors: **0**

### PHP Validation

```
No syntax errors detected in backend\controllers\SellerProfileController.php
```

### API Security Tests

| Test | Result |
| :--- | :--- |
| Unauthenticated `GET ?action=get` | HTTP 401 ✓ |
| Customer role accessing seller profile endpoints | HTTP 403 (Insufficient permissions) ✓ |
| Seller can only retrieve their own profile (session-derived ID) | Verified — no user_id parameter accepted ✓ |
| CSRF token required for all POST actions | HTTP 403 without valid token ✓ |
| Suspended account rejection | `requireActiveAccount()` enforced ✓ |

### Functional Tests (Manual via Browser)

| Scenario | Expected | Verified |
| :--- | :--- | :--- |
| Seller visits `/seller/store-settings` with no profile | "New Profile" state; empty form; "Create Store Profile" button | ✓ |
| Create store profile with store name only | Profile created; success toast; form reloaded with data | ✓ |
| Update profile with all pickup fields | All fields persisted; `updated_at` refreshed | ✓ |
| Upload JPEG logo (valid) | File saved to `uploads/sellers/logos/`; preview shown | ✓ |
| Upload PNG banner (valid) | File saved to `uploads/sellers/banners/`; preview shown | ✓ |
| Upload .exe renamed to .jpg | Rejected: "Only JPEG, PNG, and WebP formats are permitted." | ✓ |
| Upload oversized image (> 2MB logo) | Rejected: "Uploaded image cannot exceed 2MB." | ✓ |
| Replace existing logo | Old file deleted; new file stored; DB updated | ✓ |
| Remove logo/banner | File deleted; DB field set to NULL; preview cleared | ✓ |
| Duplicate store name | Rejected: "This store name is already taken." | ✓ |
| Invalid phone number | Rejected with field-level error | ✓ |
| Empty store name on save | Rejected: "Store name is required." | ✓ |
| Existing admin/staff/customer dashboards | No regressions; all routes functional | ✓ |

---

## 8. KNOWN LIMITATIONS

1. **No real-time image cropping.** Images are stored as uploaded. A crop/resize step could be added in a future enhancement.
2. **Store name slug generation is deferred.** The `seller_profiles` table does not include a `store_slug` column. If public storefront URLs are needed (e.g., `/store/juans-rare-books`), a migration adding a unique slug column should be authored in Phase 4 or later.
3. **No progress bar for uploads.** The current implementation uses standard `fetch()` without XHR progress events. For very large banner images this could be improved.
4. **Philippine-specific phone validation.** The `isValidPhoneNumber()` regex is specific to Philippine mobile numbers as defined in the existing codebase.

---

## 9. SCOPE COMPLIANCE

| Out-of-Scope Item | Status |
| :--- | :--- |
| Book listing CRUD | Not implemented ✓ |
| Inventory management | Not implemented ✓ |
| Order fulfillment | Not implemented ✓ |
| E-book file uploads | Not implemented ✓ |
| Commission calculations | Not implemented ✓ |
| Seller payouts | Not implemented ✓ |
| Payment gateways | Not implemented ✓ |
| Customer/admin/staff modifications | None made ✓ |

---

## 10. CONCLUSION

Phase 3 is complete. Sellers can create, view, and update their store profiles through the frontend, with secure image uploads and session-derived ownership protection. The implementation reuses existing backend infrastructure (auth, CSRF, validation, audit logging, response utilities) without introducing unnecessary complexity or schema changes. The codebase is ready for Phase 4 (Listing Catalog & Inventory Engine).
