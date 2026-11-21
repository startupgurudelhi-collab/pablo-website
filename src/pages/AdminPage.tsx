import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Check,
  ChevronDown,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Home,
  Image as ImageIcon,
  LogOut,
  Menu,
  Phone,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  createCategory,
  deleteCategory,
  deleteEnquiry,
  deletePortfolioItem,
  getAdminEnquiries,
  getAdminEvents,
  getAdminLegalPages,
  getAdminOverview,
  getAdminPortfolio,
  getAdminSession,
  getAdminSettings,
  logoutAdmin,
  subscribeCmsUpdates,
  updateAdminSettings,
  updateCategory,
  updateEnquiryStatus,
  updateEvent,
  updatePortfolioItem,
  uploadStandaloneMedia,
} from '../lib/api';
import type {
  AdminOverviewStats,
  AdminUserPublic,
  Enquiry,
  EnquiryStatus,
  LegalPage,
  PortfolioCategory,
  PortfolioItem,
  SiteSettings,
  StudioEvent,
} from '../types/studio';
import { AdminLogin } from '../components/admin/AdminLogin';
import { MediaUploaderPanel } from '../components/admin/MediaUploaderPanel';
import { EditItemModal } from '../components/admin/EditItemModal';
import { EventsManagerPanel } from '../components/admin/EventsManagerPanel';
import { LegalPagesPanel } from '../components/admin/LegalPagesPanel';
import { AboutManagerPanel } from '../components/admin/AboutManagerPanel';
import { StudioMedia } from '../components/StudioMedia';

type AdminSection = 'home' | 'work' | 'events' | 'about' | 'contact';

interface AdminPageProps {
  onSettingsUpdated: (settings: SiteSettings) => void;
}

export function AdminPage({ onSettingsUpdated }: AdminPageProps) {
  const [authChecked, setAuthChecked] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUserPublic | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>('home');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [legalPages, setLegalPages] = useState<LegalPage[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Home collapsible Site Identity / Footer / SEO panel
  const [siteIdentityOpen, setSiteIdentityOpen] = useState(false);

  // Portfolio filters & modals
  const [portfolioFilterCat, setPortfolioFilterCat] = useState('all');
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<PortfolioItem | null>(null);

  // Standalone media upload states
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroProgress, setHeroProgress] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);
  const [servicesText, setServicesText] = useState('');

  // Category creation / editing
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryDesc, setEditingCategoryDesc] = useState('');

  const showToast = (msg: string) => {
    setBannerMessage(msg);
    setErrorMessage('');
    window.setTimeout(() => setBannerMessage((prev) => (prev === msg ? '' : prev)), 4000);
  };

  const loadAllAdminData = async () => {
    setLoadingData(true);
    setErrorMessage('');
    try {
      const [ov, port, evts, sett, enq, legal] = await Promise.all([
        getAdminOverview(),
        getAdminPortfolio(),
        getAdminEvents(),
        getAdminSettings(),
        getAdminEnquiries(),
        getAdminLegalPages(),
      ]);
      setOverview(ov);
      setItems(port.items);
      setCategories(port.categories);
      setEvents(evts.events);
      setSettings(sett.settings);
      setServicesText((sett.settings.contactServices || []).join('\n'));
      setEnquiries(enq.enquiries);
      setLegalPages(legal.pages);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    getAdminSession()
      .then((res) => {
        if (res.authenticated) {
          setAdminUser(res.user);
        }
      })
      .catch(() => setAdminUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (adminUser) {
      void loadAllAdminData();
    }
  }, [adminUser]);

  const refreshEnquiriesAndOverview = async () => {
    try {
      const [enq, ov] = await Promise.all([getAdminEnquiries(), getAdminOverview()]);
      setEnquiries(enq.enquiries);
      setOverview(ov);
    } catch {
      // Non-fatal
    }
  };

  useEffect(() => {
    if (!adminUser) return;
    const unsubscribe = subscribeCmsUpdates((scope) => {
      if (scope === 'enquiries' || scope === 'all') {
        void refreshEnquiriesAndOverview();
      }
    });
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshEnquiriesAndOverview();
      }
    };
    window.addEventListener('focus', refreshEnquiriesAndOverview);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', refreshEnquiriesAndOverview);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [adminUser]);

  const refreshOverview = async () => {
    try {
      const ov = await getAdminOverview();
      setOverview(ov);
    } catch {
      // Non-fatal
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setAdminUser(null);
  };

  const handleTogglePublish = async (item: PortfolioItem) => {
    try {
      const res = await updatePortfolioItem(item.id, { published: !item.published });
      setItems((prev) => prev.map((i) => (i.id === item.id ? res.item : i)));
      void refreshOverview();
      showToast(res.item.published ? 'Item published to Our Work.' : 'Item moved to drafts.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update publish status.');
    }
  };

  const handleToggleFeatured = async (item: PortfolioItem) => {
    try {
      const res = await updatePortfolioItem(item.id, { featured: !item.featured });
      setItems((prev) => prev.map((i) => (i.id === item.id ? res.item : i)));
      void refreshOverview();
      showToast(res.item.featured ? 'Featured on homepage.' : 'Removed from homepage featured.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update featured status.');
    }
  };

  const handleToggleEventFeatured = async (evt: StudioEvent) => {
    try {
      const res = await updateEvent(evt.id, { featured: !evt.featured });
      setEvents((prev) => prev.map((e) => (e.id === evt.id ? res.event : e)));
      void refreshOverview();
      showToast(
        res.event.featured ? 'Event featured on homepage.' : 'Removed from homepage events.'
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update event.');
    }
  };

  const handleSetItemAsHero = async (item: PortfolioItem) => {
    if (!settings) return;
    try {
      const res = await updateAdminSettings({
        heroMediaUrl: item.mediaUrl,
        heroMediaType: item.mediaType,
      });
      setSettings(res.settings);
      onSettingsUpdated(res.settings);
      showToast(`"${item.title}" is now set as the homepage hero.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to update homepage hero.');
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!confirmDeleteItem) return;
    try {
      await deletePortfolioItem(confirmDeleteItem.id);
      setItems((prev) => prev.filter((i) => i.id !== confirmDeleteItem.id));
      setConfirmDeleteItem(null);
      void refreshOverview();
      showToast('Portfolio item deleted.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete item.');
    }
  };

  const handleUploadHeroMedia = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !settings) return;
    setHeroUploading(true);
    setHeroProgress(0);
    setErrorMessage('');
    try {
      const uploaded = await uploadStandaloneMedia(file, (p) => setHeroProgress(p));
      const updated = await updateAdminSettings({
        heroMediaUrl: uploaded.url,
        heroMediaType: uploaded.mediaType,
      });
      setSettings(updated.settings);
      onSettingsUpdated(updated.settings);
      showToast('Homepage hero media updated.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload hero media.');
    } finally {
      setHeroUploading(false);
    }
  };

  const handleUploadLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !settings) return;
    setErrorMessage('');
    try {
      const uploaded = await uploadStandaloneMedia(file);
      if (uploaded.mediaType !== 'image') {
        setErrorMessage('Brand logo must be an image file.');
        return;
      }
      const updated = await updateAdminSettings({ logoUrl: uploaded.url });
      setSettings(updated.settings);
      onSettingsUpdated(updated.settings);
      showToast('Brand logo updated.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload logo.');
    }
  };

  const handleUploadFavicon = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !settings) return;
    setErrorMessage('');
    try {
      const uploaded = await uploadStandaloneMedia(file);
      if (uploaded.mediaType !== 'image') {
        setErrorMessage('Favicon must be a PNG, WEBP, or JPG image.');
        return;
      }
      const updated = await updateAdminSettings({ faviconUrl: uploaded.url });
      setSettings(updated.settings);
      onSettingsUpdated(updated.settings);
      showToast('Website favicon updated.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload favicon.');
    }
  };

  const handleSaveSettingsForm = async (e: FormEvent, includeServices = false) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    setErrorMessage('');
    try {
      const payload: Partial<SiteSettings> = { ...settings };
      if (includeServices) {
        const parsedServices = servicesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        if (parsedServices.length > 0) {
          payload.contactServices = parsedServices;
        }
      }
      const res = await updateAdminSettings(payload);
      setSettings(res.settings);
      setServicesText((res.settings.contactServices || []).join('\n'));
      onSettingsUpdated(res.settings);
      showToast('Changes saved and published to the live website.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await createCategory({ name: newCategoryName, description: newCategoryDesc });
      setCategories((prev) => [...prev, res.category]);
      setNewCategoryName('');
      setNewCategoryDesc('');
      void refreshOverview();
      showToast(`Category "${res.category.name}" added.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to add category.');
    }
  };

  const handleSaveCategoryEdit = async (id: string) => {
    try {
      const res = await updateCategory(id, {
        name: editingCategoryName,
        description: editingCategoryDesc,
      });
      setCategories((prev) => prev.map((c) => (c.id === id ? res.category : c)));
      setEditingCategoryId(null);
      showToast('Category updated.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to update category.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      void refreshOverview();
      showToast('Category removed.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to delete category.');
    }
  };

  const handleEnquiryStatus = async (id: string, status: EnquiryStatus) => {
    try {
      const res = await updateEnquiryStatus(id, status);
      setEnquiries((prev) => prev.map((e) => (e.id === id ? res.enquiry : e)));
      void refreshOverview();
      showToast('Enquiry status updated.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to update enquiry.');
    }
  };

  const handleDeleteEnquiry = async (id: string) => {
    try {
      await deleteEnquiry(id);
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      void refreshOverview();
      showToast('Enquiry deleted.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to delete enquiry.');
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-sm text-[#5C5750]">
        Verifying studio session...
      </div>
    );
  }

  if (!adminUser) {
    return <AdminLogin onSuccess={(user) => setAdminUser(user)} />;
  }

  const filteredPortfolio =
    portfolioFilterCat === 'all'
      ? items
      : items.filter((item) => item.categoryId === portfolioFilterCat);

  const sidebarItems: Array<{ id: AdminSection; label: string; icon: typeof Home }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'work', label: 'Our Work', icon: ImageIcon },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'about', label: 'About', icon: FileText },
    { id: 'contact', label: 'Contact', icon: Phone },
  ];

  const sectionTitle: Record<AdminSection, { title: string; subtitle: string }> = {
    home: {
      title: 'Home',
      subtitle: 'Manage homepage hero, featured showcases, brand identity, and footer settings.',
    },
    work: {
      title: 'Our Work',
      subtitle: 'Upload and curate portfolio photographs, videos, and outfit categories.',
    },
    events: {
      title: 'Events',
      subtitle: 'Manage fashion shows, exhibitions, runway showcases, and event media.',
    },
    about: {
      title: 'About',
      subtitle: 'Manage Hero Banner, Our Story, What We Create, Creative Process, Closing CTA, and website legal policies.',
    },
    contact: {
      title: 'Contact',
      subtitle: 'Manage studio contact details, enquiry form options, and incoming client enquiries.',
    },
  };

  const selectSection = (section: AdminSection) => {
    setActiveSection(section);
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-[#171614]">
      {/* Top PABLO Logo */}
      <div className="px-6 py-7 border-b border-[#171614]/10 flex items-center justify-between">
        <Link to="/" className="block min-w-0">
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.brandName || 'PABLO'}
              className="h-7 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="font-serif text-2xl tracking-[0.2em] font-medium uppercase text-[#171614] block">
              {settings?.brandName || 'PABLO'}
            </span>
          )}
          <span className="mt-1 block text-[11px] tracking-[0.16em] uppercase text-[#766E64]">
            Studio Admin
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close sidebar"
          className="lg:hidden p-1.5 text-[#5C5750] hover:text-[#171614]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Five Primary Navigation Items */}
      <nav aria-label="Admin Navigation" className="flex-1 px-4 py-6 space-y-1.5">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectSection(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm transition-colors duration-150 ${
                isActive
                  ? 'bg-[#171614] text-[#FAF8F5] font-medium'
                  : 'text-[#5C5750] hover:text-[#171614] hover:bg-[#FAF8F5]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Studio Session Actions */}
      <div className="px-4 py-5 border-t border-[#171614]/10 space-y-2.5">
        <p className="px-2 text-[11px] text-[#766E64] truncate" title={adminUser.email}>
          {adminUser.email}
        </p>
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[#5C5750] hover:text-[#171614] hover:bg-[#FAF8F5] transition-colors"
        >
          <span>View Public Site</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#171614] border border-[#171614]/15 hover:bg-[#FAF8F5] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#171614] flex flex-col lg:flex-row">
      {/* Desktop Left Vertical Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[#171614]/10 lg:sticky lg:top-0 lg:h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#171614]/10 px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 -ml-2 text-[#171614] hover:bg-[#FAF8F5]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif text-xl tracking-[0.18em] uppercase text-[#171614]">
            {settings?.brandName || 'PABLO'}
          </span>
        </div>
        <span className="text-xs text-[#766E64]">{sectionTitle[activeSection].title}</span>
      </header>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#171614]/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative z-10 w-68 max-w-[82vw] h-full border-r border-[#171614]/10">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 min-w-0 px-5 sm:px-8 lg:px-10 py-8 sm:py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Active Section Heading */}
          <div className="pb-6 border-b border-[#171614]/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#171614]">
                {sectionTitle[activeSection].title}
              </h1>
              <p className="mt-1.5 text-sm text-[#5C5750]">
                {sectionTitle[activeSection].subtitle}
              </p>
            </div>
            {overview && (
              <p className="text-xs font-mono tabular-nums text-[#766E64]">
                {overview.publishedItems} works · {overview.publishedEvents} events ·{' '}
                {overview.newEnquiries} new enquiries
              </p>
            )}
          </div>

          {bannerMessage && (
            <div
              role="status"
              className="p-3.5 bg-white border border-[#171614]/20 flex items-center gap-2.5 text-xs sm:text-sm text-[#171614]"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{bannerMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 bg-[#FDF4F3] border border-[#B42318]/25 text-xs sm:text-sm text-[#8A1C13]"
            >
              {errorMessage}
            </div>
          )}

          {loadingData && !settings && (
            <div className="bg-white border border-[#171614]/10 p-8 text-sm text-[#5C5750]">
              Loading studio content...
            </div>
          )}

          {/* SECTION 1: HOME */}
          {activeSection === 'home' && settings && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Hero Media Upload */}
                <div className="lg:col-span-5 bg-white border border-[#171614]/10 p-6 sm:p-8 space-y-5 self-start">
                  <div>
                    <h2 className="font-serif text-2xl font-normal text-[#171614]">
                      Homepage Hero Media
                    </h2>
                    <p className="mt-1 text-xs text-[#5C5750]">
                      Upload a hero photograph (JPG/PNG/WEBP) or MP4 video, or select an item from Our Work.
                    </p>
                  </div>

                  <div className="aspect-[16/10] bg-[#EFECE6] overflow-hidden">
                    <StudioMedia
                      src={settings.heroMediaUrl}
                      thumbnailSrc={settings.heroMediaUrl}
                      mediaType={settings.heroMediaType}
                      alt="Current Homepage Hero"
                      autoPlayVideo={settings.heroMediaType === 'video'}
                      showVideoControls={settings.heroMediaType === 'video'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>
                      {heroUploading ? `Uploading (${heroProgress}%)...` : 'Upload New Hero Media'}
                    </span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4"
                      onChange={handleUploadHeroMedia}
                      disabled={heroUploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Hero & Intro Copy + CTA Destinations */}
                <form
                  onSubmit={(e) => handleSaveSettingsForm(e)}
                  className="lg:col-span-7 bg-white border border-[#171614]/10 p-6 sm:p-8 space-y-5"
                >
                  <h2 className="font-serif text-2xl font-normal text-[#171614]">
                    Hero &amp; Homepage Content
                  </h2>

                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Hero Subheadline / Kicker
                    </label>
                    <input
                      type="text"
                      value={settings.heroSubheadline}
                      onChange={(e) =>
                        setSettings({ ...settings, heroSubheadline: e.target.value })
                      }
                      className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Hero Headline
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.heroHeadline}
                      onChange={(e) => setSettings({ ...settings, heroHeadline: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Hero Description
                    </label>
                    <textarea
                      rows={3}
                      value={settings.heroDescription}
                      onChange={(e) =>
                        setSettings({ ...settings, heroDescription: e.target.value })
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
                        value={settings.heroPrimaryCtaText}
                        onChange={(e) =>
                          setSettings({ ...settings, heroPrimaryCtaText: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1">
                        Primary Button Destination
                      </label>
                      <input
                        type="text"
                        value={settings.heroPrimaryCtaUrl}
                        onChange={(e) =>
                          setSettings({ ...settings, heroPrimaryCtaUrl: e.target.value })
                        }
                        placeholder="/work"
                        className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1">
                        Secondary Link Label
                      </label>
                      <input
                        type="text"
                        value={settings.heroSecondaryCtaText}
                        onChange={(e) =>
                          setSettings({ ...settings, heroSecondaryCtaText: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1">
                        Secondary Link Destination
                      </label>
                      <input
                        type="text"
                        value={settings.heroSecondaryCtaUrl}
                        onChange={(e) =>
                          setSettings({ ...settings, heroSecondaryCtaUrl: e.target.value })
                        }
                        placeholder="/contact"
                        className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#171614]/8 space-y-4">
                    <h3 className="font-serif text-xl text-[#171614]">
                      Homepage Introduction &amp; Bottom CTA
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#5C5750] mb-1">
                          Practice Kicker
                        </label>
                        <input
                          type="text"
                          value={settings.homeIntroKicker}
                          onChange={(e) =>
                            setSettings({ ...settings, homeIntroKicker: e.target.value })
                          }
                          className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5C5750] mb-1">
                          Practice Heading
                        </label>
                        <input
                          type="text"
                          value={settings.homeIntroHeadline}
                          onChange={(e) =>
                            setSettings({ ...settings, homeIntroHeadline: e.target.value })
                          }
                          className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1">
                        Consultation CTA Heading
                      </label>
                      <input
                        type="text"
                        value={settings.homeCtaHeadline}
                        onChange={(e) =>
                          setSettings({ ...settings, homeCtaHeadline: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1">
                        Consultation CTA Description
                      </label>
                      <textarea
                        rows={2}
                        value={settings.homeCtaDescription}
                        onChange={(e) =>
                          setSettings({ ...settings, homeCtaDescription: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#5C5750] mb-1">
                          CTA Button Label
                        </label>
                        <input
                          type="text"
                          value={settings.homeCtaButtonText}
                          onChange={(e) =>
                            setSettings({ ...settings, homeCtaButtonText: e.target.value })
                          }
                          className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5C5750] mb-1">
                          CTA Button Destination
                        </label>
                        <input
                          type="text"
                          value={settings.homeCtaButtonUrl}
                          onChange={(e) =>
                            setSettings({ ...settings, homeCtaButtonUrl: e.target.value })
                          }
                          className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-7 py-3 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
                    >
                      {savingSettings ? 'Saving...' : 'Save Homepage Content'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Select Featured Portfolio Items & Featured Events */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-[#171614]/10 p-6">
                  <h3 className="font-serif text-xl text-[#171614] pb-3 border-b border-[#171614]/8">
                    Featured Portfolio Items
                  </h3>
                  <p className="mt-2 text-xs text-[#5C5750]">
                    Published items marked Featured appear in Featured Creations on the homepage.
                  </p>
                  <div className="mt-4 divide-y divide-[#171614]/8 max-h-80 overflow-y-auto">
                    {items.map((item) => (
                      <label
                        key={item.id}
                        className="py-3 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.featured}
                            onChange={() => handleToggleFeatured(item)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-[#171614] truncate">{item.title}</p>
                            <p className="text-[11px] text-[#766E64]">
                              {item.published ? 'Published' : 'Draft (unpublish hides from Home)'}
                            </p>
                          </div>
                        </div>
                        <Star
                          className={`w-4 h-4 shrink-0 ${
                            item.featured ? 'fill-current text-[#171614]' : 'text-[#C5BEB5]'
                          }`}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-[#171614]/10 p-6">
                  <h3 className="font-serif text-xl text-[#171614] pb-3 border-b border-[#171614]/8">
                    Featured Events
                  </h3>
                  <p className="mt-2 text-xs text-[#5C5750]">
                    Published events marked Featured appear in Featured Events on the homepage.
                  </p>
                  <div className="mt-4 divide-y divide-[#171614]/8 max-h-80 overflow-y-auto">
                    {events.map((evt) => (
                      <label
                        key={evt.id}
                        className="py-3 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={evt.featured}
                            onChange={() => handleToggleEventFeatured(evt)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-[#171614] truncate">{evt.title}</p>
                            <p className="text-[11px] text-[#766E64]">
                              {evt.category} · {evt.published ? 'Published' : 'Draft'}
                            </p>
                          </div>
                        </div>
                        <Star
                          className={`w-4 h-4 shrink-0 ${
                            evt.featured ? 'fill-current text-[#171614]' : 'text-[#C5BEB5]'
                          }`}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Brand Identity, SEO, Navigation & Footer Settings */}
              <section className="bg-white border border-[#171614]/10">
                <button
                  type="button"
                  onClick={() => setSiteIdentityOpen((prev) => !prev)}
                  aria-expanded={siteIdentityOpen}
                  className="w-full px-6 sm:px-8 py-5 flex items-center justify-between text-left hover:bg-[#FAF8F5]/60 transition-colors"
                >
                  <div>
                    <h2 className="font-serif text-2xl font-normal text-[#171614]">
                      Brand Identity, SEO &amp; Footer Settings
                    </h2>
                    <p className="mt-1 text-xs text-[#5C5750]">
                      Manage brand wordmark, logo, favicon, SEO metadata, navigation labels, footer copy, and social links.
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-[#5C5750] shrink-0 transition-transform ${
                      siteIdentityOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {siteIdentityOpen && (
                  <form
                    onSubmit={(e) => handleSaveSettingsForm(e)}
                    className="p-6 sm:p-8 pt-2 border-t border-[#171614]/8 grid grid-cols-1 lg:grid-cols-12 gap-8"
                  >
                    <div className="lg:col-span-6 space-y-6">
                      <div>
                        <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                          Brand Name
                        </label>
                        <input
                          type="text"
                          required
                          value={settings.brandName}
                          onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                        />
                      </div>

                      <div>
                        <p className="text-xs font-medium text-[#5C5750] mb-2">
                          Header Logo (optional — defaults to PABLO serif wordmark)
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                          {settings.logoUrl && (
                            <img
                              src={settings.logoUrl}
                              alt="Brand logo"
                              className="h-10 w-auto object-contain bg-[#FAF8F5] p-1 border border-[#171614]/10"
                            />
                          )}
                          <label className="px-4 py-2 text-xs font-medium border border-[#171614]/20 hover:bg-[#FAF8F5] cursor-pointer">
                            <span>Upload Logo</span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                              onChange={handleUploadLogo}
                              className="hidden"
                            />
                          </label>
                          {settings.logoUrl && (
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await updateAdminSettings({ logoUrl: '' });
                                setSettings(res.settings);
                                onSettingsUpdated(res.settings);
                                showToast('Reverted to wordmark logo.');
                              }}
                              className="text-xs text-[#8A1C13] hover:underline"
                            >
                              Use Text Wordmark
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#171614]/8">
                        <p className="text-xs font-medium text-[#5C5750] mb-2">Website Favicon</p>
                        <div className="flex flex-wrap items-center gap-4">
                          {settings.faviconUrl && (
                            <img
                              src={settings.faviconUrl}
                              alt="Favicon"
                              className="w-8 h-8 object-contain border border-[#171614]/10 bg-[#FAF8F5]"
                            />
                          )}
                          <label className="px-4 py-2 text-xs font-medium border border-[#171614]/20 hover:bg-[#FAF8F5] cursor-pointer">
                            <span>Upload Favicon (PNG/WEBP)</span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                              onChange={handleUploadFavicon}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#171614]/8 space-y-4">
                        <h3 className="font-serif text-xl text-[#171614]">
                          SEO &amp; Social Metadata
                        </h3>
                        <div>
                          <label className="block text-xs font-medium text-[#5C5750] mb-1">
                            SEO Title
                          </label>
                          <input
                            type="text"
                            value={settings.seoTitle}
                            onChange={(e) => setSettings({ ...settings, seoTitle: e.target.value })}
                            className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#5C5750] mb-1">
                            SEO Meta Description
                          </label>
                          <textarea
                            rows={3}
                            value={settings.seoDescription}
                            onChange={(e) =>
                              setSettings({ ...settings, seoDescription: e.target.value })
                            }
                            className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-6 space-y-6">
                      <div>
                        <h3 className="font-serif text-xl text-[#171614] mb-3">
                          Public Navigation Labels
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                          {(['home', 'work', 'events', 'about', 'contact', 'cta'] as const).map(
                            (key) => (
                              <div key={key}>
                                <label className="block text-[11px] font-medium text-[#5C5750] mb-1 capitalize">
                                  {key === 'cta' ? 'Header CTA' : `${key} Label`}
                                </label>
                                <input
                                  type="text"
                                  value={settings.navLabels[key]}
                                  onChange={(e) =>
                                    setSettings({
                                      ...settings,
                                      navLabels: { ...settings.navLabels, [key]: e.target.value },
                                    })
                                  }
                                  className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#171614]/15"
                                />
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#171614]/8 space-y-4">
                        <h3 className="font-serif text-xl text-[#171614]">Footer Content</h3>
                        <div>
                          <label className="block text-xs font-medium text-[#5C5750] mb-1">
                            Footer Description
                          </label>
                          <textarea
                            rows={3}
                            value={settings.footerDescription}
                            onChange={(e) =>
                              setSettings({ ...settings, footerDescription: e.target.value })
                            }
                            className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#5C5750] mb-1">
                            Copyright Notice
                          </label>
                          <input
                            type="text"
                            value={settings.footerCopyright}
                            onChange={(e) =>
                              setSettings({ ...settings, footerCopyright: e.target.value })
                            }
                            className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#171614]/8 space-y-3">
                        <h3 className="font-serif text-xl text-[#171614]">Social Media Links</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[11px] text-[#5C5750] mb-1">
                              Instagram URL
                            </label>
                            <input
                              type="url"
                              value={settings.instagramUrl}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  instagramUrl: e.target.value,
                                  socialLinks: {
                                    ...settings.socialLinks,
                                    instagram: e.target.value,
                                  },
                                })
                              }
                              placeholder="https://instagram.com/..."
                              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#171614]/15"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#5C5750] mb-1">
                              Facebook URL
                            </label>
                            <input
                              type="url"
                              value={settings.socialLinks.facebook}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  socialLinks: {
                                    ...settings.socialLinks,
                                    facebook: e.target.value,
                                  },
                                })
                              }
                              placeholder="https://facebook.com/..."
                              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#171614]/15"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#5C5750] mb-1">
                              Pinterest URL
                            </label>
                            <input
                              type="url"
                              value={settings.socialLinks.pinterest}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  socialLinks: {
                                    ...settings.socialLinks,
                                    pinterest: e.target.value,
                                  },
                                })
                              }
                              placeholder="https://pinterest.com/..."
                              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#171614]/15"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#5C5750] mb-1">
                              YouTube URL
                            </label>
                            <input
                              type="url"
                              value={settings.socialLinks.youtube}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  socialLinks: {
                                    ...settings.socialLinks,
                                    youtube: e.target.value,
                                  },
                                })
                              }
                              placeholder="https://youtube.com/..."
                              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#171614]/15"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="px-7 py-3 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
                        >
                          {savingSettings ? 'Saving...' : 'Save Brand & Footer Settings'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </section>
            </div>
          )}

          {/* SECTION 2: OUR WORK */}
          {activeSection === 'work' && (
            <div className="space-y-8">
              <MediaUploaderPanel
                categories={categories}
                onUploaded={(newItems) => {
                  setItems((prev) => [...newItems, ...prev]);
                  void refreshOverview();
                  showToast(
                    `${newItems.length} ${newItems.length === 1 ? 'creation' : 'creations'} added to portfolio.`
                  );
                }}
              />

              <section className="bg-white border border-[#171614]/10 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#171614]/8">
                  <div>
                    <h2 className="font-serif text-2xl font-normal text-[#171614]">
                      Portfolio Catalogue
                    </h2>
                    <p className="mt-1 text-xs text-[#766E64] font-mono tabular-nums">
                      {filteredPortfolio.length} items shown · Latest uploads appear first
                    </p>
                  </div>

                  <select
                    aria-label="Filter portfolio by category"
                    value={portfolioFilterCat}
                    onChange={(e) => setPortfolioFilterCat(e.target.value)}
                    className="px-3.5 py-2 text-xs bg-[#FAF8F5] border border-[#171614]/15"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredPortfolio.length === 0 ? (
                  <p className="py-12 text-center text-sm text-[#766E64]">
                    No portfolio items in this view yet. Upload photographs or videos above.
                  </p>
                ) : (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPortfolio.map((item) => {
                      const catName =
                        categories.find((c) => c.id === item.categoryId)?.name || 'Uncategorized';
                      const isHero = settings?.heroMediaUrl === item.mediaUrl;
                      return (
                        <article
                          key={item.id}
                          className="border border-[#171614]/10 bg-[#FAF8F5] flex flex-col justify-between"
                        >
                          <div>
                            <div className="relative aspect-[4/3] bg-[#EFECE6] overflow-hidden">
                              <StudioMedia
                                src={item.mediaUrl}
                                thumbnailSrc={item.thumbnailUrl || item.mediaUrl}
                                mediaType={item.mediaType}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-2.5 left-2.5 bg-[#171614]/80 text-[#FAF8F5] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">
                                {item.mediaType}
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-serif text-lg text-[#171614] leading-snug">
                                  {item.title}
                                </h3>
                                <span className="text-[11px] font-mono text-[#766E64] shrink-0">
                                  {item.published ? 'Live' : 'Draft'}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-[#766E64]">
                                {catName} · {item.aspectRatio}
                                {item.featured ? ' · Featured' : ''}
                              </p>
                              {item.description && (
                                <p className="mt-2 text-xs text-[#5C5750] line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="px-4 py-3 border-t border-[#171614]/8 bg-white flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                title="Edit item"
                                className="p-2 text-[#5C5750] hover:text-[#171614] hover:bg-[#FAF8F5]"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTogglePublish(item)}
                                title={item.published ? 'Unpublish item' : 'Publish item'}
                                className="p-2 text-[#5C5750] hover:text-[#171614] hover:bg-[#FAF8F5]"
                              >
                                {item.published ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleFeatured(item)}
                                title={item.featured ? 'Remove from featured' : 'Feature on homepage'}
                                className={`p-2 hover:bg-[#FAF8F5] ${
                                  item.featured ? 'text-[#171614]' : 'text-[#A29A90]'
                                }`}
                              >
                                <Star
                                  className={`w-4 h-4 ${item.featured ? 'fill-current' : ''}`}
                                />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSetItemAsHero(item)}
                                disabled={isHero}
                                className={`px-2.5 py-1 text-[11px] font-medium border ${
                                  isHero
                                    ? 'border-[#171614]/20 text-[#766E64] cursor-default'
                                    : 'border-[#171614]/15 text-[#171614] hover:bg-[#FAF8F5]'
                                }`}
                              >
                                {isHero ? 'Hero Active' : 'Set as Hero'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteItem(item)}
                                aria-label={`Delete ${item.title}`}
                                className="p-2 text-[#766E64] hover:text-[#8A1C13]"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Portfolio Categories Manager */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <form
                  onSubmit={handleAddCategory}
                  className="lg:col-span-4 bg-white border border-[#171614]/10 p-6 space-y-4 self-start"
                >
                  <h2 className="font-serif text-2xl font-normal text-[#171614]">New Category</h2>
                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">Name</label>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Bridal Couture"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Description (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-[#171614] text-[#FAF8F5]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Category</span>
                  </button>
                </form>

                <div className="lg:col-span-8 bg-white border border-[#171614]/10 p-6">
                  <h2 className="font-serif text-2xl font-normal text-[#171614] pb-4 border-b border-[#171614]/8">
                    Portfolio Categories
                  </h2>
                  <div className="divide-y divide-[#171614]/8">
                    {categories.map((cat) => {
                      const count = items.filter((i) => i.categoryId === cat.id).length;
                      const isEditing = editingCategoryId === cat.id;

                      return (
                        <div
                          key={cat.id}
                          className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          {isEditing ? (
                            <div className="flex-1 space-y-2.5">
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-[#FAF8F5] border border-[#171614]/20"
                              />
                              <input
                                type="text"
                                value={editingCategoryDesc}
                                onChange={(e) => setEditingCategoryDesc(e.target.value)}
                                placeholder="Description"
                                className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#171614]/20"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveCategoryEdit(cat.id)}
                                  className="px-4 py-1.5 text-xs bg-[#171614] text-[#FAF8F5]"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCategoryId(null)}
                                  className="px-4 py-1.5 text-xs border border-[#171614]/20"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div>
                                <p className="font-serif text-xl text-[#171614]">{cat.name}</p>
                                {cat.description && (
                                  <p className="text-xs text-[#5C5750] mt-0.5">{cat.description}</p>
                                )}
                                <p className="text-[11px] font-mono tabular-nums text-[#766E64] mt-1">
                                  /{cat.slug} · {count} {count === 1 ? 'item' : 'items'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategoryId(cat.id);
                                    setEditingCategoryName(cat.name);
                                    setEditingCategoryDesc(cat.description);
                                  }}
                                  className="px-3 py-1.5 text-xs border border-[#171614]/15 hover:bg-[#FAF8F5]"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="px-3 py-1.5 text-xs text-[#8A1C13] border border-[#8A1C13]/20 hover:bg-[#FDF4F3]"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: EVENTS */}
          {activeSection === 'events' && (
            <EventsManagerPanel
              events={events}
              onEventsChange={setEvents}
              onRefreshOverview={refreshOverview}
              onNotify={showToast}
              onError={setErrorMessage}
            />
          )}

          {/* SECTION 4: ABOUT (Full 5-Section About CMS + Footer Legal Pages) */}
          {activeSection === 'about' && (
            <div className="space-y-10">
              <AboutManagerPanel onNotify={showToast} onError={setErrorMessage} />

              {/* Studio Policies & Legal Pages (Footer Links) */}
              <div className="pt-6 border-t border-[#171614]/10 space-y-5">
                <div>
                  <h2 className="font-serif text-2xl font-normal text-[#171614]">
                    Legal Policies (Footer Links)
                  </h2>
                  <p className="mt-1 text-xs text-[#5C5750]">
                    Manage the Privacy Policy and Terms &amp; Conditions pages linked in the public website footer.
                  </p>
                </div>
                <LegalPagesPanel
                  pages={legalPages}
                  onPagesChange={setLegalPages}
                  onNotify={showToast}
                  onError={setErrorMessage}
                />
              </div>
            </div>
          )}

          {/* SECTION 5: CONTACT (Contact Details, Page Settings & Enquiries) */}
          {activeSection === 'contact' && settings && (
            <div className="space-y-8">
              <form
                onSubmit={(e) => handleSaveSettingsForm(e, true)}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                <div className="lg:col-span-6 bg-white border border-[#171614]/10 p-6 sm:p-8 space-y-5">
                  <div>
                    <h2 className="font-serif text-2xl font-normal text-[#171614]">
                      Studio Contact Details
                    </h2>
                    <p className="mt-1 text-xs text-[#5C5750]">
                      All fields are optional. Any field left blank stays hidden from the public footer and Contact page.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                        Primary Contact Number
                      </label>
                      <input
                        type="text"
                        value={settings.contactPhone}
                        onChange={(e) =>
                          setSettings({ ...settings, contactPhone: e.target.value })
                        }
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                        WhatsApp Number
                      </label>
                      <input
                        type="text"
                        value={settings.whatsappNumber}
                        onChange={(e) =>
                          setSettings({ ...settings, whatsappNumber: e.target.value })
                        }
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={settings.contactEmail}
                      onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Studio Address
                    </label>
                    <textarea
                      rows={3}
                      value={settings.address}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                        Opening Days
                      </label>
                      <input
                        type="text"
                        value={settings.openingDays}
                        onChange={(e) =>
                          setSettings({ ...settings, openingDays: e.target.value })
                        }
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                        Opening Time
                      </label>
                      <input
                        type="text"
                        value={settings.openingTime}
                        onChange={(e) =>
                          setSettings({ ...settings, openingTime: e.target.value })
                        }
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                        Closing Time
                      </label>
                      <input
                        type="text"
                        value={settings.closingTime}
                        onChange={(e) =>
                          setSettings({ ...settings, closingTime: e.target.value })
                        }
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                        Appointment Info
                      </label>
                      <input
                        type="text"
                        value={settings.appointmentInfo}
                        onChange={(e) =>
                          setSettings({ ...settings, appointmentInfo: e.target.value })
                        }
                        placeholder="Optional"
                        className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Instagram Profile URL
                    </label>
                    <input
                      type="url"
                      value={settings.instagramUrl}
                      onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>
                </div>

                <div className="lg:col-span-6 bg-white border border-[#171614]/10 p-6 sm:p-8 space-y-5">
                  <h2 className="font-serif text-2xl font-normal text-[#171614]">
                    Contact Page &amp; Enquiry Form
                  </h2>

                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Page Headline
                    </label>
                    <input
                      type="text"
                      value={settings.contactHeadline}
                      onChange={(e) =>
                        setSettings({ ...settings, contactHeadline: e.target.value })
                      }
                      className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Page Intro Copy
                    </label>
                    <textarea
                      rows={3}
                      value={settings.contactIntro}
                      onChange={(e) => setSettings({ ...settings, contactIntro: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                        Form Title
                      </label>
                      <input
                        type="text"
                        value={settings.contactFormHeading}
                        onChange={(e) =>
                          setSettings({ ...settings, contactFormHeading: e.target.value })
                        }
                        className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                        Submit Button Text
                      </label>
                      <input
                        type="text"
                        value={settings.contactFormButtonText}
                        onChange={(e) =>
                          setSettings({ ...settings, contactFormButtonText: e.target.value })
                        }
                        className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Form Subtitle
                    </label>
                    <input
                      type="text"
                      value={settings.contactFormDescription}
                      onChange={(e) =>
                        setSettings({ ...settings, contactFormDescription: e.target.value })
                      }
                      className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C5750] mb-1.5">
                      Enquiry Form Service Options (one per line)
                    </label>
                    <textarea
                      rows={5}
                      value={servicesText}
                      onChange={(e) => setServicesText(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-[#FAF8F5] border border-[#171614]/15"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="px-7 py-3 text-xs font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50"
                    >
                      {savingSettings ? 'Saving...' : 'Save Contact Settings'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Client Enquiries Inbox inside Contact */}
              <section className="bg-white border border-[#171614]/10 p-6 sm:p-8">
                <div className="flex items-center justify-between pb-5 border-b border-[#171614]/8">
                  <div>
                    <h2 className="font-serif text-2xl font-normal text-[#171614]">
                      Client Enquiries
                    </h2>
                    <p className="mt-1 text-xs text-[#766E64] font-mono tabular-nums">
                      {enquiries.length} total submissions
                      {overview && overview.newEnquiries > 0
                        ? ` · ${overview.newEnquiries} new`
                        : ''}
                    </p>
                  </div>
                </div>

                {enquiries.length === 0 ? (
                  <p className="py-12 text-center text-sm text-[#766E64]">
                    Enquiries submitted from the Contact page will appear here.
                  </p>
                ) : (
                  <div className="divide-y divide-[#171614]/8">
                    {enquiries.map((enq) => (
                      <div
                        key={enq.id}
                        className="py-5 flex flex-col md:flex-row md:items-start justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#766E64]">
                            <span className="text-sm font-medium text-[#171614]">{enq.name}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{enq.phone}</span>
                            <span aria-hidden="true">·</span>
                            <span>{enq.serviceRequired}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {new Date(enq.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-[#4A4640] leading-relaxed whitespace-pre-line max-w-3xl">
                            {enq.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            aria-label={`Status for ${enq.name}`}
                            value={enq.status}
                            onChange={(e) =>
                              handleEnquiryStatus(enq.id, e.target.value as EnquiryStatus)
                            }
                            className="px-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#171614]/15"
                          >
                            <option value="new">New</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="archived">Archived</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteEnquiry(enq.id)}
                            aria-label="Delete enquiry"
                            className="p-2 text-[#766E64] hover:text-[#8A1C13]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      {/* Edit Portfolio Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
          onSaved={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setEditingItem(null);
            void refreshOverview();
            showToast('Portfolio item updated.');
          }}
        />
      )}

      {/* Delete Portfolio Confirmation Modal */}
      {confirmDeleteItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm deletion"
          className="fixed inset-0 z-50 bg-[#171614]/60 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#171614]/15 max-w-md w-full p-6 sm:p-8">
            <h2 className="font-serif text-2xl text-[#171614]">Delete Creation?</h2>
            <p className="mt-2 text-sm text-[#5C5750]">
              Are you sure you want to permanently remove{' '}
              <span className="font-medium text-[#171614]">{confirmDeleteItem.title}</span>? This
              action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteItem(null)}
                className="px-5 py-2.5 text-xs font-medium border border-[#171614]/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
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
