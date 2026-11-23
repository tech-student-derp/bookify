import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const SellerOverviewPage: FC = () => {
  const { user } = useAuth();

  const statCards = [
    {
      label: 'Total Listings',
      value: '—',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
      note: 'Catalog creation arriving in Phase 4',
      badge: 'Phase 4',
    },
    {
      label: 'Active Listings',
      value: '—',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      note: 'Multi-format stock engine in Phase 4',
      badge: 'Phase 4',
    },
    {
      label: 'Pending Orders',
      value: '—',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      note: 'Order fulfillment arriving in Phase 5',
      badge: 'Phase 5',
    },
    {
      label: 'Completed Orders',
      value: '—',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      note: 'Completed order tracking arriving in Phase 5',
      badge: 'Phase 5',
    },
  ];

  const quickActions = [
    {
      title: 'Add New Book Listing',
      desc: 'Publish physical books or digital e-books to the marketplace',
      path: '/seller/listings',
      badge: 'Phase 4',
      icon: '+',
    },
    {
      title: 'Review Orders',
      desc: 'Confirm incoming purchases and track customer shipments',
      path: '/seller/orders',
      badge: 'Phase 5',
      icon: '📦',
    },
    {
      title: 'Configure Store Profile',
      desc: 'Set up store name, pickup address, and payment preferences',
      path: '/seller/store-settings',
      badge: 'Phase 3',
      icon: '⚙️',
    },
    {
      title: 'View Marketplace',
      desc: 'Browse current books as seen by customers',
      path: '/books',
      badge: 'Active',
      icon: '🌐',
    },
  ];

  const roadmapPhases = [
    {
      phase: 'Phase 1',
      title: 'Database Schema Expansion',
      status: 'Completed',
      desc: 'Migration script for seller profiles, stock quantities, and order items.',
      active: false,
      done: true,
    },
    {
      phase: 'Phase 2',
      title: 'Seller Workspace Foundation',
      status: 'In Progress',
      desc: 'Dedicated seller layout, sidebar navigation, top bar, and route structure.',
      active: true,
      done: false,
    },
    {
      phase: 'Phase 3',
      title: 'Store Profile & Identity Settings',
      status: 'Upcoming',
      desc: 'Storefront details, pickup address management, and merchant preferences.',
      active: false,
      done: false,
    },
    {
      phase: 'Phase 4',
      title: 'Listing Catalog & Inventory Engine',
      status: 'Upcoming',
      desc: 'Physical/e-book CRUD, stock counts, and admin moderation pipeline.',
      active: false,
      done: false,
    },
    {
      phase: 'Phase 5',
      title: 'Order Processing & Digital Delivery',
      status: 'Upcoming',
      desc: 'Split line-item confirmation, physical dispatch, and digital file access.',
      active: false,
      done: false,
    },
    {
      phase: 'Phase 6',
      title: 'Commission & Financial Accounting',
      status: 'Upcoming',
      desc: '15% commission tracking, seller net balances, and payout history.',
      active: false,
      done: false,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-hover)] p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Seller Workspace Active
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text)]">
              Welcome back, {user?.first_name || 'Seller'}!
            </h1>
            <p className="mt-1.5 text-sm md:text-base text-[var(--text-muted)] max-w-2xl">
              This is your merchant command center. Monitor book stock, fulfill customer purchases, and review bookstore financials.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/seller/store-settings"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs md:text-sm font-medium font-mono text-[var(--text)] transition-all shadow-sm"
            >
              <span>Store Settings</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--text-muted)]">Phase 3</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards (Phase-safe Empty States) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-mono uppercase tracking-wider text-[var(--text-muted)] font-medium">
            Performance Snapshot
          </h2>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Awaiting module integrations
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:border-[var(--accent)]/50 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wide text-[var(--text-muted)]">
                  {card.label}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]">
                  {card.badge}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-mono font-bold text-[var(--text)]">
                  {card.value}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
                {card.note}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Operational Panels & Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Recent Activity + Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions Panel */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
            <h2 className="text-base font-semibold text-[var(--text)] mb-1">
              Quick Actions
            </h2>
            <p className="text-xs text-[var(--text-muted)] mb-4 font-mono">
              Shortcuts to core seller workflows across development phases
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  to={action.path}
                  className="flex items-start gap-3 p-3.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] transition-all group"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-sm group-hover:scale-105 transition-transform">
                    {action.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-[var(--text)] truncate">
                        {action.title}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--border)]/60 text-[var(--text-muted)] shrink-0">
                        {action.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)] line-clamp-1">
                      {action.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Activity Feed (Empty State) */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--text)]">
                  Operational Activity
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Real-time listing updates, order status changes, and payouts
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]">
                Empty
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-10 px-4 rounded-lg border border-dashed border-[var(--border)] text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 14 14" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-[var(--text)]">
                No activity recorded yet
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm">
                Activity events will automatically appear here once you list books in Phase 4 and fulfill orders in Phase 5.
              </p>
            </div>
          </section>
        </div>

        {/* Right Column (1 col): Roadmap & Account Status */}
        <div className="space-y-6">
          {/* Engineering Roadmap */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
            <h2 className="text-base font-semibold text-[var(--text)] mb-1">
              Seller Implementation Roadmap
            </h2>
            <p className="text-xs text-[var(--text-muted)] mb-4 font-mono">
              6-Phase Engineering Lifecycle
            </p>

            <div className="space-y-3">
              {roadmapPhases.map((phase) => (
                <div
                  key={phase.phase}
                  className={`p-3 rounded-lg border text-xs transition-colors ${
                    phase.active
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : phase.done
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-[var(--border)] bg-[var(--surface-hover)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-[var(--text)]">
                      {phase.phase}: {phase.title}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        phase.done
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold'
                          : phase.active
                          ? 'bg-[var(--accent)]/20 text-[var(--accent)] font-semibold'
                          : 'bg-[var(--border)] text-[var(--text-muted)]'
                      }`}
                    >
                      {phase.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {phase.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Account Profile Card */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
            <h2 className="text-base font-semibold text-[var(--text)] mb-3">
              Account Credentials
            </h2>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Merchant</span>
                <span className="font-medium text-[var(--text)]">{user?.first_name} {user?.last_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Email</span>
                <span className="text-[var(--text)] truncate max-w-[170px]">{user?.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Role</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">{user?.role}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Status</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Verified Active</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SellerOverviewPage;
