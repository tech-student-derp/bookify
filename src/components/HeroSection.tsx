import { useCallback, useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import TypewriterText from './TypewriterText';
import IsometricBookshelf from './IsometricBookshelf';
import { getRandomLanguage, languages, type LanguageEntry } from '../data/translations';
import { useIntersectionFade } from '../hooks/useIntersectionFade';

interface PublicStatistics {
  total_books: number;
  active_sellers: number;
  available_languages: number;
}

const formatNumber = new Intl.NumberFormat();
const LAST_LANGUAGE_KEY = 'bookify-hero-language';

function getInitialLanguage(): LanguageEntry {
  const previous = window.sessionStorage.getItem(LAST_LANGUAGE_KEY) ?? '';
  const initial = getRandomLanguage(previous, languages);
  window.sessionStorage.setItem(LAST_LANGUAGE_KEY, initial.code);
  return initial;
}

const HeroSection: FC = () => {
  const revealRef = useIntersectionFade(0.1);
  const [currentLang, setCurrentLang] = useState<LanguageEntry>(getInitialLanguage);
  const [statistics, setStatistics] = useState<PublicStatistics | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/backend/controllers/PublicStatisticsController.php', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Statistics unavailable');
        return response.json() as Promise<{ success: boolean } & PublicStatistics>;
      })
      .then((data) => {
        if (!data.success) throw new Error('Statistics unavailable');
        setStatistics({
          total_books: data.total_books,
          active_sellers: data.active_sellers,
          available_languages: data.available_languages,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setStatistics(null);
      })
      .finally(() => setStatisticsLoading(false));
    return () => controller.abort();
  }, []);

  const handleLanguageChange = useCallback((language: LanguageEntry) => {
    setCurrentLang(language);
    window.sessionStorage.setItem(LAST_LANGUAGE_KEY, language.code);
  }, []);

  const stats = [
    { key: 'total_books', label: 'Books listed' },
    { key: 'active_sellers', label: 'Active sellers' },
    { key: 'available_languages', label: 'Languages' },
  ] as const;

  return (
    <section ref={revealRef} id="home" className="hero-section section-fade-in">
      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" aria-hidden="true" />
            A marketplace for every kind of reader
          </div>
          <div className="hero-language" aria-label={`Bookify welcomes readers in ${currentLang.name}`}>
            <span>{currentLang.nativeName}</span>
            {currentLang.name && <span className="hero-language-english"> · {currentLang.name}</span>}
          </div>
          <TypewriterText initialLanguage={currentLang} onLanguageChange={handleLanguageChange} />

          <div className="hero-actions">
            <a className="hero-button hero-button-primary" href="#explore">
              Explore books
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 5l5 5-5 5" /></svg>
            </a>
            <Link className="hero-button hero-button-secondary" to="/seller-application">
              Become a seller
            </Link>
          </div>

          <div className="hero-statistics" aria-label="Bookify marketplace statistics" aria-live="polite">
            {stats.map((stat) => {
              const value = statistics?.[stat.key];
              return (
                <div className="hero-stat" key={stat.key}>
                  <span className="hero-stat-value">
                    {statisticsLoading ? '…' : value === undefined ? '—' : formatNumber.format(value)}
                  </span>
                  <span className="hero-stat-label">{stat.label}</span>
                </div>
              );
            })}
            {!statisticsLoading && !statistics && (
              <span className="hero-stat-note">Live figures are temporarily unavailable.</span>
            )}
          </div>
        </div>

        <div className="hero-artwork" aria-label="Interactive 3D bookshelf">
          <IsometricBookshelf />
          <p className="hero-artwork-caption"><span>01</span> Find your next favorite</p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
