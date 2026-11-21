import { type FC } from 'react';
import { useIntersectionFade } from '../hooks/useIntersectionFade';

const WhatIsBookify: FC = () => {
  const ref = useIntersectionFade();

  return (
    <section
      id="about"
      ref={ref as React.RefObject<HTMLElement>}
      className="section-fade-in"
      style={{
        padding: '80px 24px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        {/* Label */}
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
          What is Bookify?
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
          One marketplace.
          <br />
          <span className="gradient-text">Every book. Every story.</span>
        </h2>

        <p
          style={{
            fontSize: 'clamp(0.9rem, 1.8vw, 1rem)',
            lineHeight: 1.8,
            color: 'var(--text-muted)',
            maxWidth: '60ch',
            margin: '0 auto 40px',
            fontFamily: "'Geist Mono', monospace",
          }}
        >
          Bookify connects independent book sellers, authors, and readers through one
          open marketplace. Whether you're looking to discover your next great read,
          declutter a bookshelf, or publish your own writing — Bookify makes it simple,
          direct, and accessible to everyone.
        </p>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {[
            { label: 'Physical Books' },
            { label: 'Digital E-Books' },
            { label: 'Independent Sellers' },
            { label: 'Author Platform' },
          ].map((item) => (
            <span
              key={item.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '999px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: '0.82rem',
                color: 'var(--text)',
                fontFamily: "'Geist Mono', monospace",
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatIsBookify;
