<?php
/**
 * Bookify — Auth Controller
 * Handles register, login, logout, verify-email, resend-verification, me
 */
declare(strict_types=1);

// Start output buffering to prevent accidental PHP output from breaking JSON responses
ob_start();

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../config/session.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/mail.php';
require_once __DIR__ . '/../utils/validation.php';
require_once __DIR__ . '/../utils/csrf.php';
require_once __DIR__ . '/../utils/audit.php';
require_once __DIR__ . '/../middleware/auth.php';

// Configure error logging and handlers to keep API output pure JSON
set_error_handler(function (int $errno, string $errstr, string $errfile, int $errline): bool {
    if (!(error_reporting() & $errno)) {
        return false;
    }
    error_log("PHP Error [{$errno}]: {$errstr} in {$errfile} on line {$errline}");
    return true; // Suppress PHP HTML error output
});

set_exception_handler(function (Throwable $e): void {
    error_log('Uncaught Exception: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    errorResponse('An internal server error occurred. Please try again later.', 500);
});

register_shutdown_function(function (): void {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        error_log("PHP Fatal Error [{$error['type']}]: {$error['message']} in {$error['file']} on line {$error['line']}");
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'message' => 'A fatal server error occurred.',
        ], JSON_UNESCAPED_UNICODE);
    }
});

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

try {
    match ($action) {
        'csrf'                => handleCsrf(),
        'register'            => handleRegister(),
        'login'               => handleLogin(),
        'logout'              => handleLogout(),
        'verify'              => handleVerifyEmail(),
        'resend-verification' => handleResendVerification(),
        'me'                  => handleMe(),
        'update-profile'      => handleUpdateProfile(),
        'change-password'     => handleChangePassword(),
        'create-staff'        => handleCreateStaff(),
        'list-staff'          => handleListStaff(),
        default               => errorResponse('Unknown action.', 404),
    };
} catch (PDOException $e) {
    error_log('Database query error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    errorResponse('A database error occurred. Please try again later.', 500);
} catch (Throwable $e) {
    error_log('Unhandled action error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    errorResponse('An unexpected server error occurred.', 500);
}

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
    $statusSelect = hasAccountStatusColumn($db) ? ', account_status' : '';
    $stmt = $db->prepare(
        'SELECT id, first_name, last_name, email, password_hash,
                role, is_verified, contact_number' . $statusSelect . '
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
    if (($user['account_status'] ?? 'active') !== 'active') {
        errorResponse('This account is suspended. Contact Bookify support for assistance.', 403);
    }

    // Regenerate session ID after successful login (session fixation protection)
    session_regenerate_id(true);

    $_SESSION['user_id']        = $user['id'];
    $_SESSION['email']          = $user['email'];
    $_SESSION['role']           = $user['role'];
    $_SESSION['is_verified']    = (bool) $user['is_verified'];
    $_SESSION['first_name']     = $user['first_name'];
    $_SESSION['last_name']      = $user['last_name'];
    $_SESSION['contact_number'] = $user['contact_number'];

    successResponse([
        'message' => 'Login successful.',
        'user'    => [
            'id'             => $user['id'],
            'first_name'     => $user['first_name'],
            'last_name'      => $user['last_name'],
            'email'          => $user['email'],
            'role'           => $user['role'],
            'is_verified'    => (bool) $user['is_verified'],
            'contact_number' => $user['contact_number'],
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

    $db   = getDB();
    $statusSelect = hasAccountStatusColumn($db) ? ', account_status' : '';
    $stmt = $db->prepare(
        'SELECT id, first_name, last_name, email, role, is_verified, contact_number, created_at' . $statusSelect . '
         FROM users WHERE id = ? LIMIT 1'
    );
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        $_SESSION = [];
        successResponse(['authenticated' => false, 'user' => null]);
    }
    if (($user['account_status'] ?? 'active') !== 'active') {
        $_SESSION = [];
        successResponse(['authenticated' => false, 'user' => null]);
    }

    $_SESSION['first_name']     = $user['first_name'];
    $_SESSION['last_name']      = $user['last_name'];
    $_SESSION['email']          = $user['email'];
    $_SESSION['role']           = $user['role'];
    $_SESSION['is_verified']    = (bool) $user['is_verified'];
    $_SESSION['contact_number'] = $user['contact_number'];

    successResponse([
        'authenticated' => true,
        'user' => [
            'id'             => (int) $user['id'],
            'first_name'     => $user['first_name'],
            'last_name'      => $user['last_name'],
            'email'          => $user['email'],
            'role'           => $user['role'],
            'is_verified'    => (bool) $user['is_verified'],
            'contact_number' => $user['contact_number'],
            'created_at'     => $user['created_at'],
        ],
    ]);
}

// ── Update Profile ────────────────────────────────────────────────────────────
function handleUpdateProfile(): never {
    requireMethod('POST');
    requireAuth();

    if (!validateCsrfToken()) {
        errorResponse('Invalid or missing CSRF token.', 403);
    }

    $body          = getJsonBody();
    $firstName     = sanitizeString($body['first_name'] ?? '');
    $lastName      = sanitizeString($body['last_name'] ?? '');
    $contactNumber = sanitizeString($body['contact_number'] ?? '');

    $errors = [];
    if ($firstName === '') $errors['first_name'] = 'First name is required.';
    if ($lastName === '')  $errors['last_name']  = 'Last name is required.';

    if ($contactNumber !== '' && !isValidPhoneNumber($contactNumber)) {
        $errors['contact_number'] = 'Enter a valid Philippine mobile number (e.g. 09XXXXXXXXX).';
    }

    if (!empty($errors)) {
        errorResponse('Please correct the highlighted fields.', 422, ['errors' => $errors]);
    }

    $db = getDB();
    requireActiveAccount($db);
    $stmt = $db->prepare('UPDATE users SET first_name = ?, last_name = ?, contact_number = ? WHERE id = ?');
    $stmt->execute([
        $firstName,
        $lastName,
        $contactNumber !== '' ? $contactNumber : null,
        $_SESSION['user_id'],
    ]);

    $_SESSION['first_name']     = $firstName;
    $_SESSION['last_name']      = $lastName;
    $_SESSION['contact_number'] = $contactNumber !== '' ? $contactNumber : null;

    successResponse([
        'message' => 'Profile updated successfully.',
        'user'    => [
            'id'             => (int) $_SESSION['user_id'],
            'first_name'     => $firstName,
            'last_name'      => $lastName,
            'email'          => $_SESSION['email'],
            'role'           => $_SESSION['role'],
            'is_verified'    => (bool) $_SESSION['is_verified'],
            'contact_number' => $contactNumber !== '' ? $contactNumber : null,
        ],
    ]);
}

// ── Change Password ───────────────────────────────────────────────────────────
function handleChangePassword(): never {
    requireMethod('POST');
    requireAuth();

    if (!validateCsrfToken()) {
        errorResponse('Invalid or missing CSRF token.', 403);
    }

    $body            = getJsonBody();
    $currentPassword = is_string($body['current_password'] ?? null) ? $body['current_password'] : '';
    $newPassword     = is_string($body['new_password'] ?? null) ? $body['new_password'] : '';
    $confirmPassword = is_string($body['confirm_password'] ?? null) ? $body['confirm_password'] : '';

    $errors = [];
    if ($currentPassword === '') {
        $errors['current_password'] = 'Current password is required.';
    }

    if ($newPassword === '') {
        $errors['new_password'] = 'New password is required.';
    } elseif (!isValidPassword($newPassword)) {
        $errors['new_password'] = 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.';
    }

    if ($confirmPassword === '') {
        $errors['confirm_password'] = 'Please confirm your new password.';
    } elseif ($newPassword !== $confirmPassword) {
        $errors['confirm_password'] = 'Passwords do not match.';
    }

    if (!empty($errors)) {
        errorResponse('Please correct the highlighted fields.', 422, ['errors' => $errors]);
    }

    $db   = getDB();
    requireActiveAccount($db);
    $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
        errorResponse('Current password is incorrect.', 422, [
            'errors' => ['current_password' => 'Current password is incorrect.'],
        ]);
    }

    $newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    $update  = $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $update->execute([$newHash, $_SESSION['user_id']]);

    successResponse(['message' => 'Password changed successfully.']);
}

// ── Create Staff Account ──────────────────────────────────────────────────────
function handleCreateStaff(): never {
    requireMethod('POST');

    requireAuth();
    $db = getDB();
    requireDatabaseRole($db, 'admin');
    requireAuditSchema($db);
    if (!validateCsrfToken()) {
        errorResponse('Invalid or missing CSRF token.', 403);
    }

    $body          = getJsonBody();
    $firstName     = sanitizeString($body['first_name'] ?? '');
    $lastName      = sanitizeString($body['last_name'] ?? '');
    $email         = sanitizeString($body['email'] ?? '');
    $password      = $body['password'] ?? '';
    $contactNumber = sanitizeString($body['contact_number'] ?? '');

    $errors = [];
    if ($firstName === '') $errors['first_name'] = 'First name is required.';
    if ($lastName === '')  $errors['last_name']  = 'Last name is required.';

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

    if ($contactNumber !== '' && !isValidPhoneNumber($contactNumber)) {
        $errors['contact_number'] = 'Enter a valid Philippine mobile number (e.g. 09XXXXXXXXX).';
    }

    if (!empty($errors)) {
        errorResponse('Please correct the highlighted fields.', 422, ['errors' => $errors]);
    }

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        errorResponse('An account with this email address already exists.', 409, [
            'errors' => ['email' => 'This email is already registered.'],
        ]);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $insert = $db->prepare(
        'INSERT INTO users (first_name, last_name, email, password_hash, contact_number, role, is_verified, created_at)
         VALUES (?, ?, ?, ?, ?, "staff", 1, NOW())'
    );
    $db->beginTransaction();
    try {
    $insert->execute([
        $firstName,
        $lastName,
        $email,
        $passwordHash,
        $contactNumber !== '' ? $contactNumber : null,
    ]);

    $userId = (int) $db->lastInsertId();
    recordAdminAudit($db, (int) $_SESSION['user_id'], 'staff.create', 'user', $userId);
    $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }

    successResponse([
        'message' => 'Staff account created successfully.',
        'user_id' => $userId,
    ], 201);
}

// ── List Staff Accounts ───────────────────────────────────────────────────────
function handleListStaff(): never {
    requireMethod('GET');

    requireAuth();
    $db = getDB();
    requireDatabaseRole($db, 'admin');
    $statusColumn = hasAccountStatusColumn($db) ? ', account_status' : '';
    $stmt = $db->query('SELECT id, first_name, last_name, email, role, is_verified, contact_number, created_at' . $statusColumn . ' FROM users WHERE role = "staff" ORDER BY id DESC');
    $staff = $stmt->fetchAll();

    successResponse(['staff' => $staff]);
}
