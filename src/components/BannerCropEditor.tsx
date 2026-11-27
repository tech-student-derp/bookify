import { type FC, type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

interface BannerCropEditorProps {
  file: File;
  saving: boolean;
  uploadError: string | null;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
}

interface CroppedPreview {
  file: File;
  url: string;
}

const MAX_BANNER_BYTES = 5 * 1024 * 1024;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image could not be opened. Choose another image.'));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The cropped preview could not be created. Please try another image.'));
    }, type, 0.9);
  });
}

async function createCroppedFile(file: File, imageUrl: string, area: Area): Promise<File> {
  if (area.width < 200 || area.height < 60) {
    throw new Error('The selected crop is below the 200 × 60 px minimum. Zoom out to include more of the image.');
  }

  const image = await loadImage(imageUrl);
  const width = Math.min(4000, Math.floor(area.width));
  const height = Math.round(width / 3);
  if (width < 200 || height < 60 || height > 2000) {
    throw new Error('The selected crop does not meet the banner image size limits. Adjust the crop and try again.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not prepare the cropped image.');

  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height);

  const outputType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ? file.type
    : 'image/png';
  const blob = await canvasToBlob(canvas, outputType);
  if (blob.size > MAX_BANNER_BYTES) {
    throw new Error('The cropped banner is larger than 5 MB. Choose another image or crop a smaller area.');
  }

  const extension = blob.type === 'image/jpeg' ? '.jpg' : blob.type === 'image/webp' ? '.webp' : '.png';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'store-banner';
  return new File([blob], `${baseName}-banner${extension}`, { type: blob.type, lastModified: Date.now() });
}

export const BannerCropEditor: FC<BannerCropEditorProps> = ({
  file,
  saving,
  uploadError,
  onCancel,
  onConfirm,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [preview, setPreview] = useState<CroppedPreview | null>(null);
  const [preparingPreview, setPreparingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const previewRequest = useRef(0);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    let active = true;
    image.onload = () => {
      if (active) setImageUrl(url);
    };
    image.onerror = () => {
      if (active) {
        setSourceError('This image could not be opened. Choose another image.');
        setPreparingPreview(false);
      }
    };
    image.src = url;
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  useEffect(() => () => {
    previewRequest.current += 1;
  }, []);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
    )?.focus();

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  const invalidatePreview = () => {
    previewRequest.current += 1;
    setPreview(null);
    setPreviewError(null);
    setPreparingPreview(true);
  };

  const handleCropComplete = useCallback(async (_area: Area, pixels: Area) => {
    const requestId = ++previewRequest.current;
    setPreparingPreview(true);
    setPreviewError(null);
    try {
      if (!imageUrl) return;
      const croppedFile = await createCroppedFile(file, imageUrl, pixels);
      if (requestId === previewRequest.current) {
        setPreview({ file: croppedFile, url: URL.createObjectURL(croppedFile) });
        setPreparingPreview(false);
      }
    } catch (error) {
      if (requestId === previewRequest.current) {
        setPreviewError(error instanceof Error ? error.message : 'The cropped preview could not be created.');
        setPreparingPreview(false);
      }
    }
  }, [file, imageUrl]);

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    setConfirmationError(null);
    try {
      await onConfirm(preview.file);
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : 'The banner upload failed. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const busy = saving || confirming;

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      if (!busy) onCancel();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? []);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      event.preventDefault();
      dialogRef.current?.focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      first.focus();
    } else if (!dialogRef.current?.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-3 sm:p-6" role="presentation">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="banner-crop-title"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="banner-crop-title" className="text-lg font-semibold text-[var(--text)]">Crop store banner</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Drag to reposition and use the zoom control to resize the crop. Banner shape: 3:1.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Cancel banner crop"
            className="rounded-lg px-2 py-1 text-xl leading-none text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,1fr)]">
          <div className="space-y-3">
            <div className="relative h-48 overflow-hidden rounded-xl bg-slate-900 sm:h-56 md:h-64">
              {imageUrl && (
                <Cropper
                  image={imageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={3 / 1}
                  minZoom={1}
                  maxZoom={3}
                  objectFit="cover"
                  onCropChange={(nextCrop) => { invalidatePreview(); setCrop(nextCrop); }}
                  onZoomChange={(nextZoom) => { invalidatePreview(); setZoom(nextZoom); }}
                  onCropComplete={handleCropComplete}
                />
              )}
            </div>
            <label className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="shrink-0 font-mono">Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => { invalidatePreview(); setZoom(Number(event.target.value)); }}
                aria-label="Resize banner crop"
                className="w-full accent-[var(--accent)]"
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">Banner preview</p>
            <div className="flex aspect-[3/1] items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]">
              {preview ? (
                <img src={preview.url} alt="Preview of the cropped store banner" className="h-full w-full object-cover" />
              ) : (
                <p className="px-4 text-center text-xs text-[var(--text-muted)]">
                  {preparingPreview ? 'Preparing preview…' : sourceError ?? 'Preview unavailable'}
                </p>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">The existing banner stays in place until you save this crop.</p>
          </div>
        </div>

        {(previewError || uploadError || confirmationError) && (
          <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {previewError ?? confirmationError ?? uploadError}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!preview || preparingPreview || !!previewError || busy}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Uploading…' : 'Confirm and Save Banner'}
          </button>
        </div>
      </section>
    </div>
  );
};
