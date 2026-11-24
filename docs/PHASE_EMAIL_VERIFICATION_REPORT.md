# Bookify: SMTP Email Verification and Turnstile

**Implementation date:** November 24, 2026  
**Status:** Six-digit OTP and Turnstile implementation complete; SMTP and database integration require local configuration

## Implementation summary

- Registration keeps the existing React/PHP authentication flow and server-side Turnstile Siteverify check. PHP creates a cryptographically random six-digit code and stores only a salted `password_hash` in `users.verification_token`; the raw code is sent through the existing PHPMailer SMTP service.
- Verification accepts `{ email, otp }` over the existing auth endpoint. It validates exactly six digits, checks the 30-minute expiry, and uses a row lock and transaction for attempts and consumption. Codes are single-use. Five incorrect attempts invalidate the code; an expired code is also cleared. The verification endpoint uses the existing CSRF mechanism.
- Registration and resend retain the shared database-backed IP limit (10 requests per IP per 15 minutes). Resend also retains its 60-second account cooldown and generic response to avoid confirming whether an address has an account. Failed SMTP sends do not report delivery and invalidate the issued code.
- Unverified accounts remain blocked from login/protected marketplace functionality. Existing verified flags and roles are preserved. Seller, staff, admin, and customer role handling is unchanged. The verification page supports the code form, resend, required, success, and API error states.
- Turnstile is independent of email verification: valid CAPTCHA allows registration processing, but does not verify the email or grant additional roles.

## Database migration

Added `database/migrations/2026_11_24_email_otp.sql`. It widens `users.verification_token` for PHP password hashes and adds `verification_attempts`. It clears legacy 64-character link hashes for **unverified** users so they can request an OTP; it preserves all account roles, `is_verified` flags, and verified timestamps. Existing verification columns are reused; no second auth table was created. The base schema in `database/bookify.sql` includes the corresponding column shape for new installations.

The OTP migration and the existing rate-limit migration were **not executed**. Apply both manually to the existing database before using registration/resend/OTP features. Applying the OTP migration invalidates outstanding legacy verification links. The Phase 5 seller ecosystem migration was not edited or executed.

## SMTP and local setup

1. Copy `.env.example` to `.env` and keep `.env` out of Git. Configure `MAIL_MAILER=smtp`, Mailtrap Sandbox host/port/username/password, `MAIL_ENCRYPTION=tls`, and a sender address. PHPMailer is declared in `composer.json`; run `composer install` if `vendor/autoload.php` is absent.
2. Configure `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in the local `.env` (the site key is exposed to Vite as public configuration; the secret remains PHP-only). Use Cloudflare's documented test keys for local integration tests.
3. Start Apache and MySQL from XAMPP. Manually apply `database/migrations/2026_11_24_email_verification_rate_limits.sql` and `database/migrations/2026_11_24_email_otp.sql` in phpMyAdmin. Do not run the Phase 5 migration.
4. Run `npm run dev`. Complete a fresh Turnstile challenge, register with a test address, inspect the captured OTP in Mailtrap, and enter it at `/verify-email?email=...`.

Mailtrap Sandbox captures messages and does not deliver them to the recipient's real inbox. Production can use Brevo SMTP by changing environment values only. Production deployment requires HTTPS, protected environment secrets, a verified sender/domain, and production Turnstile keys.

## Tests and verification

- `npm.cmd run build` — passed (`tsc -b` and Vite production build); Vite reports the existing large JavaScript chunk warning.
- XAMPP PHP 8.2.12 lint across backend PHP files — passed.
- `php tests/php/email_otp_test.php` — passed generated code shape, salted hash storage/verification, wrong/malformed code rejection, five-attempt setting, and legacy link token rejection.
- `php tests/php/email_verification_mail_test.php` — passed fail-closed behavior without SMTP, no legacy plaintext-code log, escaped name, six-digit template, and 30-minute expiry copy.
- `php tests/php/turnstile_test.php` — passed mocked valid, invalid, expired, reused, wrong-action/hostname, missing-token, and provider-error scenarios.
- `git diff --check` — passed (Git displayed line-ending normalization warnings only).

These local checks do not require SMTP delivery or database access.

**Not integration-tested in this environment:** Mailtrap SMTP acceptance, DB registration and persistence, actual SQL attempt/expiry/reuse transitions, resend/IP rate limits, login/protected-route behavior against MariaDB, or real browser Turnstile rendering. The local SMTP/Turnstile credentials are unconfigured, PHPMailer may not yet be installed, and migrations have intentionally not been applied. No email inbox delivery is claimed.

## Files changed for OTP conversion

- `backend/controllers/AuthController.php`, `backend/config/mail.php`, `backend/utils/email_otp.php`
- `database/bookify.sql`, `database/migrations/2026_11_24_email_otp.sql`
- `src/services/authApi.ts`, auth verification/registration/resend/login UI, and dashboard settings resend copy
- `tests/php/email_otp_test.php`, `tests/php/email_verification_mail_test.php`

The repository may also contain earlier email verification and Turnstile work documented in this report. This milestone does not execute migrations or change the authentication/role model.
