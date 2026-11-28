import { type FC, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MarketplaceBookCover } from '../components/MarketplaceProductDetail';

type SellerBook = {
  id: number;
  title: string;
  author: string;
  category: string;
  format: string;
  condition: string;
  price: number;
  cover_url: string | null;
  seller_name: string;
};
type SellerResponse = { seller: { id: number; store_name: string; bio: string | null }; books: SellerBook[]; message?: string };
const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const PublicSellerPage: FC = () => {
  const { sellerId } = useParams();
  const [data, setData] = useState<SellerResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/backend/controllers/SellerStorefrontController.php?seller_id=${encodeURIComponent(sellerId ?? '')}`, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as SellerResponse;
        if (!response.ok) throw new Error(result.message || 'The seller profile could not be loaded.');
        setData(result);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'The seller profile could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sellerId]);

  return <main className="marketplace"><div className="marketplace-inner">
    <Link to="/books" className="market-back">← Back to all books</Link>
    {loading ? <div className="market-message" role="status">Loading seller profile...</div> : error ? <div className="market-message market-error" role="alert">{error}</div> : data ? <>
      <header className="public-seller-header"><span className="market-eyebrow">INDEPENDENT SELLER</span><h1>{data.seller.store_name || 'Seller store'}</h1>{data.seller.bio && <p>{data.seller.bio}</p>}</header>
      <section className="market-results"><div className="results-toolbar"><div><span className="market-eyebrow">AVAILABLE BOOKS</span><h2>Books from this store</h2></div></div>
        {data.books.length === 0 ? <div className="market-message">This seller has no publicly available books right now.</div> : <div className="book-grid">{data.books.map((book) => <Link to={`/books/${book.id}`} className="book-card" key={book.id}><MarketplaceBookCover book={book} /><div className="book-info"><div className="book-tags"><span>{book.condition}</span><span>{book.format}</span></div><h3>{book.title}</h3><p className="book-author">{book.author}</p><div className="book-meta"><span>{book.category}</span><strong>{money.format(book.price)}</strong></div><small>Sold by {book.seller_name}</small></div></Link>)}</div>}
      </section>
    </> : null}
  </div></main>;
};

export default PublicSellerPage;
