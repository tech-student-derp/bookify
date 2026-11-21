import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FC,
} from 'react';
import { languages, getRandomLanguage, type LanguageEntry } from '../data/translations';

// Typing speed constants (ms per character)
const TYPING_SPEED = 12;
const DELETING_SPEED = 7;
const PAUSE_AFTER_TYPING = 8000;
const PAUSE_BETWEEN = 120;

type AnimPhase =
  | 'typing-headline'
  | 'pause-headline'
  | 'typing-body'
  | 'waiting'
  | 'deleting-body'
  | 'deleting-headline'
  | 'done';

interface TypewriterTextProps {
  initialLanguage: LanguageEntry;
  /** called each time the language rotates so parent can update the badge */
  onLanguageChange?: (lang: LanguageEntry) => void;
}

const TypewriterText: FC<TypewriterTextProps> = ({ initialLanguage, onLanguageChange }) => {
  const [currentLang, setCurrentLang] = useState<LanguageEntry>(initialLanguage);
  const [displayedHeadline, setDisplayedHeadline] = useState('');
  const [displayedBody, setDisplayedBody] = useState('');
  const [phase, setPhase] = useState<AnimPhase>('typing-headline');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleNext = useCallback(
    (fn: () => void, delay: number) => {
      clearTimer();
      timerRef.current = setTimeout(fn, delay);
    },
    [],
  );

  // ── Main animation state machine ──────────────────────────
  useEffect(() => {
    const headline = currentLang.headline;
    const body     = currentLang.supporting;

    if (phase === 'typing-headline') {
      if (displayedHeadline.length < headline.length) {
        scheduleNext(() => {
          setDisplayedHeadline(headline.slice(0, displayedHeadline.length + 1));
        }, TYPING_SPEED);
      } else {
        scheduleNext(() => setPhase('pause-headline'), PAUSE_BETWEEN);
      }
    } else if (phase === 'pause-headline') {
      scheduleNext(() => setPhase('typing-body'), PAUSE_BETWEEN);
    } else if (phase === 'typing-body') {
      if (displayedBody.length < body.length) {
        scheduleNext(() => {
          setDisplayedBody(body.slice(0, displayedBody.length + 1));
        }, TYPING_SPEED);
      } else {
        scheduleNext(() => setPhase('waiting'), PAUSE_AFTER_TYPING);
      }
    } else if (phase === 'waiting') {
      scheduleNext(() => setPhase('deleting-body'), 0);
    } else if (phase === 'deleting-body') {
      if (displayedBody.length > 0) {
        scheduleNext(() => {
          setDisplayedBody((prev) => prev.slice(0, -1));
        }, DELETING_SPEED);
      } else {
        scheduleNext(() => setPhase('deleting-headline'), PAUSE_BETWEEN);
      }
    } else if (phase === 'deleting-headline') {
      if (displayedHeadline.length > 0) {
        scheduleNext(() => {
          setDisplayedHeadline((prev) => prev.slice(0, -1));
        }, DELETING_SPEED);
      } else {
        scheduleNext(() => setPhase('done'), PAUSE_BETWEEN);
      }
    } else if (phase === 'done') {
      // Pick next language and restart
      const next = getRandomLanguage(currentLang.code, languages);
      setCurrentLang(next);
      onLanguageChange?.(next);
      setPhase('typing-headline');
    }

    return clearTimer;
  }, [phase, displayedHeadline, displayedBody, currentLang, scheduleNext, onLanguageChange]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), []);

  const showHeadlineCursor = phase === 'typing-headline' || phase === 'pause-headline';
  const showBodyCursor     = phase === 'typing-body';

  return (
    <div>
      <h1
        style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.8rem)',
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: '-0.03em',
          color: 'var(--text-heading)',
          marginBottom: '1.25rem',
          fontFamily: "'Geist Mono', monospace",
          minHeight: '3.5em',
        }}
      >
        {displayedHeadline}
        {showHeadlineCursor && (
          <span className="typewriter-cursor" aria-hidden="true" />
        )}
      </h1>

      <p
        style={{
          fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)',
          lineHeight: 1.75,
          color: 'var(--text-muted)',
          maxWidth: '52ch',
          marginBottom: 0,
          fontFamily: "'Geist Mono', monospace",
          minHeight: '5em',
        }}
      >
        {displayedBody}
        {showBodyCursor && (
          <span className="typewriter-cursor" aria-hidden="true" />
        )}
      </p>
    </div>
  );
};

export default TypewriterText;
