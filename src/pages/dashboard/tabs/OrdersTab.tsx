import { useState, type FC } from 'react';

type OrderStatus = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled';

export const OrdersTab: FC = () => {
  const [activeFilter, setActiveFilter] = useState<OrderStatus>('all');

  const filters: { id: OrderStatus; label: string; count: number }[] = [
    { id: 'all', label: 'All Orders', count: 0 },
    { id: 'pending', label: 'Pending', count: 0 },
    { id: 'processing', label: 'Processing', count: 0 },
    { id: 'completed', label: 'Completed', count: 0 },
    { id: 'cancelled', label: 'Cancelled', count: 0 },
  ];

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
          Purchases & Deliveries
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
          My Orders
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          Track book shipments, review past purchases, and inspect order receipts.
        </p>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
          overflowX: 'auto',
        }}
      >
        {filters.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'var(--surface)' : 'transparent',
                color: isActive ? 'var(--text-heading)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontFamily: "'Geist Mono', monospace",
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                outline: isActive ? '1px solid var(--border)' : 'none',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: isActive ? 'color-mix(in oklch, var(--surface) 80%, var(--accent) 20%)' : 'var(--bg-secondary)',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders Container (Empty State) */}
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
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>

        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>
          {activeFilter === 'all' ? 'No orders placed yet' : `No ${activeFilter} orders found`}
        </h3>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '440px', lineHeight: 1.65 }}>
          When you order books on Bookify, your transaction details, live courier tracking, order receipt, and seller notes will appear here.
        </p>

        <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href="/#explore"
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
            Browse Bookshelf &rarr;
          </a>
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
          <strong>System Note:</strong> The order placement and checkout database tables are pending backend migration. No mock transactions are displayed.
        </div>
      </div>
    </div>
  );
};
