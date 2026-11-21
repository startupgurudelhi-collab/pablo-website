import crypto from 'node:crypto';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import {
  MYSQL_DATABASE,
  MYSQL_HOST,
  MYSQL_PASSWORD,
  MYSQL_PORT,
  MYSQL_SSL,
  MYSQL_USER,
  SESSION_TTL_MS,
} from './config.ts';
import {
  type AdminUserRecord,
  type StudioStore,
  createDefaultLegalPages,
  createDefaultSiteSettings,
  createInitialSeedData,
  slugify,
} from './seedDefaults.ts';
import type {
  AdminUserPublic,
  AspectRatioType,
  Enquiry,
  EnquiryStatus,
  EventMediaItem,
  LegalPage,
  LegalPageSlug,
  MediaType,
  NavLabels,
  PortfolioCategory,
  PortfolioItem,
  SiteSettings,
  SocialLinks,
  StudioEvent,
} from '../src/types/studio.ts';

const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(64) NOT NULL,
    email VARCHAR(191) NOT NULL,
    name VARCHAR(160) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_users_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token VARCHAR(128) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    expires_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (token),
    KEY idx_admin_sessions_user_id (user_id),
    KEY idx_admin_sessions_expires_at (expires_at),
    CONSTRAINT fk_admin_sessions_user
      FOREIGN KEY (user_id) REFERENCES admin_users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_slug (slug),
    KEY idx_categories_sort_order (sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS portfolio_items (
    id VARCHAR(64) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    media_type VARCHAR(16) NOT NULL,
    media_url VARCHAR(512) NOT NULL,
    thumbnail_url VARCHAR(512) NOT NULL,
    aspect_ratio VARCHAR(24) NOT NULL DEFAULT 'portrait',
    category_id VARCHAR(64) NOT NULL,
    featured TINYINT(1) NOT NULL DEFAULT 0,
    published TINYINT(1) NOT NULL DEFAULT 1,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_portfolio_category_id (category_id),
    KEY idx_portfolio_pub_feat (published, featured),
    KEY idx_portfolio_created_at (created_at),
    CONSTRAINT fk_portfolio_category
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(64) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    event_date VARCHAR(40) NOT NULL,
    location VARCHAR(240) NOT NULL,
    category VARCHAR(120) NOT NULL,
    cover_image_url VARCHAR(512) NOT NULL,
    video_url VARCHAR(512) NOT NULL,
    featured TINYINT(1) NOT NULL DEFAULT 0,
    published TINYINT(1) NOT NULL DEFAULT 1,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_events_pub_feat (published, featured),
    KEY idx_events_date (event_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS event_media (
    id VARCHAR(64) NOT NULL,
    event_id VARCHAR(64) NOT NULL,
    media_type VARCHAR(16) NOT NULL,
    media_url VARCHAR(512) NOT NULL,
    thumbnail_url VARCHAR(512) NOT NULL,
    caption VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_event_media_event_id (event_id, sort_order),
    CONSTRAINT fk_event_media_event
      FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS legal_pages (
    id VARCHAR(64) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content LONGTEXT NOT NULL,
    seo_title VARCHAR(240) NOT NULL,
    seo_description TEXT NOT NULL,
    published TINYINT(1) NOT NULL DEFAULT 1,
    last_revised_date VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_legal_pages_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS site_settings (
    id VARCHAR(64) NOT NULL,
    brand_name VARCHAR(120) NOT NULL,
    logo_url VARCHAR(512) NOT NULL,
    favicon_url VARCHAR(512) NOT NULL,
    seo_title VARCHAR(240) NOT NULL,
    seo_description TEXT NOT NULL,
    hero_media_url VARCHAR(512) NOT NULL,
    hero_media_type VARCHAR(16) NOT NULL,
    hero_headline VARCHAR(240) NOT NULL,
    hero_subheadline VARCHAR(240) NOT NULL,
    hero_description TEXT NOT NULL,
    hero_primary_cta_text VARCHAR(120) NOT NULL,
    hero_primary_cta_url VARCHAR(255) NOT NULL,
    hero_secondary_cta_text VARCHAR(120) NOT NULL,
    hero_secondary_cta_url VARCHAR(255) NOT NULL,
    home_intro_kicker VARCHAR(160) NOT NULL,
    home_intro_headline VARCHAR(300) NOT NULL,
    home_cta_headline VARCHAR(300) NOT NULL,
    home_cta_description TEXT NOT NULL,
    home_cta_button_text VARCHAR(120) NOT NULL,
    home_cta_button_url VARCHAR(255) NOT NULL,
    about_headline VARCHAR(300) NOT NULL,
    about_content LONGTEXT NOT NULL,
    about_craft_note TEXT NOT NULL,
    about_image_url VARCHAR(512) NOT NULL,
    about_image_type VARCHAR(16) NOT NULL,
    contact_headline VARCHAR(300) NOT NULL,
    contact_intro TEXT NOT NULL,
    contact_form_heading VARCHAR(200) NOT NULL,
    contact_form_description TEXT NOT NULL,
    contact_form_button_text VARCHAR(120) NOT NULL,
    contact_services_json LONGTEXT NOT NULL,
    contact_phone VARCHAR(80) NOT NULL,
    whatsapp_number VARCHAR(80) NOT NULL,
    contact_email VARCHAR(191) NOT NULL,
    instagram_url VARCHAR(350) NOT NULL,
    address TEXT NOT NULL,
    studio_hours VARCHAR(255) NOT NULL,
    footer_description TEXT NOT NULL,
    footer_copyright VARCHAR(300) NOT NULL,
    nav_labels_json LONGTEXT NOT NULL,
    social_links_json LONGTEXT NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS enquiries (
    id VARCHAR(64) NOT NULL,
    name VARCHAR(160) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    service_required VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'new',
    created_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_enquiries_status_created (status, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

let poolInstance: Pool | null = null;
let readyPromise: Promise<void> | null = null;

function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = mysql.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      database: MYSQL_DATABASE,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      ssl: MYSQL_SSL ? { rejectUnauthorized: false } : undefined,
    });
  }
  return poolInstance;
}

function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapCategoryRow(row: RowDataPacket): PortfolioCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description || ''),
    sortOrder: Number(row.sort_order || 0),
    createdAt: String(row.created_at),
  };
}

function mapPortfolioRow(row: RowDataPacket): PortfolioItem {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description || ''),
    mediaType: row.media_type === 'video' ? 'video' : 'image',
    mediaUrl: String(row.media_url),
    thumbnailUrl: String(row.thumbnail_url || ''),
    aspectRatio:
      row.aspect_ratio === 'landscape' || row.aspect_ratio === 'square'
        ? row.aspect_ratio
        : 'portrait',
    categoryId: String(row.category_id),
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapEventRow(row: RowDataPacket, media: EventMediaItem[] = []): StudioEvent {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description || ''),
    eventDate: String(row.event_date || ''),
    location: String(row.location || ''),
    category: String(row.category || 'Fashion Show'),
    coverImageUrl: String(row.cover_image_url || ''),
    videoUrl: String(row.video_url || ''),
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    media,
  };
}

function mapEventMediaRow(row: RowDataPacket): EventMediaItem {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    mediaType: row.media_type === 'video' ? 'video' : 'image',
    mediaUrl: String(row.media_url),
    thumbnailUrl: String(row.thumbnail_url || ''),
    caption: String(row.caption || ''),
    sortOrder: Number(row.sort_order || 0),
    createdAt: String(row.created_at),
  };
}

function mapLegalPageRow(row: RowDataPacket): LegalPage {
  return {
    id: String(row.id),
    slug:
      row.slug === 'terms-and-conditions' ? 'terms-and-conditions' : 'privacy-policy',
    title: String(row.title),
    content: String(row.content),
    seoTitle: String(row.seo_title || ''),
    seoDescription: String(row.seo_description || ''),
    published: Boolean(row.published),
    lastRevisedDate: String(row.last_revised_date || ''),
    updatedAt: String(row.updated_at),
  };
}

function mapEnquiryRow(row: RowDataPacket): Enquiry {
  const status: EnquiryStatus =
    row.status === 'reviewed' || row.status === 'archived' ? row.status : 'new';
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    serviceRequired: String(row.service_required),
    message: String(row.message),
    status,
    createdAt: String(row.created_at),
  };
}

function mapSettingsRow(row: RowDataPacket): SiteSettings {
  const defaults = createDefaultSiteSettings(new Date().toISOString());
  const parsedServices = safeParseJson<string[]>(
    row.contact_services_json,
    defaults.contactServices
  );
  const parsedNav = safeParseJson<Partial<NavLabels>>(row.nav_labels_json, defaults.navLabels);
  const parsedSocial = safeParseJson<Partial<SocialLinks>>(
    row.social_links_json,
    defaults.socialLinks
  );

  const instagramUrl = String(row.instagram_url || parsedSocial.instagram || '');
  const whatsappNumber = String(row.whatsapp_number || parsedSocial.whatsapp || '');

  return {
    id: String(row.id || 'default'),
    brandName: String(row.brand_name || defaults.brandName),
    logoUrl: String(row.logo_url || ''),
    faviconUrl: String(row.favicon_url || ''),
    seoTitle: String(row.seo_title || defaults.seoTitle),
    seoDescription: String(row.seo_description || defaults.seoDescription),
    heroMediaUrl: String(row.hero_media_url || defaults.heroMediaUrl),
    heroMediaType: row.hero_media_type === 'video' ? 'video' : 'image',
    heroHeadline: String(row.hero_headline || ''),
    heroSubheadline: String(row.hero_subheadline || ''),
    heroDescription: String(row.hero_description || ''),
    heroPrimaryCtaText: String(row.hero_primary_cta_text || ''),
    heroPrimaryCtaUrl: String(row.hero_primary_cta_url || ''),
    heroSecondaryCtaText: String(row.hero_secondary_cta_text || ''),
    heroSecondaryCtaUrl: String(row.hero_secondary_cta_url || ''),
    homeIntroKicker: String(row.home_intro_kicker || ''),
    homeIntroHeadline: String(row.home_intro_headline || ''),
    homeCtaHeadline: String(row.home_cta_headline || ''),
    homeCtaDescription: String(row.home_cta_description || ''),
    homeCtaButtonText: String(row.home_cta_button_text || ''),
    homeCtaButtonUrl: String(row.home_cta_button_url || ''),
    aboutHeadline: String(row.about_headline || ''),
    aboutContent: String(row.about_content || ''),
    aboutCraftNote: String(row.about_craft_note || ''),
    aboutImageUrl: String(row.about_image_url || defaults.aboutImageUrl),
    aboutImageType: row.about_image_type === 'video' ? 'video' : 'image',
    contactHeadline: String(row.contact_headline || ''),
    contactIntro: String(row.contact_intro || ''),
    contactFormHeading: String(row.contact_form_heading || ''),
    contactFormDescription: String(row.contact_form_description || ''),
    contactFormButtonText: String(row.contact_form_button_text || ''),
    contactServices:
      Array.isArray(parsedServices) && parsedServices.length > 0
        ? parsedServices
        : defaults.contactServices,
    contactPhone: String(row.contact_phone || ''),
    whatsappNumber,
    contactEmail: String(row.contact_email || ''),
    instagramUrl,
    address: String(row.address || ''),
    studioHours: String(row.studio_hours || ''),
    footerDescription: String(row.footer_description || ''),
    footerCopyright: String(row.footer_copyright || ''),
    navLabels: {
      ...defaults.navLabels,
      ...parsedNav,
    },
    socialLinks: {
      ...defaults.socialLinks,
      ...parsedSocial,
      instagram: instagramUrl,
      whatsapp: whatsappNumber,
    },
    updatedAt: String(row.updated_at || defaults.updatedAt),
  };
}

async function seedDatabaseIfNeeded(pool: Pool): Promise<void> {
  const seed = createInitialSeedData();

  const [adminRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS cnt FROM admin_users'
  );
  if (Number(adminRows[0]?.cnt || 0) === 0) {
    for (const admin of seed.adminUsers) {
      await pool.execute(
        `INSERT IGNORE INTO admin_users (id, email, name, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [admin.id, admin.email, admin.name, admin.passwordHash, admin.createdAt, admin.updatedAt]
      );
    }
  }

  const defaultLegal = createDefaultLegalPages(new Date().toISOString());
  for (const page of defaultLegal) {
    await pool.execute(
      `INSERT IGNORE INTO legal_pages
       (id, slug, title, content, seo_title, seo_description, published, last_revised_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        page.id,
        page.slug,
        page.title,
        page.content,
        page.seoTitle,
        page.seoDescription,
        page.published ? 1 : 0,
        page.lastRevisedDate,
        page.updatedAt,
      ]
    );
  }

  const [settingsRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM site_settings WHERE id = ? LIMIT 1',
    ['default']
  );

  if (settingsRows.length === 0) {
    const s = seed.siteSettings;
    await pool.execute(
      `INSERT INTO site_settings (
        id, brand_name, logo_url, favicon_url, seo_title, seo_description,
        hero_media_url, hero_media_type, hero_headline, hero_subheadline, hero_description,
        hero_primary_cta_text, hero_primary_cta_url, hero_secondary_cta_text, hero_secondary_cta_url,
        home_intro_kicker, home_intro_headline, home_cta_headline, home_cta_description,
        home_cta_button_text, home_cta_button_url, about_headline, about_content, about_craft_note,
        about_image_url, about_image_type, contact_headline, contact_intro, contact_form_heading,
        contact_form_description, contact_form_button_text, contact_services_json, contact_phone,
        whatsapp_number, contact_email, instagram_url, address, studio_hours,
        footer_description, footer_copyright, nav_labels_json, social_links_json, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )`,
      [
        s.id,
        s.brandName,
        s.logoUrl,
        s.faviconUrl,
        s.seoTitle,
        s.seoDescription,
        s.heroMediaUrl,
        s.heroMediaType,
        s.heroHeadline,
        s.heroSubheadline,
        s.heroDescription,
        s.heroPrimaryCtaText,
        s.heroPrimaryCtaUrl,
        s.heroSecondaryCtaText,
        s.heroSecondaryCtaUrl,
        s.homeIntroKicker,
        s.homeIntroHeadline,
        s.homeCtaHeadline,
        s.homeCtaDescription,
        s.homeCtaButtonText,
        s.homeCtaButtonUrl,
        s.aboutHeadline,
        s.aboutContent,
        s.aboutCraftNote,
        s.aboutImageUrl,
        s.aboutImageType,
        s.contactHeadline,
        s.contactIntro,
        s.contactFormHeading,
        s.contactFormDescription,
        s.contactFormButtonText,
        JSON.stringify(s.contactServices),
        s.contactPhone,
        s.whatsappNumber,
        s.contactEmail,
        s.instagramUrl,
        s.address,
        s.studioHours,
        s.footerDescription,
        s.footerCopyright,
        JSON.stringify(s.navLabels),
        JSON.stringify(s.socialLinks),
        s.updatedAt,
      ]
    );

    const [catRows] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM categories');
    if (Number(catRows[0]?.cnt || 0) === 0) {
      for (const cat of seed.categories) {
        await pool.execute(
          `INSERT IGNORE INTO categories (id, name, slug, description, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [cat.id, cat.name, cat.slug, cat.description, cat.sortOrder, cat.createdAt]
        );
      }
      for (const item of seed.portfolioItems) {
        await pool.execute(
          `INSERT IGNORE INTO portfolio_items
           (id, title, description, media_type, media_url, thumbnail_url, aspect_ratio, category_id, featured, published, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.title,
            item.description,
            item.mediaType,
            item.mediaUrl,
            item.thumbnailUrl,
            item.aspectRatio,
            item.categoryId,
            item.featured ? 1 : 0,
            item.published ? 1 : 0,
            item.createdAt,
            item.updatedAt,
          ]
        );
      }
    }

    const [eventRows] = await pool.execute<RowDataPacket[]>('SELECT COUNT(*) AS cnt FROM events');
    if (Number(eventRows[0]?.cnt || 0) === 0) {
      for (const evt of seed.events) {
        await pool.execute(
          `INSERT IGNORE INTO events
           (id, title, description, event_date, location, category, cover_image_url, video_url, featured, published, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            evt.id,
            evt.title,
            evt.description,
            evt.eventDate,
            evt.location,
            evt.category,
            evt.coverImageUrl,
            evt.videoUrl,
            evt.featured ? 1 : 0,
            evt.published ? 1 : 0,
            evt.createdAt,
            evt.updatedAt,
          ]
        );
      }
      for (const media of seed.eventMedia) {
        await pool.execute(
          `INSERT IGNORE INTO event_media
           (id, event_id, media_type, media_url, thumbnail_url, caption, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            media.id,
            media.eventId,
            media.mediaType,
            media.mediaUrl,
            media.thumbnailUrl,
            media.caption,
            media.sortOrder,
            media.createdAt,
          ]
        );
      }
    }
  }
}

async function ensureReady(): Promise<Pool> {
  const pool = getPool();
  if (!readyPromise) {
    readyPromise = (async () => {
      for (const ddl of SCHEMA_STATEMENTS) {
        await pool.query(ddl);
      }
      await seedDatabaseIfNeeded(pool);
    })().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  await readyPromise;
  return pool;
}

export const mysqlStore: StudioStore = {
  async init(): Promise<void> {
    await ensureReady();
  },

  async ping(): Promise<boolean> {
    const pool = await ensureReady();
    await pool.query('SELECT 1');
    return true;
  },

  async getSettings(): Promise<SiteSettings> {
    const pool = await ensureReady();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM site_settings WHERE id = ? LIMIT 1',
      ['default']
    );
    if (rows.length === 0) {
      return createDefaultSiteSettings(new Date().toISOString());
    }
    return mapSettingsRow(rows[0]);
  },

  async updateSettings(
    patch: Partial<Omit<SiteSettings, 'id' | 'updatedAt'>>
  ): Promise<SiteSettings> {
    const pool = await ensureReady();
    const current = await this.getSettings();

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

    const next: SiteSettings = {
      ...current,
      ...patch,
      instagramUrl: nextInstagram,
      whatsappNumber: nextWhatsapp,
      navLabels: nextNavLabels,
      socialLinks: nextSocialLinks,
      updatedAt: new Date().toISOString(),
    };

    await pool.execute(
      `UPDATE site_settings SET
        brand_name = ?, logo_url = ?, favicon_url = ?, seo_title = ?, seo_description = ?,
        hero_media_url = ?, hero_media_type = ?, hero_headline = ?, hero_subheadline = ?, hero_description = ?,
        hero_primary_cta_text = ?, hero_primary_cta_url = ?, hero_secondary_cta_text = ?, hero_secondary_cta_url = ?,
        home_intro_kicker = ?, home_intro_headline = ?, home_cta_headline = ?, home_cta_description = ?,
        home_cta_button_text = ?, home_cta_button_url = ?, about_headline = ?, about_content = ?, about_craft_note = ?,
        about_image_url = ?, about_image_type = ?, contact_headline = ?, contact_intro = ?, contact_form_heading = ?,
        contact_form_description = ?, contact_form_button_text = ?, contact_services_json = ?, contact_phone = ?,
        whatsapp_number = ?, contact_email = ?, instagram_url = ?, address = ?, studio_hours = ?,
        footer_description = ?, footer_copyright = ?, nav_labels_json = ?, social_links_json = ?, updated_at = ?
      WHERE id = ?`,
      [
        next.brandName,
        next.logoUrl,
        next.faviconUrl,
        next.seoTitle,
        next.seoDescription,
        next.heroMediaUrl,
        next.heroMediaType,
        next.heroHeadline,
        next.heroSubheadline,
        next.heroDescription,
        next.heroPrimaryCtaText,
        next.heroPrimaryCtaUrl,
        next.heroSecondaryCtaText,
        next.heroSecondaryCtaUrl,
        next.homeIntroKicker,
        next.homeIntroHeadline,
        next.homeCtaHeadline,
        next.homeCtaDescription,
        next.homeCtaButtonText,
        next.homeCtaButtonUrl,
        next.aboutHeadline,
        next.aboutContent,
        next.aboutCraftNote,
        next.aboutImageUrl,
        next.aboutImageType,
        next.contactHeadline,
        next.contactIntro,
        next.contactFormHeading,
        next.contactFormDescription,
        next.contactFormButtonText,
        JSON.stringify(next.contactServices),
        next.contactPhone,
        next.whatsappNumber,
        next.contactEmail,
        next.instagramUrl,
        next.address,
        next.studioHours,
        next.footerDescription,
        next.footerCopyright,
        JSON.stringify(next.navLabels),
        JSON.stringify(next.socialLinks),
        next.updatedAt,
        'default',
      ]
    );

    return next;
  },

  async getLegalPages(publishedOnly = false): Promise<LegalPage[]> {
    const pool = await ensureReady();
    const sql = publishedOnly
      ? 'SELECT * FROM legal_pages WHERE published = 1 ORDER BY id ASC'
      : 'SELECT * FROM legal_pages ORDER BY id ASC';
    const [rows] = await pool.execute<RowDataPacket[]>(sql);
    return rows.map(mapLegalPageRow);
  },

  async getLegalPageBySlug(slug: string, publishedOnly = false): Promise<LegalPage | null> {
    const pool = await ensureReady();
    const sql = publishedOnly
      ? 'SELECT * FROM legal_pages WHERE slug = ? AND published = 1 LIMIT 1'
      : 'SELECT * FROM legal_pages WHERE slug = ? LIMIT 1';
    const [rows] = await pool.execute<RowDataPacket[]>(sql, [slug]);
    if (rows.length === 0) return null;
    return mapLegalPageRow(rows[0]);
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
    const pool = await ensureReady();
    const current = await this.getLegalPageBySlug(slug, false);
    if (!current) return null;

    const updated: LegalPage = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await pool.execute(
      `UPDATE legal_pages
       SET title = ?, content = ?, seo_title = ?, seo_description = ?, published = ?, last_revised_date = ?, updated_at = ?
       WHERE slug = ?`,
      [
        updated.title,
        updated.content,
        updated.seoTitle,
        updated.seoDescription,
        updated.published ? 1 : 0,
        updated.lastRevisedDate,
        updated.updatedAt,
        slug,
      ]
    );
    return updated;
  },

  async getCategories(): Promise<PortfolioCategory[]> {
    const pool = await ensureReady();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC'
    );
    return rows.map(mapCategoryRow);
  },

  async createCategory(input: { name: string; description?: string }): Promise<PortfolioCategory> {
    const pool = await ensureReady();
    const existing = await this.getCategories();
    const baseSlug = slugify(input.name);
    let slug = baseSlug;
    let counter = 2;
    while (existing.some((c) => c.slug === slug)) {
      slug = `${baseSlug}-${counter++}`;
    }
    const maxSort = existing.reduce((max, c) => Math.max(max, c.sortOrder), 0);
    const category: PortfolioCategory = {
      id: `cat_${crypto.randomUUID().slice(0, 8)}`,
      name: input.name.trim(),
      slug,
      description: (input.description || '').trim(),
      sortOrder: maxSort + 1,
      createdAt: new Date().toISOString(),
    };
    await pool.execute(
      `INSERT INTO categories (id, name, slug, description, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        category.id,
        category.name,
        category.slug,
        category.description,
        category.sortOrder,
        category.createdAt,
      ]
    );
    return category;
  },

  async updateCategory(
    id: string,
    patch: { name?: string; description?: string; sortOrder?: number }
  ): Promise<PortfolioCategory | null> {
    const pool = await ensureReady();
    const all = await this.getCategories();
    const current = all.find((c) => c.id === id);
    if (!current) return null;

    const nextName = patch.name !== undefined ? patch.name.trim() : current.name;
    let nextSlug = current.slug;
    if (patch.name !== undefined && nextName !== current.name) {
      const baseSlug = slugify(nextName);
      nextSlug = baseSlug;
      let counter = 2;
      while (all.some((c) => c.id !== id && c.slug === nextSlug)) {
        nextSlug = `${baseSlug}-${counter++}`;
      }
    }

    const updated: PortfolioCategory = {
      ...current,
      name: nextName,
      slug: nextSlug,
      description: patch.description !== undefined ? patch.description.trim() : current.description,
      sortOrder: patch.sortOrder !== undefined ? patch.sortOrder : current.sortOrder,
    };

    await pool.execute(
      `UPDATE categories SET name = ?, slug = ?, description = ?, sort_order = ? WHERE id = ?`,
      [updated.name, updated.slug, updated.description, updated.sortOrder, id]
    );
    return updated;
  },

  async deleteCategory(id: string): Promise<{ deleted: boolean; reason?: string }> {
    const pool = await ensureReady();
    const [refRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM portfolio_items WHERE category_id = ?',
      [id]
    );
    if (Number(refRows[0]?.cnt || 0) > 0) {
      return {
        deleted: false,
        reason: 'Reassign or delete portfolio items in this category before removing it.',
      };
    }
    const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
    const affected = (result as { affectedRows?: number }).affectedRows || 0;
    if (affected === 0) {
      return { deleted: false, reason: 'Category not found.' };
    }
    return { deleted: true };
  },

  async getPortfolioItems(options?: {
    publishedOnly?: boolean;
    featuredOnly?: boolean;
    categorySlug?: string;
    mediaType?: MediaType;
  }): Promise<PortfolioItem[]> {
    const pool = await ensureReady();
    const conditions: string[] = [];
    const params: string[] = [];

    if (options?.publishedOnly) {
      conditions.push('p.published = 1');
    }
    if (options?.featuredOnly) {
      conditions.push('p.featured = 1');
    }
    if (options?.mediaType) {
      conditions.push('p.media_type = ?');
      params.push(options.mediaType);
    }
    if (options?.categorySlug) {
      conditions.push('(c.slug = ? OR c.id = ?)');
      params.push(options.categorySlug, options.categorySlug);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*
       FROM portfolio_items p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY p.created_at DESC`,
      params
    );
    return rows.map(mapPortfolioRow);
  },

  async getPortfolioItemById(id: string): Promise<PortfolioItem | null> {
    const pool = await ensureReady();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM portfolio_items WHERE id = ? LIMIT 1',
      [id]
    );
    if (rows.length === 0) return null;
    return mapPortfolioRow(rows[0]);
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
    const pool = await ensureReady();
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
    await pool.execute(
      `INSERT INTO portfolio_items
       (id, title, description, media_type, media_url, thumbnail_url, aspect_ratio, category_id, featured, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.title,
        item.description,
        item.mediaType,
        item.mediaUrl,
        item.thumbnailUrl,
        item.aspectRatio,
        item.categoryId,
        item.featured ? 1 : 0,
        item.published ? 1 : 0,
        item.createdAt,
        item.updatedAt,
      ]
    );
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
    const pool = await ensureReady();
    const existing = await this.getPortfolioItemById(id);
    if (!existing) return null;

    const updated: PortfolioItem = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await pool.execute(
      `UPDATE portfolio_items
       SET title = ?, description = ?, media_type = ?, media_url = ?, thumbnail_url = ?,
           aspect_ratio = ?, category_id = ?, featured = ?, published = ?, updated_at = ?
       WHERE id = ?`,
      [
        updated.title,
        updated.description,
        updated.mediaType,
        updated.mediaUrl,
        updated.thumbnailUrl,
        updated.aspectRatio,
        updated.categoryId,
        updated.featured ? 1 : 0,
        updated.published ? 1 : 0,
        updated.updatedAt,
        id,
      ]
    );
    return updated;
  },

  async deletePortfolioItem(id: string): Promise<PortfolioItem | null> {
    const pool = await ensureReady();
    const existing = await this.getPortfolioItemById(id);
    if (!existing) return null;
    await pool.execute('DELETE FROM portfolio_items WHERE id = ?', [id]);
    return existing;
  },

  async getEvents(options?: {
    publishedOnly?: boolean;
    featuredOnly?: boolean;
    category?: string;
  }): Promise<StudioEvent[]> {
    const pool = await ensureReady();
    const conditions: string[] = [];
    const params: string[] = [];

    if (options?.publishedOnly) {
      conditions.push('published = 1');
    }
    if (options?.featuredOnly) {
      conditions.push('featured = 1');
    }
    if (options?.category && options.category !== 'all') {
      conditions.push('LOWER(category) = LOWER(?)');
      params.push(options.category);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [eventRows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM events ${whereClause}`,
      params
    );
    if (eventRows.length === 0) return [];

    const [mediaRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM event_media ORDER BY sort_order ASC, created_at ASC'
    );
    const mediaByEvent = new Map<string, EventMediaItem[]>();
    for (const row of mediaRows) {
      const item = mapEventMediaRow(row);
      const list = mediaByEvent.get(item.eventId);
      if (list) {
        list.push(item);
      } else {
        mediaByEvent.set(item.eventId, [item]);
      }
    }

    return eventRows
      .map((row) => mapEventRow(row, mediaByEvent.get(String(row.id)) || []))
      .sort((a, b) => {
        const da = a.eventDate ? new Date(a.eventDate).getTime() : new Date(a.createdAt).getTime();
        const dbTime = b.eventDate
          ? new Date(b.eventDate).getTime()
          : new Date(b.createdAt).getTime();
        return dbTime - da;
      });
  },

  async getEventById(id: string): Promise<StudioEvent | null> {
    const pool = await ensureReady();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM events WHERE id = ? LIMIT 1',
      [id]
    );
    if (rows.length === 0) return null;
    const [mediaRows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM event_media WHERE event_id = ? ORDER BY sort_order ASC, created_at ASC',
      [id]
    );
    return mapEventRow(rows[0], mediaRows.map(mapEventMediaRow));
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
    const pool = await ensureReady();
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
      media: [],
    };
    await pool.execute(
      `INSERT INTO events
       (id, title, description, event_date, location, category, cover_image_url, video_url, featured, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        created.id,
        created.title,
        created.description,
        created.eventDate,
        created.location,
        created.category,
        created.coverImageUrl,
        created.videoUrl,
        created.featured ? 1 : 0,
        created.published ? 1 : 0,
        created.createdAt,
        created.updatedAt,
      ]
    );
    return created;
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
    const pool = await ensureReady();
    const existing = await this.getEventById(id);
    if (!existing) return null;

    const updated: StudioEvent = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await pool.execute(
      `UPDATE events
       SET title = ?, description = ?, event_date = ?, location = ?, category = ?,
           cover_image_url = ?, video_url = ?, featured = ?, published = ?, updated_at = ?
       WHERE id = ?`,
      [
        updated.title,
        updated.description,
        updated.eventDate,
        updated.location,
        updated.category,
        updated.coverImageUrl,
        updated.videoUrl,
        updated.featured ? 1 : 0,
        updated.published ? 1 : 0,
        updated.updatedAt,
        id,
      ]
    );
    return updated;
  },

  async deleteEvent(
    id: string
  ): Promise<{ event: StudioEvent; removedMedia: EventMediaItem[] } | null> {
    const pool = await ensureReady();
    const existing = await this.getEventById(id);
    if (!existing) return null;
    const removedMedia = existing.media || [];
    await pool.execute('DELETE FROM events WHERE id = ?', [id]);
    return { event: existing, removedMedia };
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
    const pool = await ensureReady();
    const [maxRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM event_media WHERE event_id = ?',
      [eventId]
    );
    const existingMax = Number(maxRows[0]?.max_sort || 0);
    const now = new Date().toISOString();

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

    for (const m of created) {
      await pool.execute(
        `INSERT INTO event_media
         (id, event_id, media_type, media_url, thumbnail_url, caption, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          m.id,
          m.eventId,
          m.mediaType,
          m.mediaUrl,
          m.thumbnailUrl,
          m.caption,
          m.sortOrder,
          m.createdAt,
        ]
      );
    }

    return created;
  },

  async updateEventMedia(
    mediaId: string,
    patch: { caption?: string; sortOrder?: number }
  ): Promise<EventMediaItem | null> {
    const pool = await ensureReady();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM event_media WHERE id = ? LIMIT 1',
      [mediaId]
    );
    if (rows.length === 0) return null;
    const current = mapEventMediaRow(rows[0]);
    const updated: EventMediaItem = {
      ...current,
      caption: patch.caption !== undefined ? patch.caption.trim() : current.caption,
      sortOrder: patch.sortOrder !== undefined ? patch.sortOrder : current.sortOrder,
    };
    await pool.execute('UPDATE event_media SET caption = ?, sort_order = ? WHERE id = ?', [
      updated.caption,
      updated.sortOrder,
      mediaId,
    ]);
    return updated;
  },

  async deleteEventMedia(mediaId: string): Promise<EventMediaItem | null> {
    const pool = await ensureReady();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM event_media WHERE id = ? LIMIT 1',
      [mediaId]
    );
    if (rows.length === 0) return null;
    const removed = mapEventMediaRow(rows[0]);
    await pool.execute('DELETE FROM event_media WHERE id = ?', [mediaId]);
    return removed;
  },

  async isMediaUrlReferencedElsewhere(url: string, excludeId?: string): Promise<boolean> {
    if (!url) return false;
    const pool = await ensureReady();
    const excluded = excludeId || '';

    const [settingsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM site_settings
       WHERE hero_media_url = ? OR logo_url = ? OR favicon_url = ? OR about_image_url = ?`,
      [url, url, url, url]
    );
    if (Number(settingsRows[0]?.cnt || 0) > 0) return true;

    const [portfolioRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM portfolio_items
       WHERE id <> ? AND (media_url = ? OR thumbnail_url = ?)`,
      [excluded, url, url]
    );
    if (Number(portfolioRows[0]?.cnt || 0) > 0) return true;

    const [eventRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM events
       WHERE id <> ? AND (cover_image_url = ? OR video_url = ?)`,
      [excluded, url, url]
    );
    if (Number(eventRows[0]?.cnt || 0) > 0) return true;

    const [eventMediaRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM event_media
       WHERE id <> ? AND (media_url = ? OR thumbnail_url = ?)`,
      [excluded, url, url]
    );
    return Number(eventMediaRows[0]?.cnt || 0) > 0;
  },

  async getEnquiries(): Promise<Enquiry[]> {
    const pool = await ensureReady();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM enquiries ORDER BY created_at DESC'
    );
    return rows.map(mapEnquiryRow);
  },

  async createEnquiry(input: {
    name: string;
    phone: string;
    serviceRequired: string;
    message: string;
  }): Promise<Enquiry> {
    const pool = await ensureReady();
    const enquiry: Enquiry = {
      id: `enq_${crypto.randomUUID().slice(0, 10)}`,
      name: input.name.trim(),
      phone: input.phone.trim(),
      serviceRequired: input.serviceRequired.trim(),
      message: input.message.trim(),
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    await pool.execute(
      `INSERT INTO enquiries (id, name, phone, service_required, message, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        enquiry.id,
        enquiry.name,
        enquiry.phone,
        enquiry.serviceRequired,
        enquiry.message,
        enquiry.status,
        enquiry.createdAt,
      ]
    );
    return enquiry;
  },

  async updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<Enquiry | null> {
    const pool = await ensureReady();
    const [result] = await pool.execute('UPDATE enquiries SET status = ? WHERE id = ?', [
      status,
      id,
    ]);
    const affected = (result as { affectedRows?: number }).affectedRows || 0;
    if (affected === 0) return null;
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM enquiries WHERE id = ? LIMIT 1',
      [id]
    );
    if (rows.length === 0) return null;
    return mapEnquiryRow(rows[0]);
  },

  async deleteEnquiry(id: string): Promise<boolean> {
    const pool = await ensureReady();
    const [result] = await pool.execute('DELETE FROM enquiries WHERE id = ?', [id]);
    const affected = (result as { affectedRows?: number }).affectedRows || 0;
    return affected > 0;
  },

  async findAdminByEmail(email: string): Promise<AdminUserRecord | null> {
    const pool = await ensureReady();
    const normalized = email.trim().toLowerCase();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM admin_users WHERE LOWER(email) = ? LIMIT 1',
      [normalized]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      passwordHash: String(row.password_hash),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },

  async findAdminById(id: string): Promise<AdminUserPublic | null> {
    const pool = await ensureReady();
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, name, created_at FROM admin_users WHERE id = ? LIMIT 1',
      [id]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      createdAt: String(row.created_at),
    };
  },

  async createSession(userId: string, token: string): Promise<void> {
    const pool = await ensureReady();
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const expiresIso = new Date(now + SESSION_TTL_MS).toISOString();
    await pool.execute('DELETE FROM admin_sessions WHERE expires_at <= ?', [nowIso]);
    await pool.execute(
      'INSERT INTO admin_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
      [token, userId, nowIso, expiresIso]
    );
  },

  async getSessionUser(token: string): Promise<AdminUserPublic | null> {
    const pool = await ensureReady();
    const nowIso = new Date().toISOString();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.email, u.name, u.created_at
       FROM admin_sessions s
       INNER JOIN admin_users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?
       LIMIT 1`,
      [token, nowIso]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      createdAt: String(row.created_at),
    };
  },

  async deleteSession(token: string): Promise<void> {
    const pool = await ensureReady();
    await pool.execute('DELETE FROM admin_sessions WHERE token = ?', [token]);
  },

  async getOverviewStats() {
    const pool = await ensureReady();
    const [portfolioAgg] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COALESCE(SUM(CASE WHEN media_type = 'image' THEN 1 ELSE 0 END), 0) AS total_images,
        COALESCE(SUM(CASE WHEN media_type = 'video' THEN 1 ELSE 0 END), 0) AS total_videos,
        COALESCE(SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END), 0) AS published_items,
        COALESCE(SUM(CASE WHEN published = 0 THEN 1 ELSE 0 END), 0) AS draft_items,
        COALESCE(SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END), 0) AS featured_items
      FROM portfolio_items`
    );
    const [eventAgg] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS total_events,
        COALESCE(SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END), 0) AS published_events,
        COALESCE(SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END), 0) AS featured_events
      FROM events`
    );
    const [enquiryAgg] = await pool.execute<RowDataPacket[]>(
      `SELECT
        COUNT(*) AS total_enquiries,
        COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) AS new_enquiries
      FROM enquiries`
    );
    const [catAgg] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total_categories FROM categories'
    );

    const p = portfolioAgg[0] || {};
    const e = eventAgg[0] || {};
    const q = enquiryAgg[0] || {};
    const c = catAgg[0] || {};

    return {
      totalImages: Number(p.total_images || 0),
      totalVideos: Number(p.total_videos || 0),
      publishedItems: Number(p.published_items || 0),
      draftItems: Number(p.draft_items || 0),
      featuredItems: Number(p.featured_items || 0),
      totalEvents: Number(e.total_events || 0),
      publishedEvents: Number(e.published_events || 0),
      featuredEvents: Number(e.featured_events || 0),
      newEnquiries: Number(q.new_enquiries || 0),
      totalEnquiries: Number(q.total_enquiries || 0),
      totalCategories: Number(c.total_categories || 0),
    };
  },
};
