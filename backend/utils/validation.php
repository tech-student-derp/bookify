<?php
/**
 * Bookify — Input validation helpers
 */
declare(strict_types=1);

/** Basic email format check */
function isValidEmail(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Password strength:
 *  - At least 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character
 */
function isValidPassword(string $password): bool {
    return strlen($password) >= 8
        && preg_match('/[A-Z]/', $password)
        && preg_match('/[a-z]/', $password)
        && preg_match('/[0-9]/', $password)
        && preg_match('/[\W_]/', $password);
}

/** Strip tags and trim; handles non-string gracefully and never returns null */
function sanitizeString(mixed $value): string {
    if (!is_string($value)) {
        return '';
    }
    return trim(strip_tags($value));
}

/** Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX */
function isValidPhoneNumber(string $phone): bool {
    return preg_match('/^(\+?63|0)9\d{9}$/', $phone) === 1;
}
