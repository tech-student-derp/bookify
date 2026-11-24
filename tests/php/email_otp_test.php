<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/utils/email_otp.php';

function assertOtp(bool $condition, string $description): void {
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$description}\n");
        exit(1);
    }
    fwrite(STDOUT, "PASS: {$description}\n");
}

$otp = generateEmailOtp();
assertOtp((bool) preg_match('/^\d{6}$/D', $otp['code']), 'generated OTP has exactly six digits');
assertOtp($otp['hash'] !== $otp['code'], 'only a password hash is persisted');
assertOtp(password_verify($otp['code'], $otp['hash']), 'correct code matches the stored hash');
$wrongCode = $otp['code'] === '000000' ? '000001' : '000000';
assertOtp(!verifyEmailOtp($wrongCode, $otp['hash']), 'incorrect code is rejected');
assertOtp(!verifyEmailOtp('12345', $otp['hash']), 'malformed code is rejected');
assertOtp(EMAIL_OTP_MAX_ATTEMPTS === 5, 'attempt limit is five');
assertOtp(!password_verify(str_repeat('a', 64), $otp['hash']), 'legacy link token cannot be used as an OTP');
