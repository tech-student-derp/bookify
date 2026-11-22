<?php
/**
 * Bookify — Auth middleware
 * Guards endpoints that require an authenticated session.
 */
declare(strict_types=1);

function requireAuth(): void {
    if (empty($_SESSION['user_id'])) {
        errorResponse('Authentication required.', 401);
    }
}

function requireVerified(): void {
    requireAuth();
    if (empty($_SESSION['is_verified'])) {
        errorResponse('Email verification required.', 403);
    }
}

function requireRole(string ...$roles): void {
    requireAuth();
    $userRole = $_SESSION['role'] ?? '';
    if (!in_array($userRole, $roles, true)) {
        errorResponse('Insufficient permissions.', 403);
    }
}

/** Re-check privileged roles against the current database record, not only session state. */
function requireDatabaseRole(PDO $db, string ...$roles): void {
    requireAuth();
    $hasStatus = hasAccountStatusColumn($db);
    $sql = 'SELECT role' . ($hasStatus ? ', account_status' : '') . ' FROM users WHERE id = ? LIMIT 1';
    $stmt = $db->prepare($sql);
    $stmt->execute([(int) $_SESSION['user_id']]);
    $account = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$account || !is_string($account['role'] ?? null)) {
        errorResponse('Authentication required.', 401);
    }

    $_SESSION['role'] = $account['role'];
    if ($hasStatus && ($account['account_status'] ?? 'active') !== 'active') {
        errorResponse('This account is suspended.', 403);
    }
    if (!in_array($account['role'], $roles, true)) {
        errorResponse('Insufficient permissions.', 403);
    }
}

function hasAccountStatusColumn(PDO $db): bool {
    static $exists = null;
    if ($exists === null) {
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        $stmt->execute(['users', 'account_status']);
        $exists = (int) $stmt->fetchColumn() > 0;
    }
    return $exists;
}

function requireActiveAccount(PDO $db): void {
    requireAuth();
    if (!hasAccountStatusColumn($db)) return;
    $stmt = $db->prepare('SELECT account_status FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([(int) $_SESSION['user_id']]);
    if ($stmt->fetchColumn() !== 'active') {
        errorResponse('This account is suspended.', 403);
    }
}
