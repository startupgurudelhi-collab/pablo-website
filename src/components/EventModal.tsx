import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Film, X } from 'lucide-react';
import type { MediaType, StudioEvent } from '../types/studio';
import { StudioMedia } from './StudioMedia';

interface EventSlide {
  id: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string;
  caption: string;
}

interface EventModalProps {
  event: StudioEvent | null;
  initialSlideIndex?: number;
  onClose: () => void;
}

export function formatEventDate(raw: string): string {
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function EventModal({ event, initialSlideIndex = 0, onClose }: EventModalProps) {
  const slides = useMemo<EventSlide[]>(() => {
    if (!event) return [];
    const list: EventSlide[] = [];
    if (event.coverImageUrl) {
      list.push({
        id: 'cover',
        mediaType: 'image',
        mediaUrl: event.coverImageUrl,
        thumbnailUrl: event.coverImageUrl,
        caption: event.title,
      });
    }
    if (event.videoUrl && event.videoUrl.startsWith('/media/')) {
      list.push({
        id: 'event-video',
        mediaType: 'video',
        mediaUrl: event.videoUrl,
        thumbnailUrl: event.coverImageUrl,
        caption: `${event.title} — Studio Film`,
      });
    }
    for (const m of event.media || []) {
      list.push({
        id: m.id,
        mediaType: m.mediaType,
        mediaUrl: m.mediaUrl,
        thumbnailUrl: m.thumbnailUrl || m.mediaUrl,
        caption: m.caption || event.title,
      });
    }
    return list;
  }, [event]);

  const [activeIndex, setActiveIndex] = useState(initialSlideIndex);

  useEffect(() => {
    setActiveIndex(
      initialSlideIndex >= 0 && initialSlideIndex < slides.length ? initialSlideIndex : 0
    );
  }, [event?.id, initialSlideIndex, slides.length]);

  useEffect(() => {
    if (!event) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && slides.length > 1) {
        setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
      }
      if (e.key === 'ArrowRight' && slides.length > 1) {
        setActiveIndex((prev) => (prev + 1) % slides.length);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [event, slides.length, onClose]);

  if (!event || slides.length === 0) return null;
  const activeSlide = slides[activeIndex] || slides[0];
  const hasExternalVideoUrl =
    Boolean(event.videoUrl) && !event.videoUrl.startsWith('/media/');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={event.title}
      className="fixed inset-0 z-50 bg-[#121110]/95 text-[#FAF8F5] flex flex-col"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#D5CFC6]">
          <span>{event.category}</span>
          {event.eventDate && (
            <>
              <span aria-hidden="true">·</span>
              <span>{formatEventDate(event.eventDate)}</span>
            </>
          )}
          {event.location && (
            <>
              <span aria-hidden="true">·</span>
              <span>{event.location}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {activeIndex + 1} / {slides.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close event viewer"
          className="inline-flex items-center justify-center w-11 h-11 text-[#FAF8F5] hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 relative flex flex-col items-center justify-center p-4 sm:p-8 min-h-0">
          {slides.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)
              }
              aria-label="Previous slide"
              className="absolute left-3 sm:left-6 z-10 w-11 h-11 flex items-center justify-center bg-[#121110]/70 hover:bg-[#121110] text-[#FAF8F5] border border-white/15 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-full flex-1 min-h-0 flex items-center justify-center">
            <StudioMedia
              key={activeSlide.id}
              src={activeSlide.mediaUrl}
              thumbnailSrc={
                activeSlide.mediaType === 'image'
                  ? activeSlide.mediaUrl
                  : activeSlide.thumbnailUrl
              }
              mediaType={activeSlide.mediaType}
              alt={activeSlide.caption || event.title}
              eager
              showVideoControls={activeSlide.mediaType === 'video'}
              className="max-w-full max-h-[60vh] lg:max-h-[70vh] w-auto h-auto object-contain"
            />
          </div>

          {slides.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
              aria-label="Next slide"
              className="absolute right-3 sm:right-6 z-10 w-11 h-11 flex items-center justify-center bg-[#121110]/70 hover:bg-[#121110] text-[#FAF8F5] border border-white/15 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Strip of Gallery Thumbnails */}
          {slides.length > 1 && (
            <div className="mt-4 flex items-center gap-2 overflow-x-auto max-w-full pb-1">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative w-14 h-14 shrink-0 overflow-hidden border transition-opacity ${
                    idx === activeIndex
                      ? 'border-[#FAF8F5] opacity-100'
                      : 'border-white/15 opacity-55 hover:opacity-90'
                  }`}
                >
                  <StudioMedia
                    src={slide.mediaUrl}
                    thumbnailSrc={slide.thumbnailUrl}
                    mediaType={slide.mediaType}
                    alt={slide.caption}
                    className="w-full h-full object-cover"
                  />
                  {slide.mediaType === 'video' && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Film className="w-3.5 h-3.5 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Event Narrative Side Panel */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-white/10 p-6 sm:p-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <p className="text-xs tracking-wider uppercase text-[#B8A996]">{event.category}</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-normal leading-tight text-[#FAF8F5] editorial-balance">
              {event.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#9E978E]">
              {event.eventDate && <span>{formatEventDate(event.eventDate)}</span>}
              {event.eventDate && event.location && <span aria-hidden="true">·</span>}
              {event.location && <span>{event.location}</span>}
            </div>

            {activeSlide.caption && activeSlide.caption !== event.title && (
              <p className="mt-5 text-xs italic text-[#D5CFC6] border-t border-white/10 pt-4">
                {activeSlide.caption}
              </p>
            )}

            {event.description && (
              <p className="mt-6 text-sm sm:text-base text-[#D5CFC6] leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            )}

            {hasExternalVideoUrl && (
              <div className="mt-6">
                <a
                  href={event.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium border border-white/25 text-[#FAF8F5] hover:bg-white/10 transition-colors"
                >
                  <Film className="w-4 h-4" />
                  <span>Watch Event Film</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-xs text-[#9E978E]">
            <p>Use Left / Right arrow keys to browse event photographs and films.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
