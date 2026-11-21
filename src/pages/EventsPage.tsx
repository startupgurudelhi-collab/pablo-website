import { useCallback, useEffect, useState } from 'react';
import { Calendar, ExternalLink, Film, MapPin, Play } from 'lucide-react';
import { fetchPublicEvents, subscribeCmsUpdates } from '../lib/api';
import type { StudioEvent } from '../types/studio';
import { StudioMedia } from '../components/StudioMedia';
import { EventModal, formatEventDate } from '../components/EventModal';

export function EventsPage() {
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeEvent, setActiveEvent] = useState<{ event: StudioEvent; slideIndex: number } | null>(
    null
  );

  const loadEvents = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const data = await fetchPublicEvents({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          featured: featuredOnly,
        });
        setEvents(data.events);
        setCategories(data.categories);
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Unable to load studio events.');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedCategory, featuredOnly]
  );

  useEffect(() => {
    void loadEvents(false);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadEvents(true);
    };
    const handleFocus = () => void loadEvents(true);
    const unsubscribe = subscribeCmsUpdates((scope) => {
      if (scope === 'events' || scope === 'all') void loadEvents(true);
    });

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadEvents]);

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="max-w-2xl pb-10">
        <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">
          Showcases & Exhibitions
        </p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-normal text-[#171614] editorial-balance">
          Events
        </h1>
        <p className="mt-4 text-base text-[#5C5750] leading-relaxed">
          Fashion shows, private salon presentations, exhibitions, wedding showcases, and behind-the-scenes moments from the PABLO atelier.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="pb-8 border-b border-[#171614]/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter events">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setFeaturedOnly(false);
            }}
            className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'all' && !featuredOnly
                ? 'bg-[#171614] text-[#FAF8F5]'
                : 'bg-[#EFECE6] text-[#5C5750] hover:text-[#171614]'
            }`}
          >
            All Events
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setFeaturedOnly(true);
            }}
            className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              featuredOnly
                ? 'bg-[#171614] text-[#FAF8F5]'
                : 'bg-[#EFECE6] text-[#5C5750] hover:text-[#171614]'
            }`}
          >
            Featured
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setFeaturedOnly(false);
              }}
              className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat && !featuredOnly
                  ? 'bg-[#171614] text-[#FAF8F5]'
                  : 'bg-[#EFECE6] text-[#5C5750] hover:text-[#171614]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono tabular-nums text-[#766E64]">
          {loading ? 'Loading events...' : `${events.length} ${events.length === 1 ? 'event' : 'events'}`}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="mt-10 py-14 text-center border border-[#171614]/10 bg-white p-8">
          <p className="text-sm text-[#171614]">{error}</p>
          <button
            type="button"
            onClick={() => void loadEvents(false)}
            className="mt-4 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {!error && loading && (
        <div className="mt-10 space-y-14">
          {[1, 2].map((n) => (
            <div key={n} className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-14 border-b border-[#171614]/8">
              <div className="lg:col-span-7 aspect-[16/10] bg-[#EAE5DD] animate-pulse" />
              <div className="lg:col-span-5 space-y-4">
                <div className="h-3 w-32 bg-[#EAE5DD] animate-pulse" />
                <div className="h-10 w-3/4 bg-[#EAE5DD] animate-pulse" />
                <div className="h-24 w-full bg-[#EAE5DD] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!error && !loading && events.length === 0 && (
        <div className="mt-10 py-20 text-center border border-[#171614]/10 bg-white px-6">
          <h2 className="font-serif text-2xl text-[#171614]">No events match this selection</h2>
          <p className="mt-2 text-sm text-[#5C5750]">
            Explore all published showcases or return later for upcoming studio presentations.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setFeaturedOnly(false);
            }}
            className="mt-6 px-6 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5]"
          >
            View All Events
          </button>
        </div>
      )}

      {/* Editorial Event Stories */}
      {!error && !loading && events.length > 0 && (
        <div className="mt-10 divide-y divide-[#171614]/10">
          {events.map((evt) => {
            const gallery = evt.media || [];
            const hasUploadedVideo = Boolean(evt.videoUrl && evt.videoUrl.startsWith('/media/'));
            const hasExternalVideo = Boolean(evt.videoUrl && !hasUploadedVideo);

            return (
              <article key={evt.id} className="py-12 first:pt-2 last:pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                  {/* Large Editorial Cover */}
                  <div className="lg:col-span-7 space-y-4">
                    <button
                      type="button"
                      onClick={() => setActiveEvent({ event: evt, slideIndex: 0 })}
                      className="group relative block w-full aspect-[16/10] bg-[#EFECE6] overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
                    >
                      <StudioMedia
                        src={evt.coverImageUrl}
                        thumbnailSrc={evt.coverImageUrl}
                        mediaType="image"
                        alt={evt.title}
                        className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.03]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#171614]/35 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {hasUploadedVideo && (
                        <div className="absolute bottom-4 right-4 px-3.5 py-2 bg-[#171614]/85 text-[#FAF8F5] text-xs inline-flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Includes Film</span>
                        </div>
                      )}
                    </button>

                    {/* Event Multi-Photo & Video Gallery Strip */}
                    {(gallery.length > 0 || hasUploadedVideo) && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {hasUploadedVideo && (
                          <button
                            type="button"
                            onClick={() => setActiveEvent({ event: evt, slideIndex: 1 })}
                            className="group relative aspect-[4/3] bg-[#1D1B19] overflow-hidden focus-visible:outline-2 focus-visible:outline-[#171614]"
                          >
                            <StudioMedia
                              src={evt.videoUrl}
                              thumbnailSrc={evt.coverImageUrl}
                              mediaType="video"
                              alt={`${evt.title} Film`}
                              className="w-full h-full object-cover opacity-85 group-hover:scale-[1.04] transition-transform duration-300"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                              <span className="w-9 h-9 bg-[#171614]/85 text-[#FAF8F5] flex items-center justify-center">
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              </span>
                            </div>
                          </button>
                        )}

                        {gallery.slice(0, hasUploadedVideo ? 3 : 4).map((mediaItem, idx) => {
                          const offset = hasUploadedVideo ? 2 : 1;
                          return (
                            <button
                              key={mediaItem.id}
                              type="button"
                              onClick={() =>
                                setActiveEvent({ event: evt, slideIndex: offset + idx })
                              }
                              className="group relative aspect-[4/3] bg-[#EFECE6] overflow-hidden focus-visible:outline-2 focus-visible:outline-[#171614]"
                            >
                              <StudioMedia
                                src={mediaItem.mediaUrl}
                                thumbnailSrc={mediaItem.thumbnailUrl || mediaItem.mediaUrl}
                                mediaType={mediaItem.mediaType}
                                alt={mediaItem.caption || evt.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                              />
                              {mediaItem.mediaType === 'video' && (
                                <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                                  <Film className="w-4 h-4 text-white" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Editorial Metadata & Narrative */}
                  <div className="lg:col-span-5 lg:pt-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#766E64]">
                      <span>{evt.category}</span>
                      {evt.featured && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Featured Showcase</span>
                        </>
                      )}
                    </div>

                    <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-normal text-[#171614] leading-[1.1] editorial-balance">
                      {evt.title}
                    </h2>

                    <div className="mt-4 flex flex-col gap-2 text-xs sm:text-sm text-[#5C5750]">
                      {evt.eventDate && (
                        <div className="inline-flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#766E64] shrink-0" />
                          <span>{formatEventDate(evt.eventDate)}</span>
                        </div>
                      )}
                      {evt.location && (
                        <div className="inline-flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#766E64] shrink-0" />
                          <span>{evt.location}</span>
                        </div>
                      )}
                    </div>

                    {evt.description && (
                      <p className="mt-6 text-sm sm:text-base text-[#4A4640] leading-relaxed whitespace-pre-line">
                        {evt.description}
                      </p>
                    )}

                    <div className="mt-8 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setActiveEvent({ event: evt, slideIndex: 0 })}
                        className="px-6 py-3 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors"
                      >
                        Open Event Gallery ({1 + gallery.length + (hasUploadedVideo ? 1 : 0)})
                      </button>

                      {hasExternalVideo && (
                        <a
                          href={evt.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-5 py-3 text-xs font-medium border border-[#171614]/20 text-[#171614] hover:bg-[#EFECE6] transition-colors"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>Watch Film</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <EventModal
        event={activeEvent?.event || null}
        initialSlideIndex={activeEvent?.slideIndex || 0}
        onClose={() => setActiveEvent(null)}
      />
    </div>
  );
}
