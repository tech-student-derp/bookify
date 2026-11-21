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
