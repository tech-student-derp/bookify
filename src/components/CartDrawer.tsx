import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CART_UPDATED_EVENT, getCart, removeCartItem, updateCartItem, type CartPayload } from '../services/cartApi';
import { MarketplaceBookCover } from './MarketplaceProductDetail';

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer: FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { user, authenticated, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyItem, setBusyItem] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimerRef.current = setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = priorOverflow;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      previousFocus?.focus();
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen || authLoading || !authenticated || user?.role !== 'customer') return;
    let active = true;
    getCart().then((result) => {
      if (!active) return;
      setCart(result);
      window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: result }));
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'The cart could not be loaded.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [isOpen, authLoading, authenticated, user?.id, user?.role]);

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

  if (!isOpen) return null;

  return (
    <div className={`cart-drawer-layer${closing ? ' is-closing' : ''}`}>
      <button className="cart-drawer-backdrop" type="button" aria-label="Close shopping cart" onClick={close} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" ref={dialogRef}>
        <header className="cart-drawer-header">
          <div>
            <span className="market-eyebrow">YOUR BOOKSHELF</span>
            <h2 id="cart-drawer-title">Shopping cart{user?.role === 'customer' && cart ? ` (${cart.item_count})` : ''}</h2>
          </div>
          <button ref={closeButtonRef} className="cart-drawer-close" type="button" aria-label="Close cart" onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="cart-drawer-body">
          {authLoading ? <p className="cart-drawer-state" role="status">Checking your account…</p>
            : !authenticated || !user ? (
              <section className="cart-drawer-empty">
                <CartIcon />
                <h3>Sign in to see your cart</h3>
                <p>Your cart is saved to your customer account.</p>
                <Link className="market-button market-button-link" to="/login" onClick={close}>Sign in</Link>
                <Link className="cart-drawer-register" to="/register" onClick={close}>Create an account</Link>
              </section>
            ) : user.role !== 'customer' ? (
              <section className="cart-drawer-empty">
                <CartIcon />
                <h3>Customer account required</h3>
                <p>The shopping cart is available to customer accounts.</p>
                <Link className="market-button market-button-link" to="/books" onClick={close}>Browse books</Link>
              </section>
            ) : error && !cart ? <div className="market-message market-error" role="alert">{error}</div>
              : loading ? <p className="cart-drawer-state" role="status">Loading your cart…</p>
                : !cart || cart.items.length === 0 ? (
                  <section className="cart-drawer-empty">
                    <CartIcon />
                    <h3>Your cart is empty</h3>
                    <p>Find your next read and keep it here while you browse.</p>
                    <Link className="market-button market-button-link" to="/books" onClick={close}>Browse books</Link>
                  </section>
                ) : (
                  <>
                    {error && <div className="market-message market-error" role="alert">{error}</div>}
                    <section className="cart-drawer-items" aria-label="Cart items">
                      {cart.items.map((item) => (
                        <article className={`cart-drawer-item${item.eligible ? '' : ' is-unavailable'}`} key={item.id}>
                          {item.title && item.eligible
                            ? <Link to={`/books/${item.listing_id}`} onClick={close} aria-label={`View ${item.title}`}><MarketplaceBookCover book={{ title: item.title, cover_url: item.cover_url }} /></Link>
                            : item.title ? <MarketplaceBookCover book={{ title: item.title, cover_url: item.cover_url }} />
                              : <div className="cart-removed-cover">Unavailable</div>}
                          <div className="cart-drawer-item-copy">
                            {item.title && item.eligible
                              ? <Link className="cart-item-title" to={`/books/${item.listing_id}`} onClick={close}>{item.title}</Link>
                              : <strong>{item.title || 'Listing no longer available'}</strong>}
                            {item.author && <p className="book-author">by {item.author}</p>}
                            <p className="seller-credit">Sold by {item.eligible && item.seller_id
                              ? <Link className="seller-profile-link" to={`/sellers/${item.seller_id}`} onClick={close}>{item.seller_name || 'Seller store'}</Link>
                              : (item.seller_name || 'Bookify')}</p>
                            {item.reason && <p className="cart-item-warning" role="status">{item.reason}</p>}
                            {item.price !== null && <strong className="cart-item-price">{money.format(item.price)} each</strong>}
                            <div className="cart-item-controls">
                              <div className="cart-quantity" role="group" aria-label={`Quantity for ${item.title || 'unavailable listing'}`}>
                                <button type="button" aria-label={`Decrease ${item.title || 'item'} quantity`} disabled={busyItem === item.id || item.quantity <= 1} onClick={() => void changeQuantity(item.id, item.quantity - 1)}>−</button>
                                <span>{item.quantity}</span>
                                <button type="button" aria-label={`Increase ${item.title || 'item'} quantity`} disabled={busyItem === item.id || !item.can_increase} onClick={() => void changeQuantity(item.id, item.quantity + 1)}>+</button>
                              </div>
                              <button type="button" className="cart-remove" disabled={busyItem === item.id} onClick={() => void remove(item.id)}>Remove</button>
                            </div>
                          </div>
                          <strong className="cart-drawer-line-total">{item.subtotal === null ? '—' : money.format(item.subtotal)}</strong>
                        </article>
                      ))}
                    </section>
                    <aside className="cart-drawer-summary">
                      <div><span>Eligible items</span><strong>{cart.items.filter((item) => item.eligible).reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
                      <div className="cart-grand-total"><span>Subtotal</span><strong>{money.format(cart.subtotal)}</strong></div>
                      {cart.items.some((item) => !item.eligible) && <p className="cart-item-warning">Unavailable items are excluded from this subtotal.</p>}
                      <p className="cart-summary-note">Cart items do not reserve inventory. Checkout is not available yet.</p>
                      <Link className="cart-drawer-continue" to="/books" onClick={close}>Continue browsing</Link>
                    </aside>
                  </>
                )}
        </div>
      </aside>
    </div>
  );
};

const CartIcon: FC = () => (
  <svg className="cart-drawer-empty-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 1.9-1.4L22 8H6" />
    <circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
  </svg>
);

export default CartDrawer;
