<?php
/**
 * Bookify SMTP mail configuration and verification message delivery.
 * Provider changes are environment-only (for example Mailtrap in development,
 * Brevo in production); SMTP errors never fall back to logging a token.
 */
declare(strict_types=1);

function getMailConfig(): array {
    return [
        'mailer'       => strtolower(trim($_ENV['MAIL_MAILER'] ?? 'smtp')),
        'host'          => trim($_ENV['MAIL_HOST'] ?? ''),
        'port'          => (int) ($_ENV['MAIL_PORT'] ?? 587),
        'username'      => $_ENV['MAIL_USERNAME'] ?? '',
        'password'      => $_ENV['MAIL_PASSWORD'] ?? '',
        'encryption'    => strtolower(trim($_ENV['MAIL_ENCRYPTION'] ?? 'tls')),
        'from_address'  => trim($_ENV['MAIL_FROM_ADDRESS'] ?? ''),
        'from_name'     => trim($_ENV['MAIL_FROM_NAME'] ?? 'Bookify'),
    ];
}

/** Send a verification code. Returns false for missing config or SMTP rejection. */
function sendVerificationEmail(string $toEmail, string $toName, string $otpCode): bool {
    if (!preg_match('/^\d{6}$/D', $otpCode)) return false;
    $cfg = getMailConfig();
    $autoload = dirname(__DIR__, 2) . '/vendor/autoload.php';

    if (
        $cfg['mailer'] !== 'smtp'
        || $cfg['host'] === ''
        || $cfg['username'] === ''
        || $cfg['password'] === ''
        || !filter_var($cfg['from_address'], FILTER_VALIDATE_EMAIL)
        || !is_readable($autoload)
    ) {
        error_log('Verification email delivery is unavailable: SMTP configuration or PHPMailer is missing.');
        return false;
    }

    require_once $autoload;

    try {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $cfg['host'];
        $mail->SMTPAuth = true;
        $mail->Username = $cfg['username'];
        $mail->Password = $cfg['password'];
        $mail->Port = $cfg['port'];
        $mail->Timeout = 15;
        $mail->SMTPDebug = 0;
        $mail->CharSet = 'UTF-8';

        if ($cfg['encryption'] === 'tls') {
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        } elseif ($cfg['encryption'] === 'ssl') {
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($cfg['encryption'] === '') {
            $mail->SMTPSecure = '';
            $mail->SMTPAutoTLS = false;
        } else {
            error_log('Verification email delivery failed: unsupported SMTP encryption setting.');
            return false;
        }

        $mail->setFrom($cfg['from_address'], $cfg['from_name']);
        $mail->addAddress($toEmail, $toName);
        $mail->isHTML(true);
        $mail->Subject = 'Verify your Bookify account';
        $mail->Body = buildVerificationEmailHtml($toName, $otpCode);
        $mail->AltBody = "Hi {$toName},\n\nYour Bookify email verification code is: {$otpCode}\n\nIt expires in 30 minutes. If you did not create this account, ignore this message.";

        return $mail->send();
    } catch (\Throwable) {
        // PHPMailer exceptions may include transport details. Keep logs free of
        // credentials, verification URLs, recipient data, and plaintext tokens.
        error_log('Verification email delivery failed during SMTP transport.');
        return false;
    }
}

function buildVerificationEmailHtml(string $name, string $otpCode): string {
    $safeCode = htmlspecialchars($otpCode, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

    return <<<HTML
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f3f7f5;color:#23352e;padding:32px 16px;margin:0;">
  <main style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #dce8e1;border-radius:14px;padding:32px;">
    <p style="margin:0 0 24px;color:#16834b;font-weight:700;font-size:20px;">Bookify</p>
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;color:#183328;">Verify your email address</h1>
    <p style="line-height:1.7;margin:0 0 12px;">Hi {$safeName},</p>
    <p style="line-height:1.7;margin:0 0 18px;color:#52645b;">Enter this six-digit code in Bookify to confirm your email address. It expires in 30 minutes.</p>
    <p style="display:inline-block;margin:0 0 24px;padding:14px 20px;border-radius:8px;background:#eef7f1;color:#16834b;font-size:30px;font-weight:700;letter-spacing:0.24em;">{$safeCode}</p>
    <hr style="border:0;border-top:1px solid #e3ebe6;margin:24px 0;">
    <p style="font-size:12px;line-height:1.6;color:#78877f;margin:0;">If you did not create a Bookify account, you can ignore this email.</p>
  </main>
</body>
</html>
HTML;
}
