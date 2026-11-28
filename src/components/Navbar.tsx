import { useEffect, useRef, useState, type FC, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  resolvedScheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const navLinks = [
  { label: 'Home', to: '/#home' },
  { label: 'Explore Books', to: '/books' },
  { label: 'Sell Books', to: '/#sell' },
  { label: 'About', to: '/#about' },
];

const dashboardPath = {
  customer: '/dashboard',
  seller: '/seller/overview',
  staff: '/staff',
  admin: '/admin',
} as const;

const Navbar: FC<NavbarProps> = ({ resolvedScheme, onToggleTheme }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, authenticated, logout } = useAuth();
  const navigate = useNavigate();
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setIsMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const focusFrame = window.requestAnimationFrame(() => {
      accountMenuRef.current?.querySelector<HTMLElement>('[data-account-menu-item]')?.focus();
    });
    const onPointerDown = (event: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        accountTriggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen]);

  const closeAccountMenu = (restoreFocus = true) => {
    setAccountOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => accountTriggerRef.current?.focus());
  };

  const onAccountMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      '[data-account-menu-item], .account-appearance-control button',
    ));
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number | undefined;
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex !== undefined && items.length > 0) {
      event.preventDefault();
      items[nextIndex].focus();
    }
  };

  const handleLogout = async () => {
    closeAccountMenu(false);
    await logout();
    navigate('/');
  };

  const avatarUrl = user?.avatar_url || null;

  return (
    <nav className={`site-navbar${isScrolled ? ' is-scrolled' : ''}`} aria-label="Main navigation">
      <div className="site-navbar-inner">
        <Link to="/" className="site-brand" aria-label="Bookify home">
          <span className="site-brand-mark"><BookIcon /></span>
          <span>Bookify</span>
        </Link>

        <div className="site-nav-links" aria-label="Explore Bookify">
          {navLinks.map((link) => <Link key={link.label} to={link.to}>{link.label}</Link>)}
        </div>

        <div className="site-navbar-actions">
          {authenticated && user && <NotificationCenter />}

          <div
            className="account-menu-wrap"
            ref={accountRef}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAccountOpen(false);
            }}
          >
            <button
              ref={accountTriggerRef}
              type="button"
              className={`account-menu-trigger${accountOpen ? ' is-open' : ''}`}
              aria-label={authenticated && user ? `Account menu for ${user.first_name}` : 'Account menu'}
              aria-expanded={accountOpen}
              aria-controls="site-account-menu"
              onClick={() => setAccountOpen((open) => !open)}
            >
              <span className="account-avatar" aria-hidden="true">
                <UserIcon />
                {avatarUrl && <img src={avatarUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
              </span>
              <ChevronIcon />
            </button>

            {accountOpen && (
              <div id="site-account-menu" className="account-menu" ref={accountMenuRef} onKeyDown={onAccountMenuKeyDown}>
                {authenticated && user ? (
                  <>
                    <div className="account-menu-profile">
                      <span className="account-avatar account-avatar-large" aria-hidden="true">
                        <UserIcon />
                        {avatarUrl && <img src={avatarUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
                      </span>
                      <span className="account-menu-profile-copy">
                        <strong>{user.first_name} {user.last_name}</strong>
                        <small>{user.email}</small>
                        <small className="account-role-tag">{user.role}</small>
                      </span>
                    </div>
                    <Link data-account-menu-item to="/account" onClick={() => closeAccountMenu(false)}><UserIcon />My Profile</Link>
                    <Link data-account-menu-item to={dashboardPath[user.role]} onClick={() => closeAccountMenu(false)}><DashboardIcon />Dashboard</Link>
                  </>
                ) : (
                  <div className="account-menu-auth-actions">
                    <Link data-account-menu-item to="/login" onClick={() => closeAccountMenu(false)}>Sign in</Link>
                    <Link data-account-menu-item to="/register" className="account-menu-register" onClick={() => closeAccountMenu(false)}>Create account</Link>
                  </div>
                )}

                <div className="account-menu-appearance">
                  <span><AppearanceIcon />Appearance</span>
                  <div className="account-appearance-control">
                    <small>{resolvedScheme === 'dark' ? 'Dark' : 'Light'} mode</small>
                    <ThemeToggle resolvedScheme={resolvedScheme} onToggle={onToggleTheme} />
                  </div>
                </div>

                {authenticated && user && (
                  <button data-account-menu-item className="account-menu-signout" type="button" onClick={() => void handleLogout()}>
                    <SignOutIcon />Sign out
                  </button>
                )}
              </div>
            )}
          </div>

          <button type="button" className="mobile-menu-trigger" aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((open) => !open)}>
            {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="mobile-nav-panel">
          {navLinks.map((link) => <Link key={link.label} to={link.to} onClick={() => setIsMenuOpen(false)}>{link.label}</Link>)}
        </div>
      )}
    </nav>
  );
};

const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };

const BookIcon: FC = () => <svg width="21" height="21" {...iconProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
const UserIcon: FC = () => <svg width="18" height="18" {...iconProps}><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>;
const DashboardIcon: FC = () => <svg width="18" height="18" {...iconProps}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>;
const AppearanceIcon: FC = () => <svg width="18" height="18" {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18z" /></svg>;
const SignOutIcon: FC = () => <svg width="18" height="18" {...iconProps}><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></svg>;
const ChevronIcon: FC = () => <svg width="14" height="14" {...iconProps}><path d="m6 9 6 6 6-6" /></svg>;
const MenuIcon: FC = () => <svg width="21" height="21" {...iconProps}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
const CloseIcon: FC = () => <svg width="21" height="21" {...iconProps}><path d="m6 6 12 12M18 6 6 18" /></svg>;

export default Navbar;
