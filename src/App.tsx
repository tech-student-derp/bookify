import { type FC } from 'react';
import { useTheme } from './hooks/useTheme';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import WhatIsBookify from './components/WhatIsBookify';
import HowItWorks from './components/HowItWorks';
import SellerIntroduction from './components/SellerIntroduction';
import Footer from './components/Footer';

const App: FC = () => {
  const { resolvedScheme, toggle } = useTheme();

  return (
    <>
      <Navbar resolvedScheme={resolvedScheme} onToggleTheme={toggle} />
      <main>
        <HeroSection />
        <WhatIsBookify />
        <HowItWorks />
        <SellerIntroduction />
      </main>
      <Footer />
    </>
  );
};

export default App;
