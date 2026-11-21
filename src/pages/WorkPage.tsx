import { useCallback, useEffect, useState } from 'react';
import { fetchPortfolio, subscribeCmsUpdates } from '../lib/api';
import type { MediaType, PortfolioCategory, PortfolioItem } from '../types/studio';
import { PortfolioCard } from '../components/PortfolioCard';
import { LightboxModal } from '../components/LightboxModal';

export function WorkPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'all' | MediaType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const loadWork = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const data = await fetchPortfolio({
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          mediaType: mediaFilter,
          featured: featuredOnly,
        });
        setItems(data.items);
        setCategories(data.categories);
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Unable to load portfolio items.');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedCategory, mediaFilter, featuredOnly]
  );

  useEffect(() => {
    void loadWork(false);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadWork(true);
    };
    const handleFocus = () => void loadWork(true);
    const unsubscribe = subscribeCmsUpdates((scope) => {
      if (scope === 'portfolio' || scope === 'all') void loadWork(true);
    });

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadWork]);

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      {/* Page Header */}
      <div className="max-w-2xl pb-10">
        <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">Portfolio Archive</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-normal text-[#171614] editorial-balance">
          Our Work
        </h1>
        <p className="mt-4 text-base text-[#5C5750] leading-relaxed">
          A living index of bespoke tailoring, occasion wear, event ensembles, and hand-worked surface detailing from the PABLO atelier.
        </p>
      </div>

      {/* Category & Media Filters */}
      <div className="pb-8 border-b border-[#171614]/10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter by category">
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
            All Work
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
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.slug);
                setFeaturedOnly(false);
              }}
              className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat.slug && !featuredOnly
                  ? 'bg-[#171614] text-[#FAF8F5]'
                  : 'bg-[#EFECE6] text-[#5C5750] hover:text-[#171614]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Media Type Filter */}
        <div className="flex items-center gap-1 bg-[#EFECE6] p-1 self-start lg:self-auto">
          {(['all', 'image', 'video'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMediaFilter(type)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                mediaFilter === type
                  ? 'bg-white text-[#171614]'
                  : 'text-[#5C5750] hover:text-[#171614]'
              }`}
            >
              {type === 'all' ? 'All Media' : type === 'image' ? 'Photographs' : 'Videos'}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="py-5 flex items-center justify-between text-xs text-[#766E64]">
        <span className="font-mono tabular-nums">
          {loading ? 'Loading archive...' : `${items.length} ${items.length === 1 ? 'creation' : 'creations'}`}
        </span>
        <span>Ordered latest first</span>
      </div>

      {/* States */}
      {error && (
        <div className="py-16 text-center border border-[#171614]/10 bg-white p-8">
          <p className="text-sm text-[#171614]">{error}</p>
          <button
            type="button"
            onClick={() => void loadWork(false)}
            className="mt-4 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5]"
          >
            Try Again
          </button>
        </div>
      )}

      {!error && loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="space-y-3">
              <div className="aspect-[3/4] bg-[#EAE5DD] animate-pulse" />
              <div className="h-3 w-28 bg-[#EAE5DD] animate-pulse" />
              <div className="h-6 w-3/4 bg-[#EAE5DD] animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!error && !loading && items.length === 0 && (
        <div className="py-20 text-center border border-[#171614]/10 bg-white px-6">
          <h2 className="font-serif text-2xl text-[#171614]">No creations match this filter</h2>
          <p className="mt-2 text-sm text-[#5C5750]">
            Try selecting another category or viewing the full studio collection.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setFeaturedOnly(false);
              setMediaFilter('all');
            }}
            className="mt-6 px-6 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5]"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Editorial Responsive Masonry / Columns Grid */}
      {!error && !loading && items.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-10">
          {items.map((item, idx) => (
            <PortfolioCard
              key={item.id}
              item={item}
              categories={categories}
              onOpen={() => setLightboxIndex(idx)}
            />
          ))}
        </div>
      )}

      <LightboxModal
        items={items}
        categories={categories}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
}
