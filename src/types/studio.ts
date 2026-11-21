export type MediaType = 'image' | 'video';
export type AspectRatioType = 'portrait' | 'landscape' | 'square';
export type EnquiryStatus = 'new' | 'reviewed' | 'archived';
export type LegalPageSlug = 'privacy-policy' | 'terms-and-conditions';

export interface PortfolioCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string;
  aspectRatio: AspectRatioType;
  categoryId: string;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventMediaItem {
  id: string;
  eventId: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnailUrl: string;
  caption: string;
  sortOrder: number;
  createdAt: string;
}

export interface StudioEvent {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  category: string;
  coverImageUrl: string;
  videoUrl: string;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  media?: EventMediaItem[];
}

export interface LegalPage {
  id: string;
  slug: LegalPageSlug;
  title: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  published: boolean;
  lastRevisedDate: string;
  updatedAt: string;
}

export interface NavLabels {
  home: string;
  work: string;
  events: string;
  about: string;
  contact: string;
  cta: string;
}

export interface SocialLinks {
  instagram: string;
  whatsapp: string;
  facebook: string;
  pinterest: string;
  youtube: string;
}

export interface SiteSettings {
  id: string;
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  seoTitle: string;
  seoDescription: string;
  heroMediaUrl: string;
  heroMediaType: MediaType;
  heroHeadline: string;
  heroSubheadline: string;
  heroDescription: string;
  heroPrimaryCtaText: string;
  heroPrimaryCtaUrl: string;
  heroSecondaryCtaText: string;
  heroSecondaryCtaUrl: string;
  homeIntroKicker: string;
  homeIntroHeadline: string;
  homeCtaHeadline: string;
  homeCtaDescription: string;
  homeCtaButtonText: string;
  homeCtaButtonUrl: string;
  aboutHeadline: string;
  aboutContent: string;
  aboutCraftNote: string;
  aboutImageUrl: string;
  aboutImageType: MediaType;
  contactHeadline: string;
  contactIntro: string;
  contactFormHeading: string;
  contactFormDescription: string;
  contactFormButtonText: string;
  contactServices: string[];
  contactPhone: string;
  whatsappNumber: string;
  contactEmail: string;
  instagramUrl: string;
  address: string;
  studioHours: string;
  footerDescription: string;
  footerCopyright: string;
  navLabels: NavLabels;
  socialLinks: SocialLinks;
  updatedAt: string;
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  serviceRequired: string;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
}

export interface AdminUserPublic {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AdminOverviewStats {
  totalImages: number;
  totalVideos: number;
  publishedItems: number;
  draftItems: number;
  featuredItems: number;
  totalEvents: number;
  publishedEvents: number;
  featuredEvents: number;
  newEnquiries: number;
  totalEnquiries: number;
  totalCategories: number;
}
