import { type FC } from 'react';
import { Link } from 'react-router-dom';

export const SellerOrdersPage: FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2">
            <span>Milestone: Phase 5</span>
          </div>
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

      {/* Phase 5 Information Banner */}
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-2xl mb-4">
          📦
        </div>
        <h2 className="text-lg font-bold text-[var(--text)]">
          Order Fulfillment Workflow Under Development
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
          This module is part of <strong>Phase 5: Order Processing & Digital Delivery</strong>. When deployed, sellers will manage customer orders, confirm physical shipments, and coordinate courier pickups.
        </p>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-left">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/40">
            <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-wider">
              Physical Dispatch
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)] mt-1">
              Courier Coordination
            </h3>
            <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
              Confirm incoming purchases, generate pickup waybills, and update shipment tracking numbers for buyer delivery.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/40">
            <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-wider">
              Instant E-books
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)] mt-1">
              Automated Digital Access
            </h3>
            <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
              E-book purchases automatically fulfill upon checkout verification, granting immediate download permissions.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/40">
            <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-wider">
              Line-Item Control
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)] mt-1">
              Item Confirmation
            </h3>
            <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
              Independent confirmation per order item with automatic subtotal and commission adjustments on partial declines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerOrdersPage;
