<?php
/** Single-use, short-lived email verification codes. */
declare(strict_types=1);

const EMAIL_OTP_MAX_ATTEMPTS = 5;

/** @return array{code: string, hash: string} */
function generateEmailOtp(): array {
    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $hash = password_hash($code, PASSWORD_DEFAULT);
    if (!is_string($hash)) {
        throw new RuntimeException('Could not hash the email verification code.');
    }

    return ['code' => $code, 'hash' => $hash];
}

function verifyEmailOtp(string $code, string $hash): bool {
    if (!preg_match('/^\d{6}$/D', $code) || $hash === '') {
        return false;
    }

    return password_verify($code, $hash);
}
