<?php
/**
 * Bookify — Database connection
 * Returns a PDO instance. Throws on failure.
 */
declare(strict_types=1);

require_once __DIR__ . '/../utils/response.php';

$dbConfig = [
    'host'    => $_ENV['DB_HOST']    ?? 'localhost',
    'port'    => $_ENV['DB_PORT']    ?? '3306',
    'name'    => $_ENV['DB_NAME']    ?? 'bookify',
    'user'    => $_ENV['DB_USER']    ?? 'root',
    'pass'    => $_ENV['DB_PASS']    ?? '',
    'charset' => 'utf8mb4',
];

function getDB(): PDO {
    global $dbConfig;
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $dbConfig['host'],
        $dbConfig['port'],
        $dbConfig['name'],
        $dbConfig['charset']
    );

    try {
        $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        error_log('Database connection error: ' . $e->getMessage());
        errorResponse('Database connection failed. Please ensure the database server is running and configured correctly.', 500);
    }

    return $pdo;
}
