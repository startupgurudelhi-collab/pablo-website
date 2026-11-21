import { useState, type ChangeEvent, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { analyzeAndCreateThumbnail } from '../../lib/mediaThumb';
import { updatePortfolioItem } from '../../lib/api';
import type { AspectRatioType, PortfolioCategory, PortfolioItem } from '../../types/studio';

interface EditItemModalProps {
  item: PortfolioItem;
  categories: PortfolioCategory[];
  onClose: () => void;
  onSaved: (updated: PortfolioItem) => void;
}

export function EditItemModal({ item, categories, onClose, onSaved }: EditItemModalProps) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(item.aspectRatio);
  const [featured, setFeatured] = useState(item.featured);
  const [published, setPublished] = useState(item.published);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementThumb, setReplacementThumb] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleReplacementChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplacementFile(file);
    const analyzed = await analyzeAndCreateThumbnail(file);
    setReplacementThumb(analyzed.thumbnailBlob);
    setAspectRatio(analyzed.aspectRatio);
    URL.revokeObjectURL(analyzed.previewUrl);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await updatePortfolioItem(
        item.id,
        {
          title,
          description,
          categoryId,
          aspectRatio,
          featured,
          published,
          file: replacementFile || undefined,
          thumbnailBlob: replacementThumb,
        },
        (p) => setProgress(p)
      );
      onSaved(res.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${item.title}`}
      className="fixed inset-0 z-50 bg-[#171614]/60 flex items-center justify-center p-4"
    >
      <div className="bg-white border border-[#171614]/15 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-[#171614]/10">
          <h2 className="font-serif text-2xl font-normal text-[#171614]">Edit Portfolio Item</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-[#5C5750] hover:text-[#171614]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-[#FDF4F3] border border-[#B42318]/25 text-xs text-[#8A1C13]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#5C5750] mb-1.5">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">Frame Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatioType)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              >
                <option value="portrait">Portrait (3:4)</option>
                <option value="landscape">Landscape (4:3)</option>
                <option value="square">Square (1:1)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C5750] mb-1.5">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
              Replace Media File (optional)
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4"
              onChange={handleReplacementChange}
              className="block w-full text-xs text-[#5C5750] file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-[#EFECE6] file:text-[#171614] file:text-xs file:font-medium hover:file:bg-[#E5E0D7]"
            />
            {replacementFile && (
              <p className="mt-1.5 text-xs text-[#5C5750]">New file selected: {replacementFile.name}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              <span>Featured on Homepage</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              <span>Published</span>
            </label>
          </div>

          {saving && replacementFile && (
            <div>
              <div className="flex justify-between text-xs font-mono tabular-nums mb-1">
                <span>Uploading replacement media...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#EAE5DD]">
                <div className="h-full bg-[#171614]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#171614]/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-medium border border-[#171614]/20 text-[#171614] hover:bg-[#FAF8F5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
