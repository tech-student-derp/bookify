import { type FC, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartOverlay } from '../contexts/CartOverlayContext';

export type MarketplaceProductImage = {
  id: number | string;
  media_type: string;
  file_path: string;
  sort_order?: number;
};

export type MarketplaceProduct = {
  id: number | string;
  title: string;
  author: string;
  publisher?: string | null;
  category: string;
  language?: string | null;
  isbn?: string | null;
  description?: string | null;
  cover_url?: string | null;
  price: number | string;
  condition: string;
  format: string;
  stock_quantity?: number | null;
  ebook_file_format?: string | null;
  seller_name?: string | null;
  seller_id?: number | null;
  can_add_to_cart?: boolean;
  source?: 'seller' | 'bookify';
  availability?: string;
  images?: MarketplaceProductImage[];
};

export const MarketplaceBookCover: FC<{ book: Pick<MarketplaceProduct, 'title' | 'cover_url'>; large?: boolean }> = ({ book, large }) => {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showImage = Boolean(book.cover_url && failedSource !== book.cover_url);
  return <div className={`cover${large ? ' cover-large' : ''}`}>
    {showImage ? <img src={book.cover_url ?? undefined} alt={`Cover of ${book.title}`} onError={() => setFailedSource(book.cover_url ?? '')} /> : (
      <div className="cover-empty" aria-label="No cover image available">
        <span>BOOKIFY</span>
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 11h22a5 5 0 0 1 5 5v21H15a5 5 0 0 1-5-5V11Z" /><path d="M15 37V16a5 5 0 0 1 5-5" /></svg>
        <small>Cover image<br />not available</small>
      </div>
    )}
  </div>;
};

type MarketplaceProductDetailProps = {
  book: MarketplaceProduct;
  sellerPreview?: boolean;
  authenticated?: boolean;
  userRole?: string;
  addingToCart?: boolean;
  cartMessage?: string;
  onAddToCart?: () => void;
};

export const MarketplaceProductDetail: FC<MarketplaceProductDetailProps> = ({
  book, sellerPreview = false, authenticated = false, userRole, addingToCart = false, cartMessage, onAddToCart,
}) => {
  const { openCart } = useCartOverlay();
  return (
  <div className="detail-card">
    <MarketplaceBookCover book={book} large />
    <div className="detail-copy">
      {sellerPreview && <span className="market-eyebrow">Seller preview · not published</span>}
      <span className="market-eyebrow">{book.category || 'Category not set'}</span>
      <h1>{book.title || 'Untitled book'}</h1>
      <p className="book-author">by {book.author || 'Author not set'}</p>
      <p className="detail-price">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(book.price) || 0)}</p>
      <div className="book-tags">
        {book.condition && <span>{book.condition}</span>}
        <span>{book.format}</span>
        {!sellerPreview && book.availability && <span>{book.availability}</span>}
        {sellerPreview && book.format === 'Physical' && book.stock_quantity !== undefined && book.stock_quantity !== null && <span>{book.stock_quantity} in stock</span>}
        {book.format === 'E-book' && book.ebook_file_format && <span>Digital format · {book.ebook_file_format}</span>}
      </div>
      <dl className="mt-5 grid gap-x-5 gap-y-2 text-xs text-[var(--text-muted)] sm:grid-cols-2">
        {book.publisher && <div><dt className="font-semibold">Publisher</dt><dd className="mt-0.5">{book.publisher}</dd></div>}
        {book.language && <div><dt className="font-semibold">Language</dt><dd className="mt-0.5">{book.language}</dd></div>}
        {book.isbn && <div><dt className="font-semibold">ISBN</dt><dd className="mt-0.5">{book.isbn}</dd></div>}
      </dl>
      {book.description && <p className="detail-description">{book.description}</p>}
      {book.images && book.images.length > 0 && (
        <div className="mt-5 flex gap-3 overflow-x-auto" aria-label="Additional book photos and previews">
          {book.images.map((image) => <img key={image.id} src={image.file_path} alt={`${image.media_type.replaceAll('_', ' ')} for ${book.title}`} className="h-24 w-20 shrink-0 rounded-lg border border-[var(--border)] object-cover" />)}
        </div>
      )}
      {sellerPreview ? <p className="seller-credit">Preview only. Buyers cannot see or purchase this listing until staff approval.</p> : <>
        <p className="seller-credit">{book.source === 'bookify' ? 'Sold by Bookify' : <>Sold by {book.seller_id ? <Link className="seller-profile-link" to={`/sellers/${book.seller_id}`}>{book.seller_name || 'Seller store'}</Link> : (book.seller_name || 'Seller')}</>}</p>
        {book.format === 'E-book' ? <button className="market-button" disabled title="Digital books are not supported in the cart yet">E-books are not available in the cart yet</button>
          : !book.can_add_to_cart ? <button className="market-button" disabled title="This listing is currently unavailable">Currently unavailable</button>
            : !authenticated ? <Link className="market-button market-button-link" to="/login">Sign in to add to cart</Link>
              : userRole !== 'customer' ? <button className="market-button" disabled title="Only customer accounts can use the shopping cart">Customer account required</button>
                : <button className="market-button" onClick={onAddToCart} disabled={addingToCart}>{addingToCart ? 'Adding...' : 'Add to cart'}</button>}
        {cartMessage && <p className="cart-inline-message" role="status">{cartMessage}</p>}
        {authenticated && userRole === 'customer' && <button className="view-cart-link" type="button" onClick={openCart}>View cart</button>}
      </>}
    </div>
  </div>
  );
};
