import type {
  AboutPageContent,
  AboutPageData,
  AboutProcessStep,
  AboutServiceCategory,
  AdminOverviewStats,
  AdminUserPublic,
  AspectRatioType,
  CollectionLayoutStyle,
  CollectionMediaItem,
  CollectionsOverviewStats,
  Enquiry,
  EnquiryStatus,
  EventMediaItem,
  LegalPage,
  LegalPageSlug,
  MediaType,
  OurWorkPageSettings,
  PortfolioCategory,
  PortfolioItem,
  SiteSettings,
  StudioEvent,
  WorkCollection,
} from '../types/studio';

const CMS_SYNC_CHANNEL = 'pablo-cms-sync';

export type CmsSyncScope =
  | 'portfolio'
  | 'collections'
  | 'events'
  | 'about'
  | 'settings'
  | 'legal'
  | 'enquiries'
  | 'all';

export function notifyCmsUpdated(scope: CmsSyncScope = 'all'): void {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CMS_SYNC_CHANNEL);
      channel.postMessage({ scope, timestamp: Date.now() });
      channel.close();
    }
  } catch {
    // Non-fatal in environments without BroadcastChannel
  }
}

export function subscribeCmsUpdates(onSync: (scope: CmsSyncScope) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') {
    return () => {};
  }
  try {
    const channel = new BroadcastChannel(CMS_SYNC_CHANNEL);
    channel.onmessage = (event: MessageEvent<{ scope?: CmsSyncScope }>) => {
      onSync(event.data?.scope || 'all');
    };
    return () => channel.close();
  } catch {
    return () => {};
  }
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options?.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  }
  return data as T;
}

function uploadWithProgress<T>(
  method: 'POST' | 'PATCH' | 'PUT',
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parsed as T);
        } else {
          reject(new Error(parsed.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during media upload.'));
    xhr.send(formData);
  });
}

// Public API
export async function fetchSiteData() {
  return requestJson<{ settings: SiteSettings; categories: PortfolioCategory[] }>('/api/public/site');
}

export async function fetchHomeData() {
  return requestJson<{
    settings: SiteSettings;
    categories: PortfolioCategory[];
    featuredItems: PortfolioItem[];
    recentItems: PortfolioItem[];
    featuredEvents: StudioEvent[];
  }>('/api/public/home');
}

export async function fetchPortfolio(params?: {
  category?: string;
  mediaType?: MediaType | 'all';
  featured?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== 'all') qs.set('category', params.category);
  if (params?.mediaType && params.mediaType !== 'all') qs.set('mediaType', params.mediaType);
  if (params?.featured) qs.set('featured', 'true');
  const query = qs.toString();
  return requestJson<{ items: PortfolioItem[]; categories: PortfolioCategory[] }>(
    `/api/public/portfolio${query ? `?${query}` : ''}`
  );
}

export async function fetchPublicEvents(params?: { category?: string; featured?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== 'all') qs.set('category', params.category);
  if (params?.featured) qs.set('featured', 'true');
  const query = qs.toString();
  return requestJson<{ events: StudioEvent[]; categories: string[] }>(
    `/api/public/events${query ? `?${query}` : ''}`
  );
}

export async function submitEnquiry(payload: {
  name: string;
  phone: string;
  serviceRequired: string;
  message: string;
}) {
  const res = await requestJson<{ message: string; enquiryId: string }>('/api/public/enquiries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('enquiries');
  return res;
}

export async function fetchPublicLegalPages() {
  return requestJson<{
    pages: Array<{ slug: LegalPageSlug; title: string; lastRevisedDate: string }>;
  }>('/api/public/legal');
}

export async function fetchPublicLegalPage(slug: LegalPageSlug) {
  return requestJson<{ page: LegalPage }>(`/api/public/legal/${slug}`);
}

export async function fetchPublicAbout() {
  return requestJson<AboutPageData>('/api/public/about');
}

export async function fetchPublicCollections() {
  return requestJson<{ pageSettings: OurWorkPageSettings; collections: WorkCollection[] }>(
    '/api/public/collections'
  );
}

export async function fetchPublicCollectionBySlug(slug: string) {
  return requestJson<{ pageSettings: OurWorkPageSettings; collection: WorkCollection }>(
    `/api/public/collections/${encodeURIComponent(slug)}`
  );
}

// Auth API
export async function loginAdmin(email: string, password: string) {
  return requestJson<{ user: AdminUserPublic }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutAdmin() {
  return requestJson<{ ok: boolean }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getAdminSession() {
  return requestJson<{ authenticated: boolean; user: AdminUserPublic }>('/api/auth/me');
}

// Admin API
export async function getAdminOverview() {
  return requestJson<AdminOverviewStats>('/api/admin/overview');
}

export async function getAdminPortfolio() {
  return requestJson<{ items: PortfolioItem[]; categories: PortfolioCategory[] }>(
    '/api/admin/portfolio'
  );
}

export async function uploadPortfolioItem(
  payload: {
    file: File;
    thumbnailBlob?: Blob | null;
    title: string;
    description: string;
    categoryId: string;
    aspectRatio: AspectRatioType;
    featured: boolean;
    published: boolean;
  },
  onProgress?: (percent: number) => void
) {
  const form = new FormData();
  form.append('media', payload.file);
  if (payload.thumbnailBlob) {
    form.append('thumbnail', payload.thumbnailBlob, 'thumb.webp');
  }
  form.append('title', payload.title);
  form.append('description', payload.description);
  form.append('categoryId', payload.categoryId);
  form.append('aspectRatio', payload.aspectRatio);
  form.append('featured', String(payload.featured));
  form.append('published', String(payload.published));

  const res = await uploadWithProgress<{ item: PortfolioItem }>(
    'POST',
    '/api/admin/portfolio',
    form,
    onProgress
  );
  notifyCmsUpdated('portfolio');
  return res;
}

export async function updatePortfolioItem(
  id: string,
  payload: {
    title?: string;
    description?: string;
    categoryId?: string;
    aspectRatio?: AspectRatioType;
    featured?: boolean;
    published?: boolean;
    file?: File;
    thumbnailBlob?: Blob | null;
  },
  onProgress?: (percent: number) => void
) {
  if (payload.file || payload.thumbnailBlob) {
    const form = new FormData();
    if (payload.file) form.append('media', payload.file);
    if (payload.thumbnailBlob) form.append('thumbnail', payload.thumbnailBlob, 'thumb.webp');
    if (payload.title !== undefined) form.append('title', payload.title);
    if (payload.description !== undefined) form.append('description', payload.description);
    if (payload.categoryId !== undefined) form.append('categoryId', payload.categoryId);
    if (payload.aspectRatio !== undefined) form.append('aspectRatio', payload.aspectRatio);
    if (payload.featured !== undefined) form.append('featured', String(payload.featured));
    if (payload.published !== undefined) form.append('published', String(payload.published));
    const res = await uploadWithProgress<{ item: PortfolioItem }>(
      'PATCH',
      `/api/admin/portfolio/${id}`,
      form,
      onProgress
    );
    notifyCmsUpdated('portfolio');
    return res;
  }

  const res = await requestJson<{ item: PortfolioItem }>(`/api/admin/portfolio/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('portfolio');
  return res;
}

export async function deletePortfolioItem(id: string) {
  const res = await requestJson<{ deleted: boolean; id: string }>(`/api/admin/portfolio/${id}`, {
    method: 'DELETE',
  });
  notifyCmsUpdated('portfolio');
  return res;
}

// Admin Events API
export async function getAdminEvents() {
  return requestJson<{ events: StudioEvent[] }>('/api/admin/events');
}

export async function createEvent(
  payload: {
    title: string;
    description: string;
    eventDate: string;
    location: string;
    category: string;
    coverFile?: File | null;
    coverImageUrl?: string;
    videoFile?: File | null;
    videoUrl?: string;
    featured: boolean;
    published: boolean;
  },
  onProgress?: (percent: number) => void
) {
  const form = new FormData();
  form.append('title', payload.title);
  form.append('description', payload.description);
  form.append('eventDate', payload.eventDate);
  form.append('location', payload.location);
  form.append('category', payload.category);
  form.append('featured', String(payload.featured));
  form.append('published', String(payload.published));
  if (payload.coverFile) form.append('cover', payload.coverFile);
  if (payload.coverImageUrl) form.append('coverImageUrl', payload.coverImageUrl);
  if (payload.videoFile) form.append('video', payload.videoFile);
  if (payload.videoUrl !== undefined) form.append('videoUrl', payload.videoUrl);

  const res = await uploadWithProgress<{ event: StudioEvent }>('POST', '/api/admin/events', form, onProgress);
  notifyCmsUpdated('events');
  return res;
}

export async function updateEvent(
  id: string,
  payload: {
    title?: string;
    description?: string;
    eventDate?: string;
    location?: string;
    category?: string;
    coverFile?: File | null;
    coverImageUrl?: string;
    videoFile?: File | null;
    videoUrl?: string;
    featured?: boolean;
    published?: boolean;
  },
  onProgress?: (percent: number) => void
) {
  if (payload.coverFile || payload.videoFile) {
    const form = new FormData();
    if (payload.title !== undefined) form.append('title', payload.title);
    if (payload.description !== undefined) form.append('description', payload.description);
    if (payload.eventDate !== undefined) form.append('eventDate', payload.eventDate);
    if (payload.location !== undefined) form.append('location', payload.location);
    if (payload.category !== undefined) form.append('category', payload.category);
    if (payload.featured !== undefined) form.append('featured', String(payload.featured));
    if (payload.published !== undefined) form.append('published', String(payload.published));
    if (payload.coverFile) form.append('cover', payload.coverFile);
    if (payload.coverImageUrl !== undefined) form.append('coverImageUrl', payload.coverImageUrl);
    if (payload.videoFile) form.append('video', payload.videoFile);
    if (payload.videoUrl !== undefined) form.append('videoUrl', payload.videoUrl);

    const res = await uploadWithProgress<{ event: StudioEvent }>(
      'PATCH',
      `/api/admin/events/${id}`,
      form,
      onProgress
    );
    notifyCmsUpdated('events');
    return res;
  }

  const res = await requestJson<{ event: StudioEvent }>(`/api/admin/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('events');
  return res;
}

export async function deleteEvent(id: string) {
  const res = await requestJson<{ deleted: boolean; id: string }>(`/api/admin/events/${id}`, {
    method: 'DELETE',
  });
  notifyCmsUpdated('events');
  return res;
}

export async function uploadEventMedia(
  eventId: string,
  files: Array<{ file: File; thumbnailBlob?: Blob | null; caption?: string }>,
  onProgress?: (percent: number) => void
) {
  const form = new FormData();
  const captions: string[] = [];
  for (const entry of files) {
    form.append('media', entry.file);
    if (entry.thumbnailBlob) {
      form.append('thumbnails', entry.thumbnailBlob, 'thumb.webp');
    }
    captions.push(entry.caption || '');
  }
  form.append('captions', JSON.stringify(captions));

  const res = await uploadWithProgress<{ media: EventMediaItem[] }>(
    'POST',
    `/api/admin/events/${eventId}/media`,
    form,
    onProgress
  );
  notifyCmsUpdated('events');
  return res;
}

export async function deleteEventMedia(mediaId: string) {
  const res = await requestJson<{ deleted: boolean; id: string }>(`/api/admin/event-media/${mediaId}`, {
    method: 'DELETE',
  });
  notifyCmsUpdated('events');
  return res;
}

// Categories API
export async function createCategory(payload: { name: string; description?: string }) {
  const res = await requestJson<{ category: PortfolioCategory }>('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('portfolio');
  return res;
}

export async function updateCategory(
  id: string,
  payload: { name?: string; description?: string; sortOrder?: number }
) {
  const res = await requestJson<{ category: PortfolioCategory }>(`/api/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('portfolio');
  return res;
}

export async function deleteCategory(id: string) {
  const res = await requestJson<{ deleted: boolean }>(`/api/admin/categories/${id}`, {
    method: 'DELETE',
  });
  notifyCmsUpdated('portfolio');
  return res;
}

// Settings & Media
export async function getAdminSettings() {
  return requestJson<{ settings: SiteSettings }>('/api/admin/settings');
}

export async function updateAdminSettings(payload: Partial<SiteSettings>) {
  const res = await requestJson<{ settings: SiteSettings }>('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('settings');
  return res;
}

export async function uploadStandaloneMedia(file: File, onProgress?: (percent: number) => void) {
  const form = new FormData();
  form.append('media', file);
  return uploadWithProgress<{ url: string; mediaType: MediaType }>(
    'POST',
    '/api/admin/media',
    form,
    onProgress
  );
}

// Enquiries
export async function getAdminEnquiries() {
  return requestJson<{ enquiries: Enquiry[] }>('/api/admin/enquiries');
}

export async function updateEnquiryStatus(id: string, status: EnquiryStatus) {
  const res = await requestJson<{ enquiry: Enquiry }>(`/api/admin/enquiries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  notifyCmsUpdated('enquiries');
  return res;
}

export async function deleteEnquiry(id: string) {
  const res = await requestJson<{ deleted: boolean }>(`/api/admin/enquiries/${id}`, {
    method: 'DELETE',
  });
  notifyCmsUpdated('enquiries');
  return res;
}

// Legal Pages API
export async function getAdminLegalPages() {
  return requestJson<{ pages: LegalPage[] }>('/api/admin/legal');
}

export async function updateAdminLegalPage(
  slug: LegalPageSlug,
  payload: Partial<
    Pick<LegalPage, 'title' | 'content' | 'seoTitle' | 'seoDescription' | 'published' | 'lastRevisedDate'>
  >
) {
  const res = await requestJson<{ page: LegalPage }>(`/api/admin/legal/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('legal');
  return res;
}

// About Page CMS API
export async function getAdminAbout() {
  return requestJson<AboutPageData>('/api/admin/about');
}

export async function updateAdminAboutContent(
  payload: Partial<Omit<AboutPageContent, 'id' | 'updatedAt'>>
) {
  const res = await requestJson<{ content: AboutPageContent }>('/api/admin/about/content', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('about');
  return res;
}

export async function createAboutService(
  payload: {
    title: string;
    description: string;
    coverFile?: File | null;
    imageUrl?: string;
    published: boolean;
  },
  onProgress?: (percent: number) => void
) {
  const form = new FormData();
  form.append('title', payload.title);
  form.append('description', payload.description);
  form.append('published', String(payload.published));
  if (payload.coverFile) form.append('cover', payload.coverFile);
  if (payload.imageUrl) form.append('imageUrl', payload.imageUrl);

  const res = await uploadWithProgress<{ service: AboutServiceCategory }>(
    'POST',
    '/api/admin/about/services',
    form,
    onProgress
  );
  notifyCmsUpdated('about');
  return res;
}

export async function updateAboutService(
  id: string,
  payload: {
    title?: string;
    description?: string;
    coverFile?: File | null;
    imageUrl?: string;
    published?: boolean;
    sortOrder?: number;
  },
  onProgress?: (percent: number) => void
) {
  if (payload.coverFile) {
    const form = new FormData();
    if (payload.title !== undefined) form.append('title', payload.title);
    if (payload.description !== undefined) form.append('description', payload.description);
    if (payload.published !== undefined) form.append('published', String(payload.published));
    if (payload.sortOrder !== undefined) form.append('sortOrder', String(payload.sortOrder));
    form.append('cover', payload.coverFile);

    const res = await uploadWithProgress<{ service: AboutServiceCategory }>(
      'PATCH',
      `/api/admin/about/services/${id}`,
      form,
      onProgress
    );
    notifyCmsUpdated('about');
    return res;
  }

  const res = await requestJson<{ service: AboutServiceCategory }>(`/api/admin/about/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('about');
  return res;
}

export async function reorderAboutServices(orderedIds: string[]) {
  const res = await requestJson<{ services: AboutServiceCategory[] }>(
    '/api/admin/about/services/reorder',
    {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    }
  );
  notifyCmsUpdated('about');
  return res;
}

export async function deleteAboutService(id: string) {
  const res = await requestJson<{ deleted: boolean; id: string }>(`/api/admin/about/services/${id}`, {
    method: 'DELETE',
  });
  notifyCmsUpdated('about');
  return res;
}

export async function createAboutProcessStep(payload: {
  stepNumber: string;
  title: string;
  description: string;
  published: boolean;
}) {
  const res = await requestJson<{ step: AboutProcessStep }>('/api/admin/about/process', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('about');
  return res;
}

export async function updateAboutProcessStep(
  id: string,
  payload: Partial<Pick<AboutProcessStep, 'stepNumber' | 'title' | 'description' | 'published' | 'sortOrder'>>
) {
  const res = await requestJson<{ step: AboutProcessStep }>(`/api/admin/about/process/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('about');
  return res;
}

export async function reorderAboutProcessSteps(orderedIds: string[]) {
  const res = await requestJson<{ processSteps: AboutProcessStep[] }>(
    '/api/admin/about/process/reorder',
    {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    }
  );
  notifyCmsUpdated('about');
  return res;
}

export async function deleteAboutProcessStep(id: string) {
  const res = await requestJson<{ deleted: boolean }>(`/api/admin/about/process/${id}`, {
    method: 'DELETE',
  });
  notifyCmsUpdated('about');
  return res;
}

// Our Work & Collections CMS API
export async function getAdminCollections() {
  return requestJson<{
    stats: CollectionsOverviewStats;
    pageSettings: OurWorkPageSettings;
    collections: WorkCollection[];
  }>('/api/admin/collections');
}

export async function updateOurWorkSettings(
  payload: Partial<Omit<OurWorkPageSettings, 'id' | 'updatedAt'>> & {
    introImageFile?: File | null;
    promoImageFile?: File | null;
  },
  onProgress?: (percent: number) => void
) {
  if (payload.introImageFile || payload.promoImageFile) {
    const form = new FormData();
    if (payload.introHeading !== undefined) form.append('introHeading', payload.introHeading);
    if (payload.introSubtitle !== undefined) form.append('introSubtitle', payload.introSubtitle);
    if (payload.introImageUrl !== undefined) form.append('introImageUrl', payload.introImageUrl);
    if (payload.promoVisible !== undefined) form.append('promoVisible', String(payload.promoVisible));
    if (payload.promoHeading !== undefined) form.append('promoHeading', payload.promoHeading);
    if (payload.promoDescription !== undefined) {
      form.append('promoDescription', payload.promoDescription);
    }
    if (payload.promoImageUrl !== undefined) form.append('promoImageUrl', payload.promoImageUrl);
    if (payload.promoButtonText !== undefined) {
      form.append('promoButtonText', payload.promoButtonText);
    }
    if (payload.promoButtonUrl !== undefined) {
      form.append('promoButtonUrl', payload.promoButtonUrl);
    }
    if (payload.introImageFile) form.append('introImage', payload.introImageFile);
    if (payload.promoImageFile) form.append('promoImage', payload.promoImageFile);

    const res = await uploadWithProgress<{ pageSettings: OurWorkPageSettings }>(
      'PUT',
      '/api/admin/collections/settings',
      form,
      onProgress
    );
    notifyCmsUpdated('collections');
    return res;
  }

  const res = await requestJson<{ pageSettings: OurWorkPageSettings }>(
    '/api/admin/collections/settings',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  notifyCmsUpdated('collections');
  return res;
}

export async function createWorkCollection(
  payload: {
    title: string;
    slug?: string;
    description: string;
    coverFile?: File | null;
    coverImageUrl?: string;
    layoutStyle: CollectionLayoutStyle;
    previewLimit: number;
    published: boolean;
  },
  onProgress?: (percent: number) => void
) {
  const form = new FormData();
  form.append('title', payload.title);
  if (payload.slug) form.append('slug', payload.slug);
  form.append('description', payload.description);
  form.append('layoutStyle', payload.layoutStyle);
  form.append('previewLimit', String(payload.previewLimit));
  form.append('published', String(payload.published));
  if (payload.coverFile) form.append('cover', payload.coverFile);
  if (payload.coverImageUrl) form.append('coverImageUrl', payload.coverImageUrl);

  const res = await uploadWithProgress<{ collection: WorkCollection }>(
    'POST',
    '/api/admin/collections',
    form,
    onProgress
  );
  notifyCmsUpdated('collections');
  return res;
}

export async function updateWorkCollection(
  id: string,
  payload: {
    title?: string;
    slug?: string;
    description?: string;
    coverFile?: File | null;
    coverImageUrl?: string;
    layoutStyle?: CollectionLayoutStyle;
    previewLimit?: number;
    published?: boolean;
    sortOrder?: number;
  },
  onProgress?: (percent: number) => void
) {
  if (payload.coverFile) {
    const form = new FormData();
    if (payload.title !== undefined) form.append('title', payload.title);
    if (payload.slug !== undefined) form.append('slug', payload.slug);
    if (payload.description !== undefined) form.append('description', payload.description);
    if (payload.layoutStyle !== undefined) form.append('layoutStyle', payload.layoutStyle);
    if (payload.previewLimit !== undefined) {
      form.append('previewLimit', String(payload.previewLimit));
    }
    if (payload.published !== undefined) form.append('published', String(payload.published));
    if (payload.sortOrder !== undefined) form.append('sortOrder', String(payload.sortOrder));
    form.append('cover', payload.coverFile);

    const res = await uploadWithProgress<{ collection: WorkCollection }>(
      'PATCH',
      `/api/admin/collections/${id}`,
      form,
      onProgress
    );
    notifyCmsUpdated('collections');
    return res;
  }

  const res = await requestJson<{ collection: WorkCollection }>(`/api/admin/collections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  notifyCmsUpdated('collections');
  return res;
}

export async function reorderWorkCollections(orderedIds: string[]) {
  const res = await requestJson<{ collections: WorkCollection[] }>(
    '/api/admin/collections/reorder',
    {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    }
  );
  notifyCmsUpdated('collections');
  return res;
}

export async function deleteWorkCollection(id: string) {
  const res = await requestJson<{ deleted: boolean; id: string }>(`/api/admin/collections/${id}`, {
    method: 'DELETE',
  });
  notifyCmsUpdated('collections');
  return res;
}

export async function uploadCollectionMedia(
  collectionId: string,
  files: Array<{
    file: File;
    thumbnailBlob?: Blob | null;
    aspectRatio?: AspectRatioType;
    caption?: string;
    creationDetails?: string;
    published?: boolean;
  }>,
  onProgress?: (percent: number) => void
) {
  const form = new FormData();
  const captions: string[] = [];
  const creationDetailsList: string[] = [];
  const aspectRatios: AspectRatioType[] = [];
  const publishedFlags: boolean[] = [];
  const hasThumbnails: boolean[] = [];

  for (const entry of files) {
    form.append('media', entry.file);
    if (entry.thumbnailBlob) {
      form.append('thumbnails', entry.thumbnailBlob, 'thumb.webp');
      hasThumbnails.push(true);
    } else {
      hasThumbnails.push(false);
    }
    captions.push(entry.caption || '');
    creationDetailsList.push(entry.creationDetails || '');
    aspectRatios.push(entry.aspectRatio || 'portrait');
    publishedFlags.push(entry.published !== undefined ? entry.published : true);
  }

  form.append('captions', JSON.stringify(captions));
  form.append('creationDetailsList', JSON.stringify(creationDetailsList));
  form.append('aspectRatios', JSON.stringify(aspectRatios));
  form.append('publishedFlags', JSON.stringify(publishedFlags));
  form.append('hasThumbnails', JSON.stringify(hasThumbnails));

  const res = await uploadWithProgress<{ media: CollectionMediaItem[] }>(
    'POST',
    `/api/admin/collections/${collectionId}/media`,
    form,
    onProgress
  );
  notifyCmsUpdated('collections');
  return res;
}

export async function updateCollectionMedia(
  mediaId: string,
  payload: Partial<
    Pick<
      CollectionMediaItem,
      'caption' | 'creationDetails' | 'aspectRatio' | 'sortOrder' | 'published'
    >
  >
) {
  const res = await requestJson<{ media: CollectionMediaItem }>(
    `/api/admin/collection-media/${mediaId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
  notifyCmsUpdated('collections');
  return res;
}

export async function reorderCollectionMedia(collectionId: string, orderedIds: string[]) {
  const res = await requestJson<{ media: CollectionMediaItem[] }>(
    `/api/admin/collections/${collectionId}/media/reorder`,
    {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    }
  );
  notifyCmsUpdated('collections');
  return res;
}

export async function deleteCollectionMedia(mediaId: string) {
  const res = await requestJson<{ deleted: boolean; id: string }>(
    `/api/admin/collection-media/${mediaId}`,
    {
      method: 'DELETE',
    }
  );
  notifyCmsUpdated('collections');
  return res;
}

