import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Calendar,
  Edit3,
  Eye,
  EyeOff,
  Film,
  MapPin,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { analyzeAndCreateThumbnail } from '../../lib/mediaThumb';
import {
  createEvent,
  deleteEvent,
  deleteEventMedia,
  updateEvent,
  uploadEventMedia,
} from '../../lib/api';
import type { StudioEvent } from '../../types/studio';
import { StudioMedia } from '../StudioMedia';
import { formatEventDate } from '../EventModal';

const EVENT_CATEGORIES = [
  'Fashion Show',
  'Exhibition',
  'Wedding & Occasion',
  'Designer Showcase',
  'Event Participation',
  'Behind the Scenes',
];

interface EventsManagerPanelProps {
  events: StudioEvent[];
  onEventsChange: (events: StudioEvent[]) => void;
  onRefreshOverview: () => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export function EventsManagerPanel({
  events,
  onEventsChange,
  onRefreshOverview,
  onNotify,
  onError,
}: EventsManagerPanelProps) {
  // Create event state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(EVENT_CATEGORIES[0]);
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);

  // Edit & Gallery modal state
  const [editingEvent, setEditingEvent] = useState<StudioEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editFeatured, setEditFeatured] = useState(false);
  const [editPublished, setEditPublished] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editProgress, setEditProgress] = useState(0);

  // Gallery upload state inside Edit modal
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryProgress, setGalleryProgress] = useState(0);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<StudioEvent | null>(null);

  const openEditModal = (evt: StudioEvent) => {
    setEditingEvent(evt);
    setEditTitle(evt.title);
    setEditCategory(evt.category);
    setEditDate(evt.eventDate);
    setEditLocation(evt.location);
    setEditDescription(evt.description);
    setEditCoverFile(null);
    setEditVideoFile(null);
    setEditVideoUrl(evt.videoUrl);
    setEditFeatured(evt.featured);
    setEditPublished(evt.published);
  };

  const handleCoverSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleCreateEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!coverFile) {
      onError('Please upload an event cover photograph.');
      return;
    }
    setCreating(true);
    setCreateProgress(0);
    try {
      const res = await createEvent(
        {
          title,
          description,
          eventDate,
          location,
          category,
          coverFile,
          videoFile,
          videoUrl: videoFile ? undefined : videoUrl,
          featured,
          published,
        },
        (p) => setCreateProgress(p)
      );
      onEventsChange([res.event, ...events]);
      onRefreshOverview();
      onNotify(`Event "${res.event.title}" created.`);
      setTitle('');
      setDescription('');
      setEventDate('');
      setLocation('');
      setCoverFile(null);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverPreview('');
      setVideoFile(null);
      setVideoUrl('');
      setFeatured(false);
      setPublished(true);
      setShowCreateForm(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create event.');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setSavingEdit(true);
    setEditProgress(0);
    try {
      const res = await updateEvent(
        editingEvent.id,
        {
          title: editTitle,
          category: editCategory,
          eventDate: editDate,
          location: editLocation,
          description: editDescription,
          coverFile: editCoverFile,
          videoFile: editVideoFile,
          videoUrl: editVideoFile ? undefined : editVideoUrl,
          featured: editFeatured,
          published: editPublished,
        },
        (p) => setEditProgress(p)
      );
      onEventsChange(events.map((ev) => (ev.id === res.event.id ? res.event : ev)));
      setEditingEvent(res.event);
      onRefreshOverview();
      onNotify('Event details updated.');
      setEditCoverFile(null);
      setEditVideoFile(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to save event changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    e.target.value = '';
    if (!fileList || fileList.length === 0 || !editingEvent) return;

    setGalleryUploading(true);
    setGalleryProgress(0);
    try {
      const prepared: Array<{ file: File; thumbnailBlob: Blob | null }> = [];
      for (const file of Array.from(fileList)) {
        const analyzed = await analyzeAndCreateThumbnail(file);
        URL.revokeObjectURL(analyzed.previewUrl);
        prepared.push({ file, thumbnailBlob: analyzed.thumbnailBlob });
      }
      const res = await uploadEventMedia(editingEvent.id, prepared, (p) =>
        setGalleryProgress(p)
      );
      const updatedEvent: StudioEvent = {
        ...editingEvent,
        media: [...(editingEvent.media || []), ...res.media],
      };
      setEditingEvent(updatedEvent);
      onEventsChange(events.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev)));
      onNotify(`${res.media.length} gallery media item(s) uploaded.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to upload gallery media.');
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleRemoveGalleryItem = async (mediaId: string) => {
    if (!editingEvent) return;
    try {
      await deleteEventMedia(mediaId);
      const updatedEvent: StudioEvent = {
        ...editingEvent,
        media: (editingEvent.media || []).filter((m) => m.id !== mediaId),
      };
      setEditingEvent(updatedEvent);
      onEventsChange(events.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev)));
      onNotify('Media removed from event gallery.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to remove media.');
    }
  };

  const handleTogglePublished = async (evt: StudioEvent) => {
    try {
      const res = await updateEvent(evt.id, { published: !evt.published });
      onEventsChange(events.map((e) => (e.id === evt.id ? res.event : e)));
      onRefreshOverview();
      onNotify(res.event.published ? 'Event published.' : 'Event moved to drafts.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to update publish status.');
    }
  };

  const handleToggleFeatured = async (evt: StudioEvent) => {
    try {
      const res = await updateEvent(evt.id, { featured: !evt.featured });
      onEventsChange(events.map((e) => (e.id === evt.id ? res.event : e)));
      onRefreshOverview();
      onNotify(res.event.featured ? 'Event featured on homepage.' : 'Removed from featured events.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to update featured status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteEvent(confirmDelete.id);
      onEventsChange(events.filter((e) => e.id !== confirmDelete.id));
      setConfirmDelete(null);
      onRefreshOverview();
      onNotify('Event deleted.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete event.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Create Button */}
      <div className="bg-white border border-[#171614]/10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-normal text-[#171614]">
            Events & Showcases
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#5C5750]">
            Manage fashion shows, exhibitions, wedding showcases, event videos, and multi-photo galleries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'Close Form' : 'Create New Event'}</span>
        </button>
      </div>

      {/* Create Event Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateEvent}
          className="bg-white border border-[#171614]/10 p-6 sm:p-8 space-y-6"
        >
          <h3 className="font-serif text-2xl font-normal text-[#171614] pb-4 border-b border-[#171614]/8">
            New Studio Event
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Event Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Autumn Atelier Showcase"
                className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Event Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              >
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Location / Venue
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Venue or city"
                className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the showcase, collection notes, and highlights..."
              className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-2">
                Cover Photograph (Required — JPG, PNG, WEBP)
              </label>
              <input
                type="file"
                required
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleCoverSelect}
                className="block w-full text-xs text-[#5C5750] file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-[#EFECE6] file:text-[#171614] file:text-xs file:font-medium"
              />
              {coverPreview && (
                <div className="mt-3 aspect-[16/10] w-56 bg-[#EFECE6] overflow-hidden">
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-2">
                  Event Video Upload (Optional — MP4)
                </label>
                <input
                  type="file"
                  accept=".mp4,video/mp4"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-[#5C5750] file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-[#EFECE6] file:text-[#171614] file:text-xs file:font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1">
                  Or External Video URL (Optional)
                </label>
                <input
                  type="url"
                  disabled={Boolean(videoFile)}
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-[#171614]/15 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              <span>Feature on Homepage</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              <span>Publish Immediately</span>
            </label>
          </div>

          {creating && (
            <div>
              <div className="flex justify-between text-xs font-mono tabular-nums mb-1">
                <span>Uploading event media...</span>
                <span>{createProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#EAE5DD]">
                <div className="h-full bg-[#171614]" style={{ width: `${createProgress}%` }} />
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="px-7 py-3 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
            >
              {creating ? 'Creating Event...' : 'Save & Create Event'}
            </button>
          </div>
        </form>
      )}

      {/* Existing Events List */}
      <div className="bg-white border border-[#171614]/10 p-6 sm:p-8">
        <div className="pb-4 border-b border-[#171614]/8 flex items-center justify-between">
          <h3 className="font-serif text-xl text-[#171614]">All Studio Events</h3>
          <span className="text-xs font-mono tabular-nums text-[#766E64]">
            {events.length} total
          </span>
        </div>

        {events.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#766E64]">
            No events created yet. Click "Create New Event" above to add a showcase.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((evt) => (
              <article
                key={evt.id}
                className="border border-[#171614]/10 bg-[#FAF8F5] flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] bg-[#EFECE6] overflow-hidden">
                    <StudioMedia
                      src={evt.coverImageUrl}
                      thumbnailSrc={evt.coverImageUrl}
                      mediaType="image"
                      alt={evt.title}
                      className="w-full h-full object-cover"
                    />
                    {evt.videoUrl && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 bg-[#171614]/80 text-[#FAF8F5] text-[11px] inline-flex items-center gap-1">
                        <Film className="w-3 h-3" />
                        <span>Video</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#766E64]">
                      <span>{evt.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{evt.published ? 'Published' : 'Draft'}</span>
                      {evt.featured && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#171614] font-medium">Featured</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {(evt.media || []).length} gallery items
                      </span>
                    </div>

                    <h4 className="mt-2 font-serif text-2xl text-[#171614] leading-snug">
                      {evt.title}
                    </h4>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#5C5750]">
                      {evt.eventDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#766E64]" />
                          {formatEventDate(evt.eventDate)}
                        </span>
                      )}
                      {evt.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#766E64]" />
                          {evt.location}
                        </span>
                      )}
                    </div>

                    {evt.description && (
                      <p className="mt-3 text-xs text-[#5C5750] line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-[#171614]/8 bg-white flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTogglePublished(evt)}
                      className="p-2 text-xs inline-flex items-center gap-1 text-[#171614] hover:bg-[#FAF8F5]"
                    >
                      {evt.published ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-[#766E64]" />
                      )}
                      <span>{evt.published ? 'Published' : 'Draft'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(evt)}
                      title={evt.featured ? 'Unfeature' : 'Feature on homepage'}
                      className={`p-2 ${evt.featured ? 'text-[#171614]' : 'text-[#9A938A]'}`}
                    >
                      <Star className={`w-4 h-4 ${evt.featured ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(evt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#171614]/15 hover:bg-[#FAF8F5]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit & Gallery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(evt)}
                      aria-label={`Delete ${evt.title}`}
                      className="p-2 text-[#766E64] hover:text-[#8A1C13]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Edit Event & Gallery Modal */}
      {editingEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editingEvent.title}`}
          className="fixed inset-0 z-50 bg-[#171614]/60 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#171614]/15 max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#171614]/10">
              <h3 className="font-serif text-2xl font-normal text-[#171614]">
                Edit Event & Media Gallery
              </h3>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                aria-label="Close modal"
                className="p-2 text-[#5C5750] hover:text-[#171614]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C5750] mb-1">
                    Event Title
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
                  <label className="block text-xs font-medium text-[#5C5750] mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                  >
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5750] mb-1">
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5750] mb-1">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1">Description</label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C5750] mb-1">
                    Replace Cover Photo (optional)
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(e) => setEditCoverFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-[#5C5750] file:mr-3 file:py-2 file:px-3 file:border-0 file:bg-[#EFECE6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5750] mb-1">
                    Upload Event MP4 Video (optional)
                  </label>
                  <input
                    type="file"
                    accept=".mp4,video/mp4"
                    onChange={(e) => setEditVideoFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-[#5C5750] file:mr-3 file:py-2 file:px-3 file:border-0 file:bg-[#EFECE6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1">
                  Event Video URL (leave blank to remove video)
                </label>
                <input
                  type="text"
                  disabled={Boolean(editVideoFile)}
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  placeholder="https://... or /media/originals/..."
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-[#171614]/15 disabled:opacity-50"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFeatured}
                    onChange={(e) => setEditFeatured(e.target.checked)}
                  />
                  <span>Featured on Homepage</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPublished}
                    onChange={(e) => setEditPublished(e.target.checked)}
                  />
                  <span>Published</span>
                </label>
              </div>

              {savingEdit && (editCoverFile || editVideoFile) && (
                <div>
                  <div className="flex justify-between text-xs font-mono tabular-nums mb-1">
                    <span>Uploading event media...</span>
                    <span>{editProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EAE5DD]">
                    <div className="h-full bg-[#171614]" style={{ width: `${editProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Event Details'}
                </button>
              </div>
            </form>

            {/* Multiple Event Gallery Photographs & Videos */}
            <div className="pt-6 border-t border-[#171614]/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-serif text-xl text-[#171614]">Event Gallery Media</h4>
                  <p className="text-xs text-[#5C5750]">
                    Upload multiple event photographs (JPG, PNG, WEBP) or behind-the-scenes MP4 videos.
                  </p>
                </div>

                <input
                  ref={galleryInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4"
                  onChange={handleGalleryUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={galleryUploading}
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#171614] text-[#FAF8F5] disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {galleryUploading ? `Uploading (${galleryProgress}%)...` : 'Add Gallery Media'}
                  </span>
                </button>
              </div>

              {(editingEvent.media || []).length === 0 ? (
                <p className="py-6 text-center text-xs text-[#766E64] bg-[#FAF8F5] border border-[#171614]/8">
                  No additional gallery media added to this event yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(editingEvent.media || []).map((m) => (
                    <div key={m.id} className="relative group border border-[#171614]/10 bg-[#FAF8F5]">
                      <div className="aspect-square overflow-hidden">
                        <StudioMedia
                          src={m.mediaUrl}
                          thumbnailSrc={m.thumbnailUrl || m.mediaUrl}
                          mediaType={m.mediaType}
                          alt={m.caption || editingEvent.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryItem(m.id)}
                        aria-label="Remove media from gallery"
                        className="absolute top-2 right-2 w-7 h-7 bg-[#171614]/85 text-white flex items-center justify-center opacity-90 hover:bg-[#8A1C13]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm event deletion"
          className="fixed inset-0 z-50 bg-[#171614]/60 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#171614]/15 max-w-md w-full p-6 sm:p-8">
            <h3 className="font-serif text-2xl text-[#171614]">Delete Event?</h3>
            <p className="mt-2 text-sm text-[#5C5750]">
              Remove <span className="font-medium text-[#171614]">{confirmDelete.title}</span> and all of its uploaded gallery media?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-5 py-2.5 text-xs font-medium border border-[#171614]/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 text-xs font-medium bg-[#8A1C13] text-white hover:bg-[#70160E]"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
