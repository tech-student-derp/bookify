import { type FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { useState, useEffect } from 'react';

interface NavbarProps {
  resolvedScheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const BookIcon: FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const HamburgerIcon: FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon: FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const navLinks = [
  { label: 'Home', href: '/#home' },
  { label: 'Explore Books', href: '/books' },
  { label: 'Sell Books', href: '/#sell' },
  { label: 'About', href: '/#about' },
];

const Navbar: FC<NavbarProps> = ({ resolvedScheme, onToggleTheme }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, authenticated, logout } = useAuth();
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    fontFamily: "'Geist Mono', monospace",
    transition: 'background 0.3s, box-shadow 0.3s, border-color 0.3s',
    background: isScrolled ? 'color-mix(in oklch, var(--bg) 92%, transparent)' : 'transparent',
    backdropFilter: isScrolled ? 'blur(12px)' : 'none',
    WebkitBackdropFilter: isScrolled ? 'blur(12px)' : 'none',
    borderBottom: isScrolled ? '1px solid var(--border)' : '1px solid transparent',
    boxShadow: isScrolled ? 'var(--shadow-sm)' : 'none',
  };

  const linkStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: 500,
    padding: '6px 10px',
    borderRadius: '6px',
    transition: 'color 0.2s, background 0.2s',
    letterSpacing: '0.02em',
  };

  return (
    <nav style={navStyle} role="navigation" aria-label="Main navigation">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-heading)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))', color: 'white' }}>
            <BookIcon />
          </span>
          Bookify
        </Link>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="hidden md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} style={linkStyle}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >{link.label}</a>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ThemeToggle resolvedScheme={resolvedScheme} onToggle={onToggleTheme} />

          {authenticated && user ? (
            <>
              <Link to="/dashboard" className="nav-desktop-link"
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; }}
              >Dashboard</Link>
              <button onClick={handleLogout} className="nav-cta-btn"
                style={{ cursor: 'pointer', border: 'none' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >Log Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-desktop-link"
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; }}
              >Sign In</Link>
              <Link to="/register" className="nav-cta-btn"
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.9'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'; }}
              >Get Started</Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button type="button" aria-label={isMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' }}
            className="md:hidden"
          >
            {isMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}
              style={{ ...linkStyle, fontSize: '0.95rem', padding: '10px 12px', display: 'block' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >{link.label}</a>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
          {authenticated && user ? (
            <>
              <Link to="/account" onClick={() => setIsMenuOpen(false)}
                style={{ ...linkStyle, fontSize: '0.95rem', padding: '10px 12px', display: 'block', border: '1px solid var(--border)', textAlign: 'center', borderRadius: '8px', background: 'var(--surface)' }}
              >{user.first_name}'s Account</Link>
              <button onClick={handleLogout}
                style={{ textDecoration: 'none', textAlign: 'center', fontSize: '0.95rem', fontWeight: 600, padding: '10px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))', color: 'white', marginTop: '4px', border: 'none', cursor: 'pointer', fontFamily: "'Geist Mono', monospace" }}
              >Log Out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setIsMenuOpen(false)}
                style={{ ...linkStyle, fontSize: '0.95rem', padding: '10px 12px', display: 'block', border: '1px solid var(--border)', textAlign: 'center', borderRadius: '8px', background: 'var(--surface)' }}
              >Sign In</Link>
              <Link to="/register" onClick={() => setIsMenuOpen(false)}
                style={{ textDecoration: 'none', textAlign: 'center', fontSize: '0.95rem', fontWeight: 600, padding: '10px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))', color: 'white', marginTop: '4px', display: 'block' }}
              >Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
