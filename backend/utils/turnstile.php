<?php
/** Server-side Cloudflare Turnstile verification for high-risk form submissions. */
declare(strict_types=1);

/**
 * @return 'valid'|'invalid'|'unavailable'
 * The optional transport is only for deterministic tests; production always
 * posts to Cloudflare's fixed Siteverify endpoint.
 */
function verifyTurnstileToken(string $token, ?string $remoteIp = null, ?callable $transport = null): string {
    $secret = trim($_ENV['TURNSTILE_SECRET_KEY'] ?? '');
    if ($secret === '') {
        error_log('Turnstile validation unavailable: server secret is not configured.');
        return 'unavailable';
    }
    $expectedHostname = parse_url($_ENV['APP_URL'] ?? '', PHP_URL_HOST);
    if (!is_string($expectedHostname) || $expectedHostname === '') {
        error_log('Turnstile validation unavailable: application hostname is not configured.');
        return 'unavailable';
    }
    if ($token === '' || strlen($token) > 2048) {
        return 'invalid';
    }

    $payload = [
        'secret' => $secret,
        'response' => $token,
    ];
    if (is_string($remoteIp) && filter_var($remoteIp, FILTER_VALIDATE_IP)) {
        $payload['remoteip'] = $remoteIp;
    }

    $response = $transport !== null
        ? $transport($payload)
        : postTurnstileSiteverify($payload);
    if (!is_array($response) || !array_key_exists('success', $response)) {
        error_log('Turnstile validation unavailable: Siteverify did not return a valid response.');
        return 'unavailable';
    }

    if (($response['success'] ?? false) !== true) {
        $errorCodes = is_array($response['error-codes'] ?? null) ? $response['error-codes'] : [];
        if (array_intersect($errorCodes, ['internal-error', 'invalid-input-secret', 'missing-input-secret'])) {
            error_log('Turnstile validation unavailable: Siteverify reported a configuration or service error.');
            return 'unavailable';
        }
        return 'invalid';
    }

    // Registration widgets specify this action to prevent cross-form token use.
    if (($response['action'] ?? null) !== 'register') {
        return 'invalid';
    }
    if (!is_string($response['hostname'] ?? null) || strcasecmp($response['hostname'], $expectedHostname) !== 0) {
        return 'invalid';
    }

    return 'valid';
}

/** @param array<string, string> $payload @return array<string, mixed>|null */
function postTurnstileSiteverify(array $payload): ?array {
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\nAccept: application/json\r\n",
            'content' => http_build_query($payload, '', '&', PHP_QUERY_RFC3986),
            'timeout' => 8,
            'ignore_errors' => true,
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);

    $body = @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $context);
    if (!is_string($body)) {
        return null;
    }

    $statusLine = is_array($http_response_header ?? null) ? ($http_response_header[0] ?? '') : '';
    if (!is_string($statusLine) || !preg_match('/\s200\s/', $statusLine)) {
        return null;
    }

    try {
        $decoded = json_decode($body, true, 32, JSON_THROW_ON_ERROR);
        return is_array($decoded) ? $decoded : null;
    } catch (JsonException) {
        return null;
    }
}
