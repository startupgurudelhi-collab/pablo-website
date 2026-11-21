import type {
  AdminOverviewStats,
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
} from '../types/studio';

const CMS_SYNC_CHANNEL = 'pablo-cms-sync';

export type CmsSyncScope =
  | 'portfolio'
  | 'events'
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
  method: 'POST' | 'PATCH',
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
