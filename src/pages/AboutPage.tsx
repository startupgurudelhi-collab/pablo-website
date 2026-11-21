import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { fetchPublicAbout, subscribeCmsUpdates } from '../lib/api';
import type { AboutPageData, SiteSettings } from '../types/studio';
import { StudioMedia } from '../components/StudioMedia';
import { isExternalHref } from '../components/PublicLayout';

interface AboutPageProps {
  settings: SiteSettings | null;
}

function SafeActionLink({
  to,
  className,
  children,
}: {
  to: string;
  className: string;
  children: ReactNode;
}) {
  const safeTarget =
    to && (to.startsWith('/') || isExternalHref(to)) ? to : '/contact';

  if (isExternalHref(safeTarget)) {
    return (
      <a
        href={safeTarget}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={safeTarget} className={className}>
      {children}
    </Link>
  );
}

export function AboutPage({ settings }: AboutPageProps) {
  const [aboutData, setAboutData] = useState<AboutPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAbout = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await fetchPublicAbout();
      setAboutData(data);
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof Error ? err.message : 'Unable to load About page.'
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAbout(false);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadAbout(true);
      }
    };
    const handleFocus = () => void loadAbout(true);
    const unsubscribe = subscribeCmsUpdates((scope) => {
      if (scope === 'about' || scope === 'settings' || scope === 'all') {
        void loadAbout(true);
      }
    });

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadAbout]);

  if (loading && !aboutData) {
    return (
      <div className="bg-[#FAF8F5]">
        <div className="w-full h-[340px] sm:h-[400px] lg:h-[450px] bg-[#EAE5DD] animate-pulse" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-6 space-y-5">
            <div className="h-3 w-28 bg-[#EAE5DD] animate-pulse" />
            <div className="h-12 w-4/5 bg-[#EAE5DD] animate-pulse" />
            <div className="h-28 w-full bg-[#EAE5DD] animate-pulse" />
          </div>
          <div className="lg:col-span-6 aspect-[4/3] bg-[#EAE5DD] animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !aboutData) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-24 text-center">
        <h1 className="font-serif text-3xl text-[#171614]">
          Unable to load studio story
        </h1>
        <p className="mt-3 text-sm text-[#5C5750]">{error}</p>
        <button
          type="button"
          onClick={() => void loadAbout(false)}
          className="mt-6 px-6 py-3 text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const content = aboutData?.content;
  const services = (aboutData?.services || []).filter((s) => s.published);
  const processSteps = (aboutData?.processSteps || []).filter((s) => s.published);

  const brandName = settings?.brandName || 'PABLO';
  const storyParagraphs = (content?.storyContent || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="bg-[#FAF8F5] text-[#171614] overflow-x-hidden">
      {/* SECTION 1 — FULL-WIDTH HERO BANNER */}
      <section className="relative w-full h-[320px] sm:h-[400px] lg:h-[450px] bg-[#171614] overflow-hidden flex items-center justify-center">
        <StudioMedia
          src={
            content?.heroImageUrl ||
            '/src/assets/images/about_hero_atelier_1795277242672.jpg'
          }
          thumbnailSrc={
            content?.heroImageUrl ||
            '/src/assets/images/about_hero_atelier_1795277242672.jpg'
          }
          mediaType="image"
          alt={content?.heroHeading || `About ${brandName}`}
          eager
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#171614]/45 via-[#171614]/52 to-[#171614]/65"
        />
        <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#FAF8F5] leading-[1.06] tracking-tight editorial-balance">
            {content?.heroHeading || `About ${brandName}`}
          </h1>
          {content?.heroSubtitle && (
            <p className="mt-4 text-sm sm:text-base text-[#FAF8F5]/85 max-w-xl mx-auto leading-relaxed">
              {content.heroSubtitle}
            </p>
          )}
        </div>
      </section>

      {/* SECTION 2 — OUR STORY */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-6">
            {content?.storyEyebrow && (
              <p className="text-xs tracking-[0.18em] uppercase text-[#766E64]">
                {content.storyEyebrow}
              </p>
            )}
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#171614] leading-[1.08] editorial-balance">
              {content?.storyHeading || 'Crafted around the individual.'}
            </h2>

            {storyParagraphs.length > 0 && (
              <div className="mt-7 space-y-5 text-base text-[#4A4640] leading-relaxed">
                {storyParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}

            {content?.storyClosingStatement && (
              <div className="mt-8 pt-6 border-t border-[#171614]/12">
                <p className="font-serif italic text-lg sm:text-xl text-[#5C5750] leading-relaxed">
                  {content.storyClosingStatement}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-6">
            <div className="aspect-[4/3] bg-[#EFECE6] overflow-hidden">
              <StudioMedia
                src={
                  content?.storyImageUrl ||
                  '/src/assets/images/about_story_craft_1795277242734.jpg'
                }
                thumbnailSrc={
                  content?.storyImageUrl ||
                  '/src/assets/images/about_story_craft_1795277242734.jpg'
                }
                mediaType="image"
                alt={content?.storyHeading || `${brandName} Atelier Craft`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — WHAT WE CREATE */}
      {services.length > 0 && (
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-20 sm:pb-28 border-t border-[#171614]/10">
          <div className="max-w-2xl">
            {content?.servicesEyebrow && (
              <p className="text-xs tracking-[0.18em] uppercase text-[#766E64]">
                {content.servicesEyebrow}
              </p>
            )}
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#171614] leading-[1.1] editorial-balance">
              {content?.servicesHeading || 'Disciplines of the Studio'}
            </h2>
          </div>

          <div className="mt-12 sm:mt-14 grid grid-cols-1 md:grid-cols-2 gap-x-10 lg:gap-x-14 gap-y-14 sm:gap-y-16">
            {services.map((service) => (
              <article key={service.id} className="group">
                <div className="aspect-[4/3] bg-[#EFECE6] overflow-hidden">
                  <StudioMedia
                    src={service.imageUrl}
                    thumbnailSrc={service.imageUrl}
                    mediaType="image"
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 editorial-transition"
                  />
                </div>
                <h3 className="mt-5 font-serif text-2xl sm:text-3xl font-normal text-[#171614] leading-snug">
                  {service.title}
                </h3>
                {service.description && (
                  <p className="mt-2.5 text-sm sm:text-base text-[#4A4640] leading-relaxed max-w-xl">
                    {service.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 4 — OUR CREATIVE PROCESS */}
      {processSteps.length > 0 && (
        <section className="bg-[#F3EFE8]/70 border-y border-[#171614]/10">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24 lg:py-28">
            <div className="max-w-2xl">
              {content?.processEyebrow && (
                <p className="text-xs tracking-[0.18em] uppercase text-[#766E64]">
                  {content.processEyebrow}
                </p>
              )}
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#171614] leading-[1.1] editorial-balance">
                {content?.processHeading || 'From consultation to final fitting.'}
              </h2>
            </div>

            <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 lg:gap-x-10 gap-y-10">
              {processSteps.map((step, index) => (
                <div key={step.id} className="pt-6 border-t border-[#171614]/18">
                  <p className="font-mono text-xs tracking-[0.14em] text-[#766E64] tabular-nums">
                    {step.stepNumber || String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-3 font-serif text-2xl font-normal text-[#171614] leading-snug">
                    {step.title}
                  </h3>
                  {step.description && (
                    <p className="mt-3 text-sm text-[#4A4640] leading-relaxed">
                      {step.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 5 — CLOSING IMAGE & CALL TO ACTION */}
      <section className="relative w-full min-h-[380px] sm:min-h-[440px] lg:min-h-[480px] bg-[#171614] overflow-hidden flex items-center justify-center">
        <StudioMedia
          src={
            content?.closingImageUrl ||
            '/src/assets/images/about_closing_silhouette_1795277242788.jpg'
          }
          thumbnailSrc={
            content?.closingImageUrl ||
            '/src/assets/images/about_closing_silhouette_1795277242788.jpg'
          }
          mediaType="image"
          alt={content?.closingHeading || `${brandName} Couture Silhouettes`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#171614]/58"
        />
        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 py-20 text-center text-[#FAF8F5]">
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal leading-[1.08] editorial-balance">
            {content?.closingHeading || 'Every detail tells a story.'}
          </h2>
          {content?.closingDescription && (
            <p className="mt-5 text-sm sm:text-base text-[#FAF8F5]/85 max-w-xl mx-auto leading-relaxed">
              {content.closingDescription}
            </p>
          )}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4 sm:gap-5">
            {content?.closingPrimaryButtonText && (
              <SafeActionLink
                to={content.closingPrimaryButtonUrl || '/work'}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-medium bg-[#FAF8F5] text-[#171614] hover:bg-white transition-colors"
              >
                <span>{content.closingPrimaryButtonText}</span>
                <ArrowRight className="w-4 h-4" />
              </SafeActionLink>
            )}
            {content?.closingSecondaryButtonText && (
              <SafeActionLink
                to={content.closingSecondaryButtonUrl || '/contact'}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-medium border border-[#FAF8F5]/65 text-[#FAF8F5] hover:bg-[#FAF8F5]/12 transition-colors"
              >
                <span>{content.closingSecondaryButtonText}</span>
              </SafeActionLink>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
