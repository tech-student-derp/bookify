import { type FC } from 'react';
import { useIntersectionFade } from '../hooks/useIntersectionFade';

const sellerFeatures = [
  {
    title: 'List Physical Books',
    description:
      'Sellers can list used or new physical books for sale. Set your own price, shipping terms, and reach readers across the country.',
  },
  {
    title: 'Distribute E-Books',
    description:
      'Authors can upload and sell downloadable e-books directly to readers. No printing, no shipping — just your words, delivered instantly.',
  },
  {
    title: 'Simple Dashboard',
    description:
      'Track your listings, sales, and reviews from a clean, straightforward seller dashboard built for real people, not just power users.',
  },
  {
    title: 'Reach More Readers',
    description:
      'Bookify surfaces your listings to buyers actively looking for what you have. Independent sellers compete on equal footing here.',
  },
];

const SellerIntroduction: FC = () => {
  const ref = useIntersectionFade();

  return (
    <section
      id="sell"
      ref={ref as React.RefObject<HTMLElement>}
      className="section-fade-in"
      style={{
        padding: '80px 24px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
            gap: '56px',
            alignItems: 'start',
          }}
        >
          {/* Left text block */}
          <div>
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: '16px',
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              For Sellers & Authors
            </span>

            <h2
              style={{
                fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
                fontWeight: 700,
                lineHeight: 1.3,
                letterSpacing: '-0.03em',
                color: 'var(--text-heading)',
                marginBottom: '20px',
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              Your books.
              <br />
              <span className="gradient-text">Your rules. Your readers.</span>
            </h2>

            <p
              style={{
                fontSize: 'clamp(0.9rem, 1.8vw, 1rem)',
                lineHeight: 1.8,
                color: 'var(--text-muted)',
                marginBottom: '32px',
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              Bookify gives independent sellers and authors a platform where they are
              in control. List physical books for sale, distribute your own e-books, and
              connect directly with readers who care about what you offer. No gatekeepers.
              No unnecessary complexity.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a
                href="#get-started"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  padding: '12px 22px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
                  color: 'white',
                  fontFamily: "'Geist Mono', monospace",
                  letterSpacing: '0.02em',
                  transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 14px color-mix(in oklch, var(--green-500) 40%, transparent)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                }}
              >
                Start Selling Free
              </a>
              <a
                href="#learn-more"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  padding: '12px 22px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontFamily: "'Geist Mono', monospace",
                  letterSpacing: '0.02em',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface)';
                }}
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Right feature grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {sellerFeatures.map((feature) => (
              <div
                key={feature.title}
                style={{
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
                }}
              >
<h3
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--text-heading)',
                    margin: 0,
                    fontFamily: "'Geist Mono', monospace",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.82rem',
                    lineHeight: 1.7,
                    color: 'var(--text-muted)',
                    margin: 0,
                    fontFamily: "'Geist Mono', monospace",
                  }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SellerIntroduction;
