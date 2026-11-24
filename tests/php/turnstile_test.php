<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/utils/turnstile.php';

function expectTurnstile(bool $condition, string $message): void {
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    fwrite(STDOUT, "PASS: {$message}\n");
}

$_ENV['TURNSTILE_SECRET_KEY'] = 'test-secret';
$_ENV['APP_URL'] = 'http://localhost:5173';
$requestCount = 0;
$validTransport = static function (array $payload) use (&$requestCount): array {
    $requestCount++;
    expectTurnstile(($payload['secret'] ?? '') === 'test-secret', 'server secret is sent only to Siteverify transport');
    expectTurnstile(($payload['response'] ?? '') === 'valid-token', 'captcha response is forwarded to Siteverify');
    expectTurnstile(($payload['remoteip'] ?? '') === '127.0.0.1', 'valid remote address is included');
    return ['success' => true, 'action' => 'register', 'hostname' => 'localhost'];
};

expectTurnstile(
    verifyTurnstileToken('valid-token', '127.0.0.1', $validTransport) === 'valid',
    'successful Siteverify response is accepted'
);

expectTurnstile(
    verifyTurnstileToken('invalid-token', null, static fn (): array => ['success' => false, 'error-codes' => ['invalid-input-response']]) === 'invalid',
    'invalid CAPTCHA response is rejected'
);

$expiredOrReused = static fn (): array => ['success' => false, 'error-codes' => ['timeout-or-duplicate']];
expectTurnstile(verifyTurnstileToken('expired-token', null, $expiredOrReused) === 'invalid', 'expired CAPTCHA token is rejected');
$replayCount = 0;
$replayTransport = static function () use (&$replayCount): array {
    $replayCount++;
    return $replayCount === 1
        ? ['success' => true, 'action' => 'register', 'hostname' => 'localhost']
        : ['success' => false, 'error-codes' => ['timeout-or-duplicate']];
};
expectTurnstile(verifyTurnstileToken('one-use-token', null, $replayTransport) === 'valid', 'fresh CAPTCHA token is accepted once');
expectTurnstile(verifyTurnstileToken('one-use-token', null, $replayTransport) === 'invalid', 'reusing the same CAPTCHA token is rejected');

expectTurnstile(
    verifyTurnstileToken('wrong-action', null, static fn (): array => ['success' => true, 'action' => 'login', 'hostname' => 'localhost']) === 'invalid',
    'token issued for a different action is rejected'
);
expectTurnstile(
    verifyTurnstileToken('wrong-host', null, static fn (): array => ['success' => true, 'action' => 'register', 'hostname' => 'attacker.example']) === 'invalid',
    'token issued for a different hostname is rejected'
);

$shouldNotRun = static function (): array {
    throw new RuntimeException('Siteverify must not be called without a token');
};
expectTurnstile(verifyTurnstileToken('', null, $shouldNotRun) === 'invalid', 'missing CAPTCHA token is rejected before Siteverify');

expectTurnstile(
    verifyTurnstileToken('some-token', null, static fn (): array => ['success' => false, 'error-codes' => ['internal-error']]) === 'unavailable',
    'Siteverify service errors fail closed'
);
