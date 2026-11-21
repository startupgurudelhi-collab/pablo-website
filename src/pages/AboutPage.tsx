import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { SiteSettings } from '../types/studio';
import { StudioMedia } from '../components/StudioMedia';

interface AboutPageProps {
  settings: SiteSettings | null;
}

export function AboutPage({ settings }: AboutPageProps) {
  const paragraphs = (
    settings?.aboutContent ||
    'PABLO is an independent fashion design and custom stitching studio built on discipline, proportion, and quiet individuality.'
  )
    .split(/\n\s*\n/)
    .filter(Boolean);

  const aboutMediaUrl =
    settings?.aboutImageUrl ||
    settings?.heroMediaUrl ||
    '/src/assets/images/hero_pablo_atelier_1795009473187.jpg';
  const aboutMediaType = settings?.aboutImageUrl
    ? settings.aboutImageType || 'image'
    : settings?.heroMediaType || 'image';

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <div className="lg:col-span-6">
          <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">About the Studio</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl font-normal text-[#171614] leading-[1.08] editorial-balance">
            {settings?.aboutHeadline || 'Crafted around the individual, never the assembly line.'}
          </h1>

          <div className="mt-8 space-y-5 text-base text-[#4A4640] leading-relaxed">
            {paragraphs.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>

          {settings?.aboutCraftNote && (
            <div className="mt-8 pt-6 border-t border-[#171614]/12">
              <p className="text-[#766E64] italic font-serif text-lg">
                {settings.aboutCraftNote}
              </p>
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              to="/work"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors"
            >
              <span>Browse Our Work</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="text-sm font-medium text-[#171614] underline underline-offset-4 hover:text-[#5C5750]"
            >
              Arrange a Studio Visit
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="aspect-[4/3] bg-[#EFECE6] overflow-hidden">
            <StudioMedia
              src={aboutMediaUrl}
              thumbnailSrc={aboutMediaUrl}
              mediaType={aboutMediaType}
              alt={`${settings?.brandName || 'PABLO'} Studio`}
              autoPlayVideo={aboutMediaType === 'video'}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-[#171614]/10">
            <div>
              <p className="font-mono text-xs text-[#766E64] tabular-nums">01</p>
              <h2 className="mt-2 font-serif text-xl text-[#171614]">Dialogue & Measure</h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#5C5750] leading-relaxed">
                Every outfit begins with silhouette study, textile selection, and thirty-point measurements.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-[#766E64] tabular-nums">02</p>
              <h2 className="mt-2 font-serif text-xl text-[#171614]">Pattern & Fitting</h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#5C5750] leading-relaxed">
                Individual patterns are drafted and basted for live fittings so drape and balance sit effortlessly.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-[#766E64] tabular-nums">03</p>
              <h2 className="mt-2 font-serif text-xl text-[#171614]">Hand Finishing</h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#5C5750] leading-relaxed">
                Seams, hems, closures, and delicate embroidery are finished by hand for lasting structure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
