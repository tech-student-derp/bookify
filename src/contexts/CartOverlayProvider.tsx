import { useCallback, useMemo, useState, type FC, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { CartOverlayContext } from './CartOverlayContext';
import CartDrawer from '../components/CartDrawer';

export const CartOverlayProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ openCart, closeCart }), [openCart, closeCart]);

  return (
    <CartOverlayContext.Provider value={value}>
      {children}
      {isOpen && <CartDrawer key={user?.id ?? 'guest'} isOpen onClose={closeCart} />}
    </CartOverlayContext.Provider>
  );
};
