import { type FC } from 'react';
import { Link } from 'react-router-dom';

export const WishlistTab: FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            display: 'block',
            marginBottom: '6px',
          }}
        >
          Saved Books
        </span>
        <h1
          style={{
            fontSize: 'clamp(1.3rem, 2.5vw, 1.75rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--text-heading)',
            margin: '0 0 6px',
          }}
        >
          My Wishlist
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          Books you have bookmarked to read or purchase later.
        </p>
      </div>

      {/* Wishlist Container (Empty State) */}
      <div
        style={{
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '64px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>
          Your wishlist is empty
        </h3>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '440px', lineHeight: 1.65 }}>
          You have not bookmarked any books yet. Browse the Bookify catalog and save books you're interested in reading to easily revisit them.
        </p>

        <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            to="/books"
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            Explore Books &rarr;
          </Link>
        </div>

        {/* Backend status note */}
        <div
          style={{
            marginTop: '28px',
            padding: '10px 16px',
            borderRadius: '6px',
            border: '1px dashed var(--border)',
            background: 'var(--bg-secondary)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            maxWidth: '520px',
          }}
        >
          <strong>System Note:</strong> Wishlist persistence tables are in development. No mock bookmarks are created.
        </div>
      </div>
    </div>
  );
};
