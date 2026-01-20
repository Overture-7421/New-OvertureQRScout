import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PitScouting } from './components/PitScouting.tsx'
import type { AppRoute } from './types.ts'

function Router() {
  const [route, setRoute] = useState<AppRoute>('scouting');

  useEffect(() => {
    // Check initial route from URL
    const checkRoute = () => {
      const path = window.location.pathname;
      // Handle both direct path and hash-based routing
      const hash = window.location.hash;

      if (path.toLowerCase().includes('/pitscouting') ||
          path.toLowerCase().includes('/pit-scouting') ||
          hash.toLowerCase().includes('pitscouting') ||
          hash.toLowerCase().includes('pit-scouting')) {
        setRoute('pit-scouting');
      } else {
        setRoute('scouting');
      }
    };

    checkRoute();

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);

    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  const navigateTo = (newRoute: AppRoute) => {
    const basePath = import.meta.env.BASE_URL || '/';
    if (newRoute === 'pit-scouting') {
      window.history.pushState({}, '', `${basePath}PitScouting`);
    } else {
      window.history.pushState({}, '', basePath);
    }
    setRoute(newRoute);
  };

  if (route === 'pit-scouting') {
    return <PitScouting onBack={() => navigateTo('scouting')} />;
  }

  return <App onNavigateToPitScouting={() => navigateTo('pit-scouting')} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
)
