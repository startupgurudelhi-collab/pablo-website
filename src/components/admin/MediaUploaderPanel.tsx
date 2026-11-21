import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Check, Film, Trash2, Upload } from 'lucide-react';
import { analyzeAndCreateThumbnail } from '../../lib/mediaThumb';
import { uploadPortfolioItem } from '../../lib/api';
import type { AspectRatioType, PortfolioCategory, PortfolioItem } from '../../types/studio';

interface QueuedUpload {
  localId: string;
  file: File;
  previewUrl: string;
  thumbnailBlob: Blob | null;
  mediaType: 'image' | 'video';
  title: string;
  description: string;
  categoryId: string;
  aspectRatio: AspectRatioType;
  featured: boolean;
  published: boolean;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface MediaUploaderPanelProps {
  categories: PortfolioCategory[];
  onUploaded: (items: PortfolioItem[]) => void;
}

const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
]);

export function MediaUploaderPanel({ categories, onUploaded }: MediaUploaderPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = useState<QueuedUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const defaultCategoryId = categories[0]?.id || '';

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setValidationError('');

    const added: QueuedUpload[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(fileList)) {
      const mime = file.type.toLowerCase();
      if (!ACCEPTED_TYPES.has(mime)) {
        rejected.push(`${file.name} (unsupported format)`);
        continue;
      }
      const isVideo = mime === 'video/mp4';
      const maxBytes = isVideo ? 80 * 1024 * 1024 : 15 * 1024 * 1024;
      if (file.size > maxBytes) {
        rejected.push(`${file.name} (exceeds ${isVideo ? '80 MB' : '15 MB'})`);
        continue;
      }

      const analyzed = await analyzeAndCreateThumbnail(file);
      const baseTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();

      added.push({
        localId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: analyzed.previewUrl,
        thumbnailBlob: analyzed.thumbnailBlob,
        mediaType: isVideo ? 'video' : 'image',
        title: baseTitle || 'Untitled Creation',
        description: '',
        categoryId: defaultCategoryId,
        aspectRatio: analyzed.aspectRatio,
        featured: false,
        published: true,
        progress: 0,
        status: 'pending',
      });
    }

    if (rejected.length > 0) {
      setValidationError(`Skipped: ${rejected.join(', ')}. Accepted: JPG, JPEG, PNG, WEBP, MP4.`);
    }

    if (added.length > 0) {
      setQueue((prev) => [...prev, ...added]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    void addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void addFiles(e.dataTransfer.files);
  };

  const updateQueued = (localId: string, patch: Partial<QueuedUpload>) => {
    setQueue((prev) => prev.map((q) => (q.localId === localId ? { ...q, ...patch } : q)));
  };

  const removeQueued = (localId: string) => {
    setQueue((prev) => {
      const target = prev.find((q) => q.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((q) => q.localId !== localId);
    });
  };

  const applyCategoryToAll = (categoryId: string) => {
    setQueue((prev) =>
      prev.map((q) => (q.status === 'pending' ? { ...q, categoryId } : q))
    );
  };

  const startUpload = async () => {
    const pendingItems = queue.filter((q) => q.status === 'pending' || q.status === 'error');
    if (pendingItems.length === 0 || uploading) return;

    setUploading(true);
    const created: PortfolioItem[] = [];

    for (const item of pendingItems) {
      updateQueued(item.localId, { status: 'uploading', progress: 0, error: undefined });
      try {
        const res = await uploadPortfolioItem(
          {
            file: item.file,
            thumbnailBlob: item.thumbnailBlob,
            title: item.title,
            description: item.description,
            categoryId: item.categoryId || defaultCategoryId,
            aspectRatio: item.aspectRatio,
            featured: item.featured,
            published: item.published,
          },
          (percent) => updateQueued(item.localId, { progress: percent })
        );
        updateQueued(item.localId, { status: 'done', progress: 100 });
        created.push(res.item);
      } catch (err) {
        updateQueued(item.localId, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    }

    setUploading(false);
    if (created.length > 0) {
      onUploaded(created);
    }
  };

  const clearCompleted = () => {
    setQueue((prev) => {
      prev.filter((q) => q.status === 'done').forEach((q) => URL.revokeObjectURL(q.previewUrl));
      return prev.filter((q) => q.status !== 'done');
    });
  };

  const pendingCount = queue.filter((q) => q.status === 'pending' || q.status === 'error').length;
  const doneCount = queue.filter((q) => q.status === 'done').length;

  return (
    <section className="bg-white border border-[#171614]/10 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#171614]/8">
        <div>
          <h2 className="font-serif text-2xl font-normal text-[#171614]">
            Upload Photographs & Videos
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#5C5750]">
            Select multiple JPG, JPEG, PNG, WEBP images (up to 15 MB) or MP4 videos (up to 80 MB). Thumbnails are generated automatically.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Select Media Files</span>
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`mt-6 border border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-[#171614] bg-[#F2EFE9]'
            : 'border-[#171614]/20 bg-[#FAF8F5] hover:border-[#171614]/40'
        }`}
      >
        <p className="text-sm text-[#171614]">
          Drag and drop photographs or MP4 videos here, or click to browse
        </p>
        <p className="mt-1 text-xs text-[#766E64]">
          Multiple files supported · Automatic thumbnail & aspect ratio detection
        </p>
      </div>

      {validationError && (
        <div className="mt-4 p-3.5 bg-[#FDF4F3] border border-[#B42318]/25 text-xs text-[#8A1C13]">
          {validationError}
        </div>
      )}

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div className="mt-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono tabular-nums text-[#5C5750]">
                {queue.length} queued ({pendingCount} ready)
              </span>
              {categories.length > 0 && pendingCount > 1 && (
                <select
                  aria-label="Apply category to all queued files"
                  onChange={(e) => e.target.value && applyCategoryToAll(e.target.value)}
                  defaultValue=""
                  className="px-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#171614]/15 text-[#171614]"
                >
                  <option value="" disabled>
                    Set category for all...
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-3">
              {doneCount > 0 && (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="px-3 py-2 text-xs text-[#5C5750] hover:text-[#171614]"
                >
                  Clear Completed
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={startUpload}
                  disabled={uploading}
                  className="px-6 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50 transition-colors"
                >
                  {uploading ? 'Uploading...' : `Upload ${pendingCount} ${pendingCount === 1 ? 'File' : 'Files'}`}
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-[#171614]/8 border border-[#171614]/10">
            {queue.map((item) => (
              <div key={item.localId} className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                <div className="md:col-span-2">
                  <div className="relative aspect-square w-24 md:w-full bg-[#EFECE6] overflow-hidden">
                    {item.mediaType === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center bg-[#1D1B19] text-[#FAF8F5]">
                        <video
                          src={item.previewUrl}
                          className="w-full h-full object-cover opacity-80"
                          muted
                          playsInline
                        />
                        <Film className="w-5 h-5 absolute" />
                      </div>
                    ) : (
                      <img
                        src={item.previewUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>

                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] text-[#766E64] mb-1">Title</label>
                    <input
                      type="text"
                      value={item.title}
                      disabled={item.status === 'uploading' || item.status === 'done'}
                      onChange={(e) => updateQueued(item.localId, { title: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#766E64] mb-1">Category</label>
                    <select
                      value={item.categoryId}
                      disabled={item.status === 'uploading' || item.status === 'done'}
                      onChange={(e) => updateQueued(item.localId, { categoryId: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-[#766E64] mb-1">Description</label>
                    <input
                      type="text"
                      value={item.description}
                      disabled={item.status === 'uploading' || item.status === 'done'}
                      onChange={(e) => updateQueued(item.localId, { description: e.target.value })}
                      placeholder="Fabric notes, tailoring details, or occasion context..."
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-wrap items-center gap-5 pt-1 text-xs">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <span>Frame:</span>
                      <select
                        value={item.aspectRatio}
                        disabled={item.status === 'uploading' || item.status === 'done'}
                        onChange={(e) =>
                          updateQueued(item.localId, {
                            aspectRatio: e.target.value as AspectRatioType,
                          })
                        }
                        className="px-2 py-1 bg-[#FAF8F5] border border-[#171614]/15"
                      >
                        <option value="portrait">Portrait (3:4)</option>
                        <option value="landscape">Landscape (4:3)</option>
                        <option value="square">Square (1:1)</option>
                      </select>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.featured}
                        disabled={item.status === 'uploading' || item.status === 'done'}
                        onChange={(e) => updateQueued(item.localId, { featured: e.target.checked })}
                      />
                      <span>Featured on Home</span>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.published}
                        disabled={item.status === 'uploading' || item.status === 'done'}
                        onChange={(e) => updateQueued(item.localId, { published: e.target.checked })}
                      />
                      <span>Publish Immediately</span>
                    </label>
                  </div>

                  {/* Real Upload Progress */}
                  {(item.status === 'uploading' || item.status === 'done' || item.error) && (
                    <div className="sm:col-span-2 pt-2">
                      {item.status === 'uploading' && (
                        <div>
                          <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#5C5750] mb-1">
                            <span>Uploading to persistent storage...</span>
                            <span>{item.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#EAE5DD] overflow-hidden">
                            <div
                              className="h-full bg-[#171614] transition-all duration-150"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {item.status === 'done' && (
                        <p className="inline-flex items-center gap-1.5 text-xs text-[#1B5E20]">
                          <Check className="w-3.5 h-3.5" />
                          <span>Uploaded and saved to portfolio</span>
                        </p>
                      )}
                      {item.error && <p className="text-xs text-[#8A1C13]">{item.error}</p>}
                    </div>
                  )}
                </div>

                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    disabled={item.status === 'uploading'}
                    onClick={() => removeQueued(item.localId)}
                    aria-label="Remove from upload queue"
                    className="p-2 text-[#766E64] hover:text-[#8A1C13] disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
