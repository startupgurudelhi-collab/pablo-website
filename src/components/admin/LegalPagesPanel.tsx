import { useEffect, useState, type FormEvent } from 'react';
import { ExternalLink, Eye, EyeOff, FileText } from 'lucide-react';
import { updateAdminLegalPage } from '../../lib/api';
import type { LegalPage, LegalPageSlug } from '../../types/studio';
import { LegalDocumentView } from '../LegalDocumentView';

interface LegalPagesPanelProps {
  pages: LegalPage[];
  onPagesChange: (pages: LegalPage[]) => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export function LegalPagesPanel({
  pages,
  onPagesChange,
  onNotify,
  onError,
}: LegalPagesPanelProps) {
  const [selectedSlug, setSelectedSlug] = useState<LegalPageSlug>('privacy-policy');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);

  const activePage = pages.find((p) => p.slug === selectedSlug) || pages[0] || null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [lastRevisedDate, setLastRevisedDate] = useState('');
  const [published, setPublished] = useState(true);

  useEffect(() => {
    if (!activePage) return;
    setTitle(activePage.title);
    setContent(activePage.content);
    setSeoTitle(activePage.seoTitle);
    setSeoDescription(activePage.seoDescription);
    setLastRevisedDate(activePage.lastRevisedDate);
    setPublished(activePage.published);
  }, [activePage]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!activePage) return;
    setSaving(true);
    onError('');
    try {
      const res = await updateAdminLegalPage(activePage.slug, {
        title,
        content,
        seoTitle,
        seoDescription,
        lastRevisedDate,
        published,
      });
      onPagesChange(pages.map((p) => (p.slug === res.page.slug ? res.page : p)));
      onNotify(`${res.page.title} saved.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to save legal page.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (target: LegalPage) => {
    onError('');
    try {
      const nextPublished = !target.published;
      const res = await updateAdminLegalPage(target.slug, { published: nextPublished });
      onPagesChange(pages.map((p) => (p.slug === res.page.slug ? res.page : p)));
      if (target.slug === selectedSlug) {
        setPublished(res.page.published);
      }
      onNotify(
        res.page.published
          ? `${res.page.title} published to the website.`
          : `${res.page.title} unpublished from public access.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update publish status.');
    }
  };

  if (!activePage) {
    return (
      <div className="bg-white border border-[#171614]/10 p-8 text-sm text-[#5C5750]">
        Loading legal pages...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pages.map((page) => {
          const isSelected = page.slug === activePage.slug;
          return (
            <div
              key={page.slug}
              className={`bg-white border p-5 sm:p-6 flex flex-col justify-between gap-4 transition-colors ${
                isSelected ? 'border-[#171614]' : 'border-[#171614]/10'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlug(page.slug);
                      setMode('edit');
                    }}
                    className="text-left"
                  >
                    <h2 className="font-serif text-2xl font-normal text-[#171614] hover:underline underline-offset-4">
                      {page.title}
                    </h2>
                  </button>
                  <p className="mt-1 text-xs font-mono text-[#766E64]">
                    /{page.slug} · Revised {page.lastRevisedDate || 'Not set'}
                  </p>
                </div>

                <span className="text-[11px] font-mono uppercase tracking-wide text-[#5C5750] shrink-0">
                  {page.published ? 'Published' : 'Unpublished'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#171614]/8">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlug(page.slug);
                      setMode('edit');
                    }}
                    className={`px-3.5 py-1.5 text-xs font-medium border ${
                      isSelected
                        ? 'bg-[#171614] text-[#FAF8F5] border-[#171614]'
                        : 'border-[#171614]/20 text-[#171614] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    Edit Page
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePublished(page)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#171614]/15 hover:bg-[#FAF8F5]"
                  >
                    {page.published ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Unpublish</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </>
                    )}
                  </button>
                </div>

                {page.published && (
                  <a
                    href={`/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#5C5750] hover:text-[#171614]"
                  >
                    <span>Open Live</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor / Preview Workspace */}
      <div className="bg-white border border-[#171614]/10 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#171614]/8">
          <div>
            <h3 className="font-serif text-2xl font-normal text-[#171614]">
              {activePage.title}
            </h3>
            <p className="mt-1 text-xs text-[#5C5750]">
              Use &ldquo;## Section Heading&rdquo; for section headings and &ldquo;- item&rdquo; for bullet lists. Review bracketed owner placeholders before publishing final studio terms.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border ${
                mode === 'edit'
                  ? 'bg-[#171614] text-[#FAF8F5] border-[#171614]'
                  : 'border-[#171614]/20 text-[#171614] hover:bg-[#FAF8F5]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border ${
                mode === 'preview'
                  ? 'bg-[#171614] text-[#FAF8F5] border-[#171614]'
                  : 'border-[#171614]/20 text-[#171614] hover:bg-[#FAF8F5]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>
        </div>

        {mode === 'preview' ? (
          <div className="pt-8 bg-[#FAF8F5] p-6 sm:p-10 mt-6 border border-[#171614]/10">
            <LegalDocumentView
              title={title || activePage.title}
              content={content}
              lastRevisedDate={lastRevisedDate}
            />
          </div>
        ) : (
          <form onSubmit={handleSave} className="pt-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                  Page Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                  Last Revised Date
                </label>
                <input
                  type="date"
                  value={lastRevisedDate}
                  onChange={(e) => setLastRevisedDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                  SEO Meta Description
                </label>
                <input
                  type="text"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Legal Document Content
              </label>
              <textarea
                rows={20}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-[#FAF8F5] border border-[#171614]/15 font-mono leading-relaxed"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#171614]/8">
              <label className="inline-flex items-center gap-2.5 text-sm text-[#171614] cursor-pointer">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                />
                <span>Published on public website (/{activePage.slug})</span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMode('preview')}
                  className="px-5 py-2.5 text-xs font-medium border border-[#171614]/20 hover:bg-[#FAF8F5]"
                >
                  Preview Formatted Page
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
