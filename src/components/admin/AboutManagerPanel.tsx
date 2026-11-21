import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  createAboutProcessStep,
  createAboutService,
  deleteAboutProcessStep,
  deleteAboutService,
  getAdminAbout,
  reorderAboutProcessSteps,
  reorderAboutServices,
  updateAboutProcessStep,
  updateAboutService,
  updateAdminAboutContent,
  uploadStandaloneMedia,
} from '../../lib/api';
import type {
  AboutPageContent,
  AboutProcessStep,
  AboutServiceCategory,
} from '../../types/studio';
import { StudioMedia } from '../StudioMedia';

interface AboutManagerPanelProps {
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export function AboutManagerPanel({ onNotify, onError }: AboutManagerPanelProps) {
  const [content, setContent] = useState<AboutPageContent | null>(null);
  const [services, setServices] = useState<AboutServiceCategory[]>([]);
  const [processSteps, setProcessSteps] = useState<AboutProcessStep[]>([]);
  const [loading, setLoading] = useState(true);

  // Save/upload states for content groups
  const [savingGroup, setSavingGroup] = useState<'hero' | 'story' | 'headers' | 'closing' | null>(null);
  const [uploadingImageSlot, setUploadingImageSlot] = useState<'hero' | 'story' | 'closing' | null>(null);

  // Add service category form state
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServicePublished, setNewServicePublished] = useState(true);
  const [newServiceFile, setNewServiceFile] = useState<File | null>(null);
  const [newServicePreview, setNewServicePreview] = useState('');
  const [addingService, setAddingService] = useState(false);

  // Edit service category state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceTitle, setEditServiceTitle] = useState('');
  const [editServiceDesc, setEditServiceDesc] = useState('');
  const [editServicePublished, setEditServicePublished] = useState(true);
  const [editServiceFile, setEditServiceFile] = useState<File | null>(null);
  const [editServicePreview, setEditServicePreview] = useState('');
  const [savingService, setSavingService] = useState(false);
  const [replacingServiceId, setReplacingServiceId] = useState<string | null>(null);
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState<string | null>(null);

  // Add process step form state
  const [newStepNumber, setNewStepNumber] = useState('');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [newStepPublished, setNewStepPublished] = useState(true);
  const [addingStep, setAddingStep] = useState(false);

  // Edit process step state
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepNumber, setEditStepNumber] = useState('');
  const [editStepTitle, setEditStepTitle] = useState('');
  const [editStepDesc, setEditStepDesc] = useState('');
  const [editStepPublished, setEditStepPublished] = useState(true);
  const [savingStep, setSavingStep] = useState(false);
  const [confirmDeleteStepId, setConfirmDeleteStepId] = useState<string | null>(null);

  const loadAboutData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminAbout();
      setContent(data.content);
      setServices(data.services);
      setProcessSteps(data.processSteps);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to load About page settings.');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void loadAboutData();
  }, [loadAboutData]);

  useEffect(() => {
    return () => {
      if (newServicePreview) URL.revokeObjectURL(newServicePreview);
    };
  }, [newServicePreview]);

  useEffect(() => {
    return () => {
      if (editServicePreview && editServicePreview.startsWith('blob:')) {
        URL.revokeObjectURL(editServicePreview);
      }
    };
  }, [editServicePreview]);

  const handleUploadContentImage = async (
    slot: 'hero' | 'story' | 'closing',
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !content) return;

    setUploadingImageSlot(slot);
    onError('');
    try {
      const uploaded = await uploadStandaloneMedia(file);
      if (uploaded.mediaType !== 'image') {
        onError('Please upload a JPG, PNG, or WEBP landscape photograph.');
        return;
      }
      const fieldPatch =
        slot === 'hero'
          ? { heroImageUrl: uploaded.url }
          : slot === 'story'
            ? { storyImageUrl: uploaded.url }
            : { closingImageUrl: uploaded.url };

      const res = await updateAdminAboutContent(fieldPatch);
      setContent(res.content);
      onNotify(
        slot === 'hero'
          ? 'About Hero banner photograph updated.'
          : slot === 'story'
            ? 'Our Story photograph updated.'
            : 'Closing banner photograph updated.'
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to upload photograph.');
    } finally {
      setUploadingImageSlot(null);
    }
  };

  const handleSaveContentGroup = async (
    e: FormEvent,
    group: 'hero' | 'story' | 'headers' | 'closing'
  ) => {
    e.preventDefault();
    if (!content) return;
    setSavingGroup(group);
    onError('');
    try {
      let payload: Partial<Omit<AboutPageContent, 'id' | 'updatedAt'>> = {};
      if (group === 'hero') {
        payload = {
          heroHeading: content.heroHeading,
          heroSubtitle: content.heroSubtitle,
          heroImageUrl: content.heroImageUrl,
        };
      } else if (group === 'story') {
        payload = {
          storyEyebrow: content.storyEyebrow,
          storyHeading: content.storyHeading,
          storyContent: content.storyContent,
          storyClosingStatement: content.storyClosingStatement,
          storyImageUrl: content.storyImageUrl,
        };
      } else if (group === 'headers') {
        payload = {
          servicesEyebrow: content.servicesEyebrow,
          servicesHeading: content.servicesHeading,
          processEyebrow: content.processEyebrow,
          processHeading: content.processHeading,
        };
      } else {
        payload = {
          closingHeading: content.closingHeading,
          closingDescription: content.closingDescription,
          closingImageUrl: content.closingImageUrl,
          closingPrimaryButtonText: content.closingPrimaryButtonText,
          closingPrimaryButtonUrl: content.closingPrimaryButtonUrl,
          closingSecondaryButtonText: content.closingSecondaryButtonText,
          closingSecondaryButtonUrl: content.closingSecondaryButtonUrl,
        };
      }

      const res = await updateAdminAboutContent(payload);
      setContent(res.content);
      onNotify('About page changes saved and published.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to save About page changes.');
    } finally {
      setSavingGroup(null);
    }
  };

  // Service Categories handlers
  const handleSelectNewServiceFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (newServicePreview) URL.revokeObjectURL(newServicePreview);
    setNewServiceFile(file);
    setNewServicePreview(URL.createObjectURL(file));
  };

  const handleAddService = async (e: FormEvent) => {
    e.preventDefault();
    if (!newServiceTitle.trim()) {
      onError('Please enter a service category title.');
      return;
    }
    if (!newServiceFile) {
      onError('Please upload a photograph for the new service category.');
      return;
    }
    setAddingService(true);
    onError('');
    try {
      const res = await createAboutService({
        title: newServiceTitle.trim(),
        description: newServiceDesc.trim(),
        coverFile: newServiceFile,
        published: newServicePublished,
      });
      setServices((prev) => [...prev, res.service]);
      setNewServiceTitle('');
      setNewServiceDesc('');
      setNewServicePublished(true);
      setNewServiceFile(null);
      if (newServicePreview) {
        URL.revokeObjectURL(newServicePreview);
        setNewServicePreview('');
      }
      onNotify(`Service category "${res.service.title}" added.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to add service category.');
    } finally {
      setAddingService(false);
    }
  };

  const startEditService = (service: AboutServiceCategory) => {
    setEditingServiceId(service.id);
    setEditServiceTitle(service.title);
    setEditServiceDesc(service.description);
    setEditServicePublished(service.published);
    setEditServiceFile(null);
    setEditServicePreview(service.imageUrl);
    setConfirmDeleteServiceId(null);
  };

  const handleSelectEditServiceFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (editServicePreview && editServicePreview.startsWith('blob:')) {
      URL.revokeObjectURL(editServicePreview);
    }
    setEditServiceFile(file);
    setEditServicePreview(URL.createObjectURL(file));
  };

  const handleSaveServiceEdit = async (id: string) => {
    if (!editServiceTitle.trim()) {
      onError('Service category title cannot be empty.');
      return;
    }
    setSavingService(true);
    onError('');
    try {
      const res = await updateAboutService(id, {
        title: editServiceTitle.trim(),
        description: editServiceDesc.trim(),
        published: editServicePublished,
        coverFile: editServiceFile,
      });
      setServices((prev) => prev.map((s) => (s.id === id ? res.service : s)));
      setEditingServiceId(null);
      setEditServiceFile(null);
      onNotify(`Service category "${res.service.title}" updated.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to update service category.');
    } finally {
      setSavingService(false);
    }
  };

  const handleQuickReplaceServicePhoto = async (
    serviceId: string,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReplacingServiceId(serviceId);
    onError('');
    try {
      const res = await updateAboutService(serviceId, { coverFile: file });
      setServices((prev) => prev.map((s) => (s.id === serviceId ? res.service : s)));
      if (editingServiceId === serviceId) {
        setEditServicePreview(res.service.imageUrl);
        setEditServiceFile(null);
      }
      onNotify(`Photograph updated for "${res.service.title}".`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to replace photograph.');
    } finally {
      setReplacingServiceId(null);
    }
  };

  const handleToggleServicePublish = async (service: AboutServiceCategory) => {
    onError('');
    try {
      const res = await updateAboutService(service.id, { published: !service.published });
      setServices((prev) => prev.map((s) => (s.id === service.id ? res.service : s)));
      onNotify(
        res.service.published
          ? `"${res.service.title}" is now visible on the About page.`
          : `"${res.service.title}" hidden from the public About page.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update visibility.');
    }
  };

  const handleMoveService = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= services.length) return;
    const reordered = [...services];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setServices(reordered);
    onError('');
    try {
      const res = await reorderAboutServices(reordered.map((s) => s.id));
      setServices(res.services);
      onNotify('Service category order updated.');
    } catch (err) {
      await loadAboutData();
      onError(err instanceof Error ? err.message : 'Failed to reorder service categories.');
    }
  };

  const handleDeleteService = async (id: string) => {
    onError('');
    try {
      await deleteAboutService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteServiceId(null);
      if (editingServiceId === id) setEditingServiceId(null);
      onNotify('Service category deleted.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete service category.');
    }
  };

  // Process Steps handlers
  const handleAddStep = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) {
      onError('Please enter a step title.');
      return;
    }
    setAddingStep(true);
    onError('');
    try {
      const defaultNumber = String(processSteps.length + 1).padStart(2, '0');
      const res = await createAboutProcessStep({
        stepNumber: newStepNumber.trim() || defaultNumber,
        title: newStepTitle.trim(),
        description: newStepDesc.trim(),
        published: newStepPublished,
      });
      setProcessSteps((prev) => [...prev, res.step]);
      setNewStepNumber('');
      setNewStepTitle('');
      setNewStepDesc('');
      setNewStepPublished(true);
      onNotify(`Process step "${res.step.title}" added.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to add process step.');
    } finally {
      setAddingStep(false);
    }
  };

  const startEditStep = (step: AboutProcessStep) => {
    setEditingStepId(step.id);
    setEditStepNumber(step.stepNumber);
    setEditStepTitle(step.title);
    setEditStepDesc(step.description);
    setEditStepPublished(step.published);
    setConfirmDeleteStepId(null);
  };

  const handleSaveStepEdit = async (id: string) => {
    if (!editStepTitle.trim()) {
      onError('Step title cannot be empty.');
      return;
    }
    setSavingStep(true);
    onError('');
    try {
      const res = await updateAboutProcessStep(id, {
        stepNumber: editStepNumber.trim(),
        title: editStepTitle.trim(),
        description: editStepDesc.trim(),
        published: editStepPublished,
      });
      setProcessSteps((prev) => prev.map((s) => (s.id === id ? res.step : s)));
      setEditingStepId(null);
      onNotify(`Process step "${res.step.title}" updated.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to update process step.');
    } finally {
      setSavingStep(false);
    }
  };

  const handleToggleStepPublish = async (step: AboutProcessStep) => {
    onError('');
    try {
      const res = await updateAboutProcessStep(step.id, { published: !step.published });
      setProcessSteps((prev) => prev.map((s) => (s.id === step.id ? res.step : s)));
      onNotify(
        res.step.published
          ? `Step "${res.step.title}" shown on About page.`
          : `Step "${res.step.title}" hidden from About page.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update step visibility.');
    }
  };

  const handleMoveStep = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= processSteps.length) return;
    const reordered = [...processSteps];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setProcessSteps(reordered);
    onError('');
    try {
      const res = await reorderAboutProcessSteps(reordered.map((s) => s.id));
      setProcessSteps(res.processSteps);
      onNotify('Creative process order updated.');
    } catch (err) {
      await loadAboutData();
      onError(err instanceof Error ? err.message : 'Failed to reorder process steps.');
    }
  };

  const handleDeleteStep = async (id: string) => {
    onError('');
    try {
      await deleteAboutProcessStep(id);
      setProcessSteps((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteStepId(null);
      if (editingStepId === id) setEditingStepId(null);
      onNotify('Process step removed.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete process step.');
    }
  };

  if (loading || !content) {
    return (
      <div className="bg-white border border-[#171614]/10 p-8 text-sm text-[#5C5750]">
        Loading About page content...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#171614]/10 px-6 py-4">
        <p className="text-xs sm:text-sm text-[#5C5750]">
          Edit all five sections of the public <span className="font-medium text-[#171614]">About</span> page below.
        </p>
        <Link
          to="/about"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-[#171614]/20 text-[#171614] hover:bg-[#FAF8F5]"
        >
          <span>Preview Public About Page</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* GROUP A: HERO BANNER */}
      <section className="bg-white border border-[#171614]/10 p-6 sm:p-8 space-y-6">
        <div className="pb-4 border-b border-[#171614]/8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#766E64]">
            Section 01
          </p>
          <h2 className="mt-1 font-serif text-2xl font-normal text-[#171614]">
            Hero Banner
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="aspect-[16/9] bg-[#EFECE6] overflow-hidden relative">
              <StudioMedia
                src={content.heroImageUrl}
                thumbnailSrc={content.heroImageUrl}
                mediaType="image"
                alt="About Hero Banner Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <label className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>
                {uploadingImageSlot === 'hero'
                  ? 'Uploading Photograph...'
                  : 'Replace Hero Landscape Photo'}
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => handleUploadContentImage('hero', e)}
                disabled={uploadingImageSlot === 'hero'}
                className="hidden"
              />
            </label>
          </div>

          <form
            onSubmit={(e) => handleSaveContentGroup(e, 'hero')}
            className="lg:col-span-7 space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Banner Heading
              </label>
              <input
                type="text"
                required
                value={content.heroHeading}
                onChange={(e) =>
                  setContent({ ...content, heroHeading: e.target.value })
                }
                className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Subtitle (optional)
              </label>
              <input
                type="text"
                value={content.heroSubtitle}
                onChange={(e) =>
                  setContent({ ...content, heroSubtitle: e.target.value })
                }
                className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingGroup === 'hero'}
                className="px-6 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
              >
                {savingGroup === 'hero' ? 'Saving...' : 'Save Hero Banner'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* GROUP B: OUR STORY */}
      <section className="bg-white border border-[#171614]/10 p-6 sm:p-8 space-y-6">
        <div className="pb-4 border-b border-[#171614]/8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#766E64]">
            Section 02
          </p>
          <h2 className="mt-1 font-serif text-2xl font-normal text-[#171614]">
            Our Story
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="aspect-[4/3] bg-[#EFECE6] overflow-hidden">
              <StudioMedia
                src={content.storyImageUrl}
                thumbnailSrc={content.storyImageUrl}
                mediaType="image"
                alt="Our Story Photograph Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <label className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>
                {uploadingImageSlot === 'story'
                  ? 'Uploading Photograph...'
                  : 'Replace Studio Photograph'}
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => handleUploadContentImage('story', e)}
                disabled={uploadingImageSlot === 'story'}
                className="hidden"
              />
            </label>
          </div>

          <form
            onSubmit={(e) => handleSaveContentGroup(e, 'story')}
            className="lg:col-span-7 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                  Eyebrow Heading
                </label>
                <input
                  type="text"
                  value={content.storyEyebrow}
                  onChange={(e) =>
                    setContent({ ...content, storyEyebrow: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                  Main Heading
                </label>
                <input
                  type="text"
                  required
                  value={content.storyHeading}
                  onChange={(e) =>
                    setContent({ ...content, storyHeading: e.target.value })
                  }
                  className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Story Narrative (separate paragraphs with a blank line)
              </label>
              <textarea
                rows={7}
                value={content.storyContent}
                onChange={(e) =>
                  setContent({ ...content, storyContent: e.target.value })
                }
                className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Closing Statement
              </label>
              <input
                type="text"
                value={content.storyClosingStatement}
                onChange={(e) =>
                  setContent({
                    ...content,
                    storyClosingStatement: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingGroup === 'story'}
                className="px-6 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
              >
                {savingGroup === 'story' ? 'Saving...' : 'Save Our Story'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* GROUP C: WHAT WE CREATE */}
      <section className="bg-white border border-[#171614]/10 p-6 sm:p-8 space-y-8">
        <div className="pb-4 border-b border-[#171614]/8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#766E64]">
              Section 03
            </p>
            <h2 className="mt-1 font-serif text-2xl font-normal text-[#171614]">
              What We Create ({services.length})
            </h2>
          </div>
          <p className="text-xs text-[#766E64]">
            Only published items are shown on the public About page.
          </p>
        </div>

        {/* Section Heading Controls */}
        <form
          onSubmit={(e) => handleSaveContentGroup(e, 'headers')}
          className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pb-6 border-b border-[#171614]/8"
        >
          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
              Section Eyebrow
            </label>
            <input
              type="text"
              value={content.servicesEyebrow}
              onChange={(e) =>
                setContent({ ...content, servicesEyebrow: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
            />
          </div>
          <div className="sm:col-span-6">
            <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
              Section Heading
            </label>
            <input
              type="text"
              value={content.servicesHeading}
              onChange={(e) =>
                setContent({ ...content, servicesHeading: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={savingGroup === 'headers'}
              className="w-full px-4 py-2 text-xs font-medium border border-[#171614]/25 text-[#171614] hover:bg-[#FAF8F5] disabled:opacity-50"
            >
              {savingGroup === 'headers' ? 'Saving...' : 'Save Heading'}
            </button>
          </div>
        </form>

        {/* Add New Service Category */}
        <form
          onSubmit={handleAddService}
          className="bg-[#FAF8F5] border border-[#171614]/10 p-5 sm:p-6 space-y-4"
        >
          <h3 className="font-serif text-xl font-normal text-[#171614]">
            Add Service Category
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-4 space-y-3">
              <div className="aspect-[4/3] bg-[#EFECE6] overflow-hidden flex items-center justify-center">
                {newServicePreview ? (
                  <img
                    src={newServicePreview}
                    alt="New service preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-[#766E64]">Photograph Preview</span>
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-[#171614]/20 bg-white hover:bg-[#FAF8F5] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {newServiceFile ? 'Change Photograph' : 'Upload Photograph'}
                </span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleSelectNewServiceFile}
                  className="hidden"
                />
              </label>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                  Category Title
                </label>
                <input
                  type="text"
                  value={newServiceTitle}
                  onChange={(e) => setNewServiceTitle(e.target.value)}
                  placeholder="e.g. Bridal Couture"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-[#171614]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Describe this discipline and how the studio crafts it."
                  className="w-full px-4 py-2.5 text-sm bg-white border border-[#171614]/15"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-[#171614] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newServicePublished}
                    onChange={(e) => setNewServicePublished(e.target.checked)}
                  />
                  <span>Publish immediately on About page</span>
                </label>

                <button
                  type="submit"
                  disabled={addingService}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{addingService ? 'Adding...' : 'Add Category'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Existing Service Categories List */}
        <div className="divide-y divide-[#171614]/10">
          {services.map((service, index) => {
            const isEditing = editingServiceId === service.id;
            const isDeleting = confirmDeleteServiceId === service.id;
            return (
              <div key={service.id} className="py-5 first:pt-0 last:pb-0">
                {isEditing ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start bg-[#FAF8F5] p-4 border border-[#171614]/15">
                    <div className="lg:col-span-4 space-y-3">
                      <div className="aspect-[4/3] bg-[#EFECE6] overflow-hidden">
                        <StudioMedia
                          src={editServicePreview || service.imageUrl}
                          thumbnailSrc={editServicePreview || service.imageUrl}
                          mediaType="image"
                          alt={editServiceTitle || service.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium border border-[#171614]/20 bg-white hover:bg-[#FAF8F5] cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Replace Photograph</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={handleSelectEditServiceFile}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="lg:col-span-8 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-[#5C5750] mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editServiceTitle}
                          onChange={(e) => setEditServiceTitle(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-white border border-[#171614]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5C5750] mb-1">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={editServiceDesc}
                          onChange={(e) => setEditServiceDesc(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm bg-white border border-[#171614]/20"
                        />
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs text-[#171614] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editServicePublished}
                          onChange={(e) => setEditServicePublished(e.target.checked)}
                        />
                        <span>Published on About page</span>
                      </label>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          disabled={savingService}
                          onClick={() => handleSaveServiceEdit(service.id)}
                          className="px-4 py-2 text-xs font-medium bg-[#171614] text-[#FAF8F5] disabled:opacity-50"
                        >
                          {savingService ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingServiceId(null)}
                          className="px-4 py-2 text-xs border border-[#171614]/20 bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-28 aspect-[4/3] bg-[#EFECE6] shrink-0 overflow-hidden">
                        <StudioMedia
                          src={service.imageUrl}
                          thumbnailSrc={service.imageUrl}
                          mediaType="image"
                          alt={service.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h4 className="font-serif text-xl text-[#171614]">
                            {service.title}
                          </h4>
                          <span className="font-mono text-[11px] uppercase tracking-wider text-[#766E64]">
                            {service.published ? 'Published' : 'Hidden'}
                          </span>
                        </div>
                        {service.description && (
                          <p className="mt-1 text-xs sm:text-sm text-[#5C5750] line-clamp-2 max-w-2xl">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveService(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${service.title} up`}
                        className="p-2 border border-[#171614]/15 hover:bg-[#FAF8F5] disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveService(index, 1)}
                        disabled={index === services.length - 1}
                        aria-label={`Move ${service.title} down`}
                        className="p-2 border border-[#171614]/15 hover:bg-[#FAF8F5] disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#171614]/15 hover:bg-[#FAF8F5] cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {replacingServiceId === service.id ? 'Uploading...' : 'Photo'}
                        </span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={(e) => handleQuickReplaceServicePhoto(service.id, e)}
                          disabled={replacingServiceId === service.id}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleToggleServicePublish(service)}
                        aria-label={
                          service.published
                            ? `Unpublish ${service.title}`
                            : `Publish ${service.title}`
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#171614]/15 hover:bg-[#FAF8F5]"
                      >
                        {service.published ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                        <span>{service.published ? 'Published' : 'Hidden'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditService(service)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-[#171614]/15 hover:bg-[#FAF8F5]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      {isDeleting ? (
                        <div className="flex items-center gap-1.5 ml-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteService(service.id)}
                            className="px-2.5 py-1.5 text-xs bg-[#8A1C13] text-white"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteServiceId(null)}
                            className="px-2.5 py-1.5 text-xs border border-[#171614]/15"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteServiceId(service.id)}
                          aria-label={`Delete ${service.title}`}
                          className="p-2 text-[#8A1C13] border border-[#8A1C13]/20 hover:bg-[#FDF4F3]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* GROUP D: OUR CREATIVE PROCESS */}
      <section className="bg-white border border-[#171614]/10 p-6 sm:p-8 space-y-8">
        <div className="pb-4 border-b border-[#171614]/8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#766E64]">
              Section 04
            </p>
            <h2 className="mt-1 font-serif text-2xl font-normal text-[#171614]">
              Our Creative Process ({processSteps.length})
            </h2>
          </div>
          <p className="text-xs text-[#766E64]">
            Hidden steps remain saved in the studio database without displaying publicly.
          </p>
        </div>

        {/* Process Section Heading */}
        <form
          onSubmit={(e) => handleSaveContentGroup(e, 'headers')}
          className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pb-6 border-b border-[#171614]/8"
        >
          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
              Process Eyebrow
            </label>
            <input
              type="text"
              value={content.processEyebrow}
              onChange={(e) =>
                setContent({ ...content, processEyebrow: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
            />
          </div>
          <div className="sm:col-span-6">
            <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
              Process Heading
            </label>
            <input
              type="text"
              value={content.processHeading}
              onChange={(e) =>
                setContent({ ...content, processHeading: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={savingGroup === 'headers'}
              className="w-full px-4 py-2 text-xs font-medium border border-[#171614]/25 text-[#171614] hover:bg-[#FAF8F5] disabled:opacity-50"
            >
              {savingGroup === 'headers' ? 'Saving...' : 'Save Heading'}
            </button>
          </div>
        </form>

        {/* Add Process Step */}
        <form
          onSubmit={handleAddStep}
          className="bg-[#FAF8F5] border border-[#171614]/10 p-5 sm:p-6 space-y-4"
        >
          <h3 className="font-serif text-xl font-normal text-[#171614]">
            Add Process Step
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Step No.
              </label>
              <input
                type="text"
                value={newStepNumber}
                onChange={(e) => setNewStepNumber(e.target.value)}
                placeholder={String(processSteps.length + 1).padStart(2, '0')}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#171614]/15"
              />
            </div>
            <div className="sm:col-span-10">
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Step Title
              </label>
              <input
                type="text"
                value={newStepTitle}
                onChange={(e) => setNewStepTitle(e.target.value)}
                placeholder="e.g. Private Wardrobe Delivery"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#171614]/15"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
              Step Description
            </label>
            <textarea
              rows={2}
              value={newStepDesc}
              onChange={(e) => setNewStepDesc(e.target.value)}
              placeholder="Describe what happens during this stage of the atelier process."
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#171614]/15"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="inline-flex items-center gap-2 text-xs text-[#171614] cursor-pointer">
              <input
                type="checkbox"
                checked={newStepPublished}
                onChange={(e) => setNewStepPublished(e.target.checked)}
              />
              <span>Visible on public About page</span>
            </label>
            <button
              type="submit"
              disabled={addingStep}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addingStep ? 'Adding...' : 'Add Step'}</span>
            </button>
          </div>
        </form>

        {/* Existing Steps List */}
        <div className="divide-y divide-[#171614]/10">
          {processSteps.map((step, index) => {
            const isEditing = editingStepId === step.id;
            const isDeleting = confirmDeleteStepId === step.id;
            return (
              <div key={step.id} className="py-4 first:pt-0 last:pb-0">
                {isEditing ? (
                  <div className="bg-[#FAF8F5] p-4 border border-[#171614]/15 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-[#5C5750] mb-1">
                          Step No.
                        </label>
                        <input
                          type="text"
                          value={editStepNumber}
                          onChange={(e) => setEditStepNumber(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#171614]/20"
                        />
                      </div>
                      <div className="sm:col-span-10">
                        <label className="block text-xs font-medium text-[#5C5750] mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editStepTitle}
                          onChange={(e) => setEditStepTitle(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-[#171614]/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={editStepDesc}
                        onChange={(e) => setEditStepDesc(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#171614]/20"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-[#171614] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editStepPublished}
                        onChange={(e) => setEditStepPublished(e.target.checked)}
                      />
                      <span>Visible on public About page</span>
                    </label>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        disabled={savingStep}
                        onClick={() => handleSaveStepEdit(step.id)}
                        className="px-4 py-2 text-xs font-medium bg-[#171614] text-[#FAF8F5] disabled:opacity-50"
                      >
                        {savingStep ? 'Saving...' : 'Save Step'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStepId(null)}
                        className="px-4 py-2 text-xs border border-[#171614]/20 bg-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="font-mono text-xs text-[#766E64] tabular-nums">
                          {step.stepNumber || String(index + 1).padStart(2, '0')}
                        </span>
                        <h4 className="font-serif text-xl text-[#171614]">
                          {step.title}
                        </h4>
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[#766E64]">
                          {step.published ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                      {step.description && (
                        <p className="mt-1 text-xs sm:text-sm text-[#5C5750] max-w-2xl">
                          {step.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveStep(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${step.title} up`}
                        className="p-2 border border-[#171614]/15 hover:bg-[#FAF8F5] disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(index, 1)}
                        disabled={index === processSteps.length - 1}
                        aria-label={`Move ${step.title} down`}
                        className="p-2 border border-[#171614]/15 hover:bg-[#FAF8F5] disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStepPublish(step)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#171614]/15 hover:bg-[#FAF8F5]"
                      >
                        {step.published ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                        <span>{step.published ? 'Visible' : 'Hidden'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditStep(step)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-[#171614]/15 hover:bg-[#FAF8F5]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      {isDeleting ? (
                        <div className="flex items-center gap-1.5 ml-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteStep(step.id)}
                            className="px-2.5 py-1.5 text-xs bg-[#8A1C13] text-white"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStepId(null)}
                            className="px-2.5 py-1.5 text-xs border border-[#171614]/15"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteStepId(step.id)}
                          aria-label={`Delete ${step.title}`}
                          className="p-2 text-[#8A1C13] border border-[#8A1C13]/20 hover:bg-[#FDF4F3]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* GROUP E: CLOSING IMAGE & CALL TO ACTION */}
      <section className="bg-white border border-[#171614]/10 p-6 sm:p-8 space-y-6">
        <div className="pb-4 border-b border-[#171614]/8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#766E64]">
            Section 05
          </p>
          <h2 className="mt-1 font-serif text-2xl font-normal text-[#171614]">
            Closing Banner &amp; Call to Action
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="aspect-[16/9] bg-[#EFECE6] overflow-hidden">
              <StudioMedia
                src={content.closingImageUrl}
                thumbnailSrc={content.closingImageUrl}
                mediaType="image"
                alt="Closing Banner Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <label className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>
                {uploadingImageSlot === 'closing'
                  ? 'Uploading Photograph...'
                  : 'Replace Closing Landscape Photo'}
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => handleUploadContentImage('closing', e)}
                disabled={uploadingImageSlot === 'closing'}
                className="hidden"
              />
            </label>
          </div>

          <form
            onSubmit={(e) => handleSaveContentGroup(e, 'closing')}
            className="lg:col-span-7 space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Closing Headline
              </label>
              <input
                type="text"
                required
                value={content.closingHeading}
                onChange={(e) =>
                  setContent({ ...content, closingHeading: e.target.value })
                }
                className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                Supporting Description
              </label>
              <textarea
                rows={3}
                value={content.closingDescription}
                onChange={(e) =>
                  setContent({ ...content, closingDescription: e.target.value })
                }
                className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#171614]/8">
              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1">
                  Primary Button Label
                </label>
                <input
                  type="text"
                  value={content.closingPrimaryButtonText}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      closingPrimaryButtonText: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1">
                  Primary Button URL
                </label>
                <input
                  type="text"
                  value={content.closingPrimaryButtonUrl}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      closingPrimaryButtonUrl: e.target.value,
                    })
                  }
                  placeholder="/work"
                  className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1">
                  Secondary Button Label
                </label>
                <input
                  type="text"
                  value={content.closingSecondaryButtonText}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      closingSecondaryButtonText: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5750] mb-1">
                  Secondary Button URL
                </label>
                <input
                  type="text"
                  value={content.closingSecondaryButtonUrl}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      closingSecondaryButtonUrl: e.target.value,
                    })
                  }
                  placeholder="/contact"
                  className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingGroup === 'closing'}
                className="px-6 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
              >
                {savingGroup === 'closing' ? 'Saving...' : 'Save Closing Banner'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
