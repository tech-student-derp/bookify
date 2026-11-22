<?php
/**
 * Bookify — Environment / configuration loader
 *
 * Reads a .env file from the project root (one level above backend/).
 * Values are stored in $_ENV so database.php and mail.php can read them.
 *
 * Required .env keys:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
 *   MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD,
 *   MAIL_FROM_ADDRESS, MAIL_FROM_NAME, MAIL_ENCRYPTION
 *   APP_URL  (e.g. http://localhost:5173)
 */
declare(strict_types=1);

$envFile = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env';

if (is_readable($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
        $key   = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if ($key !== '') {
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
            putenv("{$key}={$value}");
        }
    }
}
