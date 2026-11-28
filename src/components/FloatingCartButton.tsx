import { useEffect, useState, type FC } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCartOverlay } from '../contexts/CartOverlayContext';
import { CART_UPDATED_EVENT, getCart, type CartPayload } from '../services/cartApi';

const FloatingCartButton: FC = () => {
  const { user, authenticated } = useAuth();
  const { openCart } = useCartOverlay();
  const [cartState, setCartState] = useState<{ userId: number | null; count: number }>({ userId: null, count: 0 });
  const customerId = authenticated && user?.role === 'customer' ? user.id : null;

  useEffect(() => {
    if (customerId === null) return;

    let active = true;
    let receivedCartUpdate = false;
    const updateCartCount = (event: Event) => {
      const detail = (event as CustomEvent<CartPayload>).detail;
      if (typeof detail?.item_count === 'number') {
        receivedCartUpdate = true;
        setCartState({ userId: customerId, count: detail.item_count });
      }
    };

    window.addEventListener(CART_UPDATED_EVENT, updateCartCount);
    void getCart().then((cart) => {
      if (active && !receivedCartUpdate) setCartState({ userId: customerId, count: cart.item_count });
    }).catch(() => {
      if (active && !receivedCartUpdate) setCartState({ userId: customerId, count: 0 });
    });

    return () => {
      active = false;
      window.removeEventListener(CART_UPDATED_EVENT, updateCartCount);
    };
  }, [customerId]);

  if (customerId === null) return null;

  const count = cartState.userId === customerId ? cartState.count : 0;
  const label = count > 0 ? `Open shopping cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Open shopping cart';

  return (
    <button type="button" className="floating-cart-trigger" aria-label={label} aria-haspopup="dialog" onClick={openCart}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 1.9-1.4L22 8H6" />
        <circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
      </svg>
      {count > 0 && <span className="floating-cart-badge" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
    </button>
  );
};

export default FloatingCartButton;
