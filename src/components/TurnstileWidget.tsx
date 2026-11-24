import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  theme: 'auto';
  size: 'flexible';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onToken: (token: string) => void;
}

let turnstileScriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstileScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-bookify-turnstile]');
    const script = existing ?? document.createElement('script');
    const onLoad = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
        script.remove();
        reject(new Error('Turnstile unavailable'));
      }
    };
    const onError = () => {
      script.remove();
      reject(new Error('Turnstile unavailable'));
    };

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.bookifyTurnstile = 'true';
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    turnstileScriptPromise = null;
    throw error;
  });

  return turnstileScriptPromise;
}

const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  TurnstileWidgetProps
>(function TurnstileWidget({ siteKey, onToken }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  onTokenRef.current = onToken;

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      onTokenRef.current('');
    },
  }), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    if (!siteKey) {
      setLoading(false);
      setError('Bot protection is not configured. Please try again later.');
      return () => { active = false; };
    }

    loadTurnstileScript()
      .then((api) => {
        if (!active || !containerRef.current) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          action: 'register',
          theme: 'auto',
          size: 'flexible',
          callback: (token) => {
            setError('');
            onTokenRef.current(token);
          },
          'expired-callback': () => {
            onTokenRef.current('');
            setError('The bot check expired. Please complete it again.');
          },
          'error-callback': () => {
            onTokenRef.current('');
            setError('The bot check could not be completed. Please retry.');
          },
        });
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('The bot check could not be loaded. Check your connection and refresh the page.');
        setLoading(false);
      });

    return () => {
      active = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  return (
    <div className="w-full min-w-0" aria-busy={loading}>
      <div ref={containerRef} className="min-h-[66px] w-full max-w-full overflow-x-auto" />
      {loading && <p className="mt-2 text-xs text-[var(--text-muted)]">Loading bot protection…</p>}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="status">{error}</p>}
    </div>
  );
});

export default TurnstileWidget;
