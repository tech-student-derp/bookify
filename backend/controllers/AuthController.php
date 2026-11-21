<?php
/**
 * Bookify — Auth Controller
 * Handles register, login, logout, verify-email, resend-verification, me
 */
declare(strict_types=1);

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/mail.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/validation.php';
require_once __DIR__ . '/../utils/csrf.php';
require_once __DIR__ . '/../middleware/auth.php';

// ── CORS ──────────────────────────────────────────────────────────────────────
$allowedOrigin = $_ENV['APP_URL'] ?? 'http://localhost:5173';
header("Access-Control-Allow-Origin: {$allowedOrigin}");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$action = $_GET['action'] ?? '';

match ($action) {
    'csrf'               => handleCsrf(),
    'register'           => handleRegister(),
    'login'              => handleLogin(),
    'logout'             => handleLogout(),
    'verify'             => handleVerifyEmail(),
    'resend-verification'=> handleResendVerification(),
    'me'                 => handleMe(),
    default              => errorResponse('Unknown action.', 404),
};

// ── Handlers ──────────────────────────────────────────────────────────────────

function handleCsrf(): never {
    requireMethod('GET');
    successResponse(['csrf_token' => generateCsrfToken()]);
}

// ── Register ──────────────────────────────────────────────────────────────────
function handleRegister(): never {
    requireMethod('POST');

    if (!validateCsrfToken()) {
        errorResponse('Invalid or missing CSRF token.', 403);
    }

    $body = getJsonBody();

    $firstName     = sanitizeString($body['first_name']     ?? '');
    $lastName      = sanitizeString($body['last_name']      ?? '');
    $email         = sanitizeString($body['email']          ?? '');
    $password      = $body['password']         ?? '';
    $confirmPass   = $body['confirm_password'] ?? '';
    $contactNumber = sanitizeString($body['contact_number'] ?? '');

    // ── Validate fields ───────────────────────────────────────────────────
    $errors = [];

    if ($firstName === '') $errors['first_name'] = 'First name is required.';
    if ($lastName  === '') $errors['last_name']  = 'Last name is required.';

    if ($email === '') {
        $errors['email'] = 'Email address is required.';
    } elseif (!isValidEmail($email)) {
        $errors['email'] = 'Enter a valid email address.';
    }

    if ($password === '') {
        $errors['password'] = 'Password is required.';
    } elseif (!isValidPassword($password)) {
        $errors['password'] = 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';
    }

    if ($confirmPass === '') {
        $errors['confirm_password'] = 'Please confirm your password.';
    } elseif ($password !== $confirmPass) {
        $errors['confirm_password'] = 'Passwords do not match.';
    }

    if ($contactNumber !== '' && !isValidPhoneNumber($contactNumber)) {
        $errors['contact_number'] = 'Enter a valid Philippine mobile number (e.g. 09XXXXXXXXX).';
    }

    if (!empty($errors)) {
        errorResponse('Please correct the highlighted fields.', 422, ['errors' => $errors]);
    }

    // ── Duplicate email check ─────────────────────────────────────────────
    $db   = getDB();
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);

    if ($stmt->fetch()) {
        errorResponse('An account with this email address already exists.', 409, [
            'errors' => ['email' => 'This email is already registered.'],
        ]);
    }

    // ── Create account ────────────────────────────────────────────────────
    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    // Role is ALWAYS 'customer' — never trusted from the client.
    $role = 'customer';

    $token          = bin2hex(random_bytes(32));
    $tokenHash      = hash('sha256', $token);
    $tokenExpiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

    $stmt = $db->prepare(
        'INSERT INTO users
            (first_name, last_name, email, password_hash, contact_number, role,
             is_verified, verification_token, verification_token_expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NOW())'
    );
    $stmt->execute([
        $firstName,
        $lastName,
        $email,
        $passwordHash,
        $contactNumber !== '' ? $contactNumber : null,
        $role,
        $tokenHash,
        $tokenExpiresAt,
    ]);

    $userId = (int) $db->lastInsertId();

    // ── Send verification email ───────────────────────────────────────────
    $appUrl          = rtrim($_ENV['APP_URL'] ?? 'http://localhost:5173', '/');
    $verificationUrl = "{$appUrl}/verify-email?token={$token}&email=" . urlencode($email);

    sendVerificationEmail($email, "{$firstName} {$lastName}", $verificationUrl);

    successResponse([
        'message' => 'Registration successful. Please check your email to verify your account.',
        'user_id' => $userId,
    ], 201);
}

// ── Login ─────────────────────────────────────────────────────────────────────
function handleLogin(): never {
    requireMethod('POST');

    if (!validateCsrfToken()) {
        errorResponse('Invalid or missing CSRF token.', 403);
    }

    $body     = getJsonBody();
    $email    = sanitizeString($body['email']    ?? '');
    $password = $body['password'] ?? '';

    if ($email === '' || $password === '') {
        errorResponse('Email and password are required.', 422);
    }

    if (!isValidEmail($email)) {
        errorResponse('Invalid credentials.', 401);
    }

    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT id, first_name, last_name, email, password_hash,
                role, is_verified, contact_number
         FROM users WHERE email = ? LIMIT 1'
    );
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Constant-time comparison even on user-not-found
    $dummyHash = '$2y$12$invalidhashusedfortimingprotection000000000000000000000';
    $hashToVerify = $user ? $user['password_hash'] : $dummyHash;

    if (!$user || !password_verify($password, $hashToVerify)) {
        errorResponse('Invalid email address or password.', 401);
    }

    // Regenerate session ID after successful login (session fixation protection)
    session_regenerate_id(true);

    $_SESSION['user_id']     = $user['id'];
    $_SESSION['email']       = $user['email'];
    $_SESSION['role']        = $user['role'];
    $_SESSION['is_verified'] = (bool) $user['is_verified'];
    $_SESSION['first_name']  = $user['first_name'];
    $_SESSION['last_name']   = $user['last_name'];

    successResponse([
        'message' => 'Login successful.',
        'user'    => [
            'id'          => $user['id'],
            'first_name'  => $user['first_name'],
            'last_name'   => $user['last_name'],
            'email'       => $user['email'],
            'role'        => $user['role'],
            'is_verified' => (bool) $user['is_verified'],
        ],
    ]);
}

// ── Logout ────────────────────────────────────────────────────────────────────
function handleLogout(): never {
    requireMethod('POST');

    // Destroy everything in the session
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            [
                'expires'  => time() - 42000,
                'path'     => $params['path'],
                'domain'   => $params['domain'],
                'secure'   => $params['secure'],
                'httponly' => $params['httponly'],
                'samesite' => $params['samesite'],
            ]
        );
    }

    session_destroy();
    successResponse(['message' => 'You have been logged out.']);
}

// ── Verify email ──────────────────────────────────────────────────────────────
function handleVerifyEmail(): never {
    requireMethod('GET');

    $token = sanitizeString($_GET['token'] ?? '');
    $email = sanitizeString($_GET['email'] ?? '');

    if ($token === '' || $email === '') {
        errorResponse('Invalid verification link.', 400);
    }

    $tokenHash = hash('sha256', $token);

    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT id, is_verified, verification_token_expires_at
         FROM users
         WHERE email = ? AND verification_token = ? LIMIT 1'
    );
    $stmt->execute([$email, $tokenHash]);
    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Invalid verification link.', 400);
    }

    if ((bool) $user['is_verified']) {
        successResponse(['message' => 'Your email is already verified. You can log in.']);
    }

    if (strtotime($user['verification_token_expires_at']) < time()) {
        errorResponse('This verification link has expired. Please request a new one.', 410);
    }

    // Mark verified, clear token
    $stmt = $db->prepare(
        'UPDATE users
         SET is_verified = 1, verification_token = NULL,
             verification_token_expires_at = NULL, verified_at = NOW()
         WHERE id = ?'
    );
    $stmt->execute([$user['id']]);

    successResponse(['message' => 'Email verified successfully. You can now log in.']);
}

// ── Resend verification ───────────────────────────────────────────────────────
function handleResendVerification(): never {
    requireMethod('POST');

    if (!validateCsrfToken()) {
        errorResponse('Invalid or missing CSRF token.', 403);
    }

    $body  = getJsonBody();
    $email = sanitizeString($body['email'] ?? '');

    if ($email === '' || !isValidEmail($email)) {
        errorResponse('Enter a valid email address.', 422);
    }

    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT id, first_name, last_name, is_verified FROM users WHERE email = ? LIMIT 1'
    );
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Don't reveal whether the account exists
    if (!$user || (bool) $user['is_verified']) {
        successResponse(['message' => 'If this email is registered and unverified, a new verification link has been sent.']);
    }

    // Rate-limit: check resend_requested_at
    $rateStmt = $db->prepare(
        'SELECT resend_requested_at FROM users WHERE id = ? LIMIT 1'
    );
    $rateStmt->execute([$user['id']]);
    $rateRow = $rateStmt->fetch();
    if ($rateRow && $rateRow['resend_requested_at'] !== null) {
        $lastRequest = strtotime($rateRow['resend_requested_at']);
        if (time() - $lastRequest < 60) {
            errorResponse('Please wait before requesting another verification email.', 429);
        }
    }

    $token          = bin2hex(random_bytes(32));
    $tokenHash      = hash('sha256', $token);
    $tokenExpiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

    $stmt = $db->prepare(
        'UPDATE users
         SET verification_token = ?, verification_token_expires_at = ?,
             resend_requested_at = NOW()
         WHERE id = ?'
    );
    $stmt->execute([$tokenHash, $tokenExpiresAt, $user['id']]);

    $appUrl          = rtrim($_ENV['APP_URL'] ?? 'http://localhost:5173', '/');
    $verificationUrl = "{$appUrl}/verify-email?token={$token}&email=" . urlencode($email);
    sendVerificationEmail($email, "{$user['first_name']} {$user['last_name']}", $verificationUrl);

    successResponse(['message' => 'If this email is registered and unverified, a new verification link has been sent.']);
}

// ── Me (current session) ──────────────────────────────────────────────────────
function handleMe(): never {
    requireMethod('GET');

    if (empty($_SESSION['user_id'])) {
        successResponse(['authenticated' => false, 'user' => null]);
    }

    successResponse([
        'authenticated' => true,
        'user' => [
            'id'          => $_SESSION['user_id'],
            'first_name'  => $_SESSION['first_name'],
            'last_name'   => $_SESSION['last_name'],
            'email'       => $_SESSION['email'],
            'role'        => $_SESSION['role'],
            'is_verified' => $_SESSION['is_verified'],
        ],
    ]);
}
