import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Film, Image as ImageIcon } from 'lucide-react';
import { fetchPublicCollections, subscribeCmsUpdates } from '../lib/api';
import type { OurWorkPageSettings, WorkCollection } from '../types/studio';
import { StudioMedia } from '../components/StudioMedia';

type CollectionFilter = 'all' | 'indian-ethnic' | 'western-tailoring' | 'indo-western-craft';

const FILTER_OPTIONS: { id: CollectionFilter; label: string }[] = [
  { id: 'all', label: 'All Collections' },
  { id: 'indian-ethnic', label: 'Indian Ethnic' },
  { id: 'western-tailoring', label: 'Western & Tailoring' },
  { id: 'indo-western-craft', label: 'Indo-Western & Craft' },
];

const ETHNIC_KEYWORDS = [
  'lehenga',
  'bridal',
  'saree',
  'anarkali',
  'salwar',
  'kurti',
  'kameez',
  'banarasi',
  'chanderi',
  'gota',
  'festive',
  'zari',
];

const WESTERN_KEYWORDS = [
  'gown',
  'dress',
  'suit',
  'co-ord',
  'coord',
  'blazer',
  'trouser',
  'velvet',
  'satin',
  'tailored',
  'bespoke suit',
  'double-breasted',
];

const FUSION_CRAFT_KEYWORDS = [
  'indo-western',
  'fusion',
  'bandhgala',
  'dhoti',
  'saree gown',
  'embroidery',
  'zardozi',
  'beadwork',
  'adda',
  'mirror',
  'resham',
  'threadwork',
  'tunic',
];

function buildCollectionSearchText(collection: WorkCollection): string {
  const mediaText = (collection.media || [])
    .map((item) => `${item.caption || ''} ${item.creationDetails || ''}`)
    .join(' ');
  return `${collection.title} ${collection.slug} ${collection.description} ${mediaText}`.toLowerCase();
}

function matchesFilter(collection: WorkCollection, filter: CollectionFilter): boolean {
  if (filter === 'all') return true;
  const text = buildCollectionSearchText(collection);
  if (filter === 'indian-ethnic') {
    return ETHNIC_KEYWORDS.some((kw) => text.includes(kw));
  }
  if (filter === 'western-tailoring') {
    return WESTERN_KEYWORDS.some((kw) => text.includes(kw));
  }
  return FUSION_CRAFT_KEYWORDS.some((kw) => text.includes(kw));
}

function formatMediaSummary(collection: WorkCollection): string {
  const media = collection.media || [];
  const photoCount = media.filter((m) => m.mediaType === 'image').length;
  const videoCount = media.filter((m) => m.mediaType === 'video').length;
  const parts: string[] = [];

  if (photoCount > 0) {
    parts.push(`${photoCount} ${photoCount === 1 ? 'Photograph' : 'Photographs'}`);
  }
  if (videoCount > 0) {
    parts.push(`${videoCount} ${videoCount === 1 ? 'Video' : 'Videos'}`);
  }

  return parts.join(' · ');
}

export function CollectionsPage() {
  const [pageSettings, setPageSettings] = useState<OurWorkPageSettings | null>(null);
  const [collections, setCollections] = useState<WorkCollection[]>([]);
  const [activeFilter, setActiveFilter] = useState<CollectionFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCollections = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await fetchPublicCollections();
      setPageSettings(data.pageSettings);
      setCollections(data.collections);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Unable to load studio collections.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCollections(false);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadCollections(true);
    };
    const handleFocus = () => void loadCollections(true);
    const unsubscribe = subscribeCmsUpdates((scope) => {
      if (scope === 'collections' || scope === 'portfolio' || scope === 'all') {
        void loadCollections(true);
      }
    });

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadCollections]);

  const filteredCollections = useMemo(
    () => collections.filter((col) => matchesFilter(col, activeFilter)),
    [collections, activeFilter]
  );

  const totalMediaStats = useMemo(() => {
    let photos = 0;
    let videos = 0;
    for (const col of collections) {
      for (const item of col.media || []) {
        if (item.mediaType === 'video') videos += 1;
        else photos += 1;
      }
    }
    return { photos, videos };
  }, [collections]);

  const heroImageUrl =
    pageSettings?.introImageUrl || (collections.length > 0 ? collections[0].coverImageUrl : '');

  return (
    <div className="bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-16 sm:pb-24">
        {/* 1. Introductory Hero Section */}
        <header className="pb-12 sm:pb-14 border-b border-[#171614]/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">
                  Atelier Lookbook
                </p>
                <h1 className="mt-3 font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#171614] leading-[1.05] editorial-balance">
                  Collections
                </h1>
                <p className="mt-5 text-base sm:text-lg text-[#5C5750] leading-relaxed max-w-2xl">
                  Curated lookbooks spanning handcrafted Indian bridal lehengas, Banarasi and
                  organza sarees, tailored Anarkalis and salwar suits, contemporary western evening
                  gowns, structured co-ord sets, and bespoke embroidery.
                </p>
              </div>

              {/* Clean unboxed tabular summary (zero pills) */}
              {!loading && collections.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[#171614]/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono tabular-nums uppercase tracking-[0.12em] text-[#766E64]">
                  <span>
                    {collections.length} {collections.length === 1 ? 'Collection' : 'Collections'}
                  </span>
                  {totalMediaStats.photos > 0 && (
                    <>
                      <span aria-hidden="true" className="text-[#C8C1B6]">
                        ·
                      </span>
                      <span>
                        {totalMediaStats.photos}{' '}
                        {totalMediaStats.photos === 1 ? 'Photograph' : 'Photographs'}
                      </span>
                    </>
                  )}
                  {totalMediaStats.videos > 0 && (
                    <>
                      <span aria-hidden="true" className="text-[#C8C1B6]">
                        ·
                      </span>
                      <span>
                        {totalMediaStats.videos}{' '}
                        {totalMediaStats.videos === 1 ? 'Film' : 'Films'}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              {heroImageUrl ? (
                <div className="relative w-full aspect-[4/3] lg:h-full lg:min-h-[300px] bg-[#EFECE6] overflow-hidden">
                  <StudioMedia
                    src={heroImageUrl}
                    thumbnailSrc={heroImageUrl}
                    mediaType="image"
                    alt="PABLO Fashion Design & Custom Stitching Studio Collections"
                    eager
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-[4/3] lg:h-full lg:min-h-[300px] bg-[#EFECE6] flex items-center justify-center p-8 text-center">
                  <span className="font-serif text-xl text-[#766E64]">PABLO Studio Archive</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Category Filters (clean architectural underline tabs, no pills) */}
          {!loading && collections.length > 0 && (
            <div
              role="tablist"
              aria-label="Filter studio collections"
              className="mt-10 pt-6 border-t border-[#171614]/8 flex flex-wrap items-center gap-2 sm:gap-3"
            >
              {FILTER_OPTIONS.map((option) => {
                const isActive = activeFilter === option.id;
                const count = collections.filter((col) => matchesFilter(col, option.id)).length;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveFilter(option.id)}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                      isActive
                        ? 'bg-[#171614] text-[#FAF8F5] border-[#171614]'
                        : 'bg-white text-[#5C5750] border-[#171614]/15 hover:text-[#171614] hover:border-[#171614]/40'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span
                      className={`ml-2 font-mono tabular-nums text-[11px] ${
                        isActive ? 'text-[#D8D0C4]' : 'text-[#8D857B]'
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* Error State */}
        {error && (
          <div className="mt-12 py-16 text-center border border-[#171614]/10 bg-white p-8">
            <p className="text-sm text-[#171614]">{error}</p>
            <button
              type="button"
              onClick={() => void loadCollections(false)}
              className="mt-4 px-6 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5]"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {!error && loading && (
          <div className="pt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="space-y-4">
                <div className="aspect-[3/4] bg-[#EAE5DD] animate-pulse" />
                <div className="h-3 w-32 bg-[#EAE5DD] animate-pulse" />
                <div className="h-7 w-2/3 bg-[#EAE5DD] animate-pulse" />
                <div className="h-12 w-full bg-[#EAE5DD] animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!error && !loading && collections.length === 0 && (
          <div className="mt-12 py-20 text-center border border-[#171614]/10 bg-white px-6">
            <ImageIcon className="w-6 h-6 mx-auto text-[#766E64] mb-3" />
            <h2 className="font-serif text-2xl text-[#171614]">
              Collections are being curated
            </h2>
            <p className="mt-2 text-sm text-[#5C5750] max-w-md mx-auto">
              Our studio lookbooks are currently being updated. Reach out directly for private
              portfolio viewings and bespoke commissions.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-xs font-medium bg-[#171614] text-[#FAF8F5]"
            >
              <span>Book a Fitting</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Filtered Empty State */}
        {!error && !loading && collections.length > 0 && filteredCollections.length === 0 && (
          <div className="mt-12 py-16 text-center border border-[#171614]/10 bg-white px-6">
            <p className="font-serif text-2xl text-[#171614]">
              No collections match this filter
            </p>
            <p className="mt-2 text-sm text-[#5C5750]">
              Explore our complete archive across Indian ethnic and contemporary western design.
            </p>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] cursor-pointer"
            >
              Show All Collections
            </button>
          </div>
        )}

        {/* 2. Responsive Editorial Collections Grid */}
        {!error && !loading && filteredCollections.length > 0 && (
          <section aria-label="Studio Collections" className="pt-12 sm:pt-14">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
              {filteredCollections.map((collection, idx) => {
                const media = collection.media || [];
                const hasVideo = media.some((m) => m.mediaType === 'video');
                const mediaSummary = formatMediaSummary(collection);
                const originalIndex = collections.findIndex((c) => c.id === collection.id);
                const indexLabel = String(
                  (originalIndex >= 0 ? originalIndex : idx) + 1
                ).padStart(2, '0');
                const galleryHref = `/our-work/collection/${collection.slug}`;

                return (
                  <article
                    key={collection.id}
                    className="group flex flex-col justify-between border-b border-[#171614]/10 pb-8"
                  >
                    <div>
                      <Link
                        to={galleryHref}
                        className="block relative aspect-[3/4] bg-[#EFECE6] overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
                      >
                        {collection.coverImageUrl ? (
                          <StudioMedia
                            src={collection.coverImageUrl}
                            thumbnailSrc={collection.coverImageUrl}
                            mediaType="image"
                            alt={collection.title}
                            className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#EFECE6]">
                            <ImageIcon className="w-6 h-6 text-[#8D857B] mb-2" />
                            <span className="font-serif text-lg text-[#5C5750]">
                              {collection.title}
                            </span>
                          </div>
                        )}
                      </Link>

                      <div className="pt-5">
                        {/* Clean unboxed index & counts */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums uppercase tracking-[0.14em] text-[#766E64]">
                          <span>Collection {indexLabel}</span>
                          {mediaSummary && (
                            <span className="inline-flex items-center gap-1.5">
                              {hasVideo && <Film className="w-3 h-3 text-[#766E64]" />}
                              <span>{mediaSummary}</span>
                            </span>
                          )}
                        </div>

                        <h2 className="mt-2.5 font-serif text-2xl sm:text-[1.75rem] font-normal text-[#171614] leading-[1.15] editorial-balance">
                          <Link
                            to={galleryHref}
                            className="hover:text-[#5C5750] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
                          >
                            {collection.title}
                          </Link>
                        </h2>

                        {collection.description && (
                          <p className="mt-2.5 text-sm text-[#5C5750] leading-relaxed line-clamp-3">
                            {collection.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-5">
                      <Link
                        to={galleryHref}
                        className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#171614] underline underline-offset-4 hover:text-[#5C5750] transition-colors whitespace-nowrap"
                      >
                        <span>Explore Collection</span>
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Closing Studio Enquiry CTA */}
        <section className="mt-16 sm:mt-24 bg-white border border-[#171614]/10 px-6 sm:px-12 py-12 sm:py-16 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">
              Private Studio Appointments
            </p>
            <h2 className="mt-2.5 font-serif text-3xl sm:text-4xl font-normal text-[#171614] editorial-balance">
              Commission a bespoke outfit tailored around you
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#5C5750] leading-relaxed">
              From heirloom bridal lehengas and handwoven sarees to precision-cut western gowns and
              tailored suits, every piece is drafted and finished individually in our atelier.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors whitespace-nowrap"
            >
              <span>Book a Fitting</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/work"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium border border-[#171614]/25 text-[#171614] hover:border-[#171614] hover:bg-[#FAF8F5] transition-colors whitespace-nowrap"
            >
              <span>View Our Work</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
