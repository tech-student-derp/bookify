<?php
/**
 * Bookify — CSRF helpers
 *
 * generateCsrfToken()  → creates/returns a session-bound token
 * validateCsrfToken()  → compares request header vs session token
 */
declare(strict_types=1);

function generateCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validateCsrfToken(): bool {
    // React sends it as a custom header X-CSRF-Token
    $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';

    if ($headerToken === '' || $sessionToken === '') {
        return false;
    }
    return hash_equals($sessionToken, $headerToken);
}
