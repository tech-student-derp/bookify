import { type ChangeEvent, type FormEvent, type FC, useEffect, useRef, useState } from 'react';
import {
  apiErrorMessage,
  apiFieldErrors,
  archiveSellerListing,
  createSellerListing,
  displayListingStatus,
  getSellerListing,
  listSellerListings,
  unarchiveSellerListing,
  updateSellerInventory,
  updateSellerListing,
  type ListingInput,
  type SellerListing,
} from '../../services/sellerListingApi';

const EMPTY_FORM: ListingInput = {
  title: '', author: '', publisher: '', description: '', category: '', language: '', isbn: '', price: '',
  condition: 'New', format: 'Physical', stock_quantity: '1', cover_image: null, back_cover: null,
  additional_images: [], interior_previews: [], ebook_file: null, ebook_rights_confirmed: false,
};
const PAGE_SIZE = 9;

type FilterStatus = 'all' | 'draft' | 'pending_review' | 'approved' | 'rejected' | 'needs_revision' | 'suspended' | 'archived';
type Confirmation = { listing: SellerListing; action: 'archive' | 'restore' } | null;

export const SellerListingsPage: FC = () => {
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState<SellerListing | null | 'new'>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      listSellerListings({ page: String(page), per_page: String(PAGE_SIZE), q: search, status })
        .then((result) => {
          if (!active) return;
          setListings(result.listings);
          setTotal(result.total);
          setError('');
        })
        .catch((cause: unknown) => {
          if (!active) return;
          setError(apiErrorMessage(cause, 'Listings could not be loaded.'));
          setListings([]);
          setTotal(0);
        })
        .finally(() => { if (active) setLoading(false); });
    }, search ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [page, search, status, reload]);

  const refresh = () => { setLoading(true); setReload((value) => value + 1); };
  const closeEditor = () => setEditor(null);
  const openEditor = async (listing: SellerListing) => {
    setError('');
    try {
      const result = await getSellerListing(listing.id);
      setEditor({ ...listing, ...result.listing });
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The listing details could not be loaded.'));
    }
  };
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSave = async (input: ListingInput, id: number | undefined, intent: 'draft' | 'submit') => {
    setNotice('');
    const result = id === undefined ? await createSellerListing(input, intent) : await updateSellerListing(id, input, intent);
    setNotice(result.message ?? (intent === 'submit' ? 'Listing submitted for review.' : 'Draft saved.'));
    closeEditor();
    setPage(1);
    refresh();
  };

  const handleConfirmation = async () => {
    if (!confirmation) return;
    const { listing, action } = confirmation;
    try {
      const result = action === 'archive'
        ? await archiveSellerListing(listing.id)
        : await unarchiveSellerListing(listing.id);
      setNotice(result.message ?? (action === 'archive' ? 'Listing archived.' : 'Listing restored for review.'));
      setConfirmation(null);
      refresh();
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The listing could not be updated.'));
      setConfirmation(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-mono uppercase tracking-[0.18em] text-[var(--accent)]">Seller workspace</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">My Book Listings</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Save a draft or submit your book for human review. Only approved listings can appear in the catalog.</p>
        </div>
        <button type="button" onClick={() => setEditor('new')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]">
          <span aria-hidden="true">＋</span> Add a book
        </button>
      </div>

      {notice && <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}
      {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"><span>{error}</span><button type="button" className="font-semibold" onClick={refresh}>Retry</button></div>}

      <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]" aria-label="Listing search and filters">
        <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Search listings
          <input value={search} onChange={(event) => { setLoading(true); setSearch(event.target.value); setPage(1); }} placeholder="Title, author, category, or ISBN" className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Status
          <select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value as FilterStatus); setPage(1); }} className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[var(--text)] outline-none focus:border-[var(--accent)]">
            <option value="all">All listings</option><option value="draft">Drafts</option><option value="pending_review">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="needs_revision">Needs revision</option><option value="suspended">Suspended</option><option value="archived">Archived</option>
          </select>
        </label>
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading listings" aria-busy="true">{[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)]" />)}</div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-hover)] text-2xl" aria-hidden="true">📚</div>
          <h2 className="text-lg font-semibold text-[var(--text)]">{search || status !== 'all' ? 'No matching listings' : 'Your book shelf is empty'}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">{search || status !== 'all' ? 'Try another search or status filter.' : 'Add your first book listing. It will stay hidden from buyers until staff approves it.'}</p>
          {!search && status === 'all' && <button type="button" onClick={() => setEditor('new')} className="mt-5 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white">Create your first listing</button>}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => <ListingCard key={listing.id} listing={listing} onEdit={() => void openEditor(listing)} onArchive={() => setConfirmation({ listing, action: 'archive' })} onRestore={() => setConfirmation({ listing, action: 'restore' })} onInventory={async (quantity) => {
              try { const result = await updateSellerInventory(listing.id, quantity); setNotice(result.message); refresh(); }
              catch (cause) { setError(apiErrorMessage(cause, 'Inventory could not be updated.')); throw cause; }
            }} />)}
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-sm text-[var(--text-muted)] sm:flex-row">
            <span>{total} {total === 1 ? 'listing' : 'listings'} · Page {page} of {pageCount}</span>
            <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => Math.max(1, value - 1)); }} className="rounded-lg border border-[var(--border)] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button type="button" disabled={page >= pageCount} onClick={() => { setLoading(true); setPage((value) => Math.min(pageCount, value + 1)); }} className="rounded-lg border border-[var(--border)] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40">Next</button></div>
          </div>
        </>
      )}

      {editor !== null && <ListingEditor listing={editor === 'new' ? null : editor} onClose={closeEditor} onSave={handleSave} />}
      {confirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setConfirmation(null); }}><section role="dialog" aria-modal="true" aria-labelledby="confirm-listing-title" className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"><h2 id="confirm-listing-title" className="text-lg font-bold text-[var(--text)]">{confirmation.action === 'archive' ? 'Archive this listing?' : 'Restore this listing?'}</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{confirmation.action === 'archive' ? `${confirmation.listing.title} will be hidden from buyers. Its listing and moderation history will be kept.` : `${confirmation.listing.title} will return as a draft and require staff approval before it is published.`}</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setConfirmation(null)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">Cancel</button><button type="button" onClick={handleConfirmation} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">{confirmation.action === 'archive' ? 'Archive listing' : 'Restore for review'}</button></div></section></div>}
    </div>
  );
};

const ListingCard: FC<{ listing: SellerListing; onEdit: () => void; onArchive: () => void; onRestore: () => void; onInventory: (quantity: number) => Promise<void> }> = ({ listing, onEdit, onArchive, onRestore, onInventory }) => {
  const status = displayListingStatus(listing);
  const [inventory, setInventory] = useState(String(listing.stock_quantity));
  const [saving, setSaving] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const saveInventory = async () => {
    if (!/^\d+$/.test(inventory) || Number(inventory) > 2147483647) { setInventoryError('Enter a non-negative whole number.'); return; }
    setSaving(true); setInventoryError('');
    try { await onInventory(Number(inventory)); } catch { setInventoryError('Inventory could not be saved.'); } finally { setSaving(false); }
  };
  return (
    <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex gap-4 p-4">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-hover)]">
          {listing.cover_image_path ? <img src={listing.cover_image_path} alt={`Cover of ${listing.title}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl" aria-label="No cover image">📖</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={status} /><span className="rounded-full bg-[var(--surface-hover)] px-2 py-1 text-[10px] font-medium text-[var(--text-muted)]">{listing.format === 'Physical' ? 'Physical Book' : 'E-book'}</span></div>
          <h2 className="mt-2 line-clamp-2 font-semibold leading-snug text-[var(--text)]">{listing.title || 'Untitled draft'}</h2>
          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{listing.author}</p>
          <p className="mt-2 text-sm font-bold text-[var(--accent)]">₱{Number(listing.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{listing.format === 'Physical' ? `${listing.condition} · ` : ''}{listing.category || 'Category not set'}</p>
        </div>
      </div>
      {listing.moderation_reason && (status === 'rejected' || status === 'needs_revision') && <p className="mx-4 mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"><strong>Staff feedback:</strong> {listing.moderation_reason}</p>}
      <div className="flex flex-wrap items-end gap-3 border-t border-[var(--border)] px-4 py-3">
        {listing.format === 'Physical' && status !== 'suspended' && <>
        <label className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Inventory
          <span className="mt-1 flex items-center gap-2"><input aria-label={`Inventory for ${listing.title}`} type="number" min="0" max="2147483647" step="1" value={inventory} onChange={(event) => setInventory(event.target.value)} className="w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text)]" /><button type="button" disabled={saving || inventory === String(listing.stock_quantity)} onClick={saveInventory} className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button></span>
        </label>
        <span className={`ml-auto text-xs ${listing.stock_quantity > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{listing.stock_quantity > 0 ? 'In stock' : 'Out of stock'}</span>
        </>}
        <span className="ml-auto text-xs text-[var(--text-muted)]">{listing.submitted_at ? `Submitted ${new Date(listing.submitted_at).toLocaleDateString()}` : listing.created_at ? `Created ${new Date(listing.created_at).toLocaleDateString()}` : ''}</span>
      </div>
      {inventoryError && <p role="alert" className="px-4 pb-2 text-xs text-red-600">{inventoryError}</p>}
      <div className="flex gap-2 border-t border-[var(--border)] p-3">
        {status !== 'archived' && status !== 'suspended' && <><button type="button" onClick={onEdit} className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)]">Edit listing</button><button type="button" onClick={onArchive} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10">Archive</button></>}
        {status === 'archived' && <button type="button" onClick={onRestore} className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)]">Restore for review</button>}
      </div>
    </article>
  );
};

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const style = status === 'approved' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : status === 'rejected' || status === 'suspended' ? 'bg-red-500/10 text-red-700 dark:text-red-300' : status === 'archived' ? 'bg-slate-500/10 text-slate-600 dark:text-slate-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
  const label = status === 'pending_review' ? 'Pending review' : status === 'needs_revision' ? 'Needs revision' : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${style}`}>{label}</span>;
};

const ListingEditor: FC<{ listing: SellerListing | null; onClose: () => void; onSave: (input: ListingInput, id: number | undefined, intent: 'draft' | 'submit') => Promise<void> }> = ({ listing, onClose, onSave }) => {
  const [form, setForm] = useState<ListingInput>(listing ? {
    title: listing.title, author: listing.author, publisher: listing.publisher ?? '', description: listing.description ?? '',
    category: listing.category, language: listing.language ?? '', isbn: listing.isbn ?? '', price: listing.price ? String(listing.price) : '',
    condition: listing.condition, format: listing.format, stock_quantity: String(listing.stock_quantity), cover_image: null,
    back_cover: null, additional_images: [], interior_previews: [], ebook_file: null, ebook_rights_confirmed: false,
  } : { ...EMPTY_FORM });
  const [preview, setPreview] = useState(listing?.cover_image_path ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const previewObjectUrl = useRef<string | null>(null);
  useEffect(() => () => { if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current); }, []);

  const set = <K extends keyof ListingInput>(key: K, value: ListingInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => { const next = { ...current }; delete next[key]; return next; });
    setError('');
  };
  const handleCover = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setFieldErrors((current) => ({ ...current, cover_image: 'Choose a JPEG, PNG, or WebP image.' })); return; }
    if (file.size > 5 * 1024 * 1024) { setFieldErrors((current) => ({ ...current, cover_image: 'Image must be 5 MB or smaller.' })); return; }
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    previewObjectUrl.current = URL.createObjectURL(file);
    setPreview(previewObjectUrl.current);
    set('cover_image', file);
  };
  const handleImageGroup = (key: 'back_cover' | 'additional_images' | 'interior_previews', maxCount: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (files.length === 0) return;
    if (files.length > maxCount || files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setFieldErrors((current) => ({ ...current, [key]: `Choose up to ${maxCount} JPEG, PNG, or WebP images, 5 MB each.` }));
      return;
    }
    set(key, (key === 'back_cover' ? files[0] : files) as ListingInput[typeof key]);
  };
  const handleEbookFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'epub'].includes(extension ?? '') || file.size > 50 * 1024 * 1024 || file.size < 1) {
      setFieldErrors((current) => ({ ...current, ebook_file: 'Choose a PDF or EPUB file up to 50 MB.' }));
      return;
    }
    set('ebook_file', file);
  };

  const save = async (intent: 'draft' | 'submit') => {
    const errors: Record<string, string> = {};
    if (intent === 'submit') {
      if (!form.title.trim()) errors.title = 'Book title is required.';
      if (!form.author.trim()) errors.author = 'Author is required.';
      if (!form.category.trim()) errors.category = 'Category is required.';
      if (!/^\d+(?:\.\d{1,2})?$/.test(form.price) || Number(form.price) <= 0) errors.price = 'Enter a price greater than zero with up to two decimals.';
      if (form.format === 'Physical' && (!/^\d+$/.test(form.stock_quantity) || Number(form.stock_quantity) < 1 || Number(form.stock_quantity) > 2147483647)) errors.stock_quantity = 'Enter at least one physical copy.';
      if (form.format === 'E-book' && !form.ebook_file && !listing?.has_ebook_file) errors.ebook_file = 'Upload the digital book file before submitting.';
      if (form.format === 'E-book' && !form.ebook_rights_confirmed) errors.ebook_rights_confirmed = 'Confirm that you are authorized to distribute this e-book.';
    }
    if (form.isbn.trim() && !/^(?:\d{9}[\dXx]|\d{13})$/.test(form.isbn.trim().replace(/[ -]/g, ''))) errors.isbn = 'Enter an ISBN-10 or ISBN-13.';
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setSaving(true); setError(''); setFieldErrors({});
    try { await onSave(form, listing?.id, intent); }
    catch (cause) { setError(apiErrorMessage(cause, 'The listing could not be saved.')); setFieldErrors(apiFieldErrors(cause)); }
    finally { setSaving(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void save('submit'); };
  const inputClass = (key: string) => `mt-1.5 w-full rounded-lg border ${fieldErrors[key] ? 'border-red-500' : 'border-[var(--border)]'} bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]`;
  const fieldError = (key: string) => fieldErrors[key] && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{fieldErrors[key]}</span>;
  const fileNames = (files: File[] | File | null | undefined) => Array.isArray(files) ? files.map((file) => file.name).join(', ') : files?.name ?? '';
  const uploadClass = 'mt-1.5 block w-full text-sm text-[var(--text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-hover)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[var(--text)]';
  const existingMedia = listing?.media ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}>
      <form onSubmit={submit} noValidate role="dialog" aria-modal="true" aria-labelledby="listing-editor-title" className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6"><div><p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--accent)]">Listing details</p><h2 id="listing-editor-title" className="mt-1 text-lg font-bold text-[var(--text)]">{listing ? 'Edit book listing' : 'Add a book'}</h2></div><button type="button" disabled={saving} onClick={onClose} aria-label="Close form" className="rounded-lg px-3 py-1.5 text-xl text-[var(--text-muted)] hover:bg-[var(--surface-hover)]">×</button></header>
        <div className="grid max-h-[75vh] gap-5 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6">
          <label className="text-xs font-semibold text-[var(--text-muted)] sm:col-span-2">Book title<input autoFocus maxLength={255} value={form.title} onChange={(event) => set('title', event.target.value)} className={inputClass('title')} />{fieldError('title')}</label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">Author<input maxLength={255} value={form.author} onChange={(event) => set('author', event.target.value)} className={inputClass('author')} />{fieldError('author')}</label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">Publisher <span className="font-normal">(optional)</span><input maxLength={255} value={form.publisher} onChange={(event) => set('publisher', event.target.value)} className={inputClass('publisher')} /></label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">Category / genre<input maxLength={100} value={form.category} onChange={(event) => set('category', event.target.value)} className={inputClass('category')} />{fieldError('category')}</label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">Language <span className="font-normal">(optional)</span><input maxLength={100} value={form.language} onChange={(event) => set('language', event.target.value)} className={inputClass('language')} /></label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">ISBN <span className="font-normal">(optional)</span><input maxLength={20} value={form.isbn} onChange={(event) => set('isbn', event.target.value)} className={inputClass('isbn')} />{fieldError('isbn')}</label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">Price (₱)<input type="number" min="0" max="99999999.99" step="0.01" value={form.price} onChange={(event) => set('price', event.target.value)} className={inputClass('price')} />{fieldError('price')}</label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">Listing type<select value={form.format} onChange={(event) => set('format', event.target.value as ListingInput['format'])} className={inputClass('format')}><option value="Physical">Physical Book</option><option value="E-book">E-book</option></select></label>
          {form.format === 'Physical' && <>
            <label className="text-xs font-semibold text-[var(--text-muted)]">Condition<select value={form.condition} onChange={(event) => set('condition', event.target.value as ListingInput['condition'])} className={inputClass('condition')}><option>New</option><option>Like New</option><option>Very Good</option><option>Good</option><option>Acceptable</option><option>Pre-owned</option></select>{fieldError('condition')}</label>
            <label className="text-xs font-semibold text-[var(--text-muted)]">Available quantity<input type="number" min="0" max="2147483647" step="1" value={form.stock_quantity} onChange={(event) => set('stock_quantity', event.target.value)} className={inputClass('stock_quantity')} />{fieldError('stock_quantity')}</label>
          </>}
          <label className="text-xs font-semibold text-[var(--text-muted)] sm:col-span-2">Description<textarea rows={4} maxLength={10000} value={form.description} onChange={(event) => set('description', event.target.value)} className={inputClass('description')} /><span className="mt-1 block text-[10px] font-normal">{form.description.length}/10000 characters</span></label>
          <div className="sm:col-span-2"><label className="text-xs font-semibold text-[var(--text-muted)]">Front cover <span className="font-normal">(JPEG, PNG, WebP · up to 5 MB per image)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCover} className={uploadClass} /></label>{fieldError('cover_image')}{preview && <div className="mt-3 flex items-center gap-3"><img src={preview} alt="Front cover preview" className="h-24 w-16 rounded-md border border-[var(--border)] object-cover" />{listing?.cover_image_path && !form.cover_image && <span className="text-xs text-[var(--text-muted)]">Current cover. Choose an image to replace it.</span>}</div>}</div>
          <label className="text-xs font-semibold text-[var(--text-muted)]">Back cover <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageGroup('back_cover', 1)} className={uploadClass} />{fieldError('back_cover')}{fileNames(form.back_cover) && <small className="mt-1 block">Selected: {fileNames(form.back_cover)}</small>}</label>
          <label className="text-xs font-semibold text-[var(--text-muted)]">Additional book photos <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleImageGroup('additional_images', 6)} className={uploadClass} />{fieldError('additional_images')}{fileNames(form.additional_images ?? []) && <small className="mt-1 block">Selected: {fileNames(form.additional_images ?? [])}</small>}</label>
          <label className="text-xs font-semibold text-[var(--text-muted)] sm:col-span-2">Interior page previews / sample pages <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleImageGroup('interior_previews', 6)} className={uploadClass} />{fieldError('interior_previews')}{fileNames(form.interior_previews ?? []) && <small className="mt-1 block">Selected: {fileNames(form.interior_previews ?? [])}</small>}</label>
          <p className="text-xs text-[var(--text-muted)] sm:col-span-2">Combined selected uploads must stay under 35 MB per save.</p>
          {existingMedia.length > 0 && <div className="sm:col-span-2 rounded-lg bg-[var(--surface-hover)] p-3 text-xs text-[var(--text-muted)]"><strong>Existing images:</strong> {existingMedia.map((media) => media.media_type.replaceAll('_', ' ')).join(', ')}. Uploading to an image group replaces the current images in that group.</div>}
          {form.format === 'E-book' && <>
            <div className="sm:col-span-2 rounded-lg border border-[var(--border)] p-4"><label className="text-xs font-semibold text-[var(--text-muted)]">Digital book file <span className="font-normal">(PDF or EPUB · up to 30 MB · stored privately)</span><input type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" onChange={handleEbookFile} className={uploadClass} /></label>{fieldError('ebook_file')}<p className="mt-2 text-xs text-[var(--text-muted)]">{form.ebook_file ? `Selected: ${form.ebook_file.name}` : listing?.has_ebook_file ? `Current private file: ${listing.ebook_file_format ?? 'PDF/EPUB'} (choose a replacement if needed)` : 'No private e-book file uploaded.'} A file download flow is not available yet.</p></div>
            <label className="flex items-start gap-2 text-xs leading-5 text-[var(--text-muted)] sm:col-span-2"><input type="checkbox" checked={form.ebook_rights_confirmed} onChange={(event) => set('ebook_rights_confirmed', event.target.checked)} className="mt-1" /><span>I confirm that I own this digital book or have permission to distribute it through Bookify. The file will stay private until a future approved delivery flow.{fieldError('ebook_rights_confirmed')}</span></label>
          </>}
          {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300 sm:col-span-2">{error}</p>}
          <p className="text-xs leading-5 text-[var(--text-muted)] sm:col-span-2">Drafts are private. Submitted listings stay hidden from buyers until an authorized staff member or administrator approves them. Editing an approved listing hides it while it is reviewed again.</p>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-5 py-4 sm:px-6"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">Cancel</button><button type="button" disabled={saving} onClick={() => void save('draft')} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Save draft'}</button><button type="submit" disabled={saving} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : listing ? 'Submit for review' : 'Submit for review'}</button></footer>
      </form>
    </div>
  );
};

export default SellerListingsPage;
