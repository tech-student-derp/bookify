import { type FC } from 'react';
import { Link } from 'react-router-dom';

export const SellerEarningsPage: FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
            <span>Milestone: Phase 6</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            Earnings & Financial Accounting
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Platform commissions, net payouts, disbursement history, and transaction ledgers.
          </p>
        </div>

        <Link
          to="/seller/overview"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono font-medium hover:bg-[var(--surface-hover)] transition-colors self-start sm:self-auto"
        >
          <span>← Back to Overview</span>
        </Link>
      </div>

      {/* Phase 6 Information Banner */}
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-2xl mb-4">
          💳
        </div>
        <h2 className="text-lg font-bold text-[var(--text)]">
          Financial & Commission Engine Under Development
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
          This module is part of <strong>Phase 6: Commission & Financial Accounting</strong>. When deployed, sellers will review transparent net earnings calculations, commission snapshots, and payout history.
        </p>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-left">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/40">
            <span className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-wider">
              15% Snapshot
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)] mt-1">
              Transparent Commission
            </h3>
            <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
              Every purchased order item captures an immutable snapshot of commission rate, commission amount, and seller net earnings.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/40">
            <span className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-wider">
              Disbursements
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)] mt-1">
              Payout Requests
            </h3>
            <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
              Request automated payouts directly to registered bank accounts or mobile wallets upon order completion.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/40">
            <span className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-wider">
              Audit Ledger
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)] mt-1">
              Historical Transactions
            </h3>
            <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
              Preserved financial snapshots protect historical accuracy even if listings are modified or deleted in the future.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerEarningsPage;
