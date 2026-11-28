export const OTHER_TAXONOMY_VALUE = '__other__';

export const BOOK_CATEGORIES = [
  'Fiction',
  'Fantasy',
  'Science Fiction',
  'Mystery & Thriller',
  'Romance',
  'Horror',
  'Contemporary Fiction',
  'Historical Fiction',
  'Literary Fiction',
  'Poetry',
  'Short Stories',
  'Graphic Novels & Comics',
  'Children’s Books',
  'Young Adult',
  'Biography & Memoir',
  'Business & Economics',
  'History',
  'Self-Help & Personal Development',
  'Science & Nature',
  'Technology',
  'Education & Textbooks',
  'Religion & Spirituality',
  'Philosophy & Social Sciences',
  'Arts & Photography',
  'Travel',
  'Cooking & Food',
  'Health & Wellness',
  'Filipino Literature',
] as const;

export const BOOK_LANGUAGES = [
  'Filipino',
  'English',
  'Cebuano',
  'Hiligaynon',
  'Ilocano',
  'Waray',
  'Bikol',
  'Kapampangan',
  'Pangasinan',
  'Mandarin Chinese',
  'Japanese',
  'Korean',
  'Spanish',
  'French',
  'German',
  'Arabic',
  'Hindi',
  'Indonesian',
  'Thai',
  'Vietnamese',
  'Portuguese',
  'Italian',
  'Russian',
] as const;

export function taxonomySelectValue(value: string, isCustom: boolean, options: readonly string[]): string {
  return isCustom || (value !== '' && !options.includes(value)) ? OTHER_TAXONOMY_VALUE : value;
}

export function isCustomTaxonomyValue(value: string, options: readonly string[]): boolean {
  return value !== '' && !options.includes(value);
}

export function appendListingTaxonomyFields(
  form: FormData,
  fields: { category: string; category_is_custom: boolean; language: string; language_is_custom: boolean },
): void {
  form.append('category', fields.category.trim());
  form.append('category_is_custom', fields.category_is_custom ? '1' : '0');
  form.append('language', fields.language.trim());
  form.append('language_is_custom', fields.language_is_custom ? '1' : '0');
}
