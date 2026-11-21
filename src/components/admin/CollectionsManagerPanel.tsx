import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Layers,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { analyzeAndCreateThumbnail } from '../../lib/mediaThumb';
import {
  createWorkCollection,
  deleteCollectionMedia,
  deleteWorkCollection,
  getAdminCollections,
  reorderCollectionMedia,
  reorderWorkCollections,
  updateCollectionMedia,
  updateOurWorkSettings,
  updateWorkCollection,
  uploadCollectionMedia,
} from '../../lib/api';
import type {
  AspectRatioType,
  CollectionLayoutStyle,
  CollectionMediaItem,
  CollectionsOverviewStats,
  MediaType,
  OurWorkPageSettings,
  WorkCollection,
} from '../../types/studio';
import { StudioMedia } from '../StudioMedia';

interface CollectionsManagerPanelProps {
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

interface QueuedCollectionMedia {
  localId: string;
  file: File;
  previewUrl: string;
  thumbnailBlob: Blob | null;
  mediaType: MediaType;
  aspectRatio: AspectRatioType;
  caption: string;
  creationDetails: string;
  published: boolean;
}

const ACCEPTED_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
]);

const LAYOUT_OPTIONS: Array<{ value: CollectionLayoutStyle; label: string }> = [
  { value: 'editorial-split', label: 'Editorial Split (Cover + Previews)' },
  { value: 'grid-3', label: '3-Column Gallery Grid' },
  { value: 'grid-4', label: '4-Column Lookbook Grid' },
  { value: 'asymmetric', label: 'Asymmetric Editorial Feature' },
];

function slugPreview(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function CollectionsManagerPanel({ onNotify, onError }: CollectionsManagerPanelProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CollectionsOverviewStats | null>(null);
  const [pageSettings, setPageSettings] = useState<OurWorkPageSettings | null>(null);
  const [collections, setCollections] = useState<WorkCollection[]>([]);

  // Intro & Promotional Banner settings panel state
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [introHeading, setIntroHeading] = useState('');
  const [introSubtitle, setIntroSubtitle] = useState('');
  const [introImageUrl, setIntroImageUrl] = useState('');
  const [introImageFile, setIntroImageFile] = useState<File | null>(null);
  const [introPreviewUrl, setIntroPreviewUrl] = useState('');
  const [promoVisible, setPromoVisible] = useState(true);
  const [promoHeading, setPromoHeading] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoImageUrl, setPromoImageUrl] = useState('');
  const [promoImageFile, setPromoImageFile] = useState<File | null>(null);
  const [promoPreviewUrl, setPromoPreviewUrl] = useState('');
  const [promoButtonText, setPromoButtonText] = useState('');
  const [promoButtonUrl, setPromoButtonUrl] = useState('/contact');
  const [savingPageSettings, setSavingPageSettings] = useState(false);
  const [settingsProgress, setSettingsProgress] = useState(0);

  // Create collection state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLayoutStyle, setNewLayoutStyle] = useState<CollectionLayoutStyle>('editorial-split');
  const [newPreviewLimit, setNewPreviewLimit] = useState(3);
  const [newPublished, setNewPublished] = useState(true);
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [newCoverPreview, setNewCoverPreview] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);

  // Edit collection modal state
  const [editingCollection, setEditingCollection] = useState<WorkCollection | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLayoutStyle, setEditLayoutStyle] = useState<CollectionLayoutStyle>('editorial-split');
  const [editPreviewLimit, setEditPreviewLimit] = useState(3);
  const [editPublished, setEditPublished] = useState(true);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editProgress, setEditProgress] = useState(0);

  // Delete confirmations
  const [confirmDeleteCollection, setConfirmDeleteCollection] = useState<WorkCollection | null>(null);
  const [confirmDeleteMedia, setConfirmDeleteMedia] = useState<{
    collectionId: string;
    item: CollectionMediaItem;
  } | null>(null);

  // Expanded gallery manager per collection
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);
  const [queuedMedia, setQueuedMedia] = useState<QueuedCollectionMedia[]>([]);
  const [draggingMedia, setDraggingMedia] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  // Inline media metadata editor
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [mediaCaptionDraft, setMediaCaptionDraft] = useState('');
  const [mediaDetailsDraft, setMediaDetailsDraft] = useState('');
  const [mediaAspectDraft, setMediaAspectDraft] = useState<AspectRatioType>('portrait');
  const [savingMediaMeta, setSavingMediaMeta] = useState(false);

  const hydratePageSettings = useCallback((ps: OurWorkPageSettings) => {
    setPageSettings(ps);
    setIntroHeading(ps.introHeading);
    setIntroSubtitle(ps.introSubtitle);
    setIntroImageUrl(ps.introImageUrl);
    setPromoVisible(ps.promoVisible);
    setPromoHeading(ps.promoHeading);
    setPromoDescription(ps.promoDescription);
    setPromoImageUrl(ps.promoImageUrl);
    setPromoButtonText(ps.promoButtonText);
    setPromoButtonUrl(ps.promoButtonUrl || '/contact');
  }, []);

  const loadCollectionsData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await getAdminCollections();
        setStats(data.stats);
        hydratePageSettings(data.pageSettings);
        setCollections(data.collections);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Unable to load Our Work collections.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [hydratePageSettings, onError]
  );

  useEffect(() => {
    void loadCollectionsData();
  }, [loadCollectionsData]);

  // Clear preview object URLs on unmount or drawer switch
  const clearMediaQueue = useCallback(() => {
    setQueuedMedia((prev) => {
      prev.forEach((q) => URL.revokeObjectURL(q.previewUrl));
      return [];
    });
  }, []);

  const toggleExpandCollection = (collectionId: string) => {
    clearMediaQueue();
    setEditingMediaId(null);
    setExpandedCollectionId((prev) => (prev === collectionId ? null : collectionId));
  };

  // Page Intro & Promo Settings handlers
  const handleIntroImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (introPreviewUrl) URL.revokeObjectURL(introPreviewUrl);
    setIntroImageFile(file);
    setIntroPreviewUrl(URL.createObjectURL(file));
  };

  const handlePromoImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (promoPreviewUrl) URL.revokeObjectURL(promoPreviewUrl);
    setPromoImageFile(file);
    setPromoPreviewUrl(URL.createObjectURL(file));
  };

  const handleSavePageSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPageSettings(true);
    setSettingsProgress(0);
    try {
      const res = await updateOurWorkSettings(
        {
          introHeading: introHeading.trim() || 'Our Work',
          introSubtitle: introSubtitle.trim(),
          introImageUrl: introImageFile ? undefined : introImageUrl,
          introImageFile,
          promoVisible,
          promoHeading: promoHeading.trim(),
          promoDescription: promoDescription.trim(),
          promoImageUrl: promoImageFile ? undefined : promoImageUrl,
          promoImageFile,
          promoButtonText: promoButtonText.trim(),
          promoButtonUrl: promoButtonUrl.trim() || '/contact',
        },
        (p) => setSettingsProgress(p)
      );
      hydratePageSettings(res.pageSettings);
      if (introPreviewUrl) URL.revokeObjectURL(introPreviewUrl);
      if (promoPreviewUrl) URL.revokeObjectURL(promoPreviewUrl);
      setIntroImageFile(null);
      setIntroPreviewUrl('');
      setPromoImageFile(null);
      setPromoPreviewUrl('');
      onNotify('Our Work intro and promotional banner saved.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save Our Work settings.');
    } finally {
      setSavingPageSettings(false);
    }
  };

  // Create collection handlers
  const handleNewCoverSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (newCoverPreview) URL.revokeObjectURL(newCoverPreview);
    setNewCoverFile(file);
    setNewCoverPreview(URL.createObjectURL(file));
  };

  const handleCreateCollection = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCoverFile) {
      onError('Please upload a cover photograph for the new collection.');
      return;
    }
    setCreatingCollection(true);
    setCreateProgress(0);
    try {
      const res = await createWorkCollection(
        {
          title: newTitle.trim(),
          slug: newSlug.trim() || undefined,
          description: newDescription.trim(),
          coverFile: newCoverFile,
          layoutStyle: newLayoutStyle,
          previewLimit: newPreviewLimit,
          published: newPublished,
        },
        (p) => setCreateProgress(p)
      );
      await loadCollectionsData(true);
      onNotify(`Collection "${res.collection.title}" created.`);
      setNewTitle('');
      setNewSlug('');
      setNewDescription('');
      setNewLayoutStyle('editorial-split');
      setNewPreviewLimit(3);
      setNewPublished(true);
      if (newCoverPreview) URL.revokeObjectURL(newCoverPreview);
      setNewCoverFile(null);
      setNewCoverPreview('');
      setShowCreateForm(false);
      setExpandedCollectionId(res.collection.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to create collection.');
    } finally {
      setCreatingCollection(false);
    }
  };

  // Edit collection modal handlers
  const openEditModal = (col: WorkCollection) => {
    setEditingCollection(col);
    setEditTitle(col.title);
    setEditSlug(col.slug);
    setEditDescription(col.description);
    setEditLayoutStyle(col.layoutStyle);
    setEditPreviewLimit(col.previewLimit);
    setEditPublished(col.published);
    setEditCoverFile(null);
    if (editCoverPreview) URL.revokeObjectURL(editCoverPreview);
    setEditCoverPreview('');
  };

  const handleEditCoverSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (editCoverPreview) URL.revokeObjectURL(editCoverPreview);
    setEditCoverFile(file);
    setEditCoverPreview(URL.createObjectURL(file));
  };

  const handleSaveCollectionEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCollection) return;
    setSavingEdit(true);
    setEditProgress(0);
    try {
      const res = await updateWorkCollection(
        editingCollection.id,
        {
          title: editTitle.trim(),
          slug: editSlug.trim() || undefined,
          description: editDescription.trim(),
          coverFile: editCoverFile,
          layoutStyle: editLayoutStyle,
          previewLimit: editPreviewLimit,
          published: editPublished,
        },
        (p) => setEditProgress(p)
      );
      await loadCollectionsData(true);
      setEditingCollection(null);
      if (editCoverPreview) URL.revokeObjectURL(editCoverPreview);
      setEditCoverFile(null);
      setEditCoverPreview('');
      onNotify(`Collection "${res.collection.title}" updated.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to save collection changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleCollectionPublished = async (col: WorkCollection) => {
    try {
      const res = await updateWorkCollection(col.id, { published: !col.published });
      await loadCollectionsData(true);
      onNotify(
        res.collection.published
          ? `"${res.collection.title}" is now live on Our Work.`
          : `"${res.collection.title}" moved to drafts.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to update publish status.');
    }
  };

  const handleMoveCollection = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= collections.length) return;
    const next = [...collections];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setCollections(next);
    try {
      const res = await reorderWorkCollections(next.map((c) => c.id));
      setCollections(res.collections);
      onNotify('Collection display order updated.');
    } catch (err) {
      await loadCollectionsData(true);
      onError(err instanceof Error ? err.message : 'Unable to reorder collections.');
    }
  };

  const handleConfirmDeleteCollection = async () => {
    if (!confirmDeleteCollection) return;
    try {
      await deleteWorkCollection(confirmDeleteCollection.id);
      if (expandedCollectionId === confirmDeleteCollection.id) {
        clearMediaQueue();
        setExpandedCollectionId(null);
      }
      setConfirmDeleteCollection(null);
      await loadCollectionsData(true);
      onNotify('Collection removed.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete collection.');
    }
  };

  // Multi-file upload inside expanded collection
  const queueCollectionFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const added: QueuedCollectionMedia[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(fileList)) {
      const mime = file.type.toLowerCase();
      if (!ACCEPTED_MEDIA_TYPES.has(mime)) {
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
      const baseCaption = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      added.push({
        localId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: analyzed.previewUrl,
        thumbnailBlob: analyzed.thumbnailBlob,
        mediaType: isVideo ? 'video' : 'image',
        aspectRatio: analyzed.aspectRatio,
        caption: baseCaption,
        creationDetails: '',
        published: true,
      });
    }

    if (rejected.length > 0) {
      onError(`Skipped: ${rejected.join(', ')}. Accepted: JPG, JPEG, PNG, WEBP, MP4.`);
    }
    if (added.length > 0) {
      setQueuedMedia((prev) => [...prev, ...added]);
    }
  };

  const handleUploadQueuedMedia = async (collectionId: string) => {
    if (queuedMedia.length === 0) return;
    setUploadingMedia(true);
    setMediaUploadProgress(0);
    try {
      const res = await uploadCollectionMedia(
        collectionId,
        queuedMedia.map((q) => ({
          file: q.file,
          thumbnailBlob: q.thumbnailBlob,
          aspectRatio: q.aspectRatio,
          caption: q.caption.trim(),
          creationDetails: q.creationDetails.trim(),
          published: q.published,
        })),
        (p) => setMediaUploadProgress(p)
      );
      clearMediaQueue();
      await loadCollectionsData(true);
      onNotify(`${res.media.length} media item(s) added to collection.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to upload collection media.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleToggleMediaPublished = async (item: CollectionMediaItem) => {
    try {
      const res = await updateCollectionMedia(item.id, { published: !item.published });
      await loadCollectionsData(true);
      onNotify(res.media.published ? 'Media item published.' : 'Media item hidden as draft.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to update media visibility.');
    }
  };

  const handleMoveMediaItem = async (
    collection: WorkCollection,
    index: number,
    direction: -1 | 1
  ) => {
    const mediaList = collection.media || [];
    const target = index + direction;
    if (target < 0 || target >= mediaList.length) return;
    const reordered = [...mediaList];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    setCollections((prev) =>
      prev.map((c) => (c.id === collection.id ? { ...c, media: reordered } : c))
    );
    try {
      const res = await reorderCollectionMedia(
        collection.id,
        reordered.map((m) => m.id)
      );
      setCollections((prev) =>
        prev.map((c) => (c.id === collection.id ? { ...c, media: res.media } : c))
      );
      onNotify('Gallery media order saved.');
    } catch (err) {
      await loadCollectionsData(true);
      onError(err instanceof Error ? err.message : 'Unable to reorder media.');
    }
  };

  const openMediaMetaEditor = (item: CollectionMediaItem) => {
    setEditingMediaId(item.id);
    setMediaCaptionDraft(item.caption);
    setMediaDetailsDraft(item.creationDetails);
    setMediaAspectDraft(item.aspectRatio);
  };

  const handleSaveMediaMeta = async (mediaId: string) => {
    setSavingMediaMeta(true);
    try {
      await updateCollectionMedia(mediaId, {
        caption: mediaCaptionDraft.trim(),
        creationDetails: mediaDetailsDraft.trim(),
        aspectRatio: mediaAspectDraft,
      });
      setEditingMediaId(null);
      await loadCollectionsData(true);
      onNotify('Gallery item details updated.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to update item details.');
    } finally {
      setSavingMediaMeta(false);
    }
  };

  const handleConfirmDeleteMedia = async () => {
    if (!confirmDeleteMedia) return;
    try {
      await deleteCollectionMedia(confirmDeleteMedia.item.id);
      setConfirmDeleteMedia(null);
      await loadCollectionsData(true);
      onNotify('Media removed from collection.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to delete media item.');
    }
  };

  if (loading && collections.length === 0) {
    return (
      <div className="bg-white border border-[#171614]/10 p-10 text-center text-sm text-[#5C5750]">
        Loading Our Work collections...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Metrics Bar */}
      {stats && (
        <section
          aria-label="Our Work collections summary"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
        >
          <div className="bg-white border border-[#171614]/10 p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#766E64]">
              Total Collections
            </p>
            <p className="mt-2 font-mono text-2xl tabular-nums text-[#171614]">
              {stats.totalCollections}
            </p>
          </div>
          <div className="bg-white border border-[#171614]/10 p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#766E64]">
              Published Live
            </p>
            <p className="mt-2 font-mono text-2xl tabular-nums text-[#171614]">
              {stats.publishedCollections}
            </p>
          </div>
          <div className="bg-white border border-[#171614]/10 p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#766E64]">Drafts</p>
            <p className="mt-2 font-mono text-2xl tabular-nums text-[#171614]">
              {stats.draftCollections}
            </p>
          </div>
          <div className="bg-white border border-[#171614]/10 p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#766E64]">Photographs</p>
            <p className="mt-2 font-mono text-2xl tabular-nums text-[#171614]">
              {stats.totalPhotographs}
            </p>
          </div>
          <div className="bg-white border border-[#171614]/10 p-5 col-span-2 sm:col-span-1">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#766E64]">Videos</p>
            <p className="mt-2 font-mono text-2xl tabular-nums text-[#171614]">
              {stats.totalVideos}
            </p>
          </div>
        </section>
      )}

      {/* Collapsible Our Work Intro & Interstitial Promotional Banner Settings */}
      {pageSettings && (
        <section className="bg-white border border-[#171614]/10">
          <button
            type="button"
            onClick={() => setPageSettingsOpen((prev) => !prev)}
            className="w-full px-6 sm:px-8 py-5 flex items-center justify-between gap-4 text-left hover:bg-[#FAF8F5]/60 transition-colors"
          >
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#171614]">
                Page Introduction &amp; Promotional Banner
              </h2>
              <p className="mt-1 text-xs text-[#5C5750]">
                Edit the Our Work page heading, subtitle, optional intro landscape photograph, and interstitial promotional banner.
              </p>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-[#5C5750] shrink-0 transition-transform duration-200 ${
                pageSettingsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {pageSettingsOpen && (
            <form
              onSubmit={handleSavePageSettings}
              className="px-6 sm:px-8 pb-8 pt-4 border-t border-[#171614]/10 space-y-8"
            >
              {/* Intro Section Settings */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-[0.16em] text-[#766E64]">
                  1. Page Introduction
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Page Heading
                    </label>
                    <input
                      type="text"
                      required
                      value={introHeading}
                      onChange={(e) => setIntroHeading(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Optional Intro Landscape Photograph
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={handleIntroImageSelect}
                        className="block flex-1 min-w-0 text-xs text-[#5C5750] file:mr-3 file:py-2 file:px-3.5 file:border-0 file:bg-[#EFECE6] file:text-[#171614] file:text-xs file:font-medium"
                      />
                      {(introImageUrl || introPreviewUrl) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (introPreviewUrl) URL.revokeObjectURL(introPreviewUrl);
                            setIntroPreviewUrl('');
                            setIntroImageFile(null);
                            setIntroImageUrl('');
                          }}
                          className="px-3 py-1.5 text-xs text-[#8A1C13] border border-[#8A1C13]/25 hover:bg-[#FDF4F3]"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                    Subtitle / Intro Statement
                  </label>
                  <textarea
                    rows={2}
                    value={introSubtitle}
                    onChange={(e) => setIntroSubtitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                  />
                </div>

                {(introPreviewUrl || introImageUrl) && (
                  <div className="aspect-[16/9] max-w-md bg-[#EFECE6] border border-[#171614]/10 overflow-hidden">
                    <img
                      src={introPreviewUrl || introImageUrl}
                      alt="Our Work intro preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {/* Promotional Banner Settings */}
              <div className="pt-6 border-t border-[#171614]/10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-[0.16em] text-[#766E64]">
                      2. Interstitial Promotional Banner
                    </h3>
                    <p className="mt-1 text-xs text-[#5C5750]">
                      Displayed cleanly between collection sections when enabled.
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promoVisible}
                      onChange={(e) => setPromoVisible(e.target.checked)}
                    />
                    <span className="font-medium text-[#171614]">Show Banner on Our Work</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Banner Heading
                    </label>
                    <input
                      type="text"
                      value={promoHeading}
                      onChange={(e) => setPromoHeading(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Banner Landscape Photograph
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={handlePromoImageSelect}
                        className="block flex-1 min-w-0 text-xs text-[#5C5750] file:mr-3 file:py-2 file:px-3.5 file:border-0 file:bg-[#EFECE6] file:text-[#171614] file:text-xs file:font-medium"
                      />
                      {(promoImageUrl || promoPreviewUrl) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (promoPreviewUrl) URL.revokeObjectURL(promoPreviewUrl);
                            setPromoPreviewUrl('');
                            setPromoImageFile(null);
                            setPromoImageUrl('');
                          }}
                          className="px-3 py-1.5 text-xs text-[#8A1C13] border border-[#8A1C13]/25 hover:bg-[#FDF4F3]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                    Supporting Description
                  </label>
                  <textarea
                    rows={2}
                    value={promoDescription}
                    onChange={(e) => setPromoDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={promoButtonText}
                      onChange={(e) => setPromoButtonText(e.target.value)}
                      placeholder="e.g. Book a Custom Fitting"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Button Link Path or URL
                    </label>
                    <input
                      type="text"
                      value={promoButtonUrl}
                      onChange={(e) => setPromoButtonUrl(e.target.value)}
                      placeholder="/contact"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>
                </div>

                {(promoPreviewUrl || promoImageUrl) && (
                  <div className="aspect-[16/9] max-w-md bg-[#EFECE6] border border-[#171614]/10 overflow-hidden">
                    <img
                      src={promoPreviewUrl || promoImageUrl}
                      alt="Promotional banner preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {savingPageSettings && (introImageFile || promoImageFile) && (
                <div>
                  <div className="flex justify-between text-xs font-mono tabular-nums mb-1">
                    <span>Uploading banner media...</span>
                    <span>{settingsProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EAE5DD]">
                    <div className="h-full bg-[#171614]" style={{ width: `${settingsProgress}%` }} />
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={savingPageSettings}
                  className="px-7 py-3 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
                >
                  {savingPageSettings ? 'Saving Settings...' : 'Save Page Intro & Banner'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Collections Header & Create Button */}
      <div className="bg-white border border-[#171614]/10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-normal text-[#171614]">
            Our Work Collections
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#5C5750]">
            Create curated fashion collections, reorder sections, and upload multiple lookbook photographs and videos into each collection.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/work"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border border-[#171614]/15 text-[#171614] hover:bg-[#FAF8F5]"
          >
            <span>View Live Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{showCreateForm ? 'Close Form' : 'New Collection'}</span>
          </button>
        </div>
      </div>

      {/* Create New Collection Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateCollection}
          className="bg-white border border-[#171614]/10 p-6 sm:p-8 space-y-6"
        >
          <h3 className="font-serif text-2xl font-normal text-[#171614] pb-4 border-b border-[#171614]/8">
            Create New Collection
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Collection Title
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Bridal Trousseau"
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                URL Slug (optional — auto-generated if blank)
              </label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder={slugPreview(newTitle) || 'bridal-trousseau'}
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Our Work Section Layout
              </label>
              <select
                value={newLayoutStyle}
                onChange={(e) => setNewLayoutStyle(e.target.value as CollectionLayoutStyle)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              >
                {LAYOUT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Preview Items Shown on Our Work (1–6)
              </label>
              <input
                type="number"
                min={1}
                max={6}
                value={newPreviewLimit}
                onChange={(e) =>
                  setNewPreviewLimit(Math.max(1, Math.min(6, Number(e.target.value) || 3)))
                }
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
              Short Editorial Description
            </label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe fabrics, silhouette direction, and handcrafted details..."
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#5C5750]">
              Cover Photograph (Required — JPG, PNG, WEBP)
            </label>
            <input
              type="file"
              required
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleNewCoverSelect}
              className="block w-full text-xs text-[#5C5750] file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-[#EFECE6] file:text-[#171614] file:text-xs file:font-medium"
            />
            {newCoverPreview && (
              <div className="mt-3 aspect-[3/4] w-40 bg-[#EFECE6] border border-[#171614]/10 overflow-hidden">
                <img src={newCoverPreview} alt="Cover preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={newPublished}
              onChange={(e) => setNewPublished(e.target.checked)}
            />
            <span>Publish immediately on Our Work</span>
          </label>

          {creatingCollection && (
            <div>
              <div className="flex justify-between text-xs font-mono tabular-nums mb-1">
                <span>Creating collection...</span>
                <span>{createProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#EAE5DD]">
                <div className="h-full bg-[#171614]" style={{ width: `${createProgress}%` }} />
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={creatingCollection}
              className="px-7 py-3 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
            >
              {creatingCollection ? 'Creating...' : 'Create Collection'}
            </button>
          </div>
        </form>
      )}

      {/* Collections List */}
      <div className="space-y-5">
        {collections.length === 0 ? (
          <div className="bg-white border border-[#171614]/10 p-12 text-center text-sm text-[#766E64]">
            No collections configured yet. Click &ldquo;New Collection&rdquo; above to create one.
          </div>
        ) : (
          collections.map((col, idx) => {
            const mediaList = col.media || [];
            const photoCount = mediaList.filter((m) => m.mediaType === 'image').length;
            const videoCount = mediaList.filter((m) => m.mediaType === 'video').length;
            const isExpanded = expandedCollectionId === col.id;

            return (
              <article
                key={col.id}
                className="bg-white border border-[#171614]/10 overflow-hidden"
              >
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-5 min-w-0">
                    {/* Reorder Arrows */}
                    <div className="flex flex-col gap-1 shrink-0 pt-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveCollection(idx, -1)}
                        aria-label={`Move ${col.title} up`}
                        className="p-1.5 border border-[#171614]/12 text-[#5C5750] hover:text-[#171614] hover:bg-[#FAF8F5] disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === collections.length - 1}
                        onClick={() => handleMoveCollection(idx, 1)}
                        aria-label={`Move ${col.title} down`}
                        className="p-1.5 border border-[#171614]/12 text-[#5C5750] hover:text-[#171614] hover:bg-[#FAF8F5] disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Cover Thumbnail */}
                    <div className="w-20 h-24 sm:w-24 sm:h-28 bg-[#EFECE6] shrink-0 overflow-hidden border border-[#171614]/10">
                      <StudioMedia
                        src={col.coverImageUrl}
                        thumbnailSrc={col.coverImageUrl}
                        mediaType="image"
                        alt={col.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Collection Summary */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#766E64]">
                        <span
                          className={`px-2 py-0.5 uppercase tracking-wider border ${
                            col.published
                              ? 'border-[#171614]/25 bg-[#FAF8F5] text-[#171614]'
                              : 'border-[#171614]/10 text-[#766E64]'
                          }`}
                        >
                          {col.published ? 'Live' : 'Draft'}
                        </span>
                        <span>{col.layoutStyle}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">Preview {col.previewLimit}</span>
                      </div>

                      <h3 className="mt-1.5 font-serif text-2xl font-normal text-[#171614] leading-snug">
                        {col.title}
                      </h3>

                      <p className="mt-1 text-xs text-[#5C5750] line-clamp-2 max-w-2xl">
                        {col.description}
                      </p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-[#766E64]">
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <ImageIcon className="w-3.5 h-3.5" />
                          {photoCount} {photoCount === 1 ? 'Photo' : 'Photos'}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Film className="w-3.5 h-3.5" />
                          {videoCount} {videoCount === 1 ? 'Video' : 'Videos'}
                        </span>
                        <Link
                          to={`/our-work/collection/${col.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[#171614] hover:underline"
                        >
                          <span>/our-work/collection/{col.slug}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Collection Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleCollectionPublished(col)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-[#171614]/15 hover:bg-[#FAF8F5]"
                    >
                      {col.published ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-[#766E64]" />
                      )}
                      <span>{col.published ? 'Published' : 'Draft'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(col)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-[#171614]/15 hover:bg-[#FAF8F5]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpandCollection(col.id)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium ${
                        isExpanded
                          ? 'bg-[#171614] text-[#FAF8F5]'
                          : 'border border-[#171614] text-[#171614] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Close Media' : 'Manage Media'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCollection(col)}
                      aria-label={`Delete ${col.title}`}
                      className="p-2 text-[#766E64] hover:text-[#8A1C13]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expandable Media Gallery & Multi-Upload Workspace */}
                {isExpanded && (
                  <div className="border-t border-[#171614]/10 bg-[#FAF8F5] p-5 sm:p-8 space-y-8">
                    {/* Multi-file Dropzone */}
                    <div className="bg-white border border-[#171614]/10 p-5 sm:p-6 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-serif text-xl text-[#171614]">
                            Upload Photographs &amp; Videos to {col.title}
                          </h4>
                          <p className="text-xs text-[#5C5750]">
                            Add multiple JPG, JPEG, PNG, WEBP images (up to 15 MB) or MP4 videos (up to 80 MB).
                          </p>
                        </div>
                        <input
                          ref={mediaInputRef}
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4"
                          onChange={(e) => {
                            void queueCollectionFiles(e.target.files);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => mediaInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Select Files</span>
                        </button>
                      </div>

                      <div
                        onDragOver={(e: DragEvent<HTMLDivElement>) => {
                          e.preventDefault();
                          setDraggingMedia(true);
                        }}
                        onDragLeave={() => setDraggingMedia(false)}
                        onDrop={(e: DragEvent<HTMLDivElement>) => {
                          e.preventDefault();
                          setDraggingMedia(false);
                          void queueCollectionFiles(e.dataTransfer.files);
                        }}
                        onClick={() => mediaInputRef.current?.click()}
                        className={`border border-dashed p-6 text-center cursor-pointer transition-colors ${
                          draggingMedia
                            ? 'border-[#171614] bg-[#EFECE6]'
                            : 'border-[#171614]/25 bg-[#FAF8F5] hover:border-[#171614]/50'
                        }`}
                      >
                        <p className="text-xs text-[#5C5750]">
                          Drag and drop photographs or MP4 studio videos here, or click to browse.
                        </p>
                      </div>

                      {/* Staged Upload Queue */}
                      {queuedMedia.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs font-mono tabular-nums text-[#5C5750]">
                              {queuedMedia.length} file(s) ready to upload
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={clearMediaQueue}
                                className="px-3 py-1.5 text-xs border border-[#171614]/15"
                              >
                                Clear Queue
                              </button>
                              <button
                                type="button"
                                disabled={uploadingMedia}
                                onClick={() => void handleUploadQueuedMedia(col.id)}
                                className="px-5 py-2 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
                              >
                                {uploadingMedia
                                  ? `Uploading (${mediaUploadProgress}%)...`
                                  : `Upload ${queuedMedia.length} Item(s)`}
                              </button>
                            </div>
                          </div>

                          {uploadingMedia && (
                            <div className="w-full h-1.5 bg-[#EAE5DD]">
                              <div
                                className="h-full bg-[#171614]"
                                style={{ width: `${mediaUploadProgress}%` }}
                              />
                            </div>
                          )}

                          <div className="space-y-3">
                            {queuedMedia.map((q) => (
                              <div
                                key={q.localId}
                                className="border border-[#171614]/10 bg-[#FAF8F5] p-3.5 flex flex-col sm:flex-row gap-4"
                              >
                                <div className="w-20 h-24 bg-[#EFECE6] shrink-0 overflow-hidden">
                                  {q.mediaType === 'video' ? (
                                    <video
                                      src={q.previewUrl}
                                      muted
                                      playsInline
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <img
                                      src={q.previewUrl}
                                      alt={q.caption}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>

                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-[11px] text-[#766E64] mb-1">
                                      Caption
                                    </label>
                                    <input
                                      type="text"
                                      value={q.caption}
                                      onChange={(e) =>
                                        setQueuedMedia((prev) =>
                                          prev.map((item) =>
                                            item.localId === q.localId
                                              ? { ...item, caption: e.target.value }
                                              : item
                                          )
                                        )
                                      }
                                      placeholder="Garment title or look name"
                                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#171614]/15"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-[#766E64] mb-1">
                                      Creation Details
                                    </label>
                                    <input
                                      type="text"
                                      value={q.creationDetails}
                                      onChange={(e) =>
                                        setQueuedMedia((prev) =>
                                          prev.map((item) =>
                                            item.localId === q.localId
                                              ? { ...item, creationDetails: e.target.value }
                                              : item
                                          )
                                        )
                                      }
                                      placeholder="Fabric, stitch work, silhouette..."
                                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#171614]/15"
                                    />
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                      <label className="block text-[11px] text-[#766E64] mb-1">
                                        Aspect Ratio
                                      </label>
                                      <select
                                        value={q.aspectRatio}
                                        onChange={(e) =>
                                          setQueuedMedia((prev) =>
                                            prev.map((item) =>
                                              item.localId === q.localId
                                                ? {
                                                    ...item,
                                                    aspectRatio: e.target.value as AspectRatioType,
                                                  }
                                                : item
                                            )
                                          )
                                        }
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#171614]/15"
                                      >
                                        <option value="portrait">Portrait (3:4)</option>
                                        <option value="landscape">Landscape (4:3)</option>
                                        <option value="square">Square (1:1)</option>
                                      </select>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        URL.revokeObjectURL(q.previewUrl);
                                        setQueuedMedia((prev) =>
                                          prev.filter((item) => item.localId !== q.localId)
                                        );
                                      }}
                                      aria-label="Remove queued file"
                                      className="p-2 text-[#766E64] hover:text-[#8A1C13]"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Existing Gallery Items */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-serif text-xl text-[#171614]">
                          Collection Media ({mediaList.length})
                        </h4>
                        <span className="text-xs text-[#766E64]">
                          First {col.previewLimit} published items appear as previews on Our Work
                        </span>
                      </div>

                      {mediaList.length === 0 ? (
                        <p className="py-8 text-center text-xs text-[#766E64] bg-white border border-[#171614]/10">
                          No photographs or videos uploaded to this collection yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                          {mediaList.map((m, mIdx) => {
                            const isEditingMeta = editingMediaId === m.id;
                            return (
                              <div
                                key={m.id}
                                className="bg-white border border-[#171614]/10 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="relative aspect-[3/4] bg-[#EFECE6] overflow-hidden">
                                    <StudioMedia
                                      src={m.mediaUrl}
                                      thumbnailSrc={m.thumbnailUrl || m.mediaUrl}
                                      mediaType={m.mediaType}
                                      alt={m.caption || col.title}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#171614]/80 text-[#FAF8F5] text-[10px] font-mono uppercase">
                                      {m.mediaType} · {m.aspectRatio}
                                    </div>
                                    {!m.published && (
                                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#FAF8F5]/95 text-[#766E64] text-[10px] font-mono uppercase border border-[#171614]/15">
                                        Draft
                                      </div>
                                    )}
                                  </div>

                                  {isEditingMeta ? (
                                    <div className="p-3.5 space-y-2.5">
                                      <input
                                        type="text"
                                        value={mediaCaptionDraft}
                                        onChange={(e) => setMediaCaptionDraft(e.target.value)}
                                        placeholder="Caption"
                                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#171614]/15"
                                      />
                                      <textarea
                                        rows={2}
                                        value={mediaDetailsDraft}
                                        onChange={(e) => setMediaDetailsDraft(e.target.value)}
                                        placeholder="Creation details"
                                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#171614]/15"
                                      />
                                      <select
                                        value={mediaAspectDraft}
                                        onChange={(e) =>
                                          setMediaAspectDraft(e.target.value as AspectRatioType)
                                        }
                                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-[#171614]/15"
                                      >
                                        <option value="portrait">Portrait (3:4)</option>
                                        <option value="landscape">Landscape (4:3)</option>
                                        <option value="square">Square (1:1)</option>
                                      </select>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          disabled={savingMediaMeta}
                                          onClick={() => void handleSaveMediaMeta(m.id)}
                                          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 text-xs bg-[#171614] text-[#FAF8F5]"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Save</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingMediaId(null)}
                                          className="px-3 py-1.5 text-xs border border-[#171614]/15"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3.5">
                                      <p className="text-xs font-medium text-[#171614] line-clamp-1">
                                        {m.caption || 'Untitled look'}
                                      </p>
                                      {m.creationDetails && (
                                        <p className="mt-1 text-[11px] text-[#5C5750] line-clamp-2">
                                          {m.creationDetails}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="px-3 py-2.5 border-t border-[#171614]/8 flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={mIdx === 0}
                                      onClick={() => void handleMoveMediaItem(col, mIdx, -1)}
                                      aria-label="Move item earlier"
                                      className="p-1.5 text-[#5C5750] hover:text-[#171614] disabled:opacity-30"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={mIdx === mediaList.length - 1}
                                      onClick={() => void handleMoveMediaItem(col, mIdx, 1)}
                                      aria-label="Move item later"
                                      className="p-1.5 text-[#5C5750] hover:text-[#171614] disabled:opacity-30"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => openMediaMetaEditor(m)}
                                      title="Edit caption & details"
                                      className="p-1.5 text-[#5C5750] hover:text-[#171614]"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleToggleMediaPublished(m)}
                                      title={m.published ? 'Hide from public gallery' : 'Publish'}
                                      className="p-1.5 text-[#5C5750] hover:text-[#171614]"
                                    >
                                      {m.published ? (
                                        <Eye className="w-3.5 h-3.5" />
                                      ) : (
                                        <EyeOff className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmDeleteMedia({ collectionId: col.id, item: m })
                                      }
                                      aria-label="Delete media item"
                                      className="p-1.5 text-[#766E64] hover:text-[#8A1C13]"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Edit Collection Modal */}
      {editingCollection && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editingCollection.title}`}
          className="fixed inset-0 z-50 bg-[#171614]/60 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#171614]/15 max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#171614]/10">
              <h3 className="font-serif text-2xl font-normal text-[#171614]">
                Edit Collection Details
              </h3>
              <button
                type="button"
                onClick={() => setEditingCollection(null)}
                aria-label="Close modal"
                className="p-2 text-[#5C5750] hover:text-[#171614]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCollectionEdit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C5750] mb-1">
                    Collection Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5750] mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FAF8F5] border border-[#171614]/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5750] mb-1">
                    Section Layout
                  </label>
                  <select
                    value={editLayoutStyle}
                    onChange={(e) => setEditLayoutStyle(e.target.value as CollectionLayoutStyle)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                  >
                    {LAYOUT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5750] mb-1">
                    Preview Items Count (1–6)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={editPreviewLimit}
                    onChange={(e) =>
                      setEditPreviewLimit(Math.max(1, Math.min(6, Number(e.target.value) || 3)))
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#FAF8F5] border border-[#171614]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1">
                  Editorial Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#5C5750]">
                  Replace Cover Photograph (optional)
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleEditCoverSelect}
                  className="block w-full text-xs text-[#5C5750] file:mr-3 file:py-2 file:px-3.5 file:border-0 file:bg-[#EFECE6]"
                />
                <div className="mt-2 aspect-[3/4] w-32 bg-[#EFECE6] border border-[#171614]/10 overflow-hidden">
                  <img
                    src={editCoverPreview || editingCollection.coverImageUrl}
                    alt={editTitle}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editPublished}
                  onChange={(e) => setEditPublished(e.target.checked)}
                />
                <span>Published on Our Work</span>
              </label>

              {savingEdit && editCoverFile && (
                <div>
                  <div className="flex justify-between text-xs font-mono tabular-nums mb-1">
                    <span>Uploading cover photograph...</span>
                    <span>{editProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EAE5DD]">
                    <div className="h-full bg-[#171614]" style={{ width: `${editProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCollection(null)}
                  className="px-5 py-2.5 text-xs font-medium border border-[#171614]/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Collection Confirmation */}
      {confirmDeleteCollection && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm collection deletion"
          className="fixed inset-0 z-50 bg-[#171614]/60 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#171614]/15 max-w-md w-full p-6 sm:p-8">
            <h3 className="font-serif text-2xl text-[#171614]">Delete Collection?</h3>
            <p className="mt-2 text-sm text-[#5C5750]">
              Remove{' '}
              <span className="font-medium text-[#171614]">{confirmDeleteCollection.title}</span>{' '}
              and all uploaded photographs and videos inside this collection?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteCollection(null)}
                className="px-5 py-2.5 text-xs font-medium border border-[#171614]/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteCollection()}
                className="px-5 py-2.5 text-xs font-medium bg-[#8A1C13] text-white hover:bg-[#70160E]"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Media Item Confirmation */}
      {confirmDeleteMedia && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm media deletion"
          className="fixed inset-0 z-50 bg-[#171614]/60 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#171614]/15 max-w-md w-full p-6 sm:p-8">
            <h3 className="font-serif text-2xl text-[#171614]">Remove Media Item?</h3>
            <p className="mt-2 text-sm text-[#5C5750]">
              Remove{' '}
              <span className="font-medium text-[#171614]">
                {confirmDeleteMedia.item.caption || 'this media item'}
              </span>{' '}
              from the collection gallery?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteMedia(null)}
                className="px-5 py-2.5 text-xs font-medium border border-[#171614]/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteMedia()}
                className="px-5 py-2.5 text-xs font-medium bg-[#8A1C13] text-white hover:bg-[#70160E]"
              >
                Remove Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
