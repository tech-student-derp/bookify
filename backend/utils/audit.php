<?php
declare(strict_types=1);

function requireAuditSchema(PDO $db): void {
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );
    $stmt->execute(['admin_audit_logs']);
    if ((int) $stmt->fetchColumn() !== 1) {
        errorResponse('Apply the Phase 2 back-office migration before making administrative changes.', 503);
    }
}

/** Record a non-secret administrative action inside the caller's transaction. */
function recordAdminAudit(PDO $db, int $actorId, string $action, string $targetType, ?int $targetId, array $details = []): void {
    $json = $details === []
        ? null
        : json_encode($details, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $stmt = $db->prepare(
        'INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id, details_json)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$actorId, $action, $targetType, $targetId, $json]);
}
