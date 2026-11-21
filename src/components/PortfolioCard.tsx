import { Play } from 'lucide-react';
import type { PortfolioCategory, PortfolioItem } from '../types/studio';
import { StudioMedia } from './StudioMedia';

interface PortfolioCardProps {
  item: PortfolioItem;
  categories: PortfolioCategory[];
  onOpen: () => void;
}

const ASPECT_CLASSES = {
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  square: 'aspect-square',
};

export function PortfolioCard({ item, categories, onOpen }: PortfolioCardProps) {
  const categoryName =
    categories.find((c) => c.id === item.categoryId)?.name || 'Atelier Collection';

  return (
    <article className="group break-inside-avoid">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
      >
        <div
          className={`relative w-full overflow-hidden bg-[#EFECE6] ${
            ASPECT_CLASSES[item.aspectRatio] || ASPECT_CLASSES.portrait
          }`}
        >
          <StudioMedia
            src={item.mediaUrl}
            thumbnailSrc={item.thumbnailUrl || item.mediaUrl}
            mediaType={item.mediaType}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 editorial-transition group-hover:scale-[1.03]"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#171614]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {item.mediaType === 'video' && (
            <div className="absolute bottom-4 right-4 w-10 h-10 bg-[#171614]/85 text-[#FAF8F5] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          )}
        </div>

        <div className="pt-3.5">
          <div className="flex items-center gap-2 text-xs text-[#766E64]">
            <span>{categoryName}</span>
            {item.mediaType === 'video' && (
              <>
                <span aria-hidden="true">·</span>
                <span>Studio Film</span>
              </>
            )}
            {item.featured && (
              <>
                <span aria-hidden="true">·</span>
                <span>Featured</span>
              </>
            )}
          </div>
          <h3 className="mt-1 font-serif text-xl sm:text-[1.35rem] font-normal text-[#171614] leading-snug group-hover:text-[#5C5750] transition-colors">
            {item.title}
          </h3>
          {item.description && (
            <p className="mt-1.5 text-sm text-[#5C5750] line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
      </button>
    </article>
  );
}
