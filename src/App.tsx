import { type FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingCartButton from './components/FloatingCartButton';
import { useCartOverlay } from './contexts/CartOverlayContext';
import { CartOverlayProvider } from './contexts/CartOverlayProvider';

// Landing page sections
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import WhatIsBookify from './components/WhatIsBookify';
import HowItWorks from './components/HowItWorks';
import SellerIntroduction from './components/SellerIntroduction';
import Footer from './components/Footer';

// Auth & Dashboard pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RegisterSuccessPage from './pages/auth/RegisterSuccessPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ResendVerificationPage from './pages/auth/ResendVerificationPage';
import AccountPage from './pages/auth/AccountPage';
import SellerApplicationPage from './pages/auth/SellerApplicationPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import StaffAddAccountPage from './pages/StaffAddAccountPage';
import MarketplacePage from './pages/MarketplacePage';
import PublicSellerPage from './pages/PublicSellerPage';
import BackOfficePage from './pages/backoffice/BackOfficePage';
import BookifyIntro from './components/BookifyIntro';

// Seller Workspace pages
import SellerLayout from './pages/seller/SellerLayout';
import SellerOverviewPage from './pages/seller/SellerOverviewPage';
import SellerListingsPage from './pages/seller/SellerListingsPage';
import SellerOrdersPage from './pages/seller/SellerOrdersPage';
import SellerEarningsPage from './pages/seller/SellerEarningsPage';
import SellerSettingsPage from './pages/seller/SellerSettingsPage';

const INTRO_DURATION_MS = 2200;
const XAMPP_BASE_PATH = '/bookify';

function normalizedPath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

function getRouterBasename(pathname: string): string | undefined {
  const normalized = normalizedPath(pathname);
  return normalized === XAMPP_BASE_PATH || normalized.startsWith(`${XAMPP_BASE_PATH}/`)
    ? XAMPP_BASE_PATH
    : undefined;
}

function isHeroPath(pathname: string): boolean {
  const normalized = normalizedPath(pathname);
  return normalized === '/' || normalized === XAMPP_BASE_PATH;
}

/** Landing page — existing hero + sections */
const LandingPage: FC = () => (
  <main>
    <HeroSection />
    <WhatIsBookify />
    <HowItWorks />
    <SellerIntroduction />
  </main>
);

const AppContent: FC<{ resolvedScheme: 'light' | 'dark'; toggle: () => void }> = ({ resolvedScheme, toggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { openCart } = useCartOverlay();
  const [introVisible, setIntroVisible] = useState(
    () => isHeroPath(window.location.pathname),
  );
  const appInterfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const routeState = location.state as { openCart?: boolean } | null;
    if (routeState?.openCart) {
      openCart();
      navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
    }
  }, [location.hash, location.pathname, location.search, location.state, navigate, openCart]);

  useLayoutEffect(() => {
    if (location.pathname !== '/') {
      const hideTimer = window.setTimeout(() => setIntroVisible(false), 0);
      return () => window.clearTimeout(hideTimer);
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setIntroVisible(true);
    });
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && appInterfaceRef.current?.contains(activeElement)) {
      activeElement.blur();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      document.body.style.overflow = previousOverflow;
      setIntroVisible(false);
    }, INTRO_DURATION_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [location.pathname]);

  const isDashboardRoute = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/account');
  const isBackOfficeRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
    || location.pathname === '/staff' || location.pathname.startsWith('/staff/');
  const isSellerRoute = location.pathname === '/seller' || location.pathname.startsWith('/seller/');
  const showIntro = introVisible && location.pathname === '/';

  return (
    <>
      <div
        className="bookify-app-interface"
        ref={appInterfaceRef}
        inert={showIntro}
        aria-hidden={showIntro || undefined}
      >
        {!isDashboardRoute && !isBackOfficeRoute && !isSellerRoute && (
          <Navbar resolvedScheme={resolvedScheme} onToggleTheme={toggle} />
        )}
        <Routes>
        {/* Public */}
        <Route path="/books" element={<MarketplacePage />} />
        <Route path="/books/:bookId" element={<MarketplacePage />} />
        <Route path="/sellers/:sellerId" element={<PublicSellerPage />} />
        <Route path="/cart" element={<CartRouteRedirect />} />
        <Route path="/" element={<><LandingPage /><Footer /></>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/success" element={<RegisterSuccessPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/resend-verification" element={<ResendVerificationPage />} />
        <Route path="/staffaddaccount" element={<ProtectedRoute allowedRoles={['admin']}><StaffAddAccountPage /></ProtectedRoute>} />

        {/* Staff and administrator workspaces use the same operational shell, with separate permissions. */}
        <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']}><BackOfficePage audience="admin" /></ProtectedRoute>} />
        <Route path="/staff/*" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><BackOfficePage audience="staff" /></ProtectedRoute>} />

        {/* Seller Workspace — strictly protected for users with role='seller' */}
        <Route path="/seller" element={<Navigate to="/seller/overview" replace />} />
        <Route
          path="/seller/*"
          element={
            <ProtectedRoute allowedRoles={['seller']}>
              <SellerLayout resolvedScheme={resolvedScheme} onToggleTheme={toggle} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/seller/overview" replace />} />
          <Route path="overview" element={<SellerOverviewPage />} />
          <Route path="listings" element={<SellerListingsPage />} />
          <Route path="orders" element={<SellerOrdersPage />} />
          <Route path="earnings" element={<SellerEarningsPage />} />
          <Route path="store-settings" element={<SellerSettingsPage />} />
          <Route path="*" element={<Navigate to="/seller/overview" replace />} />
        </Route>

        {/* Protected — requires login */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seller-application"
          element={
            <ProtectedRoute>
              <SellerApplicationPage />
            </ProtectedRoute>
          }
        />
        </Routes>
        <FloatingCartButton />
      </div>
      {showIntro && (
        <BookifyIntro theme={resolvedScheme} />
      )}
    </>
  );
};

const CartRouteRedirect: FC = () => {
  const navigate = useNavigate();
  const { authenticated, user } = useAuth();
  useEffect(() => {
    const state = authenticated && user?.role === 'customer' ? { openCart: true } : null;
    navigate('/books', { replace: true, state });
  }, [authenticated, navigate, user?.role]);
  return null;
};

const App: FC = () => {
  const { resolvedScheme, toggle } = useTheme();

  return (
    <BrowserRouter basename={getRouterBasename(window.location.pathname)}>
      <AuthProvider>
        <CartOverlayProvider>
          <AppContent resolvedScheme={resolvedScheme} toggle={toggle} />
        </CartOverlayProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
