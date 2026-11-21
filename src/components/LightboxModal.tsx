import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { PortfolioCategory, PortfolioItem } from '../types/studio';
import { StudioMedia } from './StudioMedia';

interface LightboxModalProps {
  items: PortfolioItem[];
  categories: PortfolioCategory[];
  activeIndex: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

export function LightboxModal({
  items,
  categories,
  activeIndex,
  onClose,
  onNavigate,
}: LightboxModalProps) {
  const isOpen = activeIndex !== null && activeIndex >= 0 && activeIndex < items.length;
  const currentItem = isOpen ? items[activeIndex] : null;

  useEffect(() => {
    if (!isOpen || activeIndex === null) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && items.length > 1) {
        onNavigate((activeIndex - 1 + items.length) % items.length);
      }
      if (e.key === 'ArrowRight' && items.length > 1) {
        onNavigate((activeIndex + 1) % items.length);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, activeIndex, items.length, onClose, onNavigate]);

  if (!isOpen || !currentItem || activeIndex === null) return null;

  const categoryName =
    categories.find((c) => c.id === currentItem.categoryId)?.name || 'Atelier Collection';

  const formattedDate = new Date(currentItem.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={currentItem.title}
      className="fixed inset-0 z-50 bg-[#121110]/95 text-[#FAF8F5] flex flex-col"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-2 text-xs text-[#D5CFC6]">
          <span>{categoryName}</span>
          <span aria-hidden="true">·</span>
          <span>{currentItem.mediaType === 'video' ? 'Studio Film' : 'Photograph'}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {activeIndex + 1} / {items.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="inline-flex items-center justify-center w-11 h-11 text-[#FAF8F5] hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 relative flex items-center justify-center p-4 sm:p-8 min-h-0">
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => onNavigate((activeIndex - 1 + items.length) % items.length)}
              aria-label="Previous work"
              className="absolute left-3 sm:left-6 z-10 w-11 h-11 flex items-center justify-center bg-[#121110]/70 hover:bg-[#121110] text-[#FAF8F5] border border-white/15 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-full h-full max-h-[70vh] lg:max-h-[82vh] flex items-center justify-center">
            <StudioMedia
              key={currentItem.id}
              src={currentItem.mediaUrl}
              thumbnailSrc={currentItem.mediaType === 'image' ? currentItem.mediaUrl : currentItem.thumbnailUrl}
              mediaType={currentItem.mediaType}
              alt={currentItem.title}
              eager
              showVideoControls={currentItem.mediaType === 'video'}
              className="max-w-full max-h-[70vh] lg:max-h-[80vh] w-auto h-auto object-contain"
            />
          </div>

          {items.length > 1 && (
            <button
              type="button"
              onClick={() => onNavigate((activeIndex + 1) % items.length)}
              aria-label="Next work"
              className="absolute right-3 sm:right-6 z-10 w-11 h-11 flex items-center justify-center bg-[#121110]/70 hover:bg-[#121110] text-[#FAF8F5] border border-white/15 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Caption & Details Side Panel */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-white/10 p-6 sm:p-10 flex flex-col justify-between overflow-y-auto">
          <div>
            <p className="text-xs tracking-wider uppercase text-[#B8A996]">{categoryName}</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-normal leading-tight text-[#FAF8F5] editorial-balance">
              {currentItem.title}
            </h2>
            <p className="mt-2 text-xs text-[#9E978E]">{formattedDate}</p>

            {currentItem.description && (
              <p className="mt-6 text-sm sm:text-base text-[#D5CFC6] leading-relaxed whitespace-pre-line">
                {currentItem.description}
              </p>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-xs text-[#9E978E]">
            <p>Use Left / Right arrow keys to browse the collection or press Esc to return.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
