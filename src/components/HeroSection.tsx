import { useState, useCallback, type FC } from 'react';
import { Link } from 'react-router-dom';
import TypewriterText from './TypewriterText';
import IsometricBookshelf from './IsometricBookshelf';
import { getRandomLanguage, languages, type LanguageEntry } from '../data/translations';
import { useIntersectionFade } from '../hooks/useIntersectionFade';

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

  const handleLanguageChange = useCallback((lang: LanguageEntry) => {
    setCurrentLang(lang);
    window.sessionStorage.setItem(LAST_LANGUAGE_KEY, lang.code);
  }, []);

  return (
    <section
      ref={revealRef}
      id="home"
      className="section-fade-in"
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        paddingTop: '80px',
        paddingBottom: '48px',
        background: `
          radial-gradient(ellipse 70% 60% at 60% 50%,
            color-mix(in oklch, var(--green-500) 8%, transparent) 0%,
            color-mix(in oklch, var(--blue-500) 5%, transparent) 60%,
            transparent 100%)
        `,
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap: '48px',
          alignItems: 'center',
        }}
      >
        {/* Left: text */}
        <div>
          {/* Language badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '24px',
              padding: '5px 12px',
              borderRadius: '999px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontFamily: "'Geist Mono', monospace",
              letterSpacing: '0.03em',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'inline-block',
                animation: 'blink 1.2s ease-in-out infinite',
              }}
            />
            <span>
              {currentLang.nativeName}
              {currentLang.code !== currentLang.name.toLowerCase() && (
                <span style={{ opacity: 0.8 }}> · {currentLang.name}</span>
              )}
            </span>
          </div>

          <TypewriterText initialLanguage={currentLang} onLanguageChange={handleLanguageChange} />

          {/* CTA Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '36px',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="#explore"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                padding: '12px 22px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--green-500), var(--blue-500))',
                color: 'white',
                fontFamily: "'Geist Mono', monospace",
                letterSpacing: '0.02em',
                transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 14px color-mix(in oklch, var(--green-500) 40%, transparent)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                  '0 6px 20px color-mix(in oklch, var(--green-500) 50%, transparent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                  '0 4px 14px color-mix(in oklch, var(--green-500) 40%, transparent)';
              }}
            >
              Explore Books
            </a>

            <Link
              to="/seller-application"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                padding: '12px 22px',
                borderRadius: '10px',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: "'Geist Mono', monospace",
                letterSpacing: '0.02em',
                transition: 'border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-hover)';
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'var(--shadow-sm)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface)';
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
              }}
            >
              Start Selling
            </Link>
          </div>

          {/* Stat chips */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginTop: '40px',
              flexWrap: 'wrap',
            }}
          >
            {[
              { value: '10k+', label: 'Books listed' },
              { value: '500+', label: 'Sellers' },
              { value: '14', label: 'Languages' },
            ].map((stat) => (
              <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: 'var(--accent)',
                    fontFamily: "'Geist Mono', monospace",
                    letterSpacing: '-0.02em',
                  }}
                >
                  {stat.value}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: 3D bookshelf */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <IsometricBookshelf />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
