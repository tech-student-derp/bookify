import { type FC, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketplaceBookCover } from '../components/MarketplaceProductDetail';
import { getCart, removeCartItem, updateCartItem, type CartPayload } from '../services/cartApi';

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

const CartPage: FC = () => {
  const [cart, setCart] = useState<CartPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyItem, setBusyItem] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getCart().then((result) => {
      if (active) { setCart(result); setError(''); }
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'The cart could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const changeQuantity = async (itemId: number, quantity: number) => {
    setBusyItem(itemId);
    setError('');
    try { setCart(await updateCartItem(itemId, quantity)); }
    catch (err) { setError(err instanceof Error ? err.message : 'The cart item could not be updated.'); }
    finally { setBusyItem(null); }
  };

  const remove = async (itemId: number) => {
    setBusyItem(itemId);
    setError('');
    try { setCart(await removeCartItem(itemId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'The cart item could not be removed.'); }
    finally { setBusyItem(null); }
  };

  return <main className="marketplace cart-page"><div className="marketplace-inner">
    <header className="market-heading"><span className="market-eyebrow">YOUR BOOKSHELF</span><h1>Shopping cart</h1><p>Prices and availability are checked from current listings. Items do not reserve stock.</p></header>
    {error && <div className="market-message market-error" role="alert">{error}</div>}
    {loading ? <div className="market-message" role="status">Loading your cart...</div> : !cart || cart.items.length === 0 ? (
      <section className="cart-empty market-message"><h2>Your cart is empty</h2><p>Explore the catalog and add physical books you would like to buy.</p><Link className="market-button market-button-link" to="/books">Browse books</Link></section>
    ) : <div className="cart-layout">
      <section className="cart-items" aria-label="Cart items">
        {cart.items.map((item) => <article className={`cart-item${item.eligible ? '' : ' cart-item-unavailable'}`} key={item.id}>
          {item.title && item.eligible ? <Link to={`/books/${item.listing_id}`} aria-label={`View ${item.title}`}><MarketplaceBookCover book={{ title: item.title, cover_url: item.cover_url }} /></Link> : item.title ? <MarketplaceBookCover book={{ title: item.title, cover_url: item.cover_url }} /> : <div className="cart-removed-cover">Unavailable</div>}
          <div className="cart-item-copy">
            {item.title && item.eligible ? <Link className="cart-item-title" to={`/books/${item.listing_id}`}>{item.title}</Link> : <strong>{item.title || 'Listing no longer available'}</strong>}
            {item.author && <p className="book-author">by {item.author}</p>}
            <p className="seller-credit">Sold by {item.eligible && item.seller_id ? <Link className="seller-profile-link" to={`/sellers/${item.seller_id}`}>{item.seller_name || 'Seller store'}</Link> : (item.seller_name || 'Bookify')}</p>
            {item.reason && <p className="cart-item-warning" role="status">{item.reason}. Remove this item or change its quantity if available.</p>}
            {item.price !== null && <strong className="cart-item-price">{money.format(item.price)} each</strong>}
            <div className="cart-item-controls">
              <div className="cart-quantity" aria-label={`Quantity for ${item.title || 'unavailable listing'}`}>
                <button type="button" aria-label="Decrease quantity" disabled={busyItem === item.id || item.quantity <= 1} onClick={() => void changeQuantity(item.id, item.quantity - 1)}>−</button>
                <span>{item.quantity}</span>
                <button type="button" aria-label="Increase quantity" disabled={busyItem === item.id || !item.can_increase} onClick={() => void changeQuantity(item.id, item.quantity + 1)}>+</button>
              </div>
              <button type="button" className="cart-remove" disabled={busyItem === item.id} onClick={() => void remove(item.id)}>Remove</button>
            </div>
          </div>
          <strong className="cart-line-total">{item.subtotal === null ? '—' : money.format(item.subtotal)}</strong>
        </article>)}
      </section>
      <aside className="cart-summary"><h2>Summary</h2><div><span>Eligible items</span><strong>{cart.items.filter((item) => item.eligible).reduce((sum, item) => sum + item.quantity, 0)}</strong></div><div className="cart-grand-total"><span>Subtotal</span><strong>{money.format(cart.subtotal)}</strong></div>
        {cart.items.some((item) => !item.eligible) && <p className="cart-item-warning">Unavailable items are excluded from this subtotal.</p>}
        <p className="cart-summary-note">Checkout is not available yet. This cart does not reserve inventory.</p><button className="market-button" type="button" disabled title="Checkout is not available yet">Checkout not available yet</button>
        <Link className="cart-continue" to="/books">Continue browsing</Link>
      </aside>
    </div>}
  </div></main>;
};

export default CartPage;
