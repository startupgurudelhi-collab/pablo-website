import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  DB_FILE_PATH,
  SESSION_TTL_MS,
  ensureStorageDirectories,
  isMysqlConfigured,
} from './config.ts';
import { mysqlStore } from './mysqlStore.ts';
import {
  type AdminUserRecord,
  type DatabaseSchema,
  type StudioStore,
  createDefaultAboutData,
  createDefaultLegalPages,
  createDefaultSiteSettings,
  createInitialSeedData,
  createSampleEvents,
  slugify,
} from './seedDefaults.ts';
import type {
  AboutPageContent,
  AboutPageData,
  AboutProcessStep,
  AboutServiceCategory,
  AdminUserPublic,
  AspectRatioType,
  Enquiry,
  EnquiryStatus,
  EventMediaItem,
  LegalPage,
  LegalPageSlug,
  MediaType,
  PortfolioCategory,
  PortfolioItem,
  SiteSettings,
  StudioEvent,
} from '../src/types/studio.ts';

export { slugify };

let cachedDb: DatabaseSchema | null = null;
let writeChain: Promise<void> = Promise.resolve();

function migrateLoadedDb(rawDb: Partial<DatabaseSchema>): DatabaseSchema {
  const now = new Date().toISOString();
  const defaults = createDefaultSiteSettings(now);
  const existingSettings = rawDb.siteSettings || ({} as Partial<SiteSettings>);

  const mergedSettings: SiteSettings = {
    ...defaults,
    ...existingSettings,
    navLabels: {
      ...defaults.navLabels,
      ...(existingSettings.navLabels || {}),
    },
    socialLinks: {
      ...defaults.socialLinks,
      ...(existingSettings.socialLinks || {}),
      instagram:
        existingSettings.socialLinks?.instagram || existingSettings.instagramUrl || '',
      whatsapp:
        existingSettings.socialLinks?.whatsapp || existingSettings.whatsappNumber || '',
    },
    contactServices:
      Array.isArray(existingSettings.contactServices) &&
      existingSettings.contactServices.length > 0
        ? existingSettings.contactServices
        : defaults.contactServices,
    studioHours:
      existingSettings.studioHours === 'Tuesday – Saturday, 10:30 AM – 7:00 PM (By Appointment)'
        ? ''
        : existingSettings.studioHours ?? defaults.studioHours,
    openingDays: existingSettings.openingDays ?? '',
    openingTime: existingSettings.openingTime ?? '',
    closingTime: existingSettings.closingTime ?? '',
    appointmentInfo: existingSettings.appointmentInfo ?? '',
  };

  let events = Array.isArray(rawDb.events) ? rawDb.events : undefined;
  let eventMedia = Array.isArray(rawDb.eventMedia) ? rawDb.eventMedia : undefined;

  if (!events) {
    const sample = createSampleEvents(now);
    events = sample.events;
    eventMedia = eventMedia || sample.eventMedia;
  }

  const legalPages =
    Array.isArray(rawDb.legalPages) && rawDb.legalPages.length > 0
      ? rawDb.legalPages
      : createDefaultLegalPages(now);

  const defaultAbout = createDefaultAboutData(now);
  const aboutPage: AboutPageContent = rawDb.aboutPage
    ? { ...defaultAbout.aboutPage, ...rawDb.aboutPage }
    : defaultAbout.aboutPage;

  const aboutServices = Array.isArray(rawDb.aboutServices)
    ? rawDb.aboutServices
    : defaultAbout.aboutServices;

  const aboutProcessSteps = Array.isArray(rawDb.aboutProcessSteps)
    ? rawDb.aboutProcessSteps
    : defaultAbout.aboutProcessSteps;

  return {
    adminUsers: rawDb.adminUsers || [],
    categories: rawDb.categories || [],
    portfolioItems: rawDb.portfolioItems || [],
    events,
    eventMedia: eventMedia || [],
    legalPages,
    siteSettings: mergedSettings,
    aboutPage,
    aboutServices,
    aboutProcessSteps,
    enquiries: rawDb.enquiries || [],
    sessions: rawDb.sessions || [],
  };
}

function loadDb(): DatabaseSchema {
  if (cachedDb) return cachedDb;
  ensureStorageDirectories();
  if (!fs.existsSync(DB_FILE_PATH)) {
    const initial = createInitialSeedData();
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initial, null, 2), 'utf8');
    cachedDb = initial;
    return cachedDb;
  }
  const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
  const migrated = migrateLoadedDb(parsed);
  cachedDb = migrated;
  return cachedDb;
}

async function persistDb(db: DatabaseSchema): Promise<void> {
  cachedDb = db;
  writeChain = writeChain.then(async () => {
    ensureStorageDirectories();
    const tmpPath = `${DB_FILE_PATH}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(db, null, 2), 'utf8');
    await fs.promises.rename(tmpPath, DB_FILE_PATH);
  });
  return writeChain;
}

function hydrateEvent(db: DatabaseSchema, event: StudioEvent): StudioEvent {
  const media = db.eventMedia
    .filter((m) => m.eventId === event.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  return { ...event, media };
}

export const localStore: StudioStore = {
  async init(): Promise<void> {
    loadDb();
  },

  async ping(): Promise<boolean> {
    loadDb();
    return true;
  },

  async getSettings(): Promise<SiteSettings> {
    return { ...loadDb().siteSettings };
  },

  async updateSettings(
    patch: Partial<Omit<SiteSettings, 'id' | 'updatedAt'>>
  ): Promise<SiteSettings> {
    const db = loadDb();
    const current = db.siteSettings;

    const nextNavLabels = patch.navLabels
      ? { ...current.navLabels, ...patch.navLabels }
      : current.navLabels;

    const nextInstagram =
      patch.instagramUrl !== undefined
        ? patch.instagramUrl
        : patch.socialLinks?.instagram !== undefined
          ? patch.socialLinks.instagram
          : current.instagramUrl;

    const nextWhatsapp =
      patch.whatsappNumber !== undefined
        ? patch.whatsappNumber
        : patch.socialLinks?.whatsapp !== undefined
          ? patch.socialLinks.whatsapp
          : current.whatsappNumber;

    const nextSocialLinks = {
      ...current.socialLinks,
      ...(patch.socialLinks || {}),
      instagram: nextInstagram,
      whatsapp: nextWhatsapp,
    };

    db.siteSettings = {
      ...current,
      ...patch,
      instagramUrl: nextInstagram,
      whatsappNumber: nextWhatsapp,
      navLabels: nextNavLabels,
      socialLinks: nextSocialLinks,
      updatedAt: new Date().toISOString(),
    };
    await persistDb(db);
    return { ...db.siteSettings };
  },

  async getLegalPages(publishedOnly = false): Promise<LegalPage[]> {
    const pages = [...loadDb().legalPages];
    return publishedOnly ? pages.filter((p) => p.published) : pages;
  },

  async getLegalPageBySlug(slug: string, publishedOnly = false): Promise<LegalPage | null> {
    const page = loadDb().legalPages.find((p) => p.slug === slug) || null;
    if (!page) return null;
    if (publishedOnly && !page.published) return null;
    return { ...page };
  },

  async updateLegalPage(
    slug: LegalPageSlug,
    patch: Partial<
      Pick<
        LegalPage,
        'title' | 'content' | 'seoTitle' | 'seoDescription' | 'published' | 'lastRevisedDate'
      >
    >
  ): Promise<LegalPage | null> {
    const db = loadDb();
    const idx = db.legalPages.findIndex((p) => p.slug === slug);
    if (idx === -1) return null;
    db.legalPages[idx] = {
      ...db.legalPages[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await persistDb(db);
    return { ...db.legalPages[idx] };
  },

  async getCategories(): Promise<PortfolioCategory[]> {
    return [...loadDb().categories].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async createCategory(input: { name: string; description?: string }): Promise<PortfolioCategory> {
    const db = loadDb();
    const baseSlug = slugify(input.name);
    let slug = baseSlug;
    let counter = 2;
    while (db.categories.some((c) => c.slug === slug)) {
      slug = `${baseSlug}-${counter++}`;
    }
    const maxSort = db.categories.reduce((max, c) => Math.max(max, c.sortOrder), 0);
    const category: PortfolioCategory = {
      id: `cat_${crypto.randomUUID().slice(0, 8)}`,
      name: input.name.trim(),
      slug,
      description: (input.description || '').trim(),
      sortOrder: maxSort + 1,
      createdAt: new Date().toISOString(),
    };
    db.categories.push(category);
    await persistDb(db);
    return category;
  },

  async updateCategory(
    id: string,
    patch: { name?: string; description?: string; sortOrder?: number }
  ): Promise<PortfolioCategory | null> {
    const db = loadDb();
    const idx = db.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const current = db.categories[idx];
    const nextName = patch.name !== undefined ? patch.name.trim() : current.name;
    let nextSlug = current.slug;
    if (patch.name !== undefined && nextName !== current.name) {
      const baseSlug = slugify(nextName);
      nextSlug = baseSlug;
      let counter = 2;
      while (db.categories.some((c) => c.id !== id && c.slug === nextSlug)) {
        nextSlug = `${baseSlug}-${counter++}`;
      }
    }
    db.categories[idx] = {
      ...current,
      name: nextName,
      slug: nextSlug,
      description: patch.description !== undefined ? patch.description.trim() : current.description,
      sortOrder: patch.sortOrder !== undefined ? patch.sortOrder : current.sortOrder,
    };
    await persistDb(db);
    return db.categories[idx];
  },

  async deleteCategory(id: string): Promise<{ deleted: boolean; reason?: string }> {
    const db = loadDb();
    const usedByItem = db.portfolioItems.some((item) => item.categoryId === id);
    if (usedByItem) {
      return {
        deleted: false,
        reason: 'Reassign or delete portfolio items in this category before removing it.',
      };
    }
    const before = db.categories.length;
    db.categories = db.categories.filter((c) => c.id !== id);
    if (db.categories.length === before) {
      return { deleted: false, reason: 'Category not found.' };
    }
    await persistDb(db);
    return { deleted: true };
  },

  async getPortfolioItems(options?: {
    publishedOnly?: boolean;
    featuredOnly?: boolean;
    categorySlug?: string;
    mediaType?: MediaType;
  }): Promise<PortfolioItem[]> {
    const db = loadDb();
    let items = [...db.portfolioItems];
    if (options?.publishedOnly) {
      items = items.filter((item) => item.published);
    }
    if (options?.featuredOnly) {
      items = items.filter((item) => item.featured);
    }
    if (options?.mediaType) {
      items = items.filter((item) => item.mediaType === options.mediaType);
    }
    if (options?.categorySlug) {
      const cat = db.categories.find(
        (c) => c.slug === options.categorySlug || c.id === options.categorySlug
      );
      if (!cat) return [];
      items = items.filter((item) => item.categoryId === cat.id);
    }
    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getPortfolioItemById(id: string): Promise<PortfolioItem | null> {
    return loadDb().portfolioItems.find((item) => item.id === id) || null;
  },

  async createPortfolioItem(input: {
    title: string;
    description: string;
    mediaType: MediaType;
    mediaUrl: string;
    thumbnailUrl: string;
    aspectRatio: AspectRatioType;
    categoryId: string;
    featured: boolean;
    published: boolean;
  }): Promise<PortfolioItem> {
    const db = loadDb();
    const now = new Date().toISOString();
    const item: PortfolioItem = {
      id: `item_${crypto.randomUUID().slice(0, 10)}`,
      title: input.title.trim(),
      description: input.description.trim(),
      mediaType: input.mediaType,
      mediaUrl: input.mediaUrl,
      thumbnailUrl: input.thumbnailUrl || input.mediaUrl,
      aspectRatio: input.aspectRatio,
      categoryId: input.categoryId,
      featured: Boolean(input.featured),
      published: Boolean(input.published),
      createdAt: now,
      updatedAt: now,
    };
    db.portfolioItems.unshift(item);
    await persistDb(db);
    return item;
  },

  async updatePortfolioItem(
    id: string,
    patch: Partial<
      Pick<
        PortfolioItem,
        | 'title'
        | 'description'
        | 'mediaType'
        | 'mediaUrl'
        | 'thumbnailUrl'
        | 'aspectRatio'
        | 'categoryId'
        | 'featured'
        | 'published'
      >
    >
  ): Promise<PortfolioItem | null> {
    const db = loadDb();
    const idx = db.portfolioItems.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    db.portfolioItems[idx] = {
      ...db.portfolioItems[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await persistDb(db);
    return db.portfolioItems[idx];
  },

  async deletePortfolioItem(id: string): Promise<PortfolioItem | null> {
    const db = loadDb();
    const idx = db.portfolioItems.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const [removed] = db.portfolioItems.splice(idx, 1);
    await persistDb(db);
    return removed;
  },

  async getEvents(options?: {
    publishedOnly?: boolean;
    featuredOnly?: boolean;
    category?: string;
  }): Promise<StudioEvent[]> {
    const db = loadDb();
    let list = [...db.events];
    if (options?.publishedOnly) {
      list = list.filter((e) => e.published);
    }
    if (options?.featuredOnly) {
      list = list.filter((e) => e.featured);
    }
    if (options?.category && options.category !== 'all') {
      list = list.filter((e) => e.category.toLowerCase() === options.category!.toLowerCase());
    }
    return list
      .sort((a, b) => {
        const da = a.eventDate ? new Date(a.eventDate).getTime() : new Date(a.createdAt).getTime();
        const dbTime = b.eventDate
          ? new Date(b.eventDate).getTime()
          : new Date(b.createdAt).getTime();
        return dbTime - da;
      })
      .map((e) => hydrateEvent(db, e));
  },

  async getEventById(id: string): Promise<StudioEvent | null> {
    const db = loadDb();
    const found = db.events.find((e) => e.id === id);
    if (!found) return null;
    return hydrateEvent(db, found);
  },

  async createEvent(input: {
    title: string;
    description: string;
    eventDate: string;
    location: string;
    category: string;
    coverImageUrl: string;
    videoUrl: string;
    featured: boolean;
    published: boolean;
  }): Promise<StudioEvent> {
    const db = loadDb();
    const now = new Date().toISOString();
    const created: StudioEvent = {
      id: `evt_${crypto.randomUUID().slice(0, 10)}`,
      title: input.title.trim(),
      description: input.description.trim(),
      eventDate: input.eventDate.trim(),
      location: input.location.trim(),
      category: input.category.trim() || 'Fashion Show',
      coverImageUrl: input.coverImageUrl,
      videoUrl: input.videoUrl.trim(),
      featured: Boolean(input.featured),
      published: Boolean(input.published),
      createdAt: now,
      updatedAt: now,
    };
    db.events.unshift(created);
    await persistDb(db);
    return hydrateEvent(db, created);
  },

  async updateEvent(
    id: string,
    patch: Partial<
      Pick<
        StudioEvent,
        | 'title'
        | 'description'
        | 'eventDate'
        | 'location'
        | 'category'
        | 'coverImageUrl'
        | 'videoUrl'
        | 'featured'
        | 'published'
      >
    >
  ): Promise<StudioEvent | null> {
    const db = loadDb();
    const idx = db.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    db.events[idx] = {
      ...db.events[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await persistDb(db);
    return hydrateEvent(db, db.events[idx]);
  },

  async deleteEvent(
    id: string
  ): Promise<{ event: StudioEvent; removedMedia: EventMediaItem[] } | null> {
    const db = loadDb();
    const idx = db.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const [removed] = db.events.splice(idx, 1);
    const removedMedia = db.eventMedia.filter((m) => m.eventId === id);
    db.eventMedia = db.eventMedia.filter((m) => m.eventId !== id);
    await persistDb(db);
    return { event: removed, removedMedia };
  },

  async addEventMedia(
    eventId: string,
    items: Array<{
      mediaType: MediaType;
      mediaUrl: string;
      thumbnailUrl: string;
      caption?: string;
    }>
  ): Promise<EventMediaItem[]> {
    const db = loadDb();
    const now = new Date().toISOString();
    const existingMax = db.eventMedia
      .filter((m) => m.eventId === eventId)
      .reduce((max, m) => Math.max(max, m.sortOrder), 0);

    const created: EventMediaItem[] = items.map((item, idx) => ({
      id: `evtm_${crypto.randomUUID().slice(0, 10)}`,
      eventId,
      mediaType: item.mediaType,
      mediaUrl: item.mediaUrl,
      thumbnailUrl: item.thumbnailUrl || item.mediaUrl,
      caption: (item.caption || '').trim(),
      sortOrder: existingMax + idx + 1,
      createdAt: now,
    }));

    db.eventMedia.push(...created);
    await persistDb(db);
    return created;
  },

  async updateEventMedia(
    mediaId: string,
    patch: { caption?: string; sortOrder?: number }
  ): Promise<EventMediaItem | null> {
    const db = loadDb();
    const idx = db.eventMedia.findIndex((m) => m.id === mediaId);
    if (idx === -1) return null;
    db.eventMedia[idx] = {
      ...db.eventMedia[idx],
      caption: patch.caption !== undefined ? patch.caption.trim() : db.eventMedia[idx].caption,
      sortOrder: patch.sortOrder !== undefined ? patch.sortOrder : db.eventMedia[idx].sortOrder,
    };
    await persistDb(db);
    return db.eventMedia[idx];
  },

  async deleteEventMedia(mediaId: string): Promise<EventMediaItem | null> {
    const db = loadDb();
    const idx = db.eventMedia.findIndex((m) => m.id === mediaId);
    if (idx === -1) return null;
    const [removed] = db.eventMedia.splice(idx, 1);
    await persistDb(db);
    return removed;
  },

  async isMediaUrlReferencedElsewhere(url: string, excludeId?: string): Promise<boolean> {
    if (!url) return false;
    const db = loadDb();
    const s = db.siteSettings;
    if (
      s.heroMediaUrl === url ||
      s.logoUrl === url ||
      s.faviconUrl === url ||
      s.aboutImageUrl === url
    ) {
      return true;
    }
    if (
      db.portfolioItems.some(
        (item) => item.id !== excludeId && (item.mediaUrl === url || item.thumbnailUrl === url)
      )
    ) {
      return true;
    }
    if (
      db.events.some(
        (evt) => evt.id !== excludeId && (evt.coverImageUrl === url || evt.videoUrl === url)
      )
    ) {
      return true;
    }
    if (
      db.eventMedia.some(
        (m) => m.id !== excludeId && (m.mediaUrl === url || m.thumbnailUrl === url)
      )
    ) {
      return true;
    }
    const a = db.aboutPage;
    if (
      a.heroImageUrl === url ||
      a.storyImageUrl === url ||
      a.closingImageUrl === url
    ) {
      return true;
    }
    if (db.aboutServices.some((svc) => svc.id !== excludeId && svc.imageUrl === url)) {
      return true;
    }
    return false;
  },

  async getEnquiries(): Promise<Enquiry[]> {
    return [...loadDb().enquiries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async createEnquiry(input: {
    name: string;
    phone: string;
    serviceRequired: string;
    message: string;
  }): Promise<Enquiry> {
    const db = loadDb();
    const enquiry: Enquiry = {
      id: `enq_${crypto.randomUUID().slice(0, 10)}`,
      name: input.name.trim(),
      phone: input.phone.trim(),
      serviceRequired: input.serviceRequired.trim(),
      message: input.message.trim(),
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    db.enquiries.unshift(enquiry);
    await persistDb(db);
    return enquiry;
  },

  async updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<Enquiry | null> {
    const db = loadDb();
    const idx = db.enquiries.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    db.enquiries[idx] = { ...db.enquiries[idx], status };
    await persistDb(db);
    return db.enquiries[idx];
  },

  async deleteEnquiry(id: string): Promise<boolean> {
    const db = loadDb();
    const before = db.enquiries.length;
    db.enquiries = db.enquiries.filter((e) => e.id !== id);
    if (db.enquiries.length === before) return false;
    await persistDb(db);
    return true;
  },

  async findAdminByEmail(email: string): Promise<AdminUserRecord | null> {
    const normalized = email.trim().toLowerCase();
    return loadDb().adminUsers.find((u) => u.email.toLowerCase() === normalized) || null;
  },

  async findAdminById(id: string): Promise<AdminUserPublic | null> {
    const user = loadDb().adminUsers.find((u) => u.id === id);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  },

  async createSession(userId: string, token: string): Promise<void> {
    const db = loadDb();
    const now = Date.now();
    db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
    db.sessions.push({
      token,
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
    });
    await persistDb(db);
  },

  async getSessionUser(token: string): Promise<AdminUserPublic | null> {
    const db = loadDb();
    const now = Date.now();
    const session = db.sessions.find(
      (s) => s.token === token && new Date(s.expiresAt).getTime() > now
    );
    if (!session) return null;
    return this.findAdminById(session.userId);
  },

  async deleteSession(token: string): Promise<void> {
    const db = loadDb();
    db.sessions = db.sessions.filter((s) => s.token !== token);
    await persistDb(db);
  },

  async getOverviewStats() {
    const db = loadDb();
    const totalImages = db.portfolioItems.filter((i) => i.mediaType === 'image').length;
    const totalVideos = db.portfolioItems.filter((i) => i.mediaType === 'video').length;
    const publishedItems = db.portfolioItems.filter((i) => i.published).length;
    const draftItems = db.portfolioItems.length - publishedItems;
    const featuredItems = db.portfolioItems.filter((i) => i.featured).length;
    const totalEvents = db.events.length;
    const publishedEvents = db.events.filter((e) => e.published).length;
    const featuredEvents = db.events.filter((e) => e.featured).length;
    const newEnquiries = db.enquiries.filter((e) => e.status === 'new').length;
    return {
      totalImages,
      totalVideos,
      publishedItems,
      draftItems,
      featuredItems,
      totalEvents,
      publishedEvents,
      featuredEvents,
      newEnquiries,
      totalEnquiries: db.enquiries.length,
      totalCategories: db.categories.length,
    };
  },

  async getAboutPageData(publishedOnly = false): Promise<AboutPageData> {
    const db = loadDb();
    const services = [...db.aboutServices]
      .filter((svc) => (publishedOnly ? svc.published : true))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
    const processSteps = [...db.aboutProcessSteps]
      .filter((step) => (publishedOnly ? step.published : true))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      content: { ...db.aboutPage },
      services,
      processSteps,
    };
  },

  async updateAboutContent(
    patch: Partial<Omit<AboutPageContent, 'id' | 'updatedAt'>>
  ): Promise<AboutPageContent> {
    const db = loadDb();
    db.aboutPage = {
      ...db.aboutPage,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await persistDb(db);
    return { ...db.aboutPage };
  },

  async createAboutService(input: {
    title: string;
    description: string;
    imageUrl: string;
    published: boolean;
    sortOrder?: number;
  }): Promise<AboutServiceCategory> {
    const db = loadDb();
    const now = new Date().toISOString();
    const maxSort = db.aboutServices.reduce((max, s) => Math.max(max, s.sortOrder), 0);
    const created: AboutServiceCategory = {
      id: `about_svc_${crypto.randomUUID().slice(0, 8)}`,
      title: input.title.trim(),
      description: input.description.trim(),
      imageUrl: input.imageUrl.trim(),
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : maxSort + 1,
      published: Boolean(input.published),
      createdAt: now,
      updatedAt: now,
    };
    db.aboutServices.push(created);
    await persistDb(db);
    return created;
  },

  async updateAboutService(
    id: string,
    patch: Partial<
      Pick<AboutServiceCategory, 'title' | 'description' | 'imageUrl' | 'published' | 'sortOrder'>
    >
  ): Promise<AboutServiceCategory | null> {
    const db = loadDb();
    const idx = db.aboutServices.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    db.aboutServices[idx] = {
      ...db.aboutServices[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await persistDb(db);
    return db.aboutServices[idx];
  },

  async reorderAboutServices(orderedIds: string[]): Promise<AboutServiceCategory[]> {
    const db = loadDb();
    const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
    let tailOrder = orderedIds.length + 1;
    db.aboutServices = db.aboutServices
      .map((svc) => ({
        ...svc,
        sortOrder: orderMap.get(svc.id) ?? tailOrder++,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    await persistDb(db);
    return [...db.aboutServices];
  },

  async deleteAboutService(id: string): Promise<AboutServiceCategory | null> {
    const db = loadDb();
    const idx = db.aboutServices.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const [removed] = db.aboutServices.splice(idx, 1);
    await persistDb(db);
    return removed;
  },

  async createAboutProcessStep(input: {
    stepNumber: string;
    title: string;
    description: string;
    published: boolean;
    sortOrder?: number;
  }): Promise<AboutProcessStep> {
    const db = loadDb();
    const now = new Date().toISOString();
    const maxSort = db.aboutProcessSteps.reduce((max, s) => Math.max(max, s.sortOrder), 0);
    const created: AboutProcessStep = {
      id: `about_step_${crypto.randomUUID().slice(0, 8)}`,
      stepNumber: input.stepNumber.trim() || String(maxSort + 1).padStart(2, '0'),
      title: input.title.trim(),
      description: input.description.trim(),
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : maxSort + 1,
      published: Boolean(input.published),
      updatedAt: now,
    };
    db.aboutProcessSteps.push(created);
    await persistDb(db);
    return created;
  },

  async updateAboutProcessStep(
    id: string,
    patch: Partial<
      Pick<AboutProcessStep, 'stepNumber' | 'title' | 'description' | 'published' | 'sortOrder'>
    >
  ): Promise<AboutProcessStep | null> {
    const db = loadDb();
    const idx = db.aboutProcessSteps.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    db.aboutProcessSteps[idx] = {
      ...db.aboutProcessSteps[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await persistDb(db);
    return db.aboutProcessSteps[idx];
  },

  async reorderAboutProcessSteps(orderedIds: string[]): Promise<AboutProcessStep[]> {
    const db = loadDb();
    const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
    let tailOrder = orderedIds.length + 1;
    db.aboutProcessSteps = db.aboutProcessSteps
      .map((step) => {
        const nextOrder = orderMap.get(step.id) ?? tailOrder++;
        return {
          ...step,
          sortOrder: nextOrder,
          stepNumber: String(nextOrder).padStart(2, '0'),
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
    await persistDb(db);
    return [...db.aboutProcessSteps];
  },

  async deleteAboutProcessStep(id: string): Promise<boolean> {
    const db = loadDb();
    const before = db.aboutProcessSteps.length;
    db.aboutProcessSteps = db.aboutProcessSteps.filter((s) => s.id !== id);
    if (db.aboutProcessSteps.length === before) return false;
    await persistDb(db);
    return true;
  },
};

export const store: StudioStore = isMysqlConfigured() ? mysqlStore : localStore;
