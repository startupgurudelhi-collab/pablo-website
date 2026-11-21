import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  IS_PRODUCTION,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MEDIA_DIR,
  ORIGINALS_DIR,
  PORT,
  SESSION_COOKIE_NAME,
  THUMBNAILS_DIR,
  ensureStorageDirectories,
  isMysqlConfigured,
} from './server/config.ts';
import {
  clearSessionCookie,
  generateSessionToken,
  setSessionCookie,
  verifyPassword,
  verifySignedToken,
} from './server/auth.ts';
import { store } from './server/store.ts';
import type {
  AdminUserPublic,
  AspectRatioType,
  EnquiryStatus,
  LegalPageSlug,
  MediaType,
} from './src/types/studio.ts';

interface AuthenticatedRequest extends Request {
  adminUser?: AdminUserPublic;
}

ensureStorageDirectories();

const app = express();
app.set('trust proxy', 1);
app.set('etag', false);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(
  '/media',
  express.static(MEDIA_DIR, {
    maxAge: '365d',
    immutable: true,
    acceptRanges: true,
  })
);
app.use('/media', (_req, res) => {
  res.status(404).json({ error: 'Media file not found.' });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
});

const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many enquiries submitted. Please wait a few minutes before sending another.',
  },
});

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
};

const storage = multer.diskStorage({
  destination(_req, file, cb) {
    ensureStorageDirectories();
    if (file.fieldname === 'thumbnail' || file.fieldname === 'thumbnails') {
      cb(null, THUMBNAILS_DIR);
    } else {
      cb(null, ORIGINALS_DIR);
    }
  },
  filename(_req, file, cb) {
    const ext =
      EXTENSION_BY_MIME[file.mimetype.toLowerCase()] ||
      path.extname(file.originalname).toLowerCase() ||
      '.bin';
    const prefix =
      file.fieldname === 'thumbnail' || file.fieldname === 'thumbnails' ? 'thumb' : 'pablo';
    cb(null, `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_BYTES,
    files: 24,
  },
  fileFilter(_req, file, cb) {
    const mime = file.mimetype.toLowerCase();
    if (
      file.fieldname === 'thumbnail' ||
      file.fieldname === 'thumbnails' ||
      file.fieldname === 'cover'
    ) {
      if (ALLOWED_IMAGE_MIMES.has(mime)) {
        cb(null, true);
      } else {
        cb(new Error('Image must be JPG, JPEG, PNG, or WEBP.'));
      }
      return;
    }
    if (file.fieldname === 'video') {
      if (ALLOWED_VIDEO_MIMES.has(mime)) {
        cb(null, true);
      } else {
        cb(new Error('Event video must be an MP4 file.'));
      }
      return;
    }
    if (ALLOWED_IMAGE_MIMES.has(mime) || ALLOWED_VIDEO_MIMES.has(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Accepted formats: JPG, JPEG, PNG, WEBP, and MP4.'));
    }
  },
});

function removeLocalFileIfSafe(filePath: string | undefined): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Failed to clean up file:', filePath, err);
  }
}

async function removeMediaUrlFromDiskIfUnused(url: string, excludeId?: string): Promise<void> {
  if (!url || !url.startsWith('/media/')) return;
  if (await store.isMediaUrlReferencedElsewhere(url, excludeId)) return;
  const rel = url.replace(/^\/media\//, '');
  const resolved = path.resolve(MEDIA_DIR, rel);
  if (!resolved.startsWith(MEDIA_DIR + path.sep)) return;
  removeLocalFileIfSafe(resolved);
}

function validateUploadedFileSize(file: Express.Multer.File): string | null {
  const mime = file.mimetype.toLowerCase();
  if (ALLOWED_IMAGE_MIMES.has(mime) && file.size > MAX_IMAGE_BYTES) {
    return `Image "${file.originalname}" exceeds the 15 MB limit.`;
  }
  if (ALLOWED_VIDEO_MIMES.has(mime) && file.size > MAX_VIDEO_BYTES) {
    return `Video "${file.originalname}" exceeds the 80 MB limit.`;
  }
  return null;
}

function sanitizeText(value: unknown, maxLen = 2000): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\0/g, '').trim().slice(0, maxLen);
}

function parseAspectRatio(value: unknown): AspectRatioType {
  if (value === 'portrait' || value === 'landscape' || value === 'square') {
    return value;
  }
  return 'portrait';
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

function validateSafeUrl(value: unknown, fallback = ''): string {
  const cleaned = sanitizeText(value, 500);
  if (!cleaned) return fallback;
  if (cleaned.startsWith('/') && !cleaned.startsWith('//')) {
    return cleaned;
  }
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return cleaned;
    }
  } catch {
    // Reject malformed or dangerous schemes such as javascript: or data:
  }
  return fallback;
}

async function getAuthenticatedUser(req: Request): Promise<AdminUserPublic | null> {
  const signedCookie = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  const token = verifySignedToken(signedCookie);
  if (!token) return null;
  return store.getSessionUser(token);
}

async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    req.adminUser = user;
    next();
  } catch (err) {
    console.error('Admin auth error:', err);
    res.status(500).json({ error: 'Unable to verify session.' });
  }
}

// ==========================================
// Health Check
// ==========================================
app.get('/api/health', async (_req, res) => {
  try {
    await store.ping();
    res.json({
      status: 'ok',
      service: 'pablo-fashion-studio',
      storage: isMysqlConfigured() ? 'mysql' : 'local-json',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({
      status: 'error',
      service: 'pablo-fashion-studio',
      storage: isMysqlConfigured() ? 'mysql' : 'local-json',
      error: 'Database connectivity check failed.',
    });
  }
});

// ==========================================
// Public API Routes (Published content only)
// ==========================================
app.get('/api/public/site', async (_req, res) => {
  try {
    const [settings, categories] = await Promise.all([
      store.getSettings(),
      store.getCategories(),
    ]);
    res.json({ settings, categories });
  } catch (err) {
    console.error('Public site error:', err);
    res.status(500).json({ error: 'Failed to load site data.' });
  }
});

app.get('/api/public/home', async (_req, res) => {
  try {
    const [settings, categories, allFeaturedItems, allRecentItems, allFeaturedEvents] =
      await Promise.all([
        store.getSettings(),
        store.getCategories(),
        store.getPortfolioItems({ publishedOnly: true, featuredOnly: true }),
        store.getPortfolioItems({ publishedOnly: true }),
        store.getEvents({ publishedOnly: true, featuredOnly: true }),
      ]);
    res.json({
      settings,
      categories,
      featuredItems: allFeaturedItems.slice(0, 8),
      recentItems: allRecentItems.slice(0, 6),
      featuredEvents: allFeaturedEvents.slice(0, 4),
    });
  } catch (err) {
    console.error('Public home error:', err);
    res.status(500).json({ error: 'Failed to load homepage content.' });
  }
});

app.get('/api/public/portfolio', async (req, res) => {
  try {
    const categorySlug =
      typeof req.query.category === 'string' ? req.query.category.trim() : undefined;
    const mediaTypeParam =
      typeof req.query.mediaType === 'string' ? req.query.mediaType.trim() : undefined;
    const featuredParam = req.query.featured === 'true';

    const mediaType: MediaType | undefined =
      mediaTypeParam === 'image' || mediaTypeParam === 'video' ? mediaTypeParam : undefined;

    const [items, categories] = await Promise.all([
      store.getPortfolioItems({
        publishedOnly: true,
        featuredOnly: featuredParam,
        categorySlug: categorySlug && categorySlug !== 'all' ? categorySlug : undefined,
        mediaType,
      }),
      store.getCategories(),
    ]);

    res.json({ items, categories });
  } catch (err) {
    console.error('Public portfolio error:', err);
    res.status(500).json({ error: 'Failed to load portfolio.' });
  }
});

app.get('/api/public/events', async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : undefined;
    const featuredParam = req.query.featured === 'true';

    const [allPublished, events] = await Promise.all([
      store.getEvents({ publishedOnly: true }),
      store.getEvents({
        publishedOnly: true,
        featuredOnly: featuredParam,
        category: category && category !== 'all' ? category : undefined,
      }),
    ]);

    const eventCategories = Array.from(
      new Set(allPublished.map((e) => e.category).filter(Boolean))
    );

    res.json({
      events,
      categories: eventCategories,
    });
  } catch (err) {
    console.error('Public events error:', err);
    res.status(500).json({ error: 'Failed to load events.' });
  }
});

app.get('/api/public/events/:id', async (req, res) => {
  try {
    const event = await store.getEventById(String(req.params.id));
    if (!event || !event.published) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    res.json({ event });
  } catch (err) {
    console.error('Public event detail error:', err);
    res.status(500).json({ error: 'Failed to load event details.' });
  }
});

app.get('/api/public/about', async (_req, res) => {
  try {
    const about = await store.getAboutPageData(true);
    res.json(about);
  } catch (err) {
    console.error('Public about error:', err);
    res.status(500).json({ error: 'Failed to load About page content.' });
  }
});

app.get('/api/public/legal', async (_req, res) => {
  try {
    const allPages = await store.getLegalPages(true);
    const pages = allPages.map(({ slug, title, lastRevisedDate }) => ({
      slug,
      title,
      lastRevisedDate,
    }));
    res.json({ pages });
  } catch (err) {
    console.error('Public legal list error:', err);
    res.status(500).json({ error: 'Failed to load legal pages.' });
  }
});

app.get('/api/public/legal/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug);
    if (slug !== 'privacy-policy' && slug !== 'terms-and-conditions') {
      res.status(404).json({ error: 'Legal page not found.' });
      return;
    }
    const page = await store.getLegalPageBySlug(slug, true);
    if (!page) {
      res.status(404).json({ error: 'This legal page is currently unavailable.' });
      return;
    }
    res.json({ page });
  } catch (err) {
    console.error('Public legal detail error:', err);
    res.status(500).json({ error: 'Failed to load legal page.' });
  }
});

app.post('/api/public/enquiries', enquiryLimiter, async (req, res) => {
  try {
    const name = sanitizeText(req.body?.name, 120);
    const phone = sanitizeText(req.body?.phone, 40);
    const serviceRequired = sanitizeText(req.body?.serviceRequired, 120);
    const message = sanitizeText(req.body?.message, 2500);

    if (name.length < 2) {
      res.status(400).json({ error: 'Please enter your name.' });
      return;
    }
    if (phone.length < 6) {
      res.status(400).json({ error: 'Please provide a valid phone or WhatsApp number.' });
      return;
    }
    if (!serviceRequired) {
      res.status(400).json({ error: 'Please select the service you are enquiring about.' });
      return;
    }
    if (message.length < 5) {
      res
        .status(400)
        .json({ error: 'Please include a brief message about your outfit or requirement.' });
      return;
    }

    const enquiry = await store.createEnquiry({
      name,
      phone,
      serviceRequired,
      message,
    });

    res.status(201).json({
      message: 'Thank you. Your enquiry has been received by the PABLO studio.',
      enquiryId: enquiry.id,
    });
  } catch (err) {
    console.error('Enquiry creation error:', err);
    res.status(500).json({ error: 'Unable to submit enquiry right now. Please try again.' });
  }
});

// ==========================================
// Authentication Routes
// ==========================================
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const admin = await store.findAdminByEmail(email);
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateSessionToken();
    await store.createSession(admin.id, token);
    setSessionCookie(req, res, token);

    res.json({
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        createdAt: admin.createdAt,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const signedCookie = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    const token = verifySignedToken(signedCookie);
    if (token) {
      await store.deleteSession(token);
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  } catch (err) {
    console.error('Logout error:', err);
    clearSessionCookie(req, res);
    res.json({ ok: true });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true, user });
  } catch (err) {
    console.error('Auth session check error:', err);
    res.status(500).json({ authenticated: false });
  }
});

// ==========================================
// Protected Admin Routes
// ==========================================
app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
  try {
    res.json(await store.getOverviewStats());
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'Failed to load studio overview.' });
  }
});

// Portfolio CRUD
app.get('/api/admin/portfolio', requireAdmin, async (_req, res) => {
  try {
    const [items, categories] = await Promise.all([
      store.getPortfolioItems({ publishedOnly: false }),
      store.getCategories(),
    ]);
    res.json({ items, categories });
  } catch (err) {
    console.error('Admin portfolio error:', err);
    res.status(500).json({ error: 'Failed to load portfolio.' });
  }
});

app.post(
  '/api/admin/portfolio',
  requireAdmin,
  upload.fields([
    { name: 'media', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const mediaFile = files?.media?.[0];
    const thumbFile = files?.thumbnail?.[0];

    try {
      if (!mediaFile) {
        res.status(400).json({ error: 'Please select an image or MP4 video file to upload.' });
        return;
      }

      const sizeError = validateUploadedFileSize(mediaFile);
      if (sizeError) {
        removeLocalFileIfSafe(mediaFile.path);
        removeLocalFileIfSafe(thumbFile?.path);
        res.status(400).json({ error: sizeError });
        return;
      }

      const isVideo = ALLOWED_VIDEO_MIMES.has(mediaFile.mimetype.toLowerCase());
      const mediaType: MediaType = isVideo ? 'video' : 'image';
      const mediaUrl = `/media/originals/${mediaFile.filename}`;
      const thumbnailUrl = thumbFile
        ? `/media/thumbnails/${thumbFile.filename}`
        : isVideo
          ? ''
          : mediaUrl;

      const title = sanitizeText(req.body?.title, 160) || path.parse(mediaFile.originalname).name;
      const description = sanitizeText(req.body?.description, 2000);
      const categories = await store.getCategories();
      const requestedCategoryId = sanitizeText(req.body?.categoryId, 80);
      const validCategory = categories.find((c) => c.id === requestedCategoryId) || categories[0];

      if (!validCategory) {
        removeLocalFileIfSafe(mediaFile.path);
        removeLocalFileIfSafe(thumbFile?.path);
        res.status(400).json({ error: 'Please create a portfolio category first.' });
        return;
      }

      const item = await store.createPortfolioItem({
        title,
        description,
        mediaType,
        mediaUrl,
        thumbnailUrl,
        aspectRatio: parseAspectRatio(req.body?.aspectRatio),
        categoryId: validCategory.id,
        featured: parseBoolean(req.body?.featured, false),
        published: parseBoolean(req.body?.published, true),
      });

      res.status(201).json({ item });
    } catch (err) {
      removeLocalFileIfSafe(mediaFile?.path);
      removeLocalFileIfSafe(thumbFile?.path);
      console.error('Create portfolio item error:', err);
      res.status(500).json({ error: 'Failed to save portfolio item.' });
    }
  }
);

app.patch(
  '/api/admin/portfolio/:id',
  requireAdmin,
  upload.fields([
    { name: 'media', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  async (req, res) => {
    const id = String(req.params.id);
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const mediaFile = files?.media?.[0];
    const thumbFile = files?.thumbnail?.[0];

    try {
      const existing = await store.getPortfolioItemById(id);
      if (!existing) {
        removeLocalFileIfSafe(mediaFile?.path);
        removeLocalFileIfSafe(thumbFile?.path);
        res.status(404).json({ error: 'Portfolio item not found.' });
        return;
      }

      const patch: Record<string, unknown> = {};
      if (req.body?.title !== undefined) {
        const title = sanitizeText(req.body.title, 160);
        if (!title) {
          removeLocalFileIfSafe(mediaFile?.path);
          removeLocalFileIfSafe(thumbFile?.path);
          res.status(400).json({ error: 'Title cannot be empty.' });
          return;
        }
        patch.title = title;
      }
      if (req.body?.description !== undefined) {
        patch.description = sanitizeText(req.body.description, 2000);
      }
      if (req.body?.categoryId !== undefined) {
        const categories = await store.getCategories();
        if (!categories.some((c) => c.id === req.body.categoryId)) {
          removeLocalFileIfSafe(mediaFile?.path);
          removeLocalFileIfSafe(thumbFile?.path);
          res.status(400).json({ error: 'Selected category does not exist.' });
          return;
        }
        patch.categoryId = req.body.categoryId;
      }
      if (req.body?.aspectRatio !== undefined) {
        patch.aspectRatio = parseAspectRatio(req.body.aspectRatio);
      }
      if (req.body?.featured !== undefined) {
        patch.featured = parseBoolean(req.body.featured);
      }
      if (req.body?.published !== undefined) {
        patch.published = parseBoolean(req.body.published);
      }

      const oldMediaUrl = existing.mediaUrl;
      const oldThumbnailUrl = existing.thumbnailUrl;

      if (mediaFile) {
        const sizeError = validateUploadedFileSize(mediaFile);
        if (sizeError) {
          removeLocalFileIfSafe(mediaFile.path);
          removeLocalFileIfSafe(thumbFile?.path);
          res.status(400).json({ error: sizeError });
          return;
        }
        const isVideo = ALLOWED_VIDEO_MIMES.has(mediaFile.mimetype.toLowerCase());
        const newMediaUrl = `/media/originals/${mediaFile.filename}`;
        patch.mediaType = isVideo ? 'video' : 'image';
        patch.mediaUrl = newMediaUrl;
        patch.thumbnailUrl = thumbFile
          ? `/media/thumbnails/${thumbFile.filename}`
          : isVideo
            ? ''
            : newMediaUrl;
      } else if (thumbFile) {
        patch.thumbnailUrl = `/media/thumbnails/${thumbFile.filename}`;
      }

      const updated = await store.updatePortfolioItem(id, patch);

      if (mediaFile && oldMediaUrl !== updated?.mediaUrl) {
        await removeMediaUrlFromDiskIfUnused(oldMediaUrl, id);
      }
      if (
        (mediaFile || thumbFile) &&
        oldThumbnailUrl &&
        oldThumbnailUrl !== updated?.thumbnailUrl
      ) {
        await removeMediaUrlFromDiskIfUnused(oldThumbnailUrl, id);
      }

      res.json({ item: updated });
    } catch (err) {
      removeLocalFileIfSafe(mediaFile?.path);
      removeLocalFileIfSafe(thumbFile?.path);
      console.error('Update portfolio item error:', err);
      res.status(500).json({ error: 'Failed to update portfolio item.' });
    }
  }
);

app.delete('/api/admin/portfolio/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const removed = await store.deletePortfolioItem(id);
    if (!removed) {
      res.status(404).json({ error: 'Portfolio item not found.' });
      return;
    }
    await removeMediaUrlFromDiskIfUnused(removed.mediaUrl, id);
    if (removed.thumbnailUrl && removed.thumbnailUrl !== removed.mediaUrl) {
      await removeMediaUrlFromDiskIfUnused(removed.thumbnailUrl, id);
    }
    res.json({ deleted: true, id });
  } catch (err) {
    console.error('Delete portfolio item error:', err);
    res.status(500).json({ error: 'Failed to delete portfolio item.' });
  }
});

// Events & Event Media CRUD
app.get('/api/admin/events', requireAdmin, async (_req, res) => {
  try {
    res.json({
      events: await store.getEvents({ publishedOnly: false }),
    });
  } catch (err) {
    console.error('Admin events error:', err);
    res.status(500).json({ error: 'Failed to load events.' });
  }
});

app.post(
  '/api/admin/events',
  requireAdmin,
  upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const coverFile = files?.cover?.[0];
    const videoFile = files?.video?.[0];

    try {
      if (coverFile) {
        const sizeErr = validateUploadedFileSize(coverFile);
        if (sizeErr) {
          removeLocalFileIfSafe(coverFile.path);
          removeLocalFileIfSafe(videoFile?.path);
          res.status(400).json({ error: sizeErr });
          return;
        }
      }
      if (videoFile) {
        const sizeErr = validateUploadedFileSize(videoFile);
        if (sizeErr) {
          removeLocalFileIfSafe(coverFile?.path);
          removeLocalFileIfSafe(videoFile.path);
          res.status(400).json({ error: sizeErr });
          return;
        }
      }

      const title = sanitizeText(req.body?.title, 180);
      if (title.length < 2) {
        removeLocalFileIfSafe(coverFile?.path);
        removeLocalFileIfSafe(videoFile?.path);
        res.status(400).json({ error: 'Event title must be at least 2 characters.' });
        return;
      }

      const coverImageUrl = coverFile
        ? `/media/originals/${coverFile.filename}`
        : sanitizeText(req.body?.coverImageUrl, 500);

      if (!coverImageUrl) {
        removeLocalFileIfSafe(coverFile?.path);
        removeLocalFileIfSafe(videoFile?.path);
        res.status(400).json({ error: 'Please upload an event cover photograph.' });
        return;
      }

      const videoUrl = videoFile
        ? `/media/originals/${videoFile.filename}`
        : sanitizeText(req.body?.videoUrl, 500);

      const event = await store.createEvent({
        title,
        description: sanitizeText(req.body?.description, 4000),
        eventDate: sanitizeText(req.body?.eventDate, 80),
        location: sanitizeText(req.body?.location, 200),
        category: sanitizeText(req.body?.category, 80) || 'Fashion Show',
        coverImageUrl,
        videoUrl,
        featured: parseBoolean(req.body?.featured, false),
        published: parseBoolean(req.body?.published, true),
      });

      res.status(201).json({ event });
    } catch (err) {
      removeLocalFileIfSafe(coverFile?.path);
      removeLocalFileIfSafe(videoFile?.path);
      console.error('Create event error:', err);
      res.status(500).json({ error: 'Failed to create event.' });
    }
  }
);

app.patch(
  '/api/admin/events/:id',
  requireAdmin,
  upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  async (req, res) => {
    const id = String(req.params.id);
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const coverFile = files?.cover?.[0];
    const videoFile = files?.video?.[0];

    try {
      const existing = await store.getEventById(id);
      if (!existing) {
        removeLocalFileIfSafe(coverFile?.path);
        removeLocalFileIfSafe(videoFile?.path);
        res.status(404).json({ error: 'Event not found.' });
        return;
      }

      if (coverFile) {
        const sizeErr = validateUploadedFileSize(coverFile);
        if (sizeErr) {
          removeLocalFileIfSafe(coverFile.path);
          removeLocalFileIfSafe(videoFile?.path);
          res.status(400).json({ error: sizeErr });
          return;
        }
      }
      if (videoFile) {
        const sizeErr = validateUploadedFileSize(videoFile);
        if (sizeErr) {
          removeLocalFileIfSafe(coverFile?.path);
          removeLocalFileIfSafe(videoFile.path);
          res.status(400).json({ error: sizeErr });
          return;
        }
      }

      const patch: Record<string, unknown> = {};
      if (req.body?.title !== undefined) {
        const title = sanitizeText(req.body.title, 180);
        if (!title) {
          removeLocalFileIfSafe(coverFile?.path);
          removeLocalFileIfSafe(videoFile?.path);
          res.status(400).json({ error: 'Event title cannot be empty.' });
          return;
        }
        patch.title = title;
      }
      if (req.body?.description !== undefined) {
        patch.description = sanitizeText(req.body.description, 4000);
      }
      if (req.body?.eventDate !== undefined) {
        patch.eventDate = sanitizeText(req.body.eventDate, 80);
      }
      if (req.body?.location !== undefined) {
        patch.location = sanitizeText(req.body.location, 200);
      }
      if (req.body?.category !== undefined) {
        patch.category = sanitizeText(req.body.category, 80) || 'Fashion Show';
      }
      if (req.body?.featured !== undefined) {
        patch.featured = parseBoolean(req.body.featured);
      }
      if (req.body?.published !== undefined) {
        patch.published = parseBoolean(req.body.published);
      }

      const oldCover = existing.coverImageUrl;
      const oldVideo = existing.videoUrl;

      if (coverFile) {
        patch.coverImageUrl = `/media/originals/${coverFile.filename}`;
      } else if (req.body?.coverImageUrl !== undefined) {
        const cleanCover = sanitizeText(req.body.coverImageUrl, 500);
        if (!cleanCover) {
          removeLocalFileIfSafe(videoFile?.path);
          res.status(400).json({ error: 'Event cover photograph cannot be empty.' });
          return;
        }
        patch.coverImageUrl = cleanCover;
      }

      if (videoFile) {
        patch.videoUrl = `/media/originals/${videoFile.filename}`;
      } else if (req.body?.videoUrl !== undefined) {
        patch.videoUrl = sanitizeText(req.body.videoUrl, 500);
      }

      const updated = await store.updateEvent(id, patch);

      if (oldCover && updated?.coverImageUrl !== oldCover) {
        await removeMediaUrlFromDiskIfUnused(oldCover, id);
      }
      if (oldVideo && updated?.videoUrl !== oldVideo) {
        await removeMediaUrlFromDiskIfUnused(oldVideo, id);
      }

      res.json({ event: updated });
    } catch (err) {
      removeLocalFileIfSafe(coverFile?.path);
      removeLocalFileIfSafe(videoFile?.path);
      console.error('Update event error:', err);
      res.status(500).json({ error: 'Failed to update event.' });
    }
  }
);

app.delete('/api/admin/events/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const result = await store.deleteEvent(id);
    if (!result) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    await removeMediaUrlFromDiskIfUnused(result.event.coverImageUrl, id);
    if (result.event.videoUrl) {
      await removeMediaUrlFromDiskIfUnused(result.event.videoUrl, id);
    }
    for (const m of result.removedMedia) {
      await removeMediaUrlFromDiskIfUnused(m.mediaUrl, m.id);
      if (m.thumbnailUrl && m.thumbnailUrl !== m.mediaUrl) {
        await removeMediaUrlFromDiskIfUnused(m.thumbnailUrl, m.id);
      }
    }
    res.json({ deleted: true, id });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event.' });
  }
});

app.post(
  '/api/admin/events/:id/media',
  requireAdmin,
  upload.fields([
    { name: 'media', maxCount: 12 },
    { name: 'thumbnails', maxCount: 12 },
  ]),
  async (req, res) => {
    const eventId = String(req.params.id);
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const mediaFiles = files?.media || [];
    const thumbFiles = files?.thumbnails || [];

    try {
      const existingEvent = await store.getEventById(eventId);
      if (!existingEvent) {
        mediaFiles.forEach((f) => removeLocalFileIfSafe(f.path));
        thumbFiles.forEach((f) => removeLocalFileIfSafe(f.path));
        res.status(404).json({ error: 'Event not found.' });
        return;
      }

      if (mediaFiles.length === 0) {
        res.status(400).json({ error: 'Please select images or MP4 videos to upload.' });
        return;
      }

      for (const file of mediaFiles) {
        const sizeErr = validateUploadedFileSize(file);
        if (sizeErr) {
          mediaFiles.forEach((f) => removeLocalFileIfSafe(f.path));
          thumbFiles.forEach((f) => removeLocalFileIfSafe(f.path));
          res.status(400).json({ error: sizeErr });
          return;
        }
      }

      let captions: string[] = [];
      if (typeof req.body?.captions === 'string') {
        try {
          const parsed = JSON.parse(req.body.captions);
          if (Array.isArray(parsed)) captions = parsed.map((c) => sanitizeText(c, 400));
        } catch {
          captions = [];
        }
      }

      const created = await store.addEventMedia(
        eventId,
        mediaFiles.map((file, idx) => {
          const isVideo = ALLOWED_VIDEO_MIMES.has(file.mimetype.toLowerCase());
          const thumbFile = thumbFiles[idx];
          const mediaUrl = `/media/originals/${file.filename}`;
          const thumbnailUrl = thumbFile
            ? `/media/thumbnails/${thumbFile.filename}`
            : isVideo
              ? ''
              : mediaUrl;
          return {
            mediaType: isVideo ? 'video' : 'image',
            mediaUrl,
            thumbnailUrl,
            caption: captions[idx] || sanitizeText(req.body?.caption, 400),
          };
        })
      );

      res.status(201).json({ media: created });
    } catch (err) {
      mediaFiles.forEach((f) => removeLocalFileIfSafe(f.path));
      thumbFiles.forEach((f) => removeLocalFileIfSafe(f.path));
      console.error('Upload event media error:', err);
      res.status(500).json({ error: 'Failed to upload event media.' });
    }
  }
);

app.patch('/api/admin/event-media/:mediaId', requireAdmin, async (req, res) => {
  try {
    const mediaId = String(req.params.mediaId);
    const updated = await store.updateEventMedia(mediaId, {
      caption: req.body?.caption !== undefined ? sanitizeText(req.body.caption, 400) : undefined,
      sortOrder: typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : undefined,
    });
    if (!updated) {
      res.status(404).json({ error: 'Event media item not found.' });
      return;
    }
    res.json({ media: updated });
  } catch (err) {
    console.error('Update event media error:', err);
    res.status(500).json({ error: 'Failed to update event media.' });
  }
});

app.delete('/api/admin/event-media/:mediaId', requireAdmin, async (req, res) => {
  try {
    const mediaId = String(req.params.mediaId);
    const removed = await store.deleteEventMedia(mediaId);
    if (!removed) {
      res.status(404).json({ error: 'Event media item not found.' });
      return;
    }
    await removeMediaUrlFromDiskIfUnused(removed.mediaUrl, mediaId);
    if (removed.thumbnailUrl && removed.thumbnailUrl !== removed.mediaUrl) {
      await removeMediaUrlFromDiskIfUnused(removed.thumbnailUrl, mediaId);
    }
    res.json({ deleted: true, id: mediaId });
  } catch (err) {
    console.error('Delete event media error:', err);
    res.status(500).json({ error: 'Failed to delete event media.' });
  }
});

// Categories management
app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const name = sanitizeText(req.body?.name, 80);
    const description = sanitizeText(req.body?.description, 400);
    if (name.length < 2) {
      res.status(400).json({ error: 'Category name must be at least 2 characters.' });
      return;
    }
    const category = await store.createCategory({ name, description });
    res.status(201).json({ category });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

app.patch('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const patch: { name?: string; description?: string; sortOrder?: number } = {};
    if (req.body?.name !== undefined) {
      const name = sanitizeText(req.body.name, 80);
      if (name.length < 2) {
        res.status(400).json({ error: 'Category name must be at least 2 characters.' });
        return;
      }
      patch.name = name;
    }
    if (req.body?.description !== undefined) {
      patch.description = sanitizeText(req.body.description, 400);
    }
    if (typeof req.body?.sortOrder === 'number') {
      patch.sortOrder = req.body.sortOrder;
    }
    const category = await store.updateCategory(id, patch);
    if (!category) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    res.json({ category });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const result = await store.deleteCategory(String(req.params.id));
    if (!result.deleted) {
      res.status(400).json({ error: result.reason });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// Site Settings & Standalone Media
app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  try {
    res.json({ settings: await store.getSettings() });
  } catch (err) {
    console.error('Admin get settings error:', err);
    res.status(500).json({ error: 'Failed to load site settings.' });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const prev = await store.getSettings();

    const nextHeroType: MediaType =
      body.heroMediaType === 'video' || body.heroMediaType === 'image'
        ? body.heroMediaType
        : prev.heroMediaType;

    const nextAboutType: MediaType =
      body.aboutImageType === 'video' || body.aboutImageType === 'image'
        ? body.aboutImageType
        : prev.aboutImageType;

    const patch: Record<string, unknown> = {
      brandName:
        body.brandName !== undefined ? sanitizeText(body.brandName, 80) || prev.brandName : prev.brandName,
      logoUrl: body.logoUrl !== undefined ? sanitizeText(body.logoUrl, 500) : prev.logoUrl,
      faviconUrl: body.faviconUrl !== undefined ? sanitizeText(body.faviconUrl, 500) : prev.faviconUrl,
      seoTitle: body.seoTitle !== undefined ? sanitizeText(body.seoTitle, 160) : prev.seoTitle,
      seoDescription:
        body.seoDescription !== undefined
          ? sanitizeText(body.seoDescription, 400)
          : prev.seoDescription,
      heroMediaUrl:
        body.heroMediaUrl !== undefined
          ? sanitizeText(body.heroMediaUrl, 500) || prev.heroMediaUrl
          : prev.heroMediaUrl,
      heroMediaType: nextHeroType,
      heroHeadline:
        body.heroHeadline !== undefined ? sanitizeText(body.heroHeadline, 200) : prev.heroHeadline,
      heroSubheadline:
        body.heroSubheadline !== undefined
          ? sanitizeText(body.heroSubheadline, 200)
          : prev.heroSubheadline,
      heroDescription:
        body.heroDescription !== undefined
          ? sanitizeText(body.heroDescription, 1000)
          : prev.heroDescription,
      heroPrimaryCtaText:
        body.heroPrimaryCtaText !== undefined
          ? sanitizeText(body.heroPrimaryCtaText, 80)
          : prev.heroPrimaryCtaText,
      heroPrimaryCtaUrl:
        body.heroPrimaryCtaUrl !== undefined
          ? sanitizeText(body.heroPrimaryCtaUrl, 200)
          : prev.heroPrimaryCtaUrl,
      heroSecondaryCtaText:
        body.heroSecondaryCtaText !== undefined
          ? sanitizeText(body.heroSecondaryCtaText, 80)
          : prev.heroSecondaryCtaText,
      heroSecondaryCtaUrl:
        body.heroSecondaryCtaUrl !== undefined
          ? sanitizeText(body.heroSecondaryCtaUrl, 200)
          : prev.heroSecondaryCtaUrl,
      homeIntroKicker:
        body.homeIntroKicker !== undefined
          ? sanitizeText(body.homeIntroKicker, 120)
          : prev.homeIntroKicker,
      homeIntroHeadline:
        body.homeIntroHeadline !== undefined
          ? sanitizeText(body.homeIntroHeadline, 240)
          : prev.homeIntroHeadline,
      homeCtaHeadline:
        body.homeCtaHeadline !== undefined
          ? sanitizeText(body.homeCtaHeadline, 240)
          : prev.homeCtaHeadline,
      homeCtaDescription:
        body.homeCtaDescription !== undefined
          ? sanitizeText(body.homeCtaDescription, 600)
          : prev.homeCtaDescription,
      homeCtaButtonText:
        body.homeCtaButtonText !== undefined
          ? sanitizeText(body.homeCtaButtonText, 80)
          : prev.homeCtaButtonText,
      homeCtaButtonUrl:
        body.homeCtaButtonUrl !== undefined
          ? sanitizeText(body.homeCtaButtonUrl, 200)
          : prev.homeCtaButtonUrl,
      aboutHeadline:
        body.aboutHeadline !== undefined
          ? sanitizeText(body.aboutHeadline, 240)
          : prev.aboutHeadline,
      aboutContent:
        body.aboutContent !== undefined ? sanitizeText(body.aboutContent, 5000) : prev.aboutContent,
      aboutCraftNote:
        body.aboutCraftNote !== undefined
          ? sanitizeText(body.aboutCraftNote, 500)
          : prev.aboutCraftNote,
      aboutImageUrl:
        body.aboutImageUrl !== undefined ? sanitizeText(body.aboutImageUrl, 500) : prev.aboutImageUrl,
      aboutImageType: nextAboutType,
      contactHeadline:
        body.contactHeadline !== undefined
          ? sanitizeText(body.contactHeadline, 240)
          : prev.contactHeadline,
      contactIntro:
        body.contactIntro !== undefined ? sanitizeText(body.contactIntro, 1000) : prev.contactIntro,
      contactFormHeading:
        body.contactFormHeading !== undefined
          ? sanitizeText(body.contactFormHeading, 160)
          : prev.contactFormHeading,
      contactFormDescription:
        body.contactFormDescription !== undefined
          ? sanitizeText(body.contactFormDescription, 400)
          : prev.contactFormDescription,
      contactFormButtonText:
        body.contactFormButtonText !== undefined
          ? sanitizeText(body.contactFormButtonText, 80)
          : prev.contactFormButtonText,
      contactPhone:
        body.contactPhone !== undefined ? sanitizeText(body.contactPhone, 60) : prev.contactPhone,
      whatsappNumber:
        body.whatsappNumber !== undefined
          ? sanitizeText(body.whatsappNumber, 60)
          : prev.whatsappNumber,
      contactEmail:
        body.contactEmail !== undefined ? sanitizeText(body.contactEmail, 160) : prev.contactEmail,
      instagramUrl:
        body.instagramUrl !== undefined ? sanitizeText(body.instagramUrl, 300) : prev.instagramUrl,
      address: body.address !== undefined ? sanitizeText(body.address, 400) : prev.address,
      studioHours:
        body.studioHours !== undefined ? sanitizeText(body.studioHours, 200) : prev.studioHours,
      openingDays:
        body.openingDays !== undefined ? sanitizeText(body.openingDays, 120) : prev.openingDays,
      openingTime:
        body.openingTime !== undefined ? sanitizeText(body.openingTime, 60) : prev.openingTime,
      closingTime:
        body.closingTime !== undefined ? sanitizeText(body.closingTime, 60) : prev.closingTime,
      appointmentInfo:
        body.appointmentInfo !== undefined
          ? sanitizeText(body.appointmentInfo, 240)
          : prev.appointmentInfo,
      footerDescription:
        body.footerDescription !== undefined
          ? sanitizeText(body.footerDescription, 600)
          : prev.footerDescription,
      footerCopyright:
        body.footerCopyright !== undefined
          ? sanitizeText(body.footerCopyright, 240)
          : prev.footerCopyright,
    };

    if (Array.isArray(body.contactServices)) {
      const cleaned = body.contactServices
        .map((s: unknown) => sanitizeText(s, 100))
        .filter(Boolean);
      if (cleaned.length > 0) patch.contactServices = cleaned;
    }

    if (body.navLabels && typeof body.navLabels === 'object') {
      patch.navLabels = {
        home: sanitizeText(body.navLabels.home, 40) || prev.navLabels.home,
        work: sanitizeText(body.navLabels.work, 40) || prev.navLabels.work,
        events: sanitizeText(body.navLabels.events, 40) || prev.navLabels.events,
        about: sanitizeText(body.navLabels.about, 40) || prev.navLabels.about,
        contact: sanitizeText(body.navLabels.contact, 40) || prev.navLabels.contact,
        cta: sanitizeText(body.navLabels.cta, 50) || prev.navLabels.cta,
      };
    }

    if (body.socialLinks && typeof body.socialLinks === 'object') {
      patch.socialLinks = {
        instagram: sanitizeText(body.socialLinks.instagram, 300),
        whatsapp: sanitizeText(body.socialLinks.whatsapp, 60),
        facebook: sanitizeText(body.socialLinks.facebook, 300),
        pinterest: sanitizeText(body.socialLinks.pinterest, 300),
        youtube: sanitizeText(body.socialLinks.youtube, 300),
      };
    }

    const updated = await store.updateSettings(patch);

    if (prev.heroMediaUrl !== updated.heroMediaUrl) {
      await removeMediaUrlFromDiskIfUnused(prev.heroMediaUrl);
    }
    if (prev.logoUrl !== updated.logoUrl) {
      await removeMediaUrlFromDiskIfUnused(prev.logoUrl);
    }
    if (prev.faviconUrl !== updated.faviconUrl) {
      await removeMediaUrlFromDiskIfUnused(prev.faviconUrl);
    }
    if (prev.aboutImageUrl !== updated.aboutImageUrl) {
      await removeMediaUrlFromDiskIfUnused(prev.aboutImageUrl);
    }

    res.json({ settings: updated });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update site settings.' });
  }
});

app.post('/api/admin/media', requireAdmin, upload.single('media'), (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Please select an image or MP4 video file.' });
    return;
  }
  const sizeError = validateUploadedFileSize(file);
  if (sizeError) {
    removeLocalFileIfSafe(file.path);
    res.status(400).json({ error: sizeError });
    return;
  }
  const isVideo = ALLOWED_VIDEO_MIMES.has(file.mimetype.toLowerCase());
  res.status(201).json({
    url: `/media/originals/${file.filename}`,
    mediaType: isVideo ? 'video' : 'image',
  });
});

// Legal Pages management
app.get('/api/admin/legal', requireAdmin, async (_req, res) => {
  try {
    res.json({ pages: await store.getLegalPages(false) });
  } catch (err) {
    console.error('Admin legal error:', err);
    res.status(500).json({ error: 'Failed to load legal pages.' });
  }
});

app.put('/api/admin/legal/:slug', requireAdmin, async (req, res) => {
  try {
    const slug = String(req.params.slug);
    if (slug !== 'privacy-policy' && slug !== 'terms-and-conditions') {
      res.status(404).json({ error: 'Invalid legal page slug.' });
      return;
    }

    const existing = await store.getLegalPageBySlug(slug, false);
    if (!existing) {
      res.status(404).json({ error: 'Legal page not found.' });
      return;
    }

    const body = req.body || {};
    const title =
      body.title !== undefined ? sanitizeText(body.title, 160) : existing.title;
    const content =
      body.content !== undefined ? sanitizeText(body.content, 30000) : existing.content;

    if (!title) {
      res.status(400).json({ error: 'Page title cannot be empty.' });
      return;
    }
    if (!content) {
      res.status(400).json({ error: 'Page content cannot be empty.' });
      return;
    }

    const patch = {
      title,
      content,
      seoTitle:
        body.seoTitle !== undefined ? sanitizeText(body.seoTitle, 180) : existing.seoTitle,
      seoDescription:
        body.seoDescription !== undefined
          ? sanitizeText(body.seoDescription, 400)
          : existing.seoDescription,
      lastRevisedDate:
        body.lastRevisedDate !== undefined
          ? sanitizeText(body.lastRevisedDate, 40)
          : existing.lastRevisedDate,
      published:
        body.published !== undefined ? parseBoolean(body.published, existing.published) : existing.published,
    };

    const page = await store.updateLegalPage(slug as LegalPageSlug, patch);
    res.json({ page });
  } catch (err) {
    console.error('Update legal page error:', err);
    res.status(500).json({ error: 'Failed to update legal page.' });
  }
});

// About Page CMS management
app.get('/api/admin/about', requireAdmin, async (_req, res) => {
  try {
    res.json(await store.getAboutPageData(false));
  } catch (err) {
    console.error('Admin get about error:', err);
    res.status(500).json({ error: 'Failed to load About page CMS data.' });
  }
});

app.put('/api/admin/about/content', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const prevData = await store.getAboutPageData(false);
    const prev = prevData.content;

    const nextHeroHeading =
      body.heroHeading !== undefined ? sanitizeText(body.heroHeading, 160) : prev.heroHeading;
    if (!nextHeroHeading) {
      res.status(400).json({ error: 'Hero heading cannot be empty.' });
      return;
    }

    const nextStoryHeading =
      body.storyHeading !== undefined ? sanitizeText(body.storyHeading, 240) : prev.storyHeading;
    if (!nextStoryHeading) {
      res.status(400).json({ error: 'Our Story heading cannot be empty.' });
      return;
    }

    const nextClosingHeading =
      body.closingHeading !== undefined
        ? sanitizeText(body.closingHeading, 240)
        : prev.closingHeading;
    if (!nextClosingHeading) {
      res.status(400).json({ error: 'Closing banner heading cannot be empty.' });
      return;
    }

    const patch = {
      heroHeading: nextHeroHeading,
      heroSubtitle:
        body.heroSubtitle !== undefined ? sanitizeText(body.heroSubtitle, 300) : prev.heroSubtitle,
      heroImageUrl:
        body.heroImageUrl !== undefined
          ? validateSafeUrl(body.heroImageUrl, prev.heroImageUrl)
          : prev.heroImageUrl,
      storyEyebrow:
        body.storyEyebrow !== undefined ? sanitizeText(body.storyEyebrow, 80) : prev.storyEyebrow,
      storyHeading: nextStoryHeading,
      storyContent:
        body.storyContent !== undefined ? sanitizeText(body.storyContent, 8000) : prev.storyContent,
      storyClosingStatement:
        body.storyClosingStatement !== undefined
          ? sanitizeText(body.storyClosingStatement, 500)
          : prev.storyClosingStatement,
      storyImageUrl:
        body.storyImageUrl !== undefined
          ? validateSafeUrl(body.storyImageUrl, prev.storyImageUrl)
          : prev.storyImageUrl,
      servicesEyebrow:
        body.servicesEyebrow !== undefined
          ? sanitizeText(body.servicesEyebrow, 80)
          : prev.servicesEyebrow,
      servicesHeading:
        body.servicesHeading !== undefined
          ? sanitizeText(body.servicesHeading, 200)
          : prev.servicesHeading,
      processEyebrow:
        body.processEyebrow !== undefined
          ? sanitizeText(body.processEyebrow, 80)
          : prev.processEyebrow,
      processHeading:
        body.processHeading !== undefined
          ? sanitizeText(body.processHeading, 200)
          : prev.processHeading,
      closingHeading: nextClosingHeading,
      closingDescription:
        body.closingDescription !== undefined
          ? sanitizeText(body.closingDescription, 600)
          : prev.closingDescription,
      closingImageUrl:
        body.closingImageUrl !== undefined
          ? validateSafeUrl(body.closingImageUrl, prev.closingImageUrl)
          : prev.closingImageUrl,
      closingPrimaryButtonText:
        body.closingPrimaryButtonText !== undefined
          ? sanitizeText(body.closingPrimaryButtonText, 80) || prev.closingPrimaryButtonText
          : prev.closingPrimaryButtonText,
      closingPrimaryButtonUrl:
        body.closingPrimaryButtonUrl !== undefined
          ? validateSafeUrl(body.closingPrimaryButtonUrl, prev.closingPrimaryButtonUrl)
          : prev.closingPrimaryButtonUrl,
      closingSecondaryButtonText:
        body.closingSecondaryButtonText !== undefined
          ? sanitizeText(body.closingSecondaryButtonText, 80) || prev.closingSecondaryButtonText
          : prev.closingSecondaryButtonText,
      closingSecondaryButtonUrl:
        body.closingSecondaryButtonUrl !== undefined
          ? validateSafeUrl(body.closingSecondaryButtonUrl, prev.closingSecondaryButtonUrl)
          : prev.closingSecondaryButtonUrl,
    };

    const updated = await store.updateAboutContent(patch);

    if (prev.heroImageUrl !== updated.heroImageUrl) {
      await removeMediaUrlFromDiskIfUnused(prev.heroImageUrl);
    }
    if (prev.storyImageUrl !== updated.storyImageUrl) {
      await removeMediaUrlFromDiskIfUnused(prev.storyImageUrl);
    }
    if (prev.closingImageUrl !== updated.closingImageUrl) {
      await removeMediaUrlFromDiskIfUnused(prev.closingImageUrl);
    }

    res.json({ content: updated });
  } catch (err) {
    console.error('Update about content error:', err);
    res.status(500).json({ error: 'Failed to update About page content.' });
  }
});

app.put('/api/admin/about/services/reorder', requireAdmin, async (req, res) => {
  try {
    const orderedIds = Array.isArray(req.body?.orderedIds)
      ? req.body.orderedIds.map((id: unknown) => sanitizeText(id, 100)).filter(Boolean)
      : [];
    if (orderedIds.length === 0) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    const services = await store.reorderAboutServices(orderedIds);
    res.json({ services });
  } catch (err) {
    console.error('Reorder about services error:', err);
    res.status(500).json({ error: 'Failed to reorder service categories.' });
  }
});

app.post(
  '/api/admin/about/services',
  requireAdmin,
  upload.single('cover'),
  async (req, res) => {
    const coverFile = req.file;
    try {
      if (coverFile) {
        const sizeErr = validateUploadedFileSize(coverFile);
        if (sizeErr) {
          removeLocalFileIfSafe(coverFile.path);
          res.status(400).json({ error: sizeErr });
          return;
        }
      }

      const title = sanitizeText(req.body?.title, 160);
      if (title.length < 2) {
        removeLocalFileIfSafe(coverFile?.path);
        res.status(400).json({ error: 'Service title must be at least 2 characters.' });
        return;
      }

      const description = sanitizeText(req.body?.description, 2000);
      const imageUrl = coverFile
        ? `/media/originals/${coverFile.filename}`
        : validateSafeUrl(req.body?.imageUrl, '');

      if (!imageUrl) {
        removeLocalFileIfSafe(coverFile?.path);
        res.status(400).json({ error: 'Please upload a photograph for this service category.' });
        return;
      }

      const service = await store.createAboutService({
        title,
        description,
        imageUrl,
        published: parseBoolean(req.body?.published, true),
      });

      res.status(201).json({ service });
    } catch (err) {
      removeLocalFileIfSafe(coverFile?.path);
      console.error('Create about service error:', err);
      res.status(500).json({ error: 'Failed to create service category.' });
    }
  }
);

app.patch(
  '/api/admin/about/services/:id',
  requireAdmin,
  upload.single('cover'),
  async (req, res) => {
    const id = String(req.params.id);
    const coverFile = req.file;
    try {
      const data = await store.getAboutPageData(false);
      const existing = data.services.find((s) => s.id === id);
      if (!existing) {
        removeLocalFileIfSafe(coverFile?.path);
        res.status(404).json({ error: 'Service category not found.' });
        return;
      }

      if (coverFile) {
        const sizeErr = validateUploadedFileSize(coverFile);
        if (sizeErr) {
          removeLocalFileIfSafe(coverFile.path);
          res.status(400).json({ error: sizeErr });
          return;
        }
      }

      const patch: Record<string, unknown> = {};
      if (req.body?.title !== undefined) {
        const title = sanitizeText(req.body.title, 160);
        if (title.length < 2) {
          removeLocalFileIfSafe(coverFile?.path);
          res.status(400).json({ error: 'Service title must be at least 2 characters.' });
          return;
        }
        patch.title = title;
      }
      if (req.body?.description !== undefined) {
        patch.description = sanitizeText(req.body.description, 2000);
      }
      if (req.body?.published !== undefined) {
        patch.published = parseBoolean(req.body.published, existing.published);
      }
      if (typeof req.body?.sortOrder === 'number') {
        patch.sortOrder = req.body.sortOrder;
      }

      const oldImageUrl = existing.imageUrl;
      if (coverFile) {
        patch.imageUrl = `/media/originals/${coverFile.filename}`;
      } else if (req.body?.imageUrl !== undefined) {
        const cleanUrl = validateSafeUrl(req.body.imageUrl, '');
        if (!cleanUrl) {
          res.status(400).json({ error: 'Service photograph URL cannot be empty.' });
          return;
        }
        patch.imageUrl = cleanUrl;
      }

      const updated = await store.updateAboutService(id, patch);
      if (oldImageUrl && updated?.imageUrl !== oldImageUrl) {
        await removeMediaUrlFromDiskIfUnused(oldImageUrl, id);
      }

      res.json({ service: updated });
    } catch (err) {
      removeLocalFileIfSafe(coverFile?.path);
      console.error('Update about service error:', err);
      res.status(500).json({ error: 'Failed to update service category.' });
    }
  }
);

app.delete('/api/admin/about/services/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const removed = await store.deleteAboutService(id);
    if (!removed) {
      res.status(404).json({ error: 'Service category not found.' });
      return;
    }
    await removeMediaUrlFromDiskIfUnused(removed.imageUrl, id);
    res.json({ deleted: true, id });
  } catch (err) {
    console.error('Delete about service error:', err);
    res.status(500).json({ error: 'Failed to delete service category.' });
  }
});

app.put('/api/admin/about/process/reorder', requireAdmin, async (req, res) => {
  try {
    const orderedIds = Array.isArray(req.body?.orderedIds)
      ? req.body.orderedIds.map((id: unknown) => sanitizeText(id, 100)).filter(Boolean)
      : [];
    if (orderedIds.length === 0) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    const processSteps = await store.reorderAboutProcessSteps(orderedIds);
    res.json({ processSteps });
  } catch (err) {
    console.error('Reorder about process steps error:', err);
    res.status(500).json({ error: 'Failed to reorder process steps.' });
  }
});

app.post('/api/admin/about/process', requireAdmin, async (req, res) => {
  try {
    const title = sanitizeText(req.body?.title, 160);
    if (title.length < 2) {
      res.status(400).json({ error: 'Step title must be at least 2 characters.' });
      return;
    }
    const stepNumber = sanitizeText(req.body?.stepNumber, 20);
    const description = sanitizeText(req.body?.description, 1200);
    const published = parseBoolean(req.body?.published, true);

    const step = await store.createAboutProcessStep({
      stepNumber,
      title,
      description,
      published,
    });
    res.status(201).json({ step });
  } catch (err) {
    console.error('Create about process step error:', err);
    res.status(500).json({ error: 'Failed to create process step.' });
  }
});

app.patch('/api/admin/about/process/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const patch: Record<string, unknown> = {};
    if (req.body?.stepNumber !== undefined) {
      patch.stepNumber = sanitizeText(req.body.stepNumber, 20);
    }
    if (req.body?.title !== undefined) {
      const title = sanitizeText(req.body.title, 160);
      if (title.length < 2) {
        res.status(400).json({ error: 'Step title must be at least 2 characters.' });
        return;
      }
      patch.title = title;
    }
    if (req.body?.description !== undefined) {
      patch.description = sanitizeText(req.body.description, 1200);
    }
    if (req.body?.published !== undefined) {
      patch.published = parseBoolean(req.body.published, true);
    }
    if (typeof req.body?.sortOrder === 'number') {
      patch.sortOrder = req.body.sortOrder;
    }

    const step = await store.updateAboutProcessStep(id, patch);
    if (!step) {
      res.status(404).json({ error: 'Process step not found.' });
      return;
    }
    res.json({ step });
  } catch (err) {
    console.error('Update about process step error:', err);
    res.status(500).json({ error: 'Failed to update process step.' });
  }
});

app.delete('/api/admin/about/process/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await store.deleteAboutProcessStep(String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Process step not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete about process step error:', err);
    res.status(500).json({ error: 'Failed to delete process step.' });
  }
});

// Enquiries management
app.get('/api/admin/enquiries', requireAdmin, async (_req, res) => {
  try {
    res.json({ enquiries: await store.getEnquiries() });
  } catch (err) {
    console.error('Admin enquiries error:', err);
    res.status(500).json({ error: 'Failed to load enquiries.' });
  }
});

app.patch('/api/admin/enquiries/:id', requireAdmin, async (req, res) => {
  try {
    const status = req.body?.status as EnquiryStatus;
    if (status !== 'new' && status !== 'reviewed' && status !== 'archived') {
      res.status(400).json({ error: 'Invalid status value.' });
      return;
    }
    const enquiry = await store.updateEnquiryStatus(String(req.params.id), status);
    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }
    res.json({ enquiry });
  } catch (err) {
    console.error('Update enquiry error:', err);
    res.status(500).json({ error: 'Failed to update enquiry.' });
  }
});

app.delete('/api/admin/enquiries/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await store.deleteEnquiry(String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('Delete enquiry error:', err);
    res.status(500).json({ error: 'Failed to delete enquiry.' });
  }
});

app.use('/api', (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: 'File exceeds maximum allowed size (15 MB images, 80 MB MP4 videos).',
      });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(400).json({ error: err.message || 'Invalid request.' });
});

async function startServer() {
  await store.init();
  console.log(
    `PABLO storage backend initialized (${isMysqlConfigured() ? 'Hostinger MySQL' : 'local-json'})`
  );

  if (!IS_PRODUCTION) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { maxAge: '7d' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PABLO Fashion Studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PABLO server:', err);
  process.exit(1);
});
