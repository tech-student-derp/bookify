import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { useIntersectionFade } from '../hooks/useIntersectionFade';

const BookIcon: FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const footerLinks = {
  Marketplace: [
    { label: 'Explore Books', href: '#explore' },
    { label: 'New Arrivals', href: '#' },
    { label: 'Bestsellers', href: '#' },
    { label: 'E-Books', href: '#' },
  ],
  Sellers: [
    { label: 'Start Selling', href: '#sell' },
    { label: 'Author Platform', href: '#' },
    { label: 'Seller Dashboard', href: '#' },
    { label: 'Pricing', href: '#' },
  ],
  Company: [
    { label: 'About Bookify', href: '#about' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  Account: [
    { label: 'Sign In', href: '#signin' },
    { label: 'Get Started', href: '/seller-application' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

const Footer: FC = () => {
  const revealRef = useIntersectionFade(0.1);
  const year = new Date().getFullYear();

  return (
    <footer
      ref={revealRef}
      className="section-fade-in"
      style={{
        background: 'linear-gradient(180deg, #0d1f1a 0%, #0a1628 100%)',
        borderTop: '1px solid #1a2f28',
        padding: '64px 24px 32px',
        fontFamily: "'Geist Mono', monospace",
        color: '#a0b4ac',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Top row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
            gap: '40px',
            marginBottom: '56px',
          }}
        >
          {/* Brand column */}
          <div style={{ gridColumn: 'span 1' }}>
            {/* Logo */}
            <a
              href="#home"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                color: '#e2f0ea',
                fontWeight: 700,
                fontSize: '1.1rem',
                letterSpacing: '-0.02em',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #22c55e, #3b82f6)',
                  color: 'white',
                }}
              >
                <BookIcon />
              </span>
              Bookify
            </a>

            <p
              style={{
                fontSize: '0.82rem',
                lineHeight: 1.75,
                color: '#7a9a90',
                margin: '0 0 20px',
                maxWidth: '28ch',
              }}
            >
              An open marketplace connecting independent book sellers, authors, and
              readers everywhere.
            </p>

            {/* Gradient accent bar */}
            <div
              aria-hidden="true"
              style={{
                height: '3px',
                width: '48px',
                borderRadius: '2px',
                background: 'linear-gradient(90deg, #22c55e, #3b82f6)',
              }}
            />
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#e2f0ea',
                  marginBottom: '16px',
                  margin: '0 0 16px',
                }}
              >
                {heading}
              </h3>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href === '/seller-application' ? (
                      <Link
                        to={link.href}
                        style={{
                          textDecoration: 'none',
                          fontSize: '0.85rem',
                          color: '#7a9a90',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLAnchorElement).style.color = '#4ade80')
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLAnchorElement).style.color = '#7a9a90')
                        }
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        style={{
                          textDecoration: 'none',
                          fontSize: '0.85rem',
                          color: '#7a9a90',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLAnchorElement).style.color = '#4ade80')
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLAnchorElement).style.color = '#7a9a90')
                        }
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #1e3828, #1e3050, transparent)',
            marginBottom: '28px',
          }}
        />

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.78rem',
              color: '#4a6a60',
            }}
          >
            © {year} Bookify. All rights reserved.
          </p>

          <div style={{ display: 'flex', gap: '20px' }}>
            {['Privacy', 'Terms', 'Cookies'].map((item) => (
              <a
                key={item}
                href="#"
                style={{
                  textDecoration: 'none',
                  fontSize: '0.78rem',
                  color: '#4a6a60',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = '#4ade80')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.color = '#4a6a60')
                }
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
