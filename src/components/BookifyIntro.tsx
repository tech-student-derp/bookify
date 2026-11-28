import type { FC } from 'react';

interface BookifyIntroProps {
  theme: 'light' | 'dark';
}

const BookifyIntro: FC<BookifyIntroProps> = ({ theme }) => (
  <div
    className="bookify-intro"
    data-theme={theme}
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <div className="bookify-intro-grain" aria-hidden="true" />
    <div className="bookify-intro-frame">
      <div className="bookify-intro-signal" aria-hidden="true">
        <span>BKFY / SIGNAL 01</span>
        <span className="bookify-intro-state"><i /> INITIALIZING READER</span>
      </div>
      <div className="bookify-intro-wordmark" data-wordmark="Bookify">
        <span>Bookify</span>
      </div>
      <div className="bookify-intro-footer" aria-hidden="true">
        <span>A world of stories, coming into focus.</span>
        <span className="bookify-intro-progress"><i /></span>
        <span className="bookify-intro-index">01 — 03</span>
      </div>
    </div>
    <span className="bookify-intro-scan" aria-hidden="true" />
    <span className="bookify-intro-corner bookify-intro-corner-top" aria-hidden="true" />
    <span className="bookify-intro-corner bookify-intro-corner-bottom" aria-hidden="true" />
    <span className="bookify-intro-sr-only">Opening Bookify</span>
  </div>
);

export default BookifyIntro;
