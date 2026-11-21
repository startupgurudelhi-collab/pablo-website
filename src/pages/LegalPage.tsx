import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchPublicLegalPage, subscribeCmsUpdates } from '../lib/api';
import type { LegalPage as LegalPageRecord, LegalPageSlug, SiteSettings } from '../types/studio';
import { LegalDocumentView } from '../components/LegalDocumentView';

interface LegalPageProps {
  slug: LegalPageSlug;
  settings: SiteSettings | null;
}

export function LegalPage({ slug, settings }: LegalPageProps) {
  const [page, setPage] = useState<LegalPageRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const loadLegal = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setUnavailable(false);
        setPage(null);
      }
      try {
        const res = await fetchPublicLegalPage(slug);
        setPage(res.page);
        setUnavailable(false);
      } catch {
        setPage(null);
        setUnavailable(true);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    void loadLegal(false);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadLegal(true);
    };
    const handleFocus = () => void loadLegal(true);
    const unsubscribe = subscribeCmsUpdates((scope) => {
      if (scope === 'legal' || scope === 'all') void loadLegal(true);
    });

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadLegal]);

  useEffect(() => {
    if (!page) return;
    const brandName = settings?.brandName || 'PABLO';
    const nextTitle = page.seoTitle || `${page.title} — ${brandName} Fashion Studio`;
    document.title = nextTitle;

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', nextTitle);

    if (page.seoDescription) {
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) descMeta.setAttribute('content', page.seoDescription);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', page.seoDescription);
    }

    return () => {
      if (settings) {
        const fallbackTitle =
          settings.seoTitle ||
          `${settings.brandName || 'PABLO'} — Fashion Design & Custom Stitching Studio`;
        document.title = fallbackTitle;
        if (ogTitle) ogTitle.setAttribute('content', fallbackTitle);
        if (settings.seoDescription) {
          const descMeta = document.querySelector('meta[name="description"]');
          if (descMeta) descMeta.setAttribute('content', settings.seoDescription);
          const ogDesc = document.querySelector('meta[property="og:description"]');
          if (ogDesc) ogDesc.setAttribute('content', settings.seoDescription);
        }
      }
    };
  }, [page, settings]);

  const otherSlug: LegalPageSlug =
    slug === 'privacy-policy' ? 'terms-and-conditions' : 'privacy-policy';
  const otherLabel =
    otherSlug === 'privacy-policy' ? 'Privacy Policy' : 'Terms & Conditions';

  return (
    <div className="bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-12 pb-20 sm:pt-16 sm:pb-28">
        {loading ? (
          <div className="max-w-3xl space-y-6 animate-pulse">
            <div className="h-3 w-28 bg-[#E9E4DC]" />
            <div className="h-12 w-72 bg-[#E9E4DC]" />
            <div className="h-4 w-40 bg-[#EFECE6]" />
            <div className="pt-8 space-y-3 border-t border-[#171614]/8">
              <div className="h-4 w-full bg-[#EFECE6]" />
              <div className="h-4 w-11/12 bg-[#EFECE6]" />
              <div className="h-4 w-4/5 bg-[#EFECE6]" />
            </div>
          </div>
        ) : unavailable || !page ? (
          <div className="max-w-2xl py-12">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#766E64]">
              Studio Policy
            </p>
            <h1 className="mt-4 font-serif text-4xl font-normal text-[#171614]">
              This page is currently unavailable.
            </h1>
            <p className="mt-4 text-sm text-[#5C5750] leading-relaxed">
              The requested legal document has been unpublished or is temporarily unavailable. Please return to the homepage or contact the studio directly with any questions.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return Home</span>
              </Link>
              <Link
                to="/contact"
                className="text-sm text-[#171614] underline underline-offset-4 hover:text-[#5C5750]"
              >
                Contact Studio
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-8">
              <LegalDocumentView
                title={page.title}
                content={page.content}
                lastRevisedDate={page.lastRevisedDate}
              />
            </div>

            <aside className="lg:col-span-4 lg:pt-2">
              <div className="border-t border-[#171614]/12 pt-6 space-y-5 lg:sticky lg:top-28">
                <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#766E64]">
                  Related
                </p>
                <nav className="flex flex-col gap-3 text-sm">
                  <Link
                    to={`/${otherSlug}`}
                    className="text-[#171614] hover:text-[#766E64] transition-colors"
                  >
                    {otherLabel}
                  </Link>
                  <Link
                    to="/contact"
                    className="text-[#171614] hover:text-[#766E64] transition-colors"
                  >
                    Contact & Studio Enquiries
                  </Link>
                  <Link
                    to="/"
                    className="text-[#5C5750] hover:text-[#171614] transition-colors"
                  >
                    Return to Home
                  </Link>
                </nav>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
