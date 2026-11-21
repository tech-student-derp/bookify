import { type FC } from 'react';
import { useIntersectionFade } from '../hooks/useIntersectionFade';

const steps = [
  {
    number: '01',
    title: 'Discover Books',
    description:
      'Browse thousands of titles across every genre. Filter by category, language, format, or price. Find hidden gems from independent sellers and authors you won\'t find anywhere else.',
  },
  {
    number: '02',
    title: 'Buy or Sell',
    description:
      'Purchase physical books directly from sellers or download e-books instantly. If you\'re a seller or author, listing your books takes just a few minutes — no middlemen, no fuss.',
  },
  {
    number: '03',
    title: 'Enjoy Your Next Read',
    description:
      'Dive into your next adventure. Rate, review, and share what you\'ve read. Connect with a community of book lovers and keep your reading list growing.',
  },
];

const HowItWorks: FC = () => {
  const ref = useIntersectionFade();

  return (
    <section
      id="explore"
      ref={ref as React.RefObject<HTMLElement>}
      className="section-fade-in"
      style={{
        padding: '80px 24px',
        background: 'var(--bg)',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: '12px',
              fontFamily: "'Geist Mono', monospace",
            }}
          >
            How It Works
          </span>
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
              fontWeight: 700,
              lineHeight: 1.3,
              letterSpacing: '-0.03em',
              color: 'var(--text-heading)',
              margin: '0',
              fontFamily: "'Geist Mono', monospace",
            }}
          >
            Simple. Fast. Readable.
          </h2>
        </div>

        {/* Steps grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '24px',
          }}
        >
          {steps.map((step, i) => (
            <div
              key={step.number}
              style={{
                padding: '32px',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              {/* Background step number */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '16px',
                  fontSize: '5rem',
                  fontWeight: 800,
                  fontFamily: "'Geist Mono', monospace",
                  color: i === 0
                    ? 'color-mix(in oklch, var(--green-500) 10%, transparent)'
                    : i === 1
                      ? 'color-mix(in oklch, var(--blue-500) 10%, transparent)'
                      : 'color-mix(in oklch, var(--green-400) 10%, transparent)',
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                {step.number}
              </span>
{/* Step number badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background:
                    i === 0
                      ? 'linear-gradient(135deg, var(--green-500), var(--green-400))'
                      : i === 1
                        ? 'linear-gradient(135deg, var(--blue-500), var(--blue-400))'
                        : 'linear-gradient(135deg, var(--green-400), var(--blue-400))',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: "'Geist Mono', monospace",
                }}
              >
                {i + 1}
              </span>

              <h3
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--text-heading)',
                  margin: 0,
                  fontFamily: "'Geist Mono', monospace",
                  letterSpacing: '-0.01em',
                }}
              >
                {step.title}
              </h3>

              <p
                style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.75,
                  color: 'var(--text-muted)',
                  margin: 0,
                  fontFamily: "'Geist Mono', monospace",
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
