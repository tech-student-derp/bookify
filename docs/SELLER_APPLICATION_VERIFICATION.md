# Seller Application Verification

Seller applications require a valid Philippine mobile number and one government-issued ID image in JPG, JPEG, or PNG format. A National ID is recommended. The server validates file extension, actual MIME/image content, upload status, and a 5 MB maximum.

Application phone numbers are stored on the seller application. They do not overwrite `users.contact_number`. ID files use a randomized opaque reference and are stored outside the web root. The application database stores only that reference. An authenticated administrator can stream the image through the protected back-office controller; staff and applicants cannot retrieve documents through that action.

The additive migration `database/migrations/2026_11_25_phase6_seller_application_verification.sql` must be applied manually before new applications with verification documents can be submitted. It preserves existing application rows; legacy rows have no application-specific phone or ID reference. No migration is executed by the application.

`BOOKIFY_PRIVATE_STORAGE_PATH` may be set to a persistent private directory outside the web document root. When unset, the application uses a private subdirectory of the system temporary directory. Deployments should configure persistent private storage and an appropriate retention/deletion policy for identity documents.

## Future policy

Bookify intends to require at least three days of active platform usage before approving seller applications. This requirement is documented but intentionally unenforced for the upcoming presentation. It is not a three-day administrator review delay.

For presentation testing, use fictional or synthetic sample ID images. Do not collect real government IDs from classmates or participants.
