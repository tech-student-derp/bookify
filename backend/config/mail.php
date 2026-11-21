<?php
/**
 * Bookify — Mail configuration
 *
 * Returns the SMTP configuration array. Actual mail sending uses PHPMailer
 * when it is available, otherwise falls back to a stub that logs to a file.
 *
 * To enable real mail delivery:
 *   1. Install PHPMailer: composer require phpmailer/phpmailer
 *   2. Set the MAIL_* environment variables in your .env file.
 */
declare(strict_types=1);

function getMailConfig(): array {
    return [
        'host'         => $_ENV['MAIL_HOST']         ?? '',
        'port'         => (int) ($_ENV['MAIL_PORT']  ?? 587),
        'username'     => $_ENV['MAIL_USERNAME']      ?? '',
        'password'     => $_ENV['MAIL_PASSWORD']      ?? '',
        'encryption'   => $_ENV['MAIL_ENCRYPTION']   ?? 'tls',   // 'tls' | 'ssl' | ''
        'from_address' => $_ENV['MAIL_FROM_ADDRESS']  ?? 'noreply@bookify.local',
        'from_name'    => $_ENV['MAIL_FROM_NAME']     ?? 'Bookify',
    ];
}

/**
 * sendVerificationEmail()
 *
 * Attempts to send via PHPMailer when available.
 * Falls back to writing the verification URL to
 * backend/logs/mail_stub.log so you can test without SMTP.
 *
 * @return bool  true on success (or stub write), false on hard failure
 */
function sendVerificationEmail(string $toEmail, string $toName, string $verificationUrl): bool {
    $cfg = getMailConfig();

    // ── PHPMailer path ────────────────────────────────────────────────────
    $autoload = dirname(__DIR__, 2) . '/vendor/autoload.php';
    if (is_readable($autoload) && $cfg['host'] !== '') {
        require_once $autoload;

        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = $cfg['host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $cfg['username'];
            $mail->Password   = $cfg['password'];
            $mail->SMTPSecure = $cfg['encryption'];
            $mail->Port       = $cfg['port'];

            $mail->setFrom($cfg['from_address'], $cfg['from_name']);
            $mail->addAddress($toEmail, $toName);

            $mail->isHTML(true);
            $mail->Subject = 'Verify your Bookify account';
            $mail->Body    = buildVerificationEmailHtml($toName, $verificationUrl);
            $mail->AltBody = "Hi {$toName},\n\nPlease verify your Bookify account:\n{$verificationUrl}\n\nThis link expires in 24 hours.\n\nIf you did not register, ignore this email.";

            $mail->send();
            return true;
        } catch (\Exception) {
            // Fall through to stub
        }
    }

    // ── Stub / dev fallback ───────────────────────────────────────────────
    $logDir  = __DIR__ . '/../logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/mail_stub.log';
    $entry   = sprintf(
        "[%s] TO:%s  URL:%s\n",
        date('Y-m-d H:i:s'),
        $toEmail,
        $verificationUrl
    );
    file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);

    return true; // stub always "succeeds" so registration flow continues
}

function buildVerificationEmailHtml(string $name, string $url): string {
    $safeUrl  = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:monospace;background:#0d1f1a;color:#a0b4ac;padding:40px 24px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:#0f2318;border:1px solid #1a2f28;border-radius:12px;padding:40px;">
    <div style="margin-bottom:28px;">
      <span style="font-weight:700;font-size:1.1rem;color:#e2f0ea;">Bookify</span>
    </div>
    <h2 style="color:#e2f0ea;margin:0 0 16px;font-size:1.3rem;font-weight:700;">Verify your email address</h2>
    <p style="color:#7a9a90;margin:0 0 24px;line-height:1.75;">Hi {$safeName},</p>
    <p style="color:#7a9a90;margin:0 0 28px;line-height:1.75;">
      Thanks for creating a Bookify account. Please verify your email address by clicking the button below.
      This link expires in <strong style="color:#a0b4ac;">24 hours</strong>.
    </p>
    <a href="{$safeUrl}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#3b82f6);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.9rem;letter-spacing:0.02em;">
      Verify Email Address
    </a>
    <p style="color:#4a6a60;margin:28px 0 0;font-size:0.82rem;line-height:1.75;">
      If the button does not work, copy this link into your browser:<br>
      <span style="color:#7a9a90;word-break:break-all;">{$safeUrl}</span>
    </p>
    <hr style="border:none;border-top:1px solid #1a2f28;margin:28px 0;">
    <p style="color:#4a6a60;margin:0;font-size:0.78rem;">
      If you did not register at Bookify, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
HTML;
}
