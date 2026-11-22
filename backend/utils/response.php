<?php
/**
 * Bookify — HTTP response helpers
 */
declare(strict_types=1);

function jsonResponse(array $data, int $status = 200): never {
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    try {
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    } catch (\JsonException $e) {
        error_log('JSON encode error: ' . $e->getMessage());
        echo '{"success":false,"message":"Failed to encode JSON response."}';
    }
    exit;
}

function errorResponse(string $message, int $status = 400, array $extra = []): never {
    jsonResponse(array_merge(['success' => false, 'message' => $message], $extra), $status);
}

function successResponse(array $data = [], int $status = 200): never {
    jsonResponse(array_merge(['success' => true], $data), $status);
}

/** Only allow specified HTTP methods; send 405 otherwise. */
function requireMethod(string ...$methods): void {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (!in_array($method, array_map('strtoupper', $methods), true)) {
        header('Allow: ' . implode(', ', $methods));
        errorResponse('Method not allowed.', 405);
    }
}

/** Parse and return JSON request body; error on bad input. */
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    try {
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        return is_array($data) ? $data : [];
    } catch (\JsonException) {
        errorResponse('Invalid JSON payload.', 400);
    }
}
