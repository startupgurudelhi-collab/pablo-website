import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin, MessageCircle, Play } from 'lucide-react';
import { fetchHomeData, fetchPublicCollections, subscribeCmsUpdates } from '../lib/api';
import type {
  PortfolioCategory,
  PortfolioItem,
  SiteSettings,
  StudioEvent,
  WorkCollection,
} from '../types/studio';
import { StudioMedia } from '../components/StudioMedia';
import { LightboxModal } from '../components/LightboxModal';
import { EventModal, formatEventDate } from '../components/EventModal';
import { formatWhatsAppUrl, isExternalHref } from '../components/PublicLayout';

function SmartCta({
  to,
  className,
  children,
}: {
  to: string;
  className: string;
  children: React.ReactNode;
}) {
  if (isExternalHref(to)) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to || '/contact'} className={className}>
      {children}
    </Link>
  );
}

export function HomePage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [featuredItems, setFeaturedItems] = useState<PortfolioItem[]>([]);
  const [recentItems, setRecentItems] = useState<PortfolioItem[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<StudioEvent[]>([]);
  const [collections, setCollections] = useState<WorkCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeEvent, setActiveEvent] = useState<StudioEvent | null>(null);

  const loadHome = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [data, collectionsRes] = await Promise.all([
        fetchHomeData(),
        fetchPublicCollections().catch(() => ({
          pageSettings: null,
          collections: [] as WorkCollection[],
        })),
      ]);
      setSettings(data.settings);
      setCategories(data.categories);
      setFeaturedItems(data.featuredItems);
      setRecentItems(data.recentItems);
      setFeaturedEvents(data.featuredEvents || []);
      setCollections(collectionsRes.collections || []);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Unable to load studio showcase.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHome(false);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadHome(true);
      }
    };
    const handleFocus = () => void loadHome(true);
    const unsubscribe = subscribeCmsUpdates(() => {
      void loadHome(true);
    });

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadHome]);

  const showcaseItems = featuredItems.length > 0 ? featuredItems : recentItems;
  const whatsappRaw = settings?.whatsappNumber || settings?.socialLinks?.whatsapp || '';
  const whatsappUrl = whatsappRaw ? formatWhatsAppUrl(whatsappRaw) : '';

  if (loading && !settings) {
    return (
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-5 space-y-6 py-8">
            <div className="h-3 w-40 bg-[#EAE5DD] animate-pulse" />
            <div className="h-14 w-full bg-[#EAE5DD] animate-pulse" />
            <div className="h-20 w-4/5 bg-[#EAE5DD] animate-pulse" />
          </div>
          <div className="lg:col-span-7 aspect-[16/10] bg-[#EAE5DD] animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-24 text-center">
        <h1 className="font-serif text-3xl text-[#171614]">Unable to reach the atelier</h1>
        <p className="mt-3 text-sm text-[#5C5750]">{error}</p>
        <button
          type="button"
          onClick={() => void loadHome(false)}
          className="mt-6 px-6 py-3 text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Editorial Split Hero */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-10 pb-16 lg:pt-14 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-between py-2 lg:py-6">
            <div>
              <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">
                {settings?.heroSubheadline || 'Fashion Design & Custom Stitching Studio'}
              </p>
              <h1 className="mt-5 font-serif text-5xl sm:text-6xl xl:text-[4.25rem] font-normal leading-[1.03] tracking-tight text-[#171614] editorial-balance">
                {settings?.heroHeadline || 'Designed to be different.'}
              </h1>
              <p className="mt-6 text-base text-[#5C5750] leading-relaxed max-w-md">
                {settings?.heroDescription ||
                  'An independent atelier creating bespoke garments, sculpted occasion wear, and hand-finished silhouettes tailored to individual form.'}
              </p>
            </div>

            <div className="mt-10 pt-8 border-t border-[#171614]/10 flex flex-wrap items-center gap-6">
              <SmartCta
                to={settings?.heroPrimaryCtaUrl || '/work'}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors duration-200 whitespace-nowrap"
              >
                <span>{settings?.heroPrimaryCtaText || 'Explore Our Work'}</span>
                <ArrowRight className="w-4 h-4" />
              </SmartCta>
              <SmartCta
                to={settings?.heroSecondaryCtaUrl || '/contact'}
                className="text-sm font-medium text-[#171614] underline underline-offset-4 hover:text-[#5C5750] transition-colors whitespace-nowrap"
              >
                {settings?.heroSecondaryCtaText || 'Request a Custom Piece'}
              </SmartCta>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative w-full h-full min-h-[360px] sm:min-h-[460px] lg:min-h-[560px] bg-[#EFECE6] overflow-hidden">
              <StudioMedia
                src={settings?.heroMediaUrl || ''}
                thumbnailSrc={settings?.heroMediaUrl || ''}
                mediaType={settings?.heroMediaType || 'image'}
                alt={settings?.brandName || 'PABLO Atelier'}
                eager
                autoPlayVideo={settings?.heroMediaType === 'video'}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Fashion Designs */}
      <section className="bg-white border-y border-[#171614]/8 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-10 border-b border-[#171614]/8">
            <div>
              <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">Selected Portfolio</p>
              <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-[#171614]">
                Featured Creations
              </h2>
            </div>
            <Link
              to="/work"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#171614] hover:text-[#5C5750] transition-colors whitespace-nowrap shrink-0"
            >
              <span>View Full Archive</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {showcaseItems.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#766E64]">
              New studio creations are being curated. Visit Our Work soon.
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">
              {showcaseItems.slice(0, 4).map((item, idx) => {
                const catName =
                  categories.find((c) => c.id === item.categoryId)?.name || 'Atelier Collection';
                const colSpan = idx === 0 || idx === 3 ? 'md:col-span-7' : 'md:col-span-5';
                const aspectClass = idx === 0 || idx === 3 ? 'aspect-[4/3]' : 'aspect-[3/4]';

                return (
                  <article key={item.id} className={`${colSpan} group`}>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
                    >
                      <div className={`relative w-full overflow-hidden bg-[#EFECE6] ${aspectClass}`}>
                        <StudioMedia
                          src={item.mediaUrl}
                          thumbnailSrc={item.thumbnailUrl || item.mediaUrl}
                          mediaType={item.mediaType}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.03]"
                        />
                        {item.mediaType === 'video' && (
                          <div className="absolute bottom-4 right-4 w-11 h-11 bg-[#171614]/85 text-[#FAF8F5] flex items-center justify-center">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        )}
                      </div>

                      <div className="pt-4 flex items-baseline justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-[#766E64]">
                            <span>{catName}</span>
                            {item.mediaType === 'video' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Film</span>
                              </>
                            )}
                          </div>
                          <h3 className="mt-1 font-serif text-2xl font-normal text-[#171614] group-hover:text-[#5C5750] transition-colors">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Explore Our Collections (Dynamic from GET /api/public/collections) */}
      {collections.length > 0 && (
        <section
          aria-labelledby="home-collections-heading"
          className="bg-[#FAF8F5] border-b border-[#171614]/8 py-16 sm:py-24"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-10 border-b border-[#171614]/10">
              <div>
                <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">
                  Curated Atelier Archive
                </p>
                <h2
                  id="home-collections-heading"
                  className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-[#171614] editorial-balance"
                >
                  Explore Our Collections
                </h2>
              </div>
              <Link
                to="/work"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#171614] hover:text-[#5C5750] transition-colors whitespace-nowrap shrink-0"
              >
                <span>View All Collections</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Lead Collection Editorial Split */}
            {(() => {
              const lead = collections[0];
              const leadMedia = lead.media || [];
              const leadPhotos = leadMedia.filter((m) => m.mediaType === 'image').length;
              const leadVideos = leadMedia.filter((m) => m.mediaType === 'video').length;
              const countParts: string[] = [];
              if (leadPhotos > 0) {
                countParts.push(`${leadPhotos} ${leadPhotos === 1 ? 'Photograph' : 'Photographs'}`);
              }
              if (leadVideos > 0) {
                countParts.push(`${leadVideos} ${leadVideos === 1 ? 'Video' : 'Videos'}`);
              }

              return (
                <article className="mt-10 bg-white border border-[#171614]/10 grid grid-cols-1 lg:grid-cols-12 overflow-hidden group">
                  <Link
                    to={`/our-work/collection/${lead.slug}`}
                    className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto lg:min-h-[420px] bg-[#EFECE6] overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
                  >
                    <StudioMedia
                      src={lead.coverImageUrl}
                      thumbnailSrc={lead.coverImageUrl}
                      mediaType="image"
                      alt={lead.title}
                      className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.03]"
                    />
                  </Link>

                  <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums uppercase tracking-[0.14em] text-[#766E64]">
                        <span>Collection 01</span>
                        {countParts.length > 0 && <span>{countParts.join(' · ')}</span>}
                      </div>

                      <h3 className="mt-4 font-serif text-3xl sm:text-4xl font-normal text-[#171614] leading-[1.08] editorial-balance">
                        <Link
                          to={`/our-work/collection/${lead.slug}`}
                          className="hover:text-[#5C5750] transition-colors"
                        >
                          {lead.title}
                        </Link>
                      </h3>

                      {lead.description && (
                        <p className="mt-4 text-sm sm:text-base text-[#5C5750] leading-relaxed line-clamp-3">
                          {lead.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#171614]/8 flex flex-wrap items-center justify-between gap-4">
                      <Link
                        to={`/our-work/collection/${lead.slug}`}
                        className="inline-flex items-center gap-2.5 px-6 py-3 text-xs sm:text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors whitespace-nowrap"
                      >
                        <span>Explore Collection</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link
                        to="/work"
                        className="text-xs font-medium text-[#5C5750] hover:text-[#171614] underline underline-offset-4 transition-colors"
                      >
                        All Studio Works
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })()}

            {/* Remaining Collections Grid */}
            {collections.length > 1 && (
              <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 lg:gap-8">
                {collections.slice(1).map((col, idx) => {
                  const media = col.media || [];
                  const photoCount = media.filter((m) => m.mediaType === 'image').length;
                  const videoCount = media.filter((m) => m.mediaType === 'video').length;
                  const indexLabel = String(idx + 2).padStart(2, '0');
                  const countText =
                    photoCount > 0 || videoCount > 0
                      ? [
                          photoCount > 0
                            ? `${photoCount} ${photoCount === 1 ? 'Photo' : 'Photos'}`
                            : '',
                          videoCount > 0
                            ? `${videoCount} ${videoCount === 1 ? 'Video' : 'Videos'}`
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : '';

                  return (
                    <article key={col.id} className="group flex flex-col justify-between">
                      <Link
                        to={`/our-work/collection/${col.slug}`}
                        className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
                      >
                        <div className="relative aspect-[3/4] bg-[#EFECE6] overflow-hidden">
                          <StudioMedia
                            src={col.coverImageUrl}
                            thumbnailSrc={col.coverImageUrl}
                            mediaType="image"
                            alt={col.title}
                            className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.03]"
                          />
                        </div>

                        <div className="pt-4">
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums uppercase tracking-[0.12em] text-[#766E64]">
                            <span>Collection {indexLabel}</span>
                            {countText && <span>{countText}</span>}
                          </div>

                          <h3 className="mt-1.5 font-serif text-2xl font-normal text-[#171614] leading-snug group-hover:text-[#5C5750] transition-colors">
                            {col.title}
                          </h3>

                          {col.description && (
                            <p className="mt-1.5 text-sm text-[#5C5750] line-clamp-2 leading-relaxed">
                              {col.description}
                            </p>
                          )}

                          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-[#171614] underline underline-offset-4 group-hover:text-[#5C5750] transition-colors">
                            <span>Explore Collection</span>
                            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Events Showcase */}
      {featuredEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-10 border-b border-[#171614]/8">
            <div>
              <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">
                Showcases & Exhibitions
              </p>
              <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-[#171614]">
                Featured Events
              </h2>
            </div>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#171614] hover:text-[#5C5750] transition-colors whitespace-nowrap shrink-0"
            >
              <span>All Events & Showcases</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {featuredEvents.slice(0, 2).map((evt) => (
              <article key={evt.id} className="group">
                <button
                  type="button"
                  onClick={() => setActiveEvent(evt)}
                  className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
                >
                  <div className="relative aspect-[16/10] bg-[#EFECE6] overflow-hidden">
                    <StudioMedia
                      src={evt.coverImageUrl}
                      thumbnailSrc={evt.coverImageUrl}
                      mediaType="image"
                      alt={evt.title}
                      className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.03]"
                    />
                    {evt.videoUrl && (
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-[#171614]/85 text-[#FAF8F5] text-xs inline-flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Film</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#766E64]">
                      <span>{evt.category}</span>
                      {evt.eventDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatEventDate(evt.eventDate)}
                          </span>
                        </>
                      )}
                      {evt.location && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {evt.location}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="mt-1.5 font-serif text-2xl font-normal text-[#171614] group-hover:text-[#5C5750] transition-colors">
                      {evt.title}
                    </h3>
                    {evt.description && (
                      <p className="mt-2 text-sm text-[#5C5750] line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    )}
                  </div>
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Studio Craft & Services Overview */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-[#171614]/8">
          <div className="lg:col-span-4">
            <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">
              {settings?.homeIntroKicker || 'Studio Practice'}
            </p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-[#171614] editorial-balance">
              {settings?.homeIntroHeadline || 'Tailoring built around form and permanence.'}
            </h2>
          </div>
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="pt-4 border-t border-[#171614]/15">
              <p className="font-mono text-xs text-[#766E64] tabular-nums">01</p>
              <h3 className="mt-3 font-serif text-xl text-[#171614]">Custom Stitching</h3>
              <p className="mt-2 text-sm text-[#5C5750] leading-relaxed">
                Individual pattern drafting, canvas construction, and bespoke fittings tailored to natural posture.
              </p>
            </div>
            <div className="pt-4 border-t border-[#171614]/15">
              <p className="font-mono text-xs text-[#766E64] tabular-nums">02</p>
              <h3 className="mt-3 font-serif text-xl text-[#171614]">Occasion & Event Wear</h3>
              <p className="mt-2 text-sm text-[#5C5750] leading-relaxed">
                Sculpted silhouettes in silk, wool, and linen conceived for milestones, ceremonies, and private gatherings.
              </p>
            </div>
            <div className="pt-4 border-t border-[#171614]/15">
              <p className="font-mono text-xs text-[#766E64] tabular-nums">03</p>
              <h3 className="mt-3 font-serif text-xl text-[#171614]">Embroidery & Detailing</h3>
              <p className="mt-2 text-sm text-[#5C5750] leading-relaxed">
                Tonal threadwork, fine hand-finishing, and surface textures crafted directly in the atelier.
              </p>
            </div>
          </div>
        </div>

        {/* Private Consultation CTA */}
        <div className="pt-14 sm:pt-16 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#171614] editorial-balance">
              {settings?.homeCtaHeadline || 'Commission a bespoke outfit with PABLO.'}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#5C5750] leading-relaxed">
              {settings?.homeCtaDescription ||
                'Share your occasion, fabric direction, or timeline with our studio team to schedule a personal consultation.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium border border-[#171614] text-[#171614] hover:bg-[#171614] hover:text-[#FAF8F5] transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Studio</span>
              </a>
            )}
            <SmartCta
              to={settings?.homeCtaButtonUrl || '/contact'}
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors whitespace-nowrap"
            >
              <span>{settings?.homeCtaButtonText || 'Send Enquiry'}</span>
              <ArrowRight className="w-4 h-4" />
            </SmartCta>
          </div>
        </div>
      </section>

      <LightboxModal
        items={showcaseItems}
        categories={categories}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />

      <EventModal event={activeEvent} onClose={() => setActiveEvent(null)} />
    </div>
  );
}
