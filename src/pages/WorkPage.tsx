import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Film, Image as ImageIcon } from 'lucide-react';
import { fetchPublicCollections, subscribeCmsUpdates } from '../lib/api';
import type {
  CollectionMediaItem,
  OurWorkPageSettings,
  WorkCollection,
} from '../types/studio';
import { StudioMedia } from '../components/StudioMedia';
import { isExternalHref } from '../components/PublicLayout';

function SafeLink({
  to,
  className,
  children,
}: {
  to: string;
  className: string;
  children: ReactNode;
}) {
  const safeTarget = to && (to.startsWith('/') || isExternalHref(to)) ? to : '/contact';
  if (isExternalHref(safeTarget)) {
    return (
      <a href={safeTarget} target="_blank" rel="noopener noreferrer" className={className}>
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

function PreviewMediaTile({
  item,
  collectionSlug,
  collectionTitle,
  aspectClass = 'aspect-[3/4]',
}: {
  item: CollectionMediaItem;
  collectionSlug: string;
  collectionTitle: string;
  aspectClass?: string;
}) {
  return (
    <Link
      to={`/our-work/collection/${collectionSlug}`}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
    >
      <div className={`relative w-full overflow-hidden bg-[#EFECE6] ${aspectClass}`}>
        <StudioMedia
          src={item.mediaUrl}
          thumbnailSrc={item.thumbnailUrl || item.mediaUrl}
          mediaType={item.mediaType}
          alt={item.caption || collectionTitle}
          className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.03]"
        />
        {item.mediaType === 'video' && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-[#171614]/85 text-[#FAF8F5] text-[11px] inline-flex items-center gap-1.5">
            <Film className="w-3 h-3" />
            <span>Film</span>
          </div>
        )}
      </div>
      {item.caption && (
        <p className="mt-2.5 text-xs sm:text-sm text-[#3F3B36] leading-snug line-clamp-1 group-hover:text-[#171614] transition-colors">
          {item.caption}
        </p>
      )}
    </Link>
  );
}

function CollectionSectionBlock({
  collection,
  index,
}: {
  collection: WorkCollection;
  index: number;
}) {
  const allMedia = collection.media || [];
  const previewCount = Math.max(1, collection.previewLimit || 3);
  const previewMedia = allMedia.slice(0, previewCount);
  const totalPhotos = allMedia.filter((m) => m.mediaType === 'image').length;
  const totalVideos = allMedia.filter((m) => m.mediaType === 'video').length;
  const indexLabel = String(index + 1).padStart(2, '0');
  const galleryHref = `/our-work/collection/${collection.slug}`;

  const renderCounts = () => {
    if (totalPhotos === 0 && totalVideos === 0) return null;
    const parts: string[] = [];
    if (totalPhotos > 0) {
      parts.push(`${totalPhotos} ${totalPhotos === 1 ? 'Photograph' : 'Photographs'}`);
    }
    if (totalVideos > 0) {
      parts.push(`${totalVideos} ${totalVideos === 1 ? 'Video' : 'Videos'}`);
    }
    return (
      <span className="text-xs font-mono tabular-nums text-[#766E64]">
        {parts.join(' · ')}
      </span>
    );
  };

  // Layout 1: Editorial Split (Cover left/right + narrative + preview strip)
  if (collection.layoutStyle === 'editorial-split') {
    const reverse = index % 2 === 1;
    return (
      <section
        id={collection.slug}
        className="scroll-mt-24 py-14 sm:py-20 border-b border-[#171614]/10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Cover Feature */}
          <div className={`lg:col-span-5 ${reverse ? 'lg:order-2' : ''}`}>
            <Link
              to={galleryHref}
              className="group block relative aspect-[3/4] bg-[#EFECE6] overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
            >
              <StudioMedia
                src={collection.coverImageUrl}
                thumbnailSrc={collection.coverImageUrl}
                mediaType="image"
                alt={collection.title}
                className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.03]"
              />
            </Link>
          </div>

          {/* Title, Description & Preview Grid */}
          <div className={`lg:col-span-7 flex flex-col justify-between ${reverse ? 'lg:order-1' : ''}`}>
            <div className="pb-8 border-b border-[#171614]/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs tracking-[0.16em] uppercase text-[#766E64] font-mono tabular-nums">
                  Collection {indexLabel}
                </p>
                {renderCounts()}
              </div>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-normal text-[#171614] leading-[1.08] editorial-balance">
                {collection.title}
              </h2>
              {collection.description && (
                <p className="mt-4 text-sm sm:text-base text-[#5C5750] leading-relaxed max-w-2xl">
                  {collection.description}
                </p>
              )}
              <div className="mt-6">
                <Link
                  to={galleryHref}
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-xs sm:text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors whitespace-nowrap"
                >
                  <span>View Collection</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {previewMedia.length > 0 && (
              <div className="pt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
                {previewMedia.map((item) => (
                  <PreviewMediaTile
                    key={item.id}
                    item={item}
                    collectionSlug={collection.slug}
                    collectionTitle={collection.title}
                    aspectClass="aspect-[3/4]"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Layout 2: Asymmetric Monograph (Header + Large Cover + Staggered Secondary Works)
  if (collection.layoutStyle === 'asymmetric') {
    const secondary = previewMedia.filter((m) => m.mediaUrl !== collection.coverImageUrl).slice(0, 3);
    const itemsToShow = secondary.length > 0 ? secondary : previewMedia.slice(0, 3);

    return (
      <section
        id={collection.slug}
        className="scroll-mt-24 py-14 sm:py-20 border-b border-[#171614]/10"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#171614]/10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <p className="text-xs tracking-[0.16em] uppercase text-[#766E64] font-mono tabular-nums">
                Collection {indexLabel}
              </p>
              {renderCounts() && (
                <>
                  <span className="text-[#C8C1B6]" aria-hidden="true">
                    ·
                  </span>
                  {renderCounts()}
                </>
              )}
            </div>
            <h2 className="mt-2.5 font-serif text-3xl sm:text-4xl font-normal text-[#171614] editorial-balance">
              {collection.title}
            </h2>
            {collection.description && (
              <p className="mt-3 text-sm sm:text-base text-[#5C5750] leading-relaxed">
                {collection.description}
              </p>
            )}
          </div>

          <Link
            to={galleryHref}
            className="inline-flex items-center gap-2.5 px-6 py-3 text-xs sm:text-sm font-medium border border-[#171614] text-[#171614] hover:bg-[#171614] hover:text-[#FAF8F5] transition-colors whitespace-nowrap shrink-0 self-start md:self-auto"
          >
            <span>View Collection</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-6">
            <Link
              to={galleryHref}
              className="group block relative aspect-[4/3] bg-[#EFECE6] overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
            >
              <StudioMedia
                src={collection.coverImageUrl}
                thumbnailSrc={collection.coverImageUrl}
                mediaType="image"
                alt={collection.title}
                className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.03]"
              />
            </Link>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
            {itemsToShow.map((item) => (
              <PreviewMediaTile
                key={item.id}
                item={item}
                collectionSlug={collection.slug}
                collectionTitle={collection.title}
                aspectClass="aspect-[3/4]"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Layout 3 & 4: Clean Editorial Grid (grid-3 or grid-4)
  const isFourCol = collection.layoutStyle === 'grid-4';
  const gridItems =
    previewMedia.length > 0
      ? previewMedia
      : [
          {
            id: `${collection.id}_cover`,
            collectionId: collection.id,
            mediaType: 'image' as const,
            mediaUrl: collection.coverImageUrl,
            thumbnailUrl: collection.coverImageUrl,
            aspectRatio: 'portrait' as const,
            caption: collection.title,
            creationDetails: '',
            sortOrder: 1,
            published: true,
            createdAt: collection.createdAt,
          },
        ];

  return (
    <section
      id={collection.slug}
      className="scroll-mt-24 py-14 sm:py-20 border-b border-[#171614]/10"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#171614]/10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <p className="text-xs tracking-[0.16em] uppercase text-[#766E64] font-mono tabular-nums">
              Collection {indexLabel}
            </p>
            {renderCounts() && (
              <>
                <span className="text-[#C8C1B6]" aria-hidden="true">
                  ·
                </span>
                {renderCounts()}
              </>
            )}
          </div>
          <h2 className="mt-2.5 font-serif text-3xl sm:text-4xl font-normal text-[#171614] editorial-balance">
            {collection.title}
          </h2>
          {collection.description && (
            <p className="mt-3 text-sm sm:text-base text-[#5C5750] leading-relaxed">
              {collection.description}
            </p>
          )}
        </div>

        <Link
          to={galleryHref}
          className="inline-flex items-center gap-2.5 px-6 py-3 text-xs sm:text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          <span>View Collection</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div
        className={`mt-8 grid gap-5 sm:gap-6 ${
          isFourCol
            ? 'grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {gridItems.map((item) => (
          <PreviewMediaTile
            key={item.id}
            item={item}
            collectionSlug={collection.slug}
            collectionTitle={collection.title}
            aspectClass="aspect-[3/4]"
          />
        ))}
      </div>
    </section>
  );
}

export function WorkPage() {
  const [pageSettings, setPageSettings] = useState<OurWorkPageSettings | null>(null);
  const [collections, setCollections] = useState<WorkCollection[]>([]);
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

  const promoInsertionIndex =
    collections.length >= 4 ? 2 : collections.length >= 2 ? 1 : collections.length - 1;

  const showPromoBanner = Boolean(
    pageSettings?.promoVisible &&
      (pageSettings.promoHeading || pageSettings.promoDescription || pageSettings.promoImageUrl)
  );

  const renderPromoBanner = () => {
    if (!pageSettings || !showPromoBanner) return null;
    return (
      <section className="my-6 sm:my-10 relative overflow-hidden bg-[#171614] text-[#FAF8F5]">
        {pageSettings.promoImageUrl && (
          <img
            src={pageSettings.promoImageUrl}
            alt={pageSettings.promoHeading || 'PABLO Studio Showcase'}
            className="absolute inset-0 w-full h-full object-cover opacity-45"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#171614]/85 via-[#171614]/65 to-[#171614]/45"
        />
        <div className="relative z-10 px-6 sm:px-12 lg:px-16 py-16 sm:py-24 max-w-3xl">
          <p className="text-xs tracking-[0.18em] uppercase text-[#D8D0C4]">
            Atelier Commissions
          </p>
          {pageSettings.promoHeading && (
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#FAF8F5] leading-[1.08] editorial-balance">
              {pageSettings.promoHeading}
            </h2>
          )}
          {pageSettings.promoDescription && (
            <p className="mt-4 text-sm sm:text-base text-[#E6E0D6] leading-relaxed max-w-xl">
              {pageSettings.promoDescription}
            </p>
          )}
          {pageSettings.promoButtonText && (
            <div className="mt-8">
              <SafeLink
                to={pageSettings.promoButtonUrl || '/contact'}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-medium bg-[#FAF8F5] text-[#171614] hover:bg-[#EFECE6] transition-colors whitespace-nowrap"
              >
                <span>{pageSettings.promoButtonText}</span>
                <ArrowRight className="w-4 h-4" />
              </SafeLink>
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-16 sm:pb-24">
        {/* A. Page Introduction */}
        <header className="pb-10 sm:pb-12 border-b border-[#171614]/10">
          <div className="max-w-3xl">
            <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">
              Collections Archive
            </p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#171614] editorial-balance">
              {pageSettings?.introHeading || 'Our Work'}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-[#5C5750] leading-relaxed">
              {pageSettings?.introSubtitle ||
                'An evolving collection of bespoke designs, custom creations and handcrafted details.'}
            </p>
          </div>

          {/* Optional Introductory Landscape Photograph */}
          {pageSettings?.introImageUrl && (
            <div className="mt-8 sm:mt-10 relative w-full aspect-[16/9] sm:aspect-[21/9] bg-[#EFECE6] overflow-hidden">
              <StudioMedia
                src={pageSettings.introImageUrl}
                thumbnailSrc={pageSettings.introImageUrl}
                mediaType="image"
                alt={pageSettings.introHeading || 'Our Work at PABLO'}
                eager
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Quick Collection Index Links (No pills — clean architectural text links) */}
          {!loading && collections.length > 0 && (
            <nav
              aria-label="Jump to collection"
              className="mt-8 pt-6 border-t border-[#171614]/8 flex flex-wrap items-center gap-x-6 gap-y-2.5"
            >
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#766E64]">
                {collections.length} {collections.length === 1 ? 'Collection' : 'Collections'}
              </span>
              {collections.map((col) => (
                <a
                  key={col.id}
                  href={`#${col.slug}`}
                  className="text-xs sm:text-sm text-[#4A4640] hover:text-[#171614] underline-offset-4 hover:underline transition-colors whitespace-nowrap"
                >
                  {col.title}
                </a>
              ))}
            </nav>
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
          <div className="py-12 space-y-16">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 border-b border-[#171614]/10"
              >
                <div className="lg:col-span-5 aspect-[3/4] bg-[#EAE5DD] animate-pulse" />
                <div className="lg:col-span-7 space-y-4">
                  <div className="h-3 w-28 bg-[#EAE5DD] animate-pulse" />
                  <div className="h-10 w-2/3 bg-[#EAE5DD] animate-pulse" />
                  <div className="h-16 w-full bg-[#EAE5DD] animate-pulse" />
                  <div className="pt-4 grid grid-cols-3 gap-4">
                    <div className="aspect-[3/4] bg-[#EAE5DD] animate-pulse" />
                    <div className="aspect-[3/4] bg-[#EAE5DD] animate-pulse" />
                    <div className="aspect-[3/4] bg-[#EAE5DD] animate-pulse" />
                  </div>
                </div>
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
              Our studio lookbook is currently being updated. Reach out directly for private portfolio viewings and commissions.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-xs font-medium bg-[#171614] text-[#FAF8F5]"
            >
              <span>Contact the Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* B & C. Dynamic Collection Sections + Optional Interstitial Promotional Banner */}
        {!error && !loading && collections.length > 0 && (
          <div>
            {collections.map((collection, idx) => (
              <div key={collection.id}>
                <CollectionSectionBlock collection={collection} index={idx} />
                {idx === promoInsertionIndex && renderPromoBanner()}
              </div>
            ))}
          </div>
        )}

        {!error && !loading && collections.length === 0 && renderPromoBanner()}

        {/* D. Final Studio CTA */}
        <section className="mt-16 sm:mt-24 bg-white border border-[#171614]/10 px-6 sm:px-12 py-12 sm:py-16 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">
              Bespoke Appointments
            </p>
            <h2 className="mt-2.5 font-serif text-3xl sm:text-4xl font-normal text-[#171614] editorial-balance">
              Have an outfit in mind?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#5C5750] leading-relaxed">
              Share your occasion, silhouette references, or custom tailoring timeline with our studio team to arrange a personal consultation.
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
              to="/contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium border border-[#171614]/25 text-[#171614] hover:border-[#171614] hover:bg-[#FAF8F5] transition-colors whitespace-nowrap"
            >
              <span>Contact the Studio</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
