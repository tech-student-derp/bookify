import { type FC } from 'react';
import { Link } from 'react-router-dom';

export const SellerOrdersPage: FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            Customer Orders
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Order fulfillment, line-item confirmations, physical dispatch, and digital delivery.
          </p>
        </div>

        <Link
          to="/seller/overview"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono font-medium hover:bg-[var(--surface-hover)] transition-colors self-start sm:self-auto"
        >
          <span>← Back to Overview</span>
        </Link>
      </div>
    </div>
  );
};

export default SellerOrdersPage;
