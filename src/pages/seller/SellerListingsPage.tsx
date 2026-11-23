import { type FC } from 'react';
import { Link } from 'react-router-dom';

export const SellerListingsPage: FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
            <span>Milestone: Phase 4</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            My Book Listings
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Catalog management, multi-format listings, inventory counts, and staff moderation.
          </p>
        </div>

        <Link
          to="/seller/overview"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono font-medium hover:bg-[var(--surface-hover)] transition-colors self-start sm:self-auto"
        >
          <span>← Back to Overview</span>
        </Link>
      </div>

      {/* Phase 4 Information Banner */}
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-2xl mb-4">
          📚
        </div>
        <h2 className="text-lg font-bold text-[var(--text)]">
          Listing Management Engine Under Development
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
          This module is part of <strong>Phase 4: Listing Catalog & Inventory Engine</strong>. When deployed, sellers will be able to create, edit, archive, and monitor stock for physical and digital books.
        </p>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-left">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/40">
            <span className="text-xs font-mono font-bold text-[var(--accent)] uppercase tracking-wider">
              Format Support
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)] mt-1">
              Physical & E-books
            </h3>
            <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
              Create listings for physical hardcovers/paperbacks with condition ratings or digital e-books with secure PDF uploads.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/40">
            <span className="text-xs font-mono font-bold text-[var(--accent)] uppercase tracking-wider">
              Inventory Engine
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)] mt-1">
              Real-Time Stock Counts
            </h3>
            <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
              Track finite physical inventory with automatic transitions to out-of-stock upon completed buyer orders.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/40">
            <span className="text-xs font-mono font-bold text-[var(--accent)] uppercase tracking-wider">
              Staff Moderation
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)] mt-1">
              Quality Review Flow
            </h3>
            <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
              Review submitted listings against marketplace community guidelines before publishing to the public catalog.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerListingsPage;
