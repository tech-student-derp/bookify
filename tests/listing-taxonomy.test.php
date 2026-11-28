<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/utils/listing_taxonomy.php';

function expectTaxonomyResult(array $result, string $expectedValue, ?string $expectedError, string $label): void {
    if (($result['value'] ?? null) !== $expectedValue || ($result['error'] ?? null) !== $expectedError) {
        fwrite(STDERR, "FAIL: {$label}\n");
        exit(1);
    }
    echo "PASS: {$label}\n";
}

$categories = listingCategoryOptions();
$languages = listingLanguageOptions();
expectTaxonomyResult(normalizeListingTaxonomyValue('Fantasy', '0', $categories, true), 'Fantasy', null, 'accepts a listed category');
expectTaxonomyResult(normalizeListingTaxonomyValue('My existing genre', '1', $categories, true), 'My existing genre', null, 'preserves a custom category');
expectTaxonomyResult(normalizeListingTaxonomyValue('Regional language', '1', $languages, false), 'Regional language', null, 'accepts a custom language');
expectTaxonomyResult(normalizeListingTaxonomyValue('Legacy language', null, $languages, false), 'Legacy language', null, 'preserves a legacy language from older clients');
expectTaxonomyResult(normalizeListingTaxonomyValue('Not listed', '0', $categories, true), '', 'Choose a listed value or select Other.', 'rejects an unlisted value without Other');
expectTaxonomyResult(normalizeListingTaxonomyValue('', '0', $languages, false), '', null, 'allows an optional blank language');
expectTaxonomyResult(normalizeListingTaxonomyValue('', '1', $categories, true), '', 'This field is required.', 'requires custom category text on submission');
expectTaxonomyResult(normalizeListingTaxonomyValue(str_repeat('a', 101), '1', $categories, false), '', 'Use no more than 100 characters.', 'enforces the database field limit');
expectTaxonomyResult(normalizeListingTaxonomyValue(str_repeat('界', 100), '1', $categories, false), str_repeat('界', 100), null, 'allows 100 Unicode characters');
