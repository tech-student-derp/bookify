import { type FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { User } from '../../types/auth';
import ThemeToggle from '../../components/ThemeToggle';

interface SellerHeaderProps {
  user: User;
  onOpenSidebar: () => void;
  resolvedScheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const SellerHeader: FC<SellerHeaderProps> = ({
  user,
  onOpenSidebar,
  resolvedScheme,
  onToggleTheme,
}) => {
  const location = useLocation();

  // Derive section title from route
  const getSectionTitle = (path: string): string => {
    if (path.includes('/seller/listings')) return 'My Listings';
    if (path.includes('/seller/orders')) return 'Orders';
    if (path.includes('/seller/earnings')) return 'Earnings';
    if (path.includes('/seller/store-settings')) return 'Store Settings';
    return 'Overview';
  };

  const sectionTitle = getSectionTitle(location.pathname);
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || 'S';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 lg:px-8 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md transition-colors duration-200">
      {/* Left: Mobile hamburger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text)] hover:border-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          aria-label="Open seller navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center text-xs md:text-sm font-mono tracking-tight">
          <Link
            to="/seller/overview"
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors font-medium"
          >
            Bookify
          </Link>
          <span className="mx-2 text-[var(--border)]">/</span>
          <span className="text-[var(--text-muted)] hidden sm:inline">Seller Hub</span>
          <span className="mx-2 text-[var(--border)] hidden sm:inline">/</span>
          <span className="font-semibold text-[var(--text)]">{sectionTitle}</span>
        </nav>
      </div>

      {/* Right: Actions, Theme Toggle, Merchant Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Workspace Mode Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border border-[var(--border)] bg-[var(--surface-hover)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[var(--text-muted)]">Seller Workspace</span>
        </div>

        {/* Public Storefront Link */}
        <Link
          to="/books"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] transition-all"
          title="Browse live Bookify marketplace as customer"
        >
          <span>Marketplace</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Link>

        {/* Theme Toggle */}
        <div className="flex items-center">
          <ThemeToggle resolvedScheme={resolvedScheme} onToggle={onToggleTheme} />
        </div>

        {/* Profile Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-bold font-mono shadow-sm">
            {initials}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold leading-tight text-[var(--text)]">
              {user.first_name} {user.last_name}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {user.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SellerHeader;
