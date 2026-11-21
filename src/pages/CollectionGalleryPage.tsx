import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Expand, Film, X } from 'lucide-react';
import { fetchPublicCollectionBySlug, subscribeCmsUpdates } from '../lib/api';
import type { CollectionMediaItem, WorkCollection } from '../types/studio';
import { StudioMedia } from '../components/StudioMedia';

function aspectClassForItem(aspect: CollectionMediaItem['aspectRatio']): string {
  if (aspect === 'landscape') return 'aspect-[4/3]';
  if (aspect === 'square') return 'aspect-square';
  return 'aspect-[3/4]';
}

interface PhotoSlide {
  id: string;
  src: string;
  caption: string;
  creationDetails: string;
}

export function CollectionGalleryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<WorkCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const loadCollection = useCallback(
    async (silent = false) => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      setError('');
      setNotFound(false);
      try {
        const data = await fetchPublicCollectionBySlug(slug);
        setCollection(data.collection);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load collection.';
        if (message.toLowerCase().includes('not found') || message.includes('404')) {
          setNotFound(true);
          setCollection(null);
        } else if (!silent) {
          setError(message);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    void loadCollection(false);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadCollection(true);
    };
    const handleFocus = () => void loadCollection(true);
    const unsubscribe = subscribeCmsUpdates((scope) => {
      if (scope === 'collections' || scope === 'all') {
        void loadCollection(true);
      }
    });

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadCollection]);

  const mediaItems = collection?.media || [];
  const photos = mediaItems.filter((m) => m.mediaType === 'image');
  const videos = mediaItems.filter((m) => m.mediaType === 'video');

  // Build lightbox slides: include cover photograph if not already present among gallery photos
  const photoSlides: PhotoSlide[] = [];
  if (collection) {
    const coverAlreadyInPhotos = photos.some((p) => p.mediaUrl === collection.coverImageUrl);
    if (collection.coverImageUrl && !coverAlreadyInPhotos) {
      photoSlides.push({
        id: `${collection.id}_cover_slide`,
        src: collection.coverImageUrl,
        caption: `${collection.title} — Collection Cover`,
        creationDetails: collection.description,
      });
    }
    for (const p of photos) {
      photoSlides.push({
        id: p.id,
        src: p.mediaUrl,
        caption: p.caption || collection.title,
        creationDetails: p.creationDetails,
      });
    }
  }

  const isLightboxOpen =
    lightboxIndex !== null && lightboxIndex >= 0 && lightboxIndex < photoSlides.length;
  const activeSlide = isLightboxOpen ? photoSlides[lightboxIndex] : null;

  useEffect(() => {
    if (!isLightboxOpen || lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft' && photoSlides.length > 1) {
        setLightboxIndex((lightboxIndex - 1 + photoSlides.length) % photoSlides.length);
      }
      if (e.key === 'ArrowRight' && photoSlides.length > 1) {
        setLightboxIndex((lightboxIndex + 1) % photoSlides.length);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [isLightboxOpen, lightboxIndex, photoSlides.length]);

  if (loading && !collection) {
    return (
      <div className="bg-[#FAF8F5] max-w-7xl mx-auto px-5 sm:px-8 py-14 sm:py-20 space-y-12">
        <div className="h-4 w-36 bg-[#EAE5DD] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6 space-y-5">
            <div className="h-12 w-3/4 bg-[#EAE5DD] animate-pulse" />
            <div className="h-24 w-full bg-[#EAE5DD] animate-pulse" />
          </div>
          <div className="lg:col-span-6 aspect-[4/3] bg-[#EAE5DD] animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || (!loading && !error && !collection)) {
    return (
      <div className="bg-[#FAF8F5] max-w-3xl mx-auto px-5 sm:px-8 py-24 text-center">
        <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">Collection Archive</p>
        <h1 className="mt-3 font-serif text-4xl text-[#171614]">Collection not found</h1>
        <p className="mt-4 text-sm sm:text-base text-[#5C5750]">
          This collection may have been moved, renamed, or set to draft by the studio.
        </p>
        <Link
          to="/work"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Our Work</span>
        </Link>
      </div>
    );
  }

  if (error && !collection) {
    return (
      <div className="bg-[#FAF8F5] max-w-3xl mx-auto px-5 sm:px-8 py-24 text-center">
        <h1 className="font-serif text-3xl text-[#171614]">Unable to load collection</h1>
        <p className="mt-3 text-sm text-[#5C5750]">{error}</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => void loadCollection(false)}
            className="px-6 py-3 text-sm font-medium bg-[#171614] text-[#FAF8F5]"
          >
            Try Again
          </button>
          <Link
            to="/work"
            className="px-6 py-3 text-sm font-medium border border-[#171614]/25 text-[#171614]"
          >
            Back to Our Work
          </Link>
        </div>
      </div>
    );
  }

  if (!collection) return null;

  const coverSlideIndex = photoSlides.findIndex((s) => s.src === collection.coverImageUrl);

  return (
    <div className="bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-20">
        {/* Top Back Navigation */}
        <div className="pb-8 border-b border-[#171614]/10 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/work"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#171614] hover:text-[#5C5750] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Our Work</span>
          </Link>

          <Link
            to="/contact"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#171614] underline underline-offset-4 hover:text-[#5C5750] transition-colors"
          >
            <span>Enquire About This Collection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Collection Header & Cover Monograph */}
        <header className="py-10 sm:py-14 border-b border-[#171614]/10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-xs tracking-[0.16em] uppercase text-[#766E64]">
              <span>Collection Gallery</span>
              {(photos.length > 0 || videos.length > 0) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums tracking-normal normal-case">
                    {photos.length} {photos.length === 1 ? 'Photograph' : 'Photographs'}
                    {videos.length > 0
                      ? ` · ${videos.length} ${videos.length === 1 ? 'Video' : 'Videos'}`
                      : ''}
                  </span>
                </>
              )}
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#171614] leading-[1.06] editorial-balance">
              {collection.title}
            </h1>

            {collection.description && (
              <p className="text-base sm:text-lg text-[#5C5750] leading-relaxed max-w-xl whitespace-pre-line">
                {collection.description}
              </p>
            )}

            <div className="pt-3 flex flex-wrap items-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors whitespace-nowrap"
              >
                <span>Enquire About Custom Piece</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/work"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-medium border border-[#171614]/20 text-[#171614] hover:bg-white transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Collections</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <button
              type="button"
              onClick={() => setLightboxIndex(coverSlideIndex >= 0 ? coverSlideIndex : 0)}
              className="group relative block w-full aspect-[4/3] bg-[#EFECE6] overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
              aria-label={`View ${collection.title} cover photograph full size`}
            >
              <StudioMedia
                src={collection.coverImageUrl}
                thumbnailSrc={collection.coverImageUrl}
                mediaType="image"
                alt={collection.title}
                eager
                className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.02]"
              />
              <span className="absolute bottom-3.5 right-3.5 px-3 py-1.5 bg-[#171614]/80 text-[#FAF8F5] text-xs inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                <Expand className="w-3.5 h-3.5" />
                <span>Expand</span>
              </span>
            </button>
          </div>
        </header>

        {/* Empty Gallery Note */}
        {photos.length === 0 && videos.length === 0 && (
          <div className="mt-12 py-16 text-center bg-white border border-[#171614]/10 px-6">
            <h2 className="font-serif text-2xl text-[#171614]">
              Additional lookbook media coming soon
            </h2>
            <p className="mt-2 text-sm text-[#5C5750] max-w-md mx-auto">
              Contact the studio directly to inspect fabric swatches, bespoke sketches, and custom fitting availability for this collection.
            </p>
          </div>
        )}

        {/* Photographs Grid */}
        {photos.length > 0 && (
          <section className="pt-12 sm:pt-16">
            <div className="pb-6 flex items-baseline justify-between gap-4">
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#171614]">
                Lookbook Photographs
              </h2>
              <span className="text-xs font-mono tabular-nums text-[#766E64]">
                Click any photograph to enlarge
              </span>
            </div>

            <div className="columns-1 sm:columns-2 lg:columns-3 gap-7 space-y-8">
              {photos.map((item) => {
                const slideIdx = photoSlides.findIndex((s) => s.id === item.id);
                return (
                  <article key={item.id} className="break-inside-avoid group">
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(slideIdx >= 0 ? slideIdx : 0)}
                      className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
                    >
                      <div
                        className={`relative w-full overflow-hidden bg-[#EFECE6] ${aspectClassForItem(
                          item.aspectRatio
                        )}`}
                      >
                        <StudioMedia
                          src={item.mediaUrl}
                          thumbnailSrc={item.thumbnailUrl || item.mediaUrl}
                          mediaType="image"
                          alt={item.caption || collection.title}
                          className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.03]"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-[#171614]/0 group-hover:bg-[#171614]/10 transition-colors duration-300" />
                      </div>

                      {(item.caption || item.creationDetails) && (
                        <div className="pt-3.5">
                          {item.caption && (
                            <h3 className="font-serif text-xl font-normal text-[#171614] leading-snug group-hover:text-[#5C5750] transition-colors">
                              {item.caption}
                            </h3>
                          )}
                          {item.creationDetails && (
                            <p className="mt-1 text-xs sm:text-sm text-[#5C5750] leading-relaxed">
                              {item.creationDetails}
                            </p>
                          )}
                        </div>
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Dedicated Videos Player Section */}
        {videos.length > 0 && (
          <section className="pt-14 sm:pt-20 mt-14 sm:mt-20 border-t border-[#171614]/10">
            <div className="pb-6 flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Film className="w-4 h-4 text-[#766E64]" />
                <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#171614]">
                  Studio Films &amp; Movement
                </h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#766E64]">
                {videos.length} {videos.length === 1 ? 'Film' : 'Films'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {videos.map((vid) => (
                <article
                  key={vid.id}
                  className="bg-white border border-[#171614]/10 overflow-hidden"
                >
                  <div className="bg-[#121110] aspect-video flex items-center justify-center">
                    <video
                      src={vid.mediaUrl}
                      poster={vid.thumbnailUrl || collection.coverImageUrl || undefined}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {(vid.caption || vid.creationDetails) && (
                    <div className="p-5">
                      {vid.caption && (
                        <h3 className="font-serif text-xl font-normal text-[#171614]">
                          {vid.caption}
                        </h3>
                      )}
                      {vid.creationDetails && (
                        <p className="mt-1.5 text-xs sm:text-sm text-[#5C5750] leading-relaxed">
                          {vid.creationDetails}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Bottom Enquiry Banner */}
        <section className="mt-16 sm:mt-20 bg-white border border-[#171614]/10 px-6 sm:px-10 py-10 sm:py-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#171614]">
              Interested in a silhouette from {collection.title}?
            </h2>
            <p className="mt-2 text-sm text-[#5C5750]">
              Schedule a private studio consultation for custom sizing, textile choices, and timelines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/work"
              className="px-5 py-3 text-xs sm:text-sm font-medium border border-[#171614]/20 text-[#171614] hover:bg-[#FAF8F5] transition-colors whitespace-nowrap"
            >
              Back to Our Work
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors whitespace-nowrap"
            >
              <span>Make an Enquiry</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>

      {/* Fullscreen Photograph Lightbox */}
      {isLightboxOpen && activeSlide && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeSlide.caption || collection.title}
          className="fixed inset-0 z-50 bg-[#121110]/95 text-[#FAF8F5] flex flex-col"
        >
          <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs text-[#D5CFC6]">
              <span>{collection.title}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {lightboxIndex + 1} / {photoSlides.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="Close photograph viewer"
              className="inline-flex items-center justify-center w-11 h-11 text-[#FAF8F5] hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-8 relative flex items-center justify-center p-4 sm:p-8 min-h-0">
              {photoSlides.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((lightboxIndex - 1 + photoSlides.length) % photoSlides.length)
                  }
                  aria-label="Previous photograph"
                  className="absolute left-3 sm:left-6 z-10 w-11 h-11 flex items-center justify-center bg-[#121110]/70 hover:bg-[#121110] text-[#FAF8F5] border border-white/15 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <div className="w-full h-full max-h-[70vh] lg:max-h-[82vh] flex items-center justify-center">
                <img
                  key={activeSlide.id}
                  src={activeSlide.src}
                  alt={activeSlide.caption || collection.title}
                  className="max-w-full max-h-[70vh] lg:max-h-[80vh] w-auto h-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              {photoSlides.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex((lightboxIndex + 1) % photoSlides.length)}
                  aria-label="Next photograph"
                  className="absolute right-3 sm:right-6 z-10 w-11 h-11 flex items-center justify-center bg-[#121110]/70 hover:bg-[#121110] text-[#FAF8F5] border border-white/15 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-white/10 p-6 sm:p-10 flex flex-col justify-between overflow-y-auto">
              <div>
                <p className="text-xs tracking-wider uppercase text-[#B8A996]">
                  {collection.title}
                </p>
                <h2 className="mt-3 font-serif text-3xl font-normal leading-tight text-[#FAF8F5] editorial-balance">
                  {activeSlide.caption || collection.title}
                </h2>
                {activeSlide.creationDetails && (
                  <p className="mt-5 text-sm sm:text-base text-[#D5CFC6] leading-relaxed whitespace-pre-line">
                    {activeSlide.creationDetails}
                  </p>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                <Link
                  to="/contact"
                  onClick={() => setLightboxIndex(null)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#FAF8F5] text-[#171614] hover:bg-[#EFECE6] transition-colors"
                >
                  <span>Enquire About This Look</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <p className="text-xs text-[#9E978E]">
                  Use Left / Right arrow keys to browse or press Esc to return.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
