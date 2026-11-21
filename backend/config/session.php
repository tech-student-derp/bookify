<?php
/**
 * Bookify — Secure session configuration
 * Must be included before session_start() on every endpoint.
 */
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
             || ($_SERVER['SERVER_PORT'] ?? 80) == 443;

    session_set_cookie_params([
        'lifetime' => 0,          // browser-session cookie
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isSecure,  // HTTPS only in production
        'httponly' => true,        // no JS access
        'samesite' => 'Lax',
    ]);

    session_name('bookify_session');
    session_start();
}
