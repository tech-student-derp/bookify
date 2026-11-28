import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { appendListingTaxonomyFields, BOOK_CATEGORIES, BOOK_LANGUAGES, OTHER_TAXONOMY_VALUE, isCustomTaxonomyValue, taxonomySelectValue } from '../src/data/listingTaxonomy.ts';
import { buildSellerListingPreview } from '../src/utils/sellerListingPreview.ts';

const baseInput = {
  title: 'Unsaved preview title', author: 'A. Seller', publisher: 'Independent Press', description: 'Preview description',
  category: 'Filipino Magical Realism', category_is_custom: true, language: 'Cebuano', language_is_custom: false,
  isbn: '9781234567890', price: '250.00', condition: 'Very Good', format: 'Physical', stock_quantity: '4',
  cover_image: null, back_cover: null, additional_images: [], interior_previews: [], ebook_file: null, ebook_rights_confirmed: false,
};

test('taxonomy dropdowns preserve non-predefined legacy values as Other', () => {
  assert.ok(BOOK_CATEGORIES.includes('Fantasy'));
  assert.ok(BOOK_LANGUAGES.includes('Filipino'));
  assert.equal(isCustomTaxonomyValue('Legacy category', BOOK_CATEGORIES), true);
  assert.equal(taxonomySelectValue('Legacy category', true, BOOK_CATEGORIES), OTHER_TAXONOMY_VALUE);
  assert.equal(taxonomySelectValue('Fantasy', false, BOOK_CATEGORIES), 'Fantasy');
});

test('frontend dropdown options match backend validation options', () => {
  const output = execFileSync('php', ['-r', "require getcwd() . '/backend/utils/listing_taxonomy.php'; echo json_encode([listingCategoryOptions(), listingLanguageOptions()]);"], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
  });
  assert.deepEqual(JSON.parse(output), [[...BOOK_CATEGORIES], [...BOOK_LANGUAGES]]);
});

test('seller submission payload retains custom category and selected language', () => {
  const body = new FormData();
  appendListingTaxonomyFields(body, baseInput);
  assert.equal(body.get('category'), 'Filipino Magical Realism');
  assert.equal(body.get('category_is_custom'), '1');
  assert.equal(body.get('language'), 'Cebuano');
  assert.equal(body.get('language_is_custom'), '0');
});

test('preview is built from unsaved values and contains no private e-book path', () => {
  const book = buildSellerListingPreview(baseInput, null, 'blob:cover-preview', [
    { id: 'local-back-cover-0', media_type: 'back_cover', file_path: 'blob:back-preview' },
  ]);
  assert.equal(book.title, baseInput.title);
  assert.equal(book.category, baseInput.category);
  assert.equal(book.language, baseInput.language);
  assert.equal(book.stock_quantity, 4);
  assert.equal(book.cover_url, 'blob:cover-preview');
  assert.equal(book.images?.[0]?.file_path, 'blob:back-preview');
  assert.equal('listing_status' in book, false);
  assert.equal('ebook_file_path' in book, false);
});

test('preview replaces selected image groups and shows only an e-book format label', () => {
  const ebookInput = {
    ...baseInput,
    format: 'E-book',
    stock_quantity: '0',
    additional_images: [new File(['image'], 'new-photo.jpg', { type: 'image/jpeg' })],
    ebook_file: new File(['ebook'], 'sample.epub', { type: 'application/epub+zip' }),
  };
  const book = buildSellerListingPreview(ebookInput, {
    id: 12,
    ebook_file_format: 'PDF',
    media: [
      { id: 2, media_type: 'additional', file_path: '/permission-checked/old.jpg', sort_order: 0 },
      { id: 3, media_type: 'interior_preview', file_path: '/permission-checked/page.jpg', sort_order: 0 },
    ],
  }, null, [
    { id: 'local-additional-0', media_type: 'additional', file_path: 'blob:new-photo' },
  ]);
  assert.equal(book.ebook_file_format, 'EPUB');
  assert.equal(book.stock_quantity, null);
  assert.deepEqual(book.images?.map((image) => image.file_path), ['/permission-checked/page.jpg', 'blob:new-photo']);
  assert.equal('ebook_file_path' in book, false);
});
