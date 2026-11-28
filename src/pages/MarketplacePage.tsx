import { type FC, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

type Book = {
  id: number;
  title: string;
  author: string;
  price: number;
  condition: 'New' | 'Like New' | 'Very Good' | 'Good' | 'Acceptable' | 'Pre-owned';
  format: 'Physical' | 'E-book';
  category: string;
  cover_url: string | null;
  description: string | null;
  seller_name: string | null;
  source: 'seller' | 'bookify';
  availability: string;
  images?: { id: number; media_type: 'back_cover' | 'additional' | 'interior_preview'; file_path: string; sort_order: number }[];
};

type Filters = { category: string; condition: string; format: string; minPrice: string; maxPrice: string };
type CatalogResponse = { success: boolean; books: Book[]; categories?: string[]; message?: string; total?: number };

const EMPTY_FILTERS: Filters = { category: '', condition: '', format: '', minPrice: '', maxPrice: '' };
const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const MarketplacePage: FC = () => {
  const { bookId } = useParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const query = new URLSearchParams({ page: String(page), per_page: '12', sort });
    if (search.trim()) query.set('q', search.trim());
    if (filters.category) query.set('category', filters.category);
    if (filters.condition) query.set('condition', filters.condition);
    if (filters.format) query.set('format', filters.format);
    if (filters.minPrice) query.set('min_price', filters.minPrice);
    if (filters.maxPrice) query.set('max_price', filters.maxPrice);
    return query.toString();
  }, [page, search, filters, sort]);

  useEffect(() => {
    const controller = new AbortController();
    const url = bookId
      ? `/backend/controllers/CatalogController.php?id=${encodeURIComponent(bookId)}`
      : `/backend/controllers/CatalogController.php?${params}`;
    fetch(url, { signal: controller.signal, credentials: 'include' })
      .then(async (response) => {
        const data = await response.json() as CatalogResponse & { book?: Book };
        if (!response.ok) throw new Error(data.message || 'The catalog could not be loaded.');
        if (bookId) setSelected(data.book ?? null);
        else { setBooks(data.books ?? []); setCategories(data.categories ?? []); }
        setError('');
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'The catalog could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [bookId, params]);

  useEffect(() => {
    if (!filterOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filterOpen]);

  const beginRequest = () => { setLoading(true); setError(''); };
  const clearFilters = () => {
    beginRequest();
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setSort('newest');
    setPage(1);
  };
  const openFilters = () => { setDraftFilters(filters); setFilterOpen(true); };
  const applyFilters = () => {
    beginRequest();
    setFilters(draftFilters);
    setPage(1);
    setFilterOpen(false);
  };
  const changeSearch = (value: string) => {
    beginRequest();
    setSearch(value);
    setPage(1);
  };
  const changeSort = (value: string) => {
    beginRequest();
    setSort(value);
    setPage(1);
  };

  return (
    <main className="marketplace">
      <div className="marketplace-inner">
        {bookId ? (
          <section className="book-detail">
            <Link to="/books" className="market-back">← Back to all books</Link>
            {loading ? <div className="market-message" role="status">Loading book details…</div> : error ? <div className="market-message market-error" role="alert">{error}</div> : selected ? (
              <div className="detail-card">
                <Cover book={selected} large />
                <div className="detail-copy">
                  <span className="market-eyebrow">{selected.category}</span>
                  <h1>{selected.title}</h1>
                  <p className="book-author">by {selected.author}</p>
                  <p className="detail-price">{money.format(selected.price)}</p>
                  <div className="book-tags"><span>{selected.condition}</span><span>{selected.format}</span><span>{selected.availability}</span></div>
                  {selected.description && <p className="detail-description">{selected.description}</p>}
                  {selected.images && selected.images.length > 0 && <div className="mt-5 flex gap-3 overflow-x-auto" aria-label="Additional book photos and previews">{selected.images.map((image) => <img key={image.id} src={image.file_path} alt={`${image.media_type.replaceAll('_', ' ')} for ${selected.title}`} className="h-24 w-20 shrink-0 rounded-lg border border-[var(--border)] object-cover" />)}</div>}
                  <p className="seller-credit">{selected.source === 'bookify' ? 'Sold by Bookify' : `Sold by ${selected.seller_name || 'Bookify seller'}`}</p>
                  <button className="market-button" disabled title="Cart and checkout are not available yet">Add to cart · unavailable</button>
                </div>
              </div>
            ) : <EmptyState filtered={false} />}
          </section>
        ) : (
          <>
            <header className="market-heading">
              <span className="market-eyebrow">THE BOOKIFY BOOKSHELF</span>
              <h1>Find your next <span className="gradient-text">favorite read.</span></h1>
              <p>Explore books from independent sellers and the Bookify store.</p>
            </header>
            <div className="market-search-wrap">
              <span aria-hidden="true">⌕</span>
              <input aria-label="Search books by title or author" placeholder="Search by title or author…" value={search} onChange={(event) => changeSearch(event.target.value)} />
            </div>
            <section className="market-results">
              <div className="results-toolbar">
                <div><span className="market-eyebrow">CATALOG</span><h2>Books for every kind of reader</h2></div>
                <div className="catalog-actions">
                  <button type="button" className="filter-trigger" onClick={openFilters} aria-haspopup="dialog" aria-expanded={filterOpen}>
                    <FilterIcon /> Filter{Object.values(filters).filter(Boolean).length > 0 && <span className="filter-count">{Object.values(filters).filter(Boolean).length}</span>}
                  </button>
                  <label className="sort-label">Sort by<select value={sort} onChange={(event) => changeSort(event.target.value)}><option value="newest">Newest listings</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label>
                </div>
              </div>
              {loading ? <div className="market-message" role="status">Loading books…</div> : error ? <div className="market-message market-error" role="alert"><span className="empty-icon">!</span><h3>Catalog unavailable</h3><p>{error}</p></div> : books.length === 0 ? <EmptyState filtered={Boolean(search || Object.values(filters).some(Boolean))} onClear={clearFilters} /> : <>
                <div className="book-grid">{books.map((book) => <Link to={`/books/${book.id}`} className="book-card" key={book.id}><Cover book={book} /><div className="book-info"><div className="book-tags"><span>{book.condition}</span><span>{book.format}</span></div><h3>{book.title}</h3><p className="book-author">{book.author}</p><div className="book-meta"><span>{book.category}</span><strong>{money.format(book.price)}</strong></div><small>{book.source === 'bookify' ? 'Bookify Store' : `Seller · ${book.seller_name || 'Bookify'}`}</small></div></Link>)}</div>
                <div className="pagination"><button disabled={page <= 1} onClick={() => { beginRequest(); setPage((value) => value - 1); }}>Previous</button><span>Page {page}</span><button disabled={books.length < 12} onClick={() => { beginRequest(); setPage((value) => value + 1); }}>Next</button></div>
              </>}
            </section>
            {filterOpen && <div className="filter-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterOpen(false); }}>
              <section className="filter-dialog" role="dialog" aria-modal="true" aria-labelledby="filter-dialog-title">
                <header className="filter-dialog-header"><div><span className="market-eyebrow">REFINE YOUR SEARCH</span><h2 id="filter-dialog-title">Filters</h2></div><button type="button" className="filter-close" onClick={() => setFilterOpen(false)} aria-label="Close filters">×</button></header>
                <div className="filter-dialog-body">
                  <label>Category<select value={draftFilters.category} onChange={(event) => setDraftFilters({ ...draftFilters, category: event.target.value })}><option value="">All categories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
 <label>Condition<select value={draftFilters.condition} onChange={(event) => setDraftFilters({ ...draftFilters, condition: event.target.value })}><option value="">Any condition</option><option>New</option><option>Like New</option><option>Very Good</option><option>Good</option><option>Acceptable</option><option>Pre-owned</option></select></label>
                  <label>Format<select value={draftFilters.format} onChange={(event) => setDraftFilters({ ...draftFilters, format: event.target.value })}><option value="">Any format</option><option>Physical</option><option>E-book</option></select></label>
                  <fieldset><legend>Price range (₱)</legend><div className="price-inputs"><input aria-label="Minimum price" type="number" min="0" placeholder="Min" value={draftFilters.minPrice} onChange={(event) => setDraftFilters({ ...draftFilters, minPrice: event.target.value })} /><input aria-label="Maximum price" type="number" min="0" placeholder="Max" value={draftFilters.maxPrice} onChange={(event) => setDraftFilters({ ...draftFilters, maxPrice: event.target.value })} /></div></fieldset>
                </div>
                <footer className="filter-dialog-footer"><button type="button" className="filter-clear" onClick={() => setDraftFilters(EMPTY_FILTERS)}>Clear filters</button><button type="button" className="market-button" onClick={applyFilters}>Apply filters</button></footer>
              </section>
            </div>}
          </>
        )}
      </div>
    </main>
  );
};

const FilterIcon: FC = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="2" fill="var(--surface)"/><circle cx="15" cy="12" r="2" fill="var(--surface)"/></svg>;

const Cover: FC<{ book: Book; large?: boolean }> = ({ book, large }) => {
  const [failed, setFailed] = useState(false);
  return <div className={`cover${large ? ' cover-large' : ''}`}>{book.cover_url && !failed ? <img src={book.cover_url} alt={`Cover of ${book.title}`} onError={() => setFailed(true)} /> : <div className="cover-empty" aria-label="No cover image available"><span>BOOKIFY</span><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 11h22a5 5 0 0 1 5 5v21H15a5 5 0 0 1-5-5V11Z"/><path d="M15 37V16a5 5 0 0 1 5-5"/></svg><small>Cover image<br />not available</small></div>}</div>;
};

const EmptyState: FC<{ filtered: boolean; onClear?: () => void }> = ({ filtered, onClear }) => (
  <div className="market-message empty-state"><div className="shelf-art" aria-hidden="true"><span /><span /><span /><i /></div><h3>{filtered ? 'No results found.' : 'Nothing here, sorry.'}</h3>{filtered && onClear && <button className="market-button" onClick={onClear}>Clear search and filters</button>}</div>
);

export default MarketplacePage;
