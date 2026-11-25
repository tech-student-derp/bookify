<?php
declare(strict_types=1);

require_once __DIR__ . '/../../backend/utils/validation.php';
require_once __DIR__ . '/../../backend/utils/seller_id_documents.php';

function expectSellerVerification(bool $condition, string $message): void {
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    fwrite(STDOUT, "PASS: {$message}\n");
}

function expectSellerIdInvalid(callable $check, string $message): void {
    try {
        $check();
    } catch (SellerIdValidationException) {
        expectSellerVerification(true, $message);
        return;
    }
    expectSellerVerification(false, $message);
}

expectSellerVerification(validateSellerApplicationPhone('09171234567'), 'Philippine mobile number in 09 format is accepted');
expectSellerVerification(validateSellerApplicationPhone('+639171234567'), 'Philippine mobile number in +63 format is accepted');
expectSellerVerification(!validateSellerApplicationPhone(''), 'empty phone number is rejected');
expectSellerVerification(!validateSellerApplicationPhone('0212345678'), 'non-mobile phone number is rejected');

$temporaryRoot = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'bookify-seller-id-test-' . bin2hex(random_bytes(8));
if (!mkdir($temporaryRoot, 0700)) throw new RuntimeException('Could not create temporary test directory.');
$pngPath = $temporaryRoot . DIRECTORY_SEPARATOR . 'sample.png';
$jpgPath = $temporaryRoot . DIRECTORY_SEPARATOR . 'sample.jpg';
$invalidPath = $temporaryRoot . DIRECTORY_SEPARATOR . 'invalid.png';
$oversizedPath = $temporaryRoot . DIRECTORY_SEPARATOR . 'oversized.png';

try {
    // Synthetic 1x1 sample images only; no real identification document is used.
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', true);
    $jpg = base64_decode('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAAB//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EAf/2Q==', true);
    if (!is_string($png) || !is_string($jpg)) throw new RuntimeException('Could not decode synthetic image fixtures.');
    file_put_contents($pngPath, $png);
    file_put_contents($jpgPath, $jpg);
    file_put_contents($invalidPath, 'not an image');
    file_put_contents($oversizedPath, str_repeat('x', SELLER_ID_MAX_BYTES + 1));

    expectSellerVerification(inspectSellerIdDocument($pngPath, 'sample.PNG')['mime'] === 'image/png', 'valid PNG image is accepted');
    expectSellerVerification(inspectSellerIdDocument($jpgPath, 'sample.jpg')['mime'] === 'image/jpeg', 'valid JPG image is accepted');
    expectSellerVerification(inspectSellerIdDocument($jpgPath, 'sample.jpeg')['mime'] === 'image/jpeg', 'valid JPEG image with jpeg extension is accepted');
    expectSellerIdInvalid(static fn () => validateSellerIdUpload(null), 'missing ID upload is rejected');
    expectSellerIdInvalid(static fn () => inspectSellerIdDocument($pngPath, 'sample.gif'), 'unsupported image extension is rejected');
    expectSellerIdInvalid(static fn () => inspectSellerIdDocument($pngPath, 'sample.jpg'), 'extension and actual MIME mismatch is rejected');
    expectSellerIdInvalid(static fn () => inspectSellerIdDocument($invalidPath, 'invalid.png'), 'invalid image data is rejected');
    expectSellerIdInvalid(static fn () => inspectSellerIdDocument($oversizedPath, 'oversized.png'), 'oversized image is rejected');

    $documentRoot = $temporaryRoot . DIRECTORY_SEPARATOR . 'public';
    mkdir($documentRoot, 0700);
    $_SERVER['DOCUMENT_ROOT'] = $documentRoot;
    $_ENV['BOOKIFY_PRIVATE_STORAGE_PATH'] = $documentRoot . DIRECTORY_SEPARATOR . 'ids';
    try {
        sellerIdStorageDirectory();
        expectSellerVerification(false, 'storage path inside the document root is rejected');
    } catch (RuntimeException) {
        expectSellerVerification(true, 'storage path inside the document root is rejected');
    }
    $_ENV['BOOKIFY_PRIVATE_STORAGE_PATH'] = $temporaryRoot . DIRECTORY_SEPARATOR . 'private';
    expectSellerVerification(sellerIdStorageDirectory() === realpath($_ENV['BOOKIFY_PRIVATE_STORAGE_PATH']), 'private storage path outside the document root is accepted');
} finally {
    unset($_ENV['BOOKIFY_PRIVATE_STORAGE_PATH'], $_SERVER['DOCUMENT_ROOT']);
    $removeTree = static function (string $path) use (&$removeTree): void {
        if (is_dir($path)) {
            foreach (scandir($path) ?: [] as $entry) {
                if ($entry !== '.' && $entry !== '..') $removeTree($path . DIRECTORY_SEPARATOR . $entry);
            }
            rmdir($path);
        } elseif (is_file($path)) {
            unlink($path);
        }
    };
    $removeTree($temporaryRoot);
}
