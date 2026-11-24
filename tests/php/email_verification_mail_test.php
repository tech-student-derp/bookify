<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/config/mail.php';

function expect(bool $condition, string $message): void {
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    fwrite(STDOUT, "PASS: {$message}\n");
}

// Missing SMTP config must fail closed without exposing a code to the old stub.
$_ENV = [];
$stubPath = __DIR__ . '/../../backend/logs/mail_stub.log';
$stubMtimeBefore = is_file($stubPath) ? filemtime($stubPath) : null;
expect(
    sendVerificationEmail('test@example.invalid', 'Bookify Test', '123456') === false,
    'missing SMTP configuration is rejected'
);
expect(
    (is_file($stubPath) ? filemtime($stubPath) : null) === $stubMtimeBefore,
    'failed SMTP does not write a plaintext code to the legacy mail stub'
);

$html = buildVerificationEmailHtml('<script>alert(1)</script>', '012345');
expect(!str_contains($html, '<script>alert(1)</script>'), 'verification email escapes user-provided names');
expect(str_contains($html, '30 minutes'), 'verification email states the 30-minute expiry');
expect(str_contains($html, '012345'), 'verification email includes the six-digit code');
