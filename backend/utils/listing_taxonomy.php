<?php
declare(strict_types=1);

function listingCategoryOptions(): array {
    return [
        'Fiction', 'Fantasy', 'Science Fiction', 'Mystery & Thriller', 'Romance', 'Horror',
        'Contemporary Fiction', 'Historical Fiction', 'Literary Fiction', 'Poetry', 'Short Stories',
        'Graphic Novels & Comics', 'Children’s Books', 'Young Adult', 'Biography & Memoir',
        'Business & Economics', 'History', 'Self-Help & Personal Development', 'Science & Nature',
        'Technology', 'Education & Textbooks', 'Religion & Spirituality', 'Philosophy & Social Sciences',
        'Arts & Photography', 'Travel', 'Cooking & Food', 'Health & Wellness', 'Filipino Literature',
    ];
}

function listingLanguageOptions(): array {
    return [
        'Filipino', 'English', 'Cebuano', 'Hiligaynon', 'Ilocano', 'Waray', 'Bikol', 'Kapampangan',
        'Pangasinan', 'Mandarin Chinese', 'Japanese', 'Korean', 'Spanish', 'French', 'German', 'Arabic',
        'Hindi', 'Indonesian', 'Thai', 'Vietnamese', 'Portuguese', 'Italian', 'Russian',
    ];
}

/** Normalize and validate a category/language while retaining valid custom and legacy values. */
function normalizeListingTaxonomyValue(mixed $rawValue, mixed $rawIsCustom, array $options, bool $required): array {
    if (!is_string($rawValue)) return ['value' => '', 'error' => 'Enter a valid value.'];

    $value = trim(strip_tags($rawValue));
    $characters = [];
    $length = preg_match_all('/./us', $value, $characters);
    if ($length === false) return ['value' => '', 'error' => 'Enter valid text.'];
    if ($length > 100) return ['value' => '', 'error' => 'Use no more than 100 characters.'];
    if (preg_match('/[\x00-\x1F\x7F]/', $value) === 1) return ['value' => '', 'error' => 'Control characters are not allowed.'];

    if ($rawIsCustom === null) {
        // Older clients sent only the stored string. Keep their existing custom values readable and editable.
        $isCustom = $value !== '' && !in_array($value, $options, true);
    } elseif (in_array($rawIsCustom, ['1', 1, true], true)) {
        $isCustom = true;
    } elseif (in_array($rawIsCustom, ['0', 0, false], true)) {
        $isCustom = false;
    } else {
        return ['value' => '', 'error' => 'Choose a listed value or select Other.'];
    }

    if (!$isCustom && $value !== '' && !in_array($value, $options, true)) {
        return ['value' => '', 'error' => 'Choose a listed value or select Other.'];
    }
    if ($required && $value === '') return ['value' => '', 'error' => 'This field is required.'];

    return ['value' => $value, 'error' => null];
}
