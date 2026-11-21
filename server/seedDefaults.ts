import { INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD } from './config.ts';
import { hashPassword } from './auth.ts';
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

export interface AdminUserRecord extends AdminUserPublic {
  passwordHash: string;
  updatedAt: string;
}

export interface AdminSessionRecord {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface DatabaseSchema {
  adminUsers: AdminUserRecord[];
  categories: PortfolioCategory[];
  portfolioItems: PortfolioItem[];
  events: StudioEvent[];
  eventMedia: EventMediaItem[];
  legalPages: LegalPage[];
  siteSettings: SiteSettings;
  aboutPage: AboutPageContent;
  aboutServices: AboutServiceCategory[];
  aboutProcessSteps: AboutProcessStep[];
  enquiries: Enquiry[];
  sessions: AdminSessionRecord[];
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'category'
  );
}

export function createDefaultLegalPages(now: string): LegalPage[] {
  const today = now.slice(0, 10);

  return [
    {
      id: 'legal_privacy_policy',
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      seoTitle: 'Privacy Policy — PABLO Fashion Studio',
      seoDescription:
        'Learn how PABLO Fashion Design & Custom Stitching Studio handles enquiry details, studio photographs, cookies, and privacy requests.',
      published: true,
      lastRevisedDate: today,
      updatedAt: now,
      content: `## 1. Introduction
PABLO ("we", "our", or "the Studio") respects your privacy and is committed to protecting personal information shared with us through our website and studio enquiries. This Privacy Policy explains how information is collected, used, stored, and safeguarded in accordance with applicable Indian data protection principles.

[Owner Note: Insert legal entity or proprietor name and studio city before final publication if desired.]

## 2. Information We Collect
We collect only the information necessary to showcase our studio work, respond to client enquiries, and administer the website. We do not purchase commercial contact lists or operate automated background profiling.

## 3. Personal Information Submitted Through Enquiry Forms
When you submit an enquiry through our Contact page, we collect the details you voluntarily provide:
- Full name
- Phone or WhatsApp contact number
- Selected service category (such as custom stitching, occasion wear, or embroidery detailing)
- Your message, fitting notes, or preferred dates

## 4. Contact and Communication Information
If you choose to reach out directly via telephone, email, WhatsApp, or social media channels listed on our website, we may retain relevant correspondence and appointment notes solely to coordinate your consultation, design, or fitting request.

## 5. How We Use Collected Information
Information provided to PABLO is used strictly to:
- Respond to bespoke garment, stitching, and consultation enquiries
- Schedule studio visits, measurements, and garment fittings
- Maintain internal records of active studio enquiries and service requests
- Improve the clarity and reliability of our website

## 6. How We Handle Uploaded Photographs and Media
Photographs and videos displayed in Our Work and Events are curated and published by PABLO studio administrators. Client reference images shared privately during consultations or fittings are used strictly for design and tailoring reference and are not published on our portfolio without explicit client consent.

## 7. Cookies and Website Analytics
PABLO does not use third-party advertising trackers, behavioral profiling pixels, or marketing cookies on public visitor pages. The website uses strictly necessary HTTP-only session cookies solely for authenticated studio administrators accessing the protected management dashboard.

## 8. Data Storage and Security
Enquiry submissions and studio records are stored on controlled application storage with restricted administrative access, hashed administrator credentials, and input validation. While no digital transmission is completely risk-free, we maintain reasonable technical and organizational safeguards to prevent unauthorized access.

## 9. Sharing of Information
We do not sell, rent, or trade your personal information to third parties. Information is accessed only by authorized studio personnel and, where necessary, trusted infrastructure or delivery partners directly supporting studio operations under confidentiality obligations.

## 10. Third-Party Services and External Links
Our website may display optional links to external platforms such as WhatsApp or Instagram when configured by the Studio. Clicking these external links directs you to services governed by their own independent privacy policies, over which PABLO has no control.

## 11. Data Retention
Client enquiry records are retained only for as long as needed to address your consultation, manage ongoing tailoring services, or comply with applicable legal obligations. Enquiries may be archived or deleted upon request or after serving their purpose.

## 12. User Rights and Privacy Requests
You may request access to, correction of, or deletion of personal enquiry details you have submitted to PABLO. We will review and respond to reasonable requests within a timely manner.

## 13. Policy Updates
PABLO may revise this Privacy Policy periodically to reflect studio practices or legal updates. Any modifications will be published on this page with an updated revision date.

## 14. Contact Information for Privacy-Related Queries
For questions regarding this Privacy Policy or to request updates or deletion of your enquiry information, please reach out through our Contact page or using the details below:
- Studio Name: PABLO
- Email: [Insert Privacy / Studio Email]
- Phone / WhatsApp: [Insert Studio Contact Number]
- Address: [Insert Studio City / Address, India]`,
    },
    {
      id: 'legal_terms_conditions',
      slug: 'terms-and-conditions',
      title: 'Terms & Conditions',
      seoTitle: 'Terms & Conditions — PABLO Fashion Studio',
      seoDescription:
        'Review the Terms & Conditions governing website use, bespoke fashion design, custom stitching commissions, fittings, and intellectual property at PABLO.',
      published: true,
      lastRevisedDate: today,
      updatedAt: now,
      content: `## 1. Introduction and Acceptance of Terms
Welcome to PABLO ("the Studio", "we", "our"). By accessing or browsing this website, or by submitting an enquiry for fashion design or custom stitching services, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, please refrain from using the website.

## 2. Website Purpose and Permitted Use
This website serves as a visual portfolio and studio showcase for PABLO. It is intended for viewing studio creations, exploring events, learning about our craft, and submitting genuine client enquiries. Automated scraping, unauthorized reproduction, or disruptive technical interference is prohibited.

## 3. Fashion Design and Custom Stitching Services
All custom outfits, occasion wear, event fashion, and embroidery commissions are undertaken on a bespoke, made-to-order basis following direct consultation. Submitting an online enquiry does not constitute a confirmed order until scope, fabric, timelines, and measurements are confirmed by the Studio.

## 4. Custom Design and Measurement Requirements
Accurate measurements and timely participation in scheduled fittings are essential to bespoke tailoring. Where measurements are taken at the Studio or provided remotely by the client, the client is responsible for confirming accuracy and communicating any fit preferences prior to final stitching.

## 5. Design Approval and Customer Confirmations
Before cutting fabric or commencing intricate handwork, design silhouettes, textile choices, trims, and detailing are reviewed with the client. Once a design specification is approved, substantial structural changes may affect timelines and agreed estimates.

## 6. Pricing and Payment Terms
Pricing for custom commissions depends on garment complexity, textiles, embroidery density, and craftsmanship hours.
- [Owner Confirmation Required: Insert advance booking deposit terms, milestone payment schedule, and final settlement policy before delivery.]
- Applicable taxes and additional customization charges, if any, will be communicated clearly prior to order confirmation.

## 7. Changes and Cancellations
Because custom garments are individually drafted and cut per client specifications:
- [Owner Confirmation Required: Insert policy regarding design modification windows, cancellation eligibility prior to fabric cutting, and handling of advance payments.]

## 8. Delivery and Collection Arrangements
Estimated completion dates are shared upon order confirmation and depend on fitting availability and craft intricacy.
- [Owner Confirmation Required: Insert studio trial/pickup procedures, courier or shipping responsibility if applicable, and post-delivery alteration terms.]

## 9. Variations in Fabric, Colour, Design and Appearance
Natural textiles such as raw silk, handwoven linen, organza, and wool possess organic variations in weave, texture, and sheen. Due to screen calibration differences and studio lighting, actual fabric colours and surface finishes may vary slightly from photographs or videos displayed on this website.

## 10. Intellectual Property and Website Content
All original garment designs, sketches, pattern work, text, brand marks, photographs, and studio films published on this website remain the intellectual property of PABLO unless otherwise stated. No content may be copied, republished, or used commercially without prior written permission.

## 11. Photography and Portfolio Display
Portfolio images and event media represent the Studio's bespoke craft. Where client-worn garments or event moments are featured, they are displayed respectfully in accordance with client permissions.

## 12. User-Submitted Content
If you share reference photographs, inspiration notes, or descriptions through enquiries or consultations, you confirm that you have the right to share those materials and grant PABLO permission to review them solely for executing your design enquiry.

## 13. Limitation of Liability
To the fullest extent permitted by applicable law, PABLO shall not be liable for indirect, incidental, or consequential losses arising from temporary website unavailability, delays caused by circumstances beyond reasonable control, or third-party communication interruptions.

## 14. External Links
Links to third-party platforms (such as Instagram or WhatsApp) are provided strictly for convenience. PABLO does not endorse or assume responsibility for external websites, their availability, or their practices.

## 15. Changes to Terms
We reserve the right to update these Terms & Conditions at any time. Revisions take effect upon publication on this page with an updated revision date.

## 16. Governing Law and Jurisdiction
These Terms & Conditions are governed by and construed in accordance with the laws of India. Any disputes arising from website use or studio engagements shall be subject to the exclusive jurisdiction of the competent courts in [Insert City / State, India].

## 17. Contact Information
For questions regarding these Terms & Conditions or bespoke studio bookings, please contact us via our Contact page or at:
- Studio Name: PABLO
- Email: [Insert Studio Email]
- Phone / WhatsApp: [Insert Studio Contact Number]
- Address: [Insert Studio Address, India]`,
    },
  ];
}

export function createDefaultSiteSettings(now: string): SiteSettings {
  return {
    id: 'default',
    brandName: 'PABLO',
    logoUrl: '',
    faviconUrl: '',
    seoTitle: 'PABLO — Fashion Design & Custom Stitching Studio',
    seoDescription:
      'PABLO is a bespoke fashion design and custom stitching studio crafting individual occasion wear, tailored silhouettes, and artisanal hand embroidery.',
    heroMediaUrl: '/src/assets/images/hero_pablo_atelier_1795009473187.jpg',
    heroMediaType: 'image',
    heroHeadline: 'Designed to be different.',
    heroSubheadline: 'Fashion Design & Custom Stitching Studio',
    heroDescription:
      'An independent atelier creating bespoke garments, sculpted occasion wear, and hand-finished silhouettes tailored to individual form.',
    heroPrimaryCtaText: 'Explore Our Work',
    heroPrimaryCtaUrl: '/work',
    heroSecondaryCtaText: 'Request a Custom Piece',
    heroSecondaryCtaUrl: '/contact',
    homeIntroKicker: 'Studio Practice',
    homeIntroHeadline: 'Tailoring built around form and permanence.',
    homeCtaHeadline: 'Commission a bespoke outfit with PABLO.',
    homeCtaDescription:
      'Share your occasion, fabric direction, or timeline with our studio team to schedule a personal consultation.',
    homeCtaButtonText: 'Send Enquiry',
    homeCtaButtonUrl: '/contact',
    aboutHeadline: 'Crafted around the individual, never the assembly line.',
    aboutContent:
      'PABLO is a fashion design and custom stitching studio grounded in discipline, proportion, and quiet individuality. Each commission begins with a private dialogue—studying movement, fabric weight, and occasion—before patterns are drafted by hand.\n\nFrom sculptural occasion wear and contemporary event ensembles to razor-sharp tailoring and delicate surface embroidery, our studio treats every stitch as permanent architecture.',
    aboutCraftNote:
      'Private fittings, custom pattern drafting, occasion couture, and hand embroidery by appointment.',
    aboutImageUrl: '/src/assets/images/hero_pablo_atelier_1795009473187.jpg',
    aboutImageType: 'image',
    contactHeadline: 'Begin a conversation with the atelier.',
    contactIntro:
      'Whether commissioning an occasion gown, tailored ensemble, or custom detailing, share your details and our studio will respond personally.',
    contactFormHeading: 'Studio Enquiry',
    contactFormDescription:
      'Tell us about your outfit, occasion date, or bespoke requirement.',
    contactFormButtonText: 'Submit Enquiry',
    contactServices: [
      'Custom Stitching',
      'Designer Outfit',
      'Occasion Wear',
      'Event Fashion',
      'Embroidery & Detailing',
      'Other Bespoke Request',
    ],
    contactPhone: '',
    whatsappNumber: '',
    contactEmail: '',
    instagramUrl: '',
    address: '',
    studioHours: '',
    openingDays: '',
    openingTime: '',
    closingTime: '',
    appointmentInfo: '',
    footerDescription:
      'Bespoke fashion design and custom stitching studio dedicated to individual silhouettes and hand-finished craftsmanship.',
    footerCopyright: 'PABLO Fashion Studio. All rights reserved.',
    navLabels: {
      home: 'Home',
      work: 'Our Work',
      events: 'Events',
      about: 'About',
      contact: 'Contact',
      cta: 'Book a Fitting',
    },
    socialLinks: {
      instagram: '',
      whatsapp: '',
      facebook: '',
      pinterest: '',
      youtube: '',
    },
    updatedAt: now,
  };
}

export function createSampleEvents(now: string): {
  events: StudioEvent[];
  eventMedia: EventMediaItem[];
} {
  const evt1Id = 'evt_sample_showcase';
  const evt2Id = 'evt_sample_exhibition';

  const events: StudioEvent[] = [
    {
      id: evt1Id,
      title: 'Sample Event: Seasonal Atelier Showcase',
      description:
        'A replaceable sample event entry highlighting custom-stitched occasion silhouettes, draped raw silks, and private salon fittings. Edit or replace this showcase with your own fashion show or event from the Admin CMS.',
      eventDate: '2026-10-18',
      location: 'Studio Salon (Editable Location)',
      category: 'Fashion Show',
      coverImageUrl: '/src/assets/images/work_event_ensemble_1795009474629.jpg',
      videoUrl: '',
      featured: true,
      published: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      updatedAt: now,
    },
    {
      id: evt2Id,
      title: 'Sample Event: Craft & Hand Embroidery Exhibition',
      description:
        'A replaceable sample exhibition showcasing close-range artisanal threadwork, organza beadwork, and tailored wool construction presented for collectors and clients.',
      eventDate: '2026-09-06',
      location: 'Gallery Presentation (Editable Location)',
      category: 'Exhibition',
      coverImageUrl: '/src/assets/images/work_hand_embroidery_1795009474962.jpg',
      videoUrl: '',
      featured: true,
      published: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
      updatedAt: now,
    },
  ];

  const eventMedia: EventMediaItem[] = [
    {
      id: 'evtm_sample_1',
      eventId: evt1Id,
      mediaType: 'image',
      mediaUrl: '/src/assets/images/work_occasion_drape_1795009473548.jpg',
      thumbnailUrl: '/src/assets/images/work_occasion_drape_1795009473548.jpg',
      caption: 'Sculpted champagne raw silk silhouette presented on the salon floor.',
      sortOrder: 1,
      createdAt: now,
    },
    {
      id: 'evtm_sample_2',
      eventId: evt1Id,
      mediaType: 'image',
      mediaUrl: '/src/assets/images/work_bespoke_tailoring_1795009473780.jpg',
      thumbnailUrl: '/src/assets/images/work_bespoke_tailoring_1795009473780.jpg',
      caption: 'Double-breasted charcoal wool tailoring from the showcase capsule.',
      sortOrder: 2,
      createdAt: now,
    },
    {
      id: 'evtm_sample_3',
      eventId: evt2Id,
      mediaType: 'image',
      mediaUrl: '/src/assets/images/hero_pablo_atelier_1795009473187.jpg',
      thumbnailUrl: '/src/assets/images/hero_pablo_atelier_1795009473187.jpg',
      caption: 'Studio worktable preparation and draped toile study.',
      sortOrder: 1,
      createdAt: now,
    },
  ];

  return { events, eventMedia };
}

export function createInitialSeedData(): DatabaseSchema {
  const now = new Date().toISOString();
  const catCustomId = 'cat_custom_stitching';
  const catDesignerId = 'cat_designer_outfits';
  const catOccasionId = 'cat_occasion_wear';
  const catEventId = 'cat_event_fashion';
  const catEmbroideryId = 'cat_embroidery_detailing';

  const categories: PortfolioCategory[] = [
    {
      id: catCustomId,
      name: 'Custom Stitching',
      slug: 'custom-stitching',
      description: 'Individually drafted patterns and precision bespoke tailoring.',
      sortOrder: 1,
      createdAt: now,
    },
    {
      id: catDesignerId,
      name: 'Designer Outfits',
      slug: 'designer-outfits',
      description: 'Original studio silhouettes created from concept to fitting.',
      sortOrder: 2,
      createdAt: now,
    },
    {
      id: catOccasionId,
      name: 'Occasion Wear',
      slug: 'occasion-wear',
      description: 'Fluid silks and sculpted evening garments for milestone celebrations.',
      sortOrder: 3,
      createdAt: now,
    },
    {
      id: catEventId,
      name: 'Event Fashion',
      slug: 'event-fashion',
      description: 'Architectural ensembles tailored for gallery openings, galas, and ceremonies.',
      sortOrder: 4,
      createdAt: now,
    },
    {
      id: catEmbroideryId,
      name: 'Embroidery & Detailing',
      slug: 'embroidery-detailing',
      description: 'Tonal hand-stitching, beadwork, and fine surface embellishments.',
      sortOrder: 5,
      createdAt: now,
    },
  ];

  const portfolioItems: PortfolioItem[] = [
    {
      id: 'item_champagne_silk_drape',
      title: 'Asymmetrical Champagne Silk Gown',
      description:
        'Draped raw silk occasion gown sculpted directly on the dress form with cascading waist pleats and hand-rolled hem.',
      mediaType: 'image',
      mediaUrl: '/src/assets/images/work_occasion_drape_1795009473548.jpg',
      thumbnailUrl: '/src/assets/images/work_occasion_drape_1795009473548.jpg',
      aspectRatio: 'portrait',
      categoryId: catOccasionId,
      featured: true,
      published: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
      updatedAt: now,
    },
    {
      id: 'item_obsidian_double_breasted',
      title: 'Charcoal Wool Tailored Suit',
      description:
        'Double-breasted virgin wool blazer with hand-padded canvas shoulders, pick-stitched peak lapels, and fluid wide trousers.',
      mediaType: 'image',
      mediaUrl: '/src/assets/images/work_bespoke_tailoring_1795009473780.jpg',
      thumbnailUrl: '/src/assets/images/work_bespoke_tailoring_1795009473780.jpg',
      aspectRatio: 'portrait',
      categoryId: catCustomId,
      featured: true,
      published: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      updatedAt: now,
    },
    {
      id: 'item_sand_linen_ensemble',
      title: 'Sculpted Sand Linen Event Silhouette',
      description:
        'Architectural sleeveless tunic and layered skirt cut from heavyweight Belgian linen for sunlit daytime ceremonies.',
      mediaType: 'image',
      mediaUrl: '/src/assets/images/work_event_ensemble_1795009474629.jpg',
      thumbnailUrl: '/src/assets/images/work_event_ensemble_1795009474629.jpg',
      aspectRatio: 'landscape',
      categoryId: catEventId,
      featured: true,
      published: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      updatedAt: now,
    },
    {
      id: 'item_tonal_organza_embroidery',
      title: 'Botanical Tonal Silk Embroidery',
      description:
        'Close-range detail of hand-guided ivory silk threadwork and matte seed pearls on translucent silk organza.',
      mediaType: 'image',
      mediaUrl: '/src/assets/images/work_hand_embroidery_1795009474962.jpg',
      thumbnailUrl: '/src/assets/images/work_hand_embroidery_1795009474962.jpg',
      aspectRatio: 'square',
      categoryId: catEmbroideryId,
      featured: false,
      published: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
      updatedAt: now,
    },
  ];

  const { events, eventMedia } = createSampleEvents(now);

  const adminUsers: AdminUserRecord[] = [
    {
      id: 'admin_primary',
      email: INITIAL_ADMIN_EMAIL,
      name: 'Studio Director',
      passwordHash: hashPassword(INITIAL_ADMIN_PASSWORD),
      createdAt: now,
      updatedAt: now,
    },
  ];

  const { aboutPage, aboutServices, aboutProcessSteps } = createDefaultAboutData(now);

  return {
    adminUsers,
    categories,
    portfolioItems,
    events,
    eventMedia,
    legalPages: createDefaultLegalPages(now),
    siteSettings: createDefaultSiteSettings(now),
    aboutPage,
    aboutServices,
    aboutProcessSteps,
    enquiries: [],
    sessions: [],
  };
}

export function createDefaultAboutData(now: string): {
  aboutPage: AboutPageContent;
  aboutServices: AboutServiceCategory[];
  aboutProcessSteps: AboutProcessStep[];
} {
  const aboutPage: AboutPageContent = {
    id: 'default',
    heroHeading: 'About PABLO',
    heroSubtitle: 'Bespoke fashion design and custom stitching shaped around individual form.',
    heroImageUrl: '/src/assets/images/about_hero_atelier_1795277242672.jpg',
    storyEyebrow: 'OUR STORY',
    storyHeading: 'Crafted around the individual.',
    storyContent:
      'PABLO is an independent fashion design and custom stitching studio dedicated to garments built with quiet precision and personal proportion. Rather than working from standard sizing or mass templates, every piece begins with direct study of posture, movement, and textile drape.\n\nOur design philosophy balances clean architectural lines with fluid hand-finished construction. From first sketch and fabric curation to basted fittings and surface detailing, each commission is stitched for permanence and poise.',
    storyClosingStatement:
      'Individual patterns, thoughtful textiles, and bespoke stitching tailored exclusively by appointment.',
    storyImageUrl: '/src/assets/images/about_story_craft_1795277242734.jpg',
    servicesEyebrow: 'WHAT WE CREATE',
    servicesHeading: 'Disciplines of the atelier.',
    processEyebrow: 'OUR CREATIVE PROCESS',
    processHeading: 'From first dialogue to final stitch.',
    closingHeading: 'Every detail tells a story.',
    closingDescription:
      'Browse recent commissions from our studio archive or schedule a personal consultation to begin your custom outfit.',
    closingImageUrl: '/src/assets/images/about_closing_silhouette_1795277242788.jpg',
    closingPrimaryButtonText: 'Explore Our Work',
    closingPrimaryButtonUrl: '/work',
    closingSecondaryButtonText: 'Book a Fitting',
    closingSecondaryButtonUrl: '/contact',
    updatedAt: now,
  };

  const aboutServices: AboutServiceCategory[] = [
    {
      id: 'about_svc_custom_stitching',
      title: 'Custom Stitching',
      description:
        'Precision-drafted patterns, tailored jackets, trousers, and crisp everyday or formal silhouettes cut specifically to your measurements.',
      imageUrl: '/src/assets/images/work_bespoke_tailoring_1795009473780.jpg',
      sortOrder: 1,
      published: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'about_svc_designer_outfits',
      title: 'Designer Outfits',
      description:
        'Original studio garments developed from initial concept sketches and draping trials into cohesive, one-of-a-kind wardrobe pieces.',
      imageUrl: '/src/assets/images/hero_pablo_atelier_1795009473187.jpg',
      sortOrder: 2,
      published: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'about_svc_occasion_event_wear',
      title: 'Occasion & Event Wear',
      description:
        'Sculpted celebration ensembles, evening gowns, and contemporary ceremonial looks crafted for milestone gatherings and showcases.',
      imageUrl: '/src/assets/images/work_occasion_drape_1795009473548.jpg',
      sortOrder: 3,
      published: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'about_svc_embroidery_detailing',
      title: 'Embroidery & Detailing',
      description:
        'Tonal hand embroidery, fine beadwork, textured trims, and delicate finishing stitches applied directly to custom surfaces.',
      imageUrl: '/src/assets/images/work_hand_embroidery_1795009474962.jpg',
      sortOrder: 4,
      published: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const aboutProcessSteps: AboutProcessStep[] = [
    {
      id: 'about_step_1',
      stepNumber: '01',
      title: 'Consultation & Understanding',
      description:
        'We begin with a focused conversation around your occasion, personal comfort, silhouette preferences, and garment timeline.',
      sortOrder: 1,
      published: true,
      updatedAt: now,
    },
    {
      id: 'about_step_2',
      stepNumber: '02',
      title: 'Design & Fabric Selection',
      description:
        'Together we refine design proportions, drape direction, natural textiles, lining weights, and surface embroidery details.',
      sortOrder: 2,
      published: true,
      updatedAt: now,
    },
    {
      id: 'about_step_3',
      stepNumber: '03',
      title: 'Stitching & Construction',
      description:
        'Individual patterns are drafted and hand-cut before precision stitching, internal structuring, and artisanal embellishments take shape.',
      sortOrder: 3,
      published: true,
      updatedAt: now,
    },
    {
      id: 'about_step_4',
      stepNumber: '04',
      title: 'Fitting & Finishing',
      description:
        'During studio fittings, balance, hem flow, and posture lines are tuned before final hand-pressed finishing.',
      sortOrder: 4,
      published: true,
      updatedAt: now,
    },
  ];

  return { aboutPage, aboutServices, aboutProcessSteps };
}

export interface StudioOverviewStats {
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

export interface StudioStore {
  init(): Promise<void>;
  ping(): Promise<boolean>;
  getSettings(): Promise<SiteSettings>;
  updateSettings(
    patch: Partial<Omit<SiteSettings, 'id' | 'updatedAt'>>
  ): Promise<SiteSettings>;
  getLegalPages(publishedOnly?: boolean): Promise<LegalPage[]>;
  getLegalPageBySlug(slug: string, publishedOnly?: boolean): Promise<LegalPage | null>;
  updateLegalPage(
    slug: LegalPageSlug,
    patch: Partial<
      Pick<
        LegalPage,
        'title' | 'content' | 'seoTitle' | 'seoDescription' | 'published' | 'lastRevisedDate'
      >
    >
  ): Promise<LegalPage | null>;
  getCategories(): Promise<PortfolioCategory[]>;
  createCategory(input: { name: string; description?: string }): Promise<PortfolioCategory>;
  updateCategory(
    id: string,
    patch: { name?: string; description?: string; sortOrder?: number }
  ): Promise<PortfolioCategory | null>;
  deleteCategory(id: string): Promise<{ deleted: boolean; reason?: string }>;
  getPortfolioItems(options?: {
    publishedOnly?: boolean;
    featuredOnly?: boolean;
    categorySlug?: string;
    mediaType?: MediaType;
  }): Promise<PortfolioItem[]>;
  getPortfolioItemById(id: string): Promise<PortfolioItem | null>;
  createPortfolioItem(input: {
    title: string;
    description: string;
    mediaType: MediaType;
    mediaUrl: string;
    thumbnailUrl: string;
    aspectRatio: AspectRatioType;
    categoryId: string;
    featured: boolean;
    published: boolean;
  }): Promise<PortfolioItem>;
  updatePortfolioItem(
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
  ): Promise<PortfolioItem | null>;
  deletePortfolioItem(id: string): Promise<PortfolioItem | null>;
  getEvents(options?: {
    publishedOnly?: boolean;
    featuredOnly?: boolean;
    category?: string;
  }): Promise<StudioEvent[]>;
  getEventById(id: string): Promise<StudioEvent | null>;
  createEvent(input: {
    title: string;
    description: string;
    eventDate: string;
    location: string;
    category: string;
    coverImageUrl: string;
    videoUrl: string;
    featured: boolean;
    published: boolean;
  }): Promise<StudioEvent>;
  updateEvent(
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
  ): Promise<StudioEvent | null>;
  deleteEvent(
    id: string
  ): Promise<{ event: StudioEvent; removedMedia: EventMediaItem[] } | null>;
  addEventMedia(
    eventId: string,
    items: Array<{
      mediaType: MediaType;
      mediaUrl: string;
      thumbnailUrl: string;
      caption?: string;
    }>
  ): Promise<EventMediaItem[]>;
  updateEventMedia(
    mediaId: string,
    patch: { caption?: string; sortOrder?: number }
  ): Promise<EventMediaItem | null>;
  deleteEventMedia(mediaId: string): Promise<EventMediaItem | null>;
  isMediaUrlReferencedElsewhere(url: string, excludeId?: string): Promise<boolean>;
  getEnquiries(): Promise<Enquiry[]>;
  createEnquiry(input: {
    name: string;
    phone: string;
    serviceRequired: string;
    message: string;
  }): Promise<Enquiry>;
  updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<Enquiry | null>;
  deleteEnquiry(id: string): Promise<boolean>;
  findAdminByEmail(email: string): Promise<AdminUserRecord | null>;
  findAdminById(id: string): Promise<AdminUserPublic | null>;
  createSession(userId: string, token: string): Promise<void>;
  getSessionUser(token: string): Promise<AdminUserPublic | null>;
  deleteSession(token: string): Promise<void>;
  getOverviewStats(): Promise<StudioOverviewStats>;
  // About Page CMS
  getAboutPageData(publishedOnly?: boolean): Promise<AboutPageData>;
  updateAboutContent(
    patch: Partial<Omit<AboutPageContent, 'id' | 'updatedAt'>>
  ): Promise<AboutPageContent>;
  createAboutService(input: {
    title: string;
    description: string;
    imageUrl: string;
    published: boolean;
    sortOrder?: number;
  }): Promise<AboutServiceCategory>;
  updateAboutService(
    id: string,
    patch: Partial<Pick<AboutServiceCategory, 'title' | 'description' | 'imageUrl' | 'published' | 'sortOrder'>>
  ): Promise<AboutServiceCategory | null>;
  reorderAboutServices(orderedIds: string[]): Promise<AboutServiceCategory[]>;
  deleteAboutService(id: string): Promise<AboutServiceCategory | null>;
  createAboutProcessStep(input: {
    stepNumber: string;
    title: string;
    description: string;
    published: boolean;
    sortOrder?: number;
  }): Promise<AboutProcessStep>;
  updateAboutProcessStep(
    id: string,
    patch: Partial<Pick<AboutProcessStep, 'stepNumber' | 'title' | 'description' | 'published' | 'sortOrder'>>
  ): Promise<AboutProcessStep | null>;
  reorderAboutProcessSteps(orderedIds: string[]): Promise<AboutProcessStep[]>;
  deleteAboutProcessStep(id: string): Promise<boolean>;
}

