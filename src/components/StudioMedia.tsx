import { useEffect, useState } from 'react';
import { Film, ImageOff } from 'lucide-react';
import type { MediaType } from '../types/studio';

interface StudioMediaProps {
  src: string;
  thumbnailSrc?: string;
  mediaType: MediaType;
  alt: string;
  className?: string;
  eager?: boolean;
  autoPlayVideo?: boolean;
  showVideoControls?: boolean;
}

export function StudioMedia({
  src,
  thumbnailSrc,
  mediaType,
  alt,
  className = 'w-full h-full object-cover',
  eager = false,
  autoPlayVideo = false,
  showVideoControls = false,
}: StudioMediaProps) {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [src, thumbnailSrc, mediaType]);

  if (mediaType === 'video') {
    if (autoPlayVideo || showVideoControls) {
      return (
        <video
          src={src}
          poster={thumbnailSrc || undefined}
          className={className}
          autoPlay={autoPlayVideo}
          loop={autoPlayVideo}
          muted={autoPlayVideo}
          playsInline
          controls={showVideoControls}
          preload={eager ? 'auto' : 'metadata'}
          onError={() => setErrored(true)}
        />
      );
    }

    if (thumbnailSrc && !errored) {
      return (
        <img
          src={thumbnailSrc}
          alt={alt}
          className={className}
          loading={eager ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
        />
      );
    }

    return (
      <div className="relative w-full h-full bg-[#1D1B19] flex flex-col items-center justify-center p-6 text-[#FAF8F5]">
        <video
          src={src}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
          muted
          playsInline
          preload="metadata"
        />
        <div className="relative z-10 flex flex-col items-center gap-2 text-center">
          <Film className="w-6 h-6 text-[#FAF8F5]/80" />
          <span className="text-xs tracking-wide text-[#FAF8F5]/80 line-clamp-2">{alt}</span>
        </div>
      </div>
    );
  }

  const resolvedSrc = thumbnailSrc || src;
  if (!resolvedSrc || errored) {
    return (
      <div className="w-full h-full bg-[#EFECE6] flex flex-col items-center justify-center p-6 text-center text-[#6B645C]">
        <ImageOff className="w-5 h-5 mb-2 opacity-60" />
        <span className="font-serif text-lg text-[#171614] leading-snug">{alt}</span>
        <span className="text-xs mt-1 text-[#6B645C]">PABLO Atelier</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
    />
  );
}
