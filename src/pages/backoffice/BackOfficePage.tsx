import { type FC, type ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminOverview, type AdminOverview } from '../../services/adminApi';
import { ListingsManagement, SellerManagement, StaffManagement, UsersManagement } from './ManagementSections';
import { DeliveriesManagement, OrdersManagement, RefundsManagement } from './OperationsSections';
import NotificationCenter from '../../components/NotificationCenter';
import { ActivityFeed, AuditLogManagement, ReportsManagement, SettingsManagement } from './Phase4Sections';

type Audience = 'admin' | 'staff';

const adminNav = [
  { label: 'Overview', path: '', icon: 'grid', available: true },
  { label: 'People', path: 'users', icon: 'users', available: true },
  { label: 'Staff', path: 'staff', icon: 'user', available: true },
  { label: 'Sellers', path: 'sellers', icon: 'store', available: true },
  { label: 'Listings', path: 'listings', icon: 'book', available: true },
  { label: 'Orders', path: 'orders', icon: 'bag', available: true },
  { label: 'Deliveries', path: 'deliveries', icon: 'truck', available: true },
  { label: 'Refunds', path: 'refunds', icon: 'refund', available: true },
  { label: 'Reports', path: 'reports', icon: 'chart', available: true },
  { label: 'Audit history', path: 'audit', icon: 'history', available: true },
  { label: 'Settings', path: 'settings', icon: 'settings', available: true },
];

const staffNav = [
  { label: 'Overview', path: '', icon: 'grid', available: true },
  { label: 'Seller applications', path: 'sellers', icon: 'store', available: true },
  { label: 'Listings', path: 'listings', icon: 'book', available: true },
  { label: 'Orders', path: 'orders', icon: 'bag', available: true },
  { label: 'Deliveries', path: 'deliveries', icon: 'truck', available: true },
  { label: 'Refunds', path: 'refunds', icon: 'refund', available: true },
  { label: 'Settings', path: 'settings', icon: 'settings', available: true },
];

const BackOfficeNavIcon: FC<{ kind: string }> = ({ kind }) => {
  const icons: Record<string, ReactNode> = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20zM16 5.4a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4V20" /></>,
    user: <><circle cx="12" cy="8" r="3.3" /><path d="M5 20v-1a7 7 0 0 1 14 0v1z" /></>,
    store: <><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2 2 0 0 0 4 0M9 20v-5h6v5" /></>,
    book: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 0 5 22zM5 4.5v15A2.5 2.5 0 0 1 7.5 17H20M9 6h7M9 10h7" /></>,
    bag: <><path d="M4 8h16l1 13H3L4 8zM9 8V6a3 3 0 0 1 6 0v2" /></>,
    truck: <><path d="M2.5 5h12v12h-12zM14.5 9h4l3 3v5h-7z" /><circle cx="7" cy="19" r="1.8" /><circle cx="18" cy="19" r="1.8" /></>,
    refund: <><path d="M4 8V3m0 0h5M4 3l3.5 3.5A8 8 0 1 1 4 12" /><path d="M12 8v4l3 2" /></>,
    chart: <><path d="M3 20h18M5 16l4-5 4 2 6-8M15 5h4v4" /></>,
    history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5M12 7v5l3 2" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="currentColor" /><circle cx="15" cy="12" r="2" fill="currentColor" /><circle cx="8" cy="18" r="2" fill="currentColor" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  };
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icons[kind] ?? icons.grid}</svg>;
};

const BackOfficePage: FC<{ audience: Audience }> = ({ audience }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = user?.role === 'admin';
  const basePath = audience === 'admin' ? '/admin' : '/staff';
  const section = location.pathname.slice(basePath.length).replace(/^\/+/, '').split('/')[0] || '';
  const nav = isAdmin && audience === 'admin' ? adminNav : staffNav;
  const title = nav.find((item) => item.path === section)?.label ?? 'Workspace';

  useEffect(() => {
    let alive = true;
    getAdminOverview()
      .then((data) => { if (alive) setOverview(data); })
      .catch((reason: unknown) => { if (alive) setError(reason instanceof Error ? reason.message : 'Could not load workspace data.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  const stats = overview?.stats;
  const adminCards = [
    { title: 'Customers', value: stats?.customers, note: 'Registered customer accounts', tone: 'navy' },
    { title: 'Approved sellers', value: stats?.approved_sellers, note: 'Applications marked approved', tone: 'green' },
    { title: 'Seller applications', value: stats?.pending_seller_applications, note: 'Awaiting review', tone: 'blue' },
    { title: 'Staff accounts', value: stats?.staff_accounts, note: 'Provisioned staff users', tone: 'charcoal' },
    { title: 'Active listings', value: stats?.active_listings, note: overview?.available_modules?.includes('listings') ? 'Approved and published' : 'Listing schema unavailable', tone: 'green' },
    { title: 'Listing reviews', value: stats?.pending_listing_reviews, note: overview?.available_modules?.includes('listings') ? 'Awaiting moderation' : 'Listing schema unavailable', tone: 'blue' },
    { title: 'Orders', value: stats?.total_orders, note: overview?.available_modules?.includes('orders') ? 'Recorded customer orders' : 'Operations schema unavailable', tone: 'navy' },
    { title: 'Pending orders', value: stats?.pending_orders, note: 'Awaiting seller confirmation', tone: 'blue' },
    { title: 'Active deliveries', value: stats?.active_deliveries, note: 'Dispatch and delivery workflow', tone: 'green' },
    { title: 'Refund requests', value: stats?.pending_refunds, note: 'Awaiting operational review', tone: 'charcoal' },
  ];
  const staffCards = [
    { title: 'Approved sellers', value: stats?.approved_sellers, note: 'Applications marked approved', tone: 'green' },
    { title: 'Seller applications', value: stats?.pending_seller_applications, note: 'Awaiting review', tone: 'blue' },
    { title: 'Active listings', value: stats?.active_listings, note: overview?.available_modules?.includes('listings') ? 'Approved and published' : 'Listing schema unavailable', tone: 'green' },
    { title: 'Listing reviews', value: stats?.pending_listing_reviews, note: overview?.available_modules?.includes('listings') ? 'Awaiting moderation' : 'Listing schema unavailable', tone: 'blue' },
    { title: 'Orders', value: stats?.total_orders, note: overview?.available_modules?.includes('orders') ? 'Recorded customer orders' : 'Operations schema unavailable', tone: 'navy' },
    { title: 'Pending orders', value: stats?.pending_orders, note: 'Awaiting seller confirmation', tone: 'blue' },
    { title: 'Active deliveries', value: stats?.active_deliveries, note: 'Dispatch and delivery workflow', tone: 'green' },
    { title: 'Refund requests', value: stats?.pending_refunds, note: 'Awaiting operational review', tone: 'charcoal' },
  ];
  const cards = isAdmin ? adminCards : staffCards;

  return (
    <div className="bo-shell">
      {sidebarOpen && <button className="bo-mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`bo-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <Link to={basePath} className="bo-brand"><span className="bo-brand-mark">b</span><span>Bookify <small>OPERATIONS</small></span></Link>
        <div className="bo-workspace-label">WORKSPACE</div>
        <div className="bo-workspace-name"><span className="bo-workspace-avatar">{audience === 'admin' ? 'A' : 'S'}</span><span>{audience === 'admin' ? 'Administration' : 'Staff workspace'}<small>{audience === 'admin' ? 'Bookify back office' : 'Operations team'}</small></span><span className="bo-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" /></svg></span></div>
        <nav className="bo-nav" aria-label="Back-office navigation">
          <div className="bo-nav-label">MANAGE</div>
          {nav.map((item) => {
            const active = item.path === section;
            const path = item.path ? `${basePath}/${item.path}` : basePath;
            return item.available ? (
              <Link key={item.label} to={path} className={`bo-nav-item${active ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}><span className="bo-nav-icon"><BackOfficeNavIcon kind={item.icon} /></span><span>{item.label}</span>{active && <i />}</Link>
            ) : (
              <div key={item.label} className="bo-nav-item is-disabled" aria-disabled="true" title="This module is not available yet"><span className="bo-nav-icon"><BackOfficeNavIcon kind={item.icon} /></span><span>{item.label}</span><small>Later</small></div>
            );
          })}
        </nav>
        <div className="bo-sidebar-footer"><span className="bo-status-dot" />Secure staff workspace<span className="bo-version">PH · Bookify</span></div>
      </aside>

      <div className="bo-main">
        <header className="bo-topbar">
          <button className="bo-menu-toggle" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <div className="bo-breadcrumb"><span>Bookify</span><b>/</b><strong>{title}</strong></div>
          <div className="bo-top-actions"><span className="bo-live-status"><i /> Workspace</span><NotificationCenter /><button className="bo-profile-button" onClick={signOut} title="Sign out"><span className="bo-profile-avatar">{user?.first_name?.slice(0, 1) ?? 'U'}</span><span className="bo-profile-name">{user?.first_name} {user?.last_name}<small>{user?.role}</small></span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6" /></svg></button></div>
        </header>

        <main className="bo-content">
          {section === '' ? <>
            <div className="bo-page-heading"><div><span className="bo-eyebrow">{audience === 'admin' ? 'ADMINISTRATION' : 'OPERATIONS'}</span><h1>Workspace overview</h1><p>A current snapshot of Bookify account activity.</p></div><span className="bo-updated">Live database figures</span></div>
            {error && <div className="bo-alert" role="alert"><strong>Overview unavailable</strong><span>{error}</span></div>}
            <section className="bo-stat-grid" aria-label="Bookify account overview">
              {cards.map((card) => <article className="bo-stat-card" key={card.title}><div className={`bo-stat-icon ${card.tone}`}>{card.title.slice(0, 1)}</div><div className="bo-stat-copy"><span>{card.title}</span><strong>{loading ? '…' : error ? '—' : card.value?.toLocaleString() ?? '—'}</strong><small>{card.note}</small></div></article>)}
            </section>
            <div className="bo-panel-grid">
              <section className="bo-panel"><header><div><h2>Operational activity</h2><p>Recent changes across your marketplace</p></div><span className="bo-panel-badge">Live records</span></header><ActivityFeed basePath={basePath} /></section>
              <section className="bo-panel"><header><div><h2>Workspace status</h2><p>Data sources connected to this workspace</p></div></header><div className="bo-module-list"><ModuleStatus label="Accounts" status="Connected" connected /><ModuleStatus label="Seller applications" status="Connected" connected /><ModuleStatus label="Book listings" status={overview?.available_modules?.includes('listings') ? 'Connected' : 'Unavailable'} connected={overview?.available_modules?.includes('listings')} /><ModuleStatus label="Orders & delivery" status={overview?.available_modules?.includes('orders') ? 'Connected' : 'Unavailable'} connected={overview?.available_modules?.includes('orders')} /><ModuleStatus label="Refunds" status={overview?.available_modules?.includes('refunds') ? 'Connected' : 'Unavailable'} connected={overview?.available_modules?.includes('refunds')} /><ModuleStatus label="Notifications" status="Unavailable" /></div></section>
            </div>
            <section className="bo-panel bo-quick-panel"><header><div><h2>Quick actions</h2><p>Frequently used back-office tasks</p></div></header><div className="bo-quick-actions">{isAdmin && <Link to="/admin/staff" className="bo-quick-link"><span><BackOfficeNavIcon kind="plus" /></span><span>Create a staff account<small>Administrator access required</small></span><b><BackOfficeNavIcon kind="arrow" /></b></Link>}<Link to={`${basePath}/sellers`} className="bo-quick-link"><span><BackOfficeNavIcon kind="store" /></span><span>Review seller applications<small>Applications needing review</small></span><b><BackOfficeNavIcon kind="arrow" /></b></Link><Link to={`${basePath}/listings`} className="bo-quick-link"><span><BackOfficeNavIcon kind="book" /></span><span>Moderate listings<small>Review and publish books</small></span><b><BackOfficeNavIcon kind="arrow" /></b></Link></div></section>
          </> : section === 'users' && isAdmin ? <UsersManagement /> : section === 'staff' && isAdmin ? <StaffManagement /> : section === 'sellers' ? <SellerManagement canReviewDecisions={isAdmin} /> : section === 'listings' ? <ListingsManagement /> : section === 'orders' ? <OrdersManagement /> : section === 'deliveries' ? <DeliveriesManagement /> : section === 'refunds' ? <RefundsManagement /> : section === 'reports' && isAdmin ? <ReportsManagement /> : section === 'audit' && isAdmin ? <AuditLogManagement /> : section === 'settings' ? <SettingsManagement /> : <section className="bo-panel bo-module-placeholder"><span className="bo-eyebrow">{title.toUpperCase()}</span><h1>{title}</h1><p>This area is not available because the required operational workflow and database records have not been implemented.</p><Link to={basePath} className="bo-primary-link">Back to overview →</Link></section>}
        </main>
      </div>
    </div>
  );
};

const ModuleStatus: FC<{ label: string; status: string; connected?: boolean }> = ({ label, status, connected = false }) => <div className="bo-module-row"><span className={`bo-status-dot${connected ? ' connected' : ''}`} /><span>{label}</span><small className={connected ? 'connected' : ''}>{status}</small></div>;

export default BackOfficePage;
