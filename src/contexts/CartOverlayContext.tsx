import { createContext, useContext } from 'react';

interface CartOverlayValue {
  openCart: () => void;
  closeCart: () => void;
}

export const CartOverlayContext = createContext<CartOverlayValue | null>(null);

export function useCartOverlay(): CartOverlayValue {
  const context = useContext(CartOverlayContext);
  if (!context) throw new Error('useCartOverlay must be used inside CartOverlayProvider');
  return context;
}
