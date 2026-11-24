<?php
/** Database-backed IP throttle for registration and verification email requests. */
declare(strict_types=1);

function allowVerificationRequest(PDO $db, int $limit = 10, int $windowMinutes = 15): bool {
    $limit = max(1, min($limit, 100));
    $windowMinutes = max(1, min($windowMinutes, 1440));
    $remoteAddress = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!is_string($remoteAddress) || $remoteAddress === '') {
        $remoteAddress = 'unknown';
    }

    // Store a digest instead of a raw network address.
    $ipHash = hash('sha256', $remoteAddress);
    $db->prepare(
        'INSERT INTO email_verification_rate_limits (ip_hash, window_started_at, request_count)
         VALUES (?, NOW(), 1)
         ON DUPLICATE KEY UPDATE
           request_count = IF(window_started_at <= DATE_SUB(NOW(), INTERVAL ' . $windowMinutes . ' MINUTE), 1, request_count + 1),
           window_started_at = IF(window_started_at <= DATE_SUB(NOW(), INTERVAL ' . $windowMinutes . ' MINUTE), NOW(), window_started_at)'
    )->execute([$ipHash]);

    $stmt = $db->prepare('SELECT request_count FROM email_verification_rate_limits WHERE ip_hash = ? LIMIT 1');
    $stmt->execute([$ipHash]);
    $count = (int) $stmt->fetchColumn();

    // Opportunistic cleanup prevents old IP digests accumulating indefinitely.
    if (random_int(1, 100) === 1) {
        $db->exec('DELETE FROM email_verification_rate_limits WHERE window_started_at < DATE_SUB(NOW(), INTERVAL 1 DAY)');
    }

    return $count <= $limit;
}
