import type { AspectRatioType } from '../types/studio';

export interface AnalyzedMedia {
  aspectRatio: AspectRatioType;
  thumbnailBlob: Blob | null;
  previewUrl: string;
}

function classifyAspectRatio(width: number, height: number): AspectRatioType {
  if (!width || !height) return 'portrait';
  const ratio = width / height;
  if (ratio > 1.15) return 'landscape';
  if (ratio < 0.85) return 'portrait';
  return 'square';
}

export async function analyzeAndCreateThumbnail(file: File): Promise<AnalyzedMedia> {
  const objectUrl = URL.createObjectURL(file);

  if (file.type.startsWith('video/')) {
    try {
      const result = await new Promise<{ aspectRatio: AspectRatioType; thumbnailBlob: Blob | null }>(
        (resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.muted = true;
          video.playsInline = true;
          video.src = objectUrl;

          const cleanup = () => {
            video.removeAttribute('src');
            video.load();
          };

          const timeout = window.setTimeout(() => {
            cleanup();
            resolve({ aspectRatio: 'landscape', thumbnailBlob: null });
          }, 5000);

          video.onloadeddata = () => {
            const seekTime = video.duration && video.duration > 0.5 ? 0.4 : 0;
            video.currentTime = seekTime;
          };

          video.onseeked = () => {
            window.clearTimeout(timeout);
            const width = video.videoWidth || 1280;
            const height = video.videoHeight || 720;
            const aspectRatio = classifyAspectRatio(width, height);
            try {
              const targetW = Math.min(720, width);
              const targetH = Math.round((height / width) * targetW);
              const canvas = document.createElement('canvas');
              canvas.width = targetW;
              canvas.height = targetH;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                cleanup();
                resolve({ aspectRatio, thumbnailBlob: null });
                return;
              }
              ctx.drawImage(video, 0, 0, targetW, targetH);
              canvas.toBlob(
                (blob) => {
                  cleanup();
                  resolve({ aspectRatio, thumbnailBlob: blob });
                },
                'image/jpeg',
                0.82
              );
            } catch {
              cleanup();
              resolve({ aspectRatio, thumbnailBlob: null });
            }
          };

          video.onerror = () => {
            window.clearTimeout(timeout);
            cleanup();
            resolve({ aspectRatio: 'landscape', thumbnailBlob: null });
          };
        }
      );

      return { ...result, previewUrl: objectUrl };
    } catch {
      return { aspectRatio: 'landscape', thumbnailBlob: null, previewUrl: objectUrl };
    }
  }

  // Image analysis and thumbnail generation
  try {
    const result = await new Promise<{ aspectRatio: AspectRatioType; thumbnailBlob: Blob | null }>(
      (resolve) => {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = classifyAspectRatio(img.naturalWidth, img.naturalHeight);
          try {
            const maxDim = 800;
            const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
            const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
            const targetH = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve({ aspectRatio, thumbnailBlob: null });
              return;
            }
            ctx.drawImage(img, 0, 0, targetW, targetH);
            canvas.toBlob(
              (blob) => resolve({ aspectRatio, thumbnailBlob: blob }),
              'image/webp',
              0.84
            );
          } catch {
            resolve({ aspectRatio, thumbnailBlob: null });
          }
        };
        img.onerror = () => resolve({ aspectRatio: 'portrait', thumbnailBlob: null });
        img.src = objectUrl;
      }
    );
    return { ...result, previewUrl: objectUrl };
  } catch {
    return { aspectRatio: 'portrait', thumbnailBlob: null, previewUrl: objectUrl };
  }
}
