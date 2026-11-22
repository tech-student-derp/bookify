<?php
declare(strict_types=1);

// Legacy direct URL retained as a redirect; staff creation is handled by the
// role-protected React page and its administrator-only, CSRF-protected API.
require_once __DIR__ . '/backend/config/env.php';
$appUrl = rtrim($_ENV['APP_URL'] ?? '/', '/');
header('Location: ' . $appUrl . '/staffaddaccount', true, 302);
exit;
