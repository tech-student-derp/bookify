import { type FC } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import RegisterSuccessPage from './pages/auth/RegisterSuccessPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ResendVerificationPage from './pages/auth/ResendVerificationPage';
import AccountPage from './pages/auth/AccountPage';
import SellerApplicationPage from './pages/auth/SellerApplicationPage';

/** Landing page — existing hero + sections */
const LandingPage: FC = () => (
  <main>
    <HeroSection />
    <WhatIsBookify />
    <HowItWorks />
    <SellerIntroduction />
  </main>
);

const App: FC = () => {
  const { resolvedScheme, toggle } = useTheme();

  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar resolvedScheme={resolvedScheme} onToggleTheme={toggle} />
        <Routes>
          {/* Public */}
          <Route path="/" element={<><LandingPage /><Footer /></>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/success" element={<RegisterSuccessPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/resend-verification" element={<ResendVerificationPage />} />

          {/* Protected — requires login */}
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
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
