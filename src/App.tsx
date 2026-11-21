import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { fetchSiteData, subscribeCmsUpdates } from './lib/api';
import type { SiteSettings } from './types/studio';
import { PublicLayout } from './components/PublicLayout';
import { HomePage } from './pages/HomePage';
import { WorkPage } from './pages/WorkPage';
import { EventsPage } from './pages/EventsPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { LegalPage } from './pages/LegalPage';
import { AdminPage } from './pages/AdminPage';

function AppRoutes() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const location = useLocation();

  const refreshSiteSettings = useCallback(() => {
    fetchSiteData()
      .then((data) => setSettings(data.settings))
      .catch(() => {
        // Individual pages handle loading/error states gracefully
      });
  }, []);

  useEffect(() => {
    refreshSiteSettings();
  }, [location.pathname, refreshSiteSettings]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshSiteSettings();
      }
    };
    const unsubscribe = subscribeCmsUpdates((scope) => {
      if (scope === 'settings' || scope === 'all') {
        refreshSiteSettings();
      }
    });
    window.addEventListener('focus', refreshSiteSettings);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', refreshSiteSettings);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshSiteSettings]);

  useEffect(() => {
    if (!settings) return;
    const isLegalPage =
      location.pathname === '/privacy-policy' || location.pathname === '/terms-and-conditions';
    if (!isLegalPage) {
      const title =
        settings.seoTitle ||
        `${settings.brandName || 'PABLO'} — Fashion Design & Custom Stitching Studio`;
      document.title = title;

      if (settings.seoDescription) {
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) descMeta.setAttribute('content', settings.seoDescription);
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', settings.seoDescription);
      }

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);
    }

    if (settings.faviconUrl) {
      let iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        document.head.appendChild(iconLink);
      }
      iconLink.href = settings.faviconUrl;
    }
  }, [settings, location.pathname]);

  return (
    <Routes>
      <Route element={<PublicLayout settings={settings} />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/work" element={<WorkPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/about" element={<AboutPage settings={settings} />} />
        <Route path="/contact" element={<ContactPage settings={settings} />} />
        <Route
          path="/privacy-policy"
          element={<LegalPage slug="privacy-policy" settings={settings} />}
        />
        <Route
          path="/terms-and-conditions"
          element={<LegalPage slug="terms-and-conditions" settings={settings} />}
        />
      </Route>
      <Route
        path="/admin"
        element={<AdminPage onSettingsUpdated={(nextSettings) => setSettings(nextSettings)} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
