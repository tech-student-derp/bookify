import type { ListingInput, ListingMedia, SellerListing } from '../services/sellerListingApi';
import type { MarketplaceProduct, MarketplaceProductImage } from '../components/MarketplaceProductDetail';

type ExistingListingPreview = Pick<SellerListing, 'id' | 'ebook_file_format' | 'media'>;

export function buildSellerListingPreview(
  input: ListingInput,
  listing: ExistingListingPreview | null,
  coverUrl: string | null,
  localMedia: MarketplaceProductImage[],
): MarketplaceProduct {
  const replacedGroups = new Set<string>();
  if (input.back_cover) replacedGroups.add('back_cover');
  if (input.additional_images?.length) replacedGroups.add('additional');
  if (input.interior_previews?.length) replacedGroups.add('interior_preview');

  const existingMedia: MarketplaceProductImage[] = (listing?.media ?? [])
    .filter((image: ListingMedia) => !replacedGroups.has(image.media_type))
    .map((image) => ({ ...image }));
  const selectedEbookExtension = input.ebook_file?.name.split('.').pop()?.toUpperCase();
  const ebookFormat = selectedEbookExtension === 'PDF' || selectedEbookExtension === 'EPUB'
    ? selectedEbookExtension
    : listing?.ebook_file_format ?? null;

  return {
    id: listing?.id ?? 'seller-preview',
    title: input.title,
    author: input.author,
    publisher: input.publisher || null,
    category: input.category,
    language: input.language || null,
    isbn: input.isbn || null,
    description: input.description || null,
    cover_url: coverUrl,
    price: input.price,
    condition: input.format === 'Physical' ? input.condition : 'New',
    format: input.format,
    stock_quantity: input.format === 'Physical' ? Number(input.stock_quantity) || 0 : null,
    ebook_file_format: input.format === 'E-book' ? ebookFormat : null,
    seller_name: 'Your store',
    source: 'seller',
    availability: 'Seller preview',
    images: [...existingMedia, ...localMedia],
  };
}
