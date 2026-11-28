import { type FC } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

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
import CartPage from './pages/CartPage';
import PublicSellerPage from './pages/PublicSellerPage';
import BackOfficePage from './pages/backoffice/BackOfficePage';

// Seller Workspace pages
import SellerLayout from './pages/seller/SellerLayout';
import SellerOverviewPage from './pages/seller/SellerOverviewPage';
import SellerListingsPage from './pages/seller/SellerListingsPage';
import SellerOrdersPage from './pages/seller/SellerOrdersPage';
import SellerEarningsPage from './pages/seller/SellerEarningsPage';
import SellerSettingsPage from './pages/seller/SellerSettingsPage';

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
  const isDashboardRoute = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/account');
  const isBackOfficeRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff');
  const isPlainHtmlRoute = location.pathname.startsWith('/staffaddaccount');
  const isSellerRoute = location.pathname.startsWith('/seller');

  return (
    <>
      {!isDashboardRoute && !isBackOfficeRoute && !isPlainHtmlRoute && !isSellerRoute && (
        <Navbar resolvedScheme={resolvedScheme} onToggleTheme={toggle} />
      )}
      <Routes>
        {/* Public */}
        <Route path="/books" element={<MarketplacePage />} />
        <Route path="/books/:bookId" element={<MarketplacePage />} />
        <Route path="/sellers/:sellerId" element={<PublicSellerPage />} />
        <Route path="/cart" element={<ProtectedRoute allowedRoles={['customer']}><CartPage /></ProtectedRoute>} />
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
    </>
  );
};

const App: FC = () => {
  const { resolvedScheme, toggle } = useTheme();

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent resolvedScheme={resolvedScheme} toggle={toggle} />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
