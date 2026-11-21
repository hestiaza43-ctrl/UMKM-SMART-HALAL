import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import QRCode from 'qrcode';
import {
  db,
  ensureUniqueProductSlug,
  getProductById,
  getProductBySlug,
  getSiteSettings,
  getSiteStats,
  initDatabase,
  listProducts,
  slugify,
  UPLOADS_DIR,
} from './server/db.ts';
import {
  type AuthenticatedRequest,
  hashPassword,
  isAdminInitialized,
  isEnvAdminConfigured,
  requireAdmin,
  signAuthToken,
  verifyPassword,
} from './server/auth.ts';
import type {VerificationStatus} from './src/types.ts';

initDatabase();

const app = express();
app.use(express.json({limit: '4mb'}));

// Safe file upload configuration
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
    const randomName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
    cb(null, randomName);
  },
});

const upload = multer({
  storage,
  limits: {fileSize: 5 * 1024 * 1024},
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Format file harus JPG, PNG, WebP, atau PDF (maks. 5MB).'));
      return;
    }
    cb(null, true);
  },
});

// Serve uploaded files safely with path confinement
app.get('/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename || '');
  if (!filename || filename.includes('..')) {
    res.status(400).json({error: 'Nama file tidak valid.'});
    return;
  }
  const resolvedPath = path.resolve(UPLOADS_DIR, filename);
  if (!resolvedPath.startsWith(UPLOADS_DIR + path.sep)) {
    res.status(403).json({error: 'Akses ditolak.'});
    return;
  }
  if (!fs.existsSync(resolvedPath)) {
    res.status(404).json({error: 'File tidak ditemukan.'});
    return;
  }
  res.sendFile(resolvedPath);
});

// Helper: clean optional string
function optStr(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Helper: validate safe URL (allows http, https, or local /uploads/ or /src/assets/)
function sanitizeMediaUrl(val: unknown): string | null {
  const str = optStr(val);
  if (!str) return null;
  if (str.startsWith('/uploads/') || str.startsWith('/src/assets/') || str.startsWith('/assets/')) {
    return str;
  }
  try {
    const parsed = new URL(str);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function sanitizeHttpUrl(val: unknown): string | null {
  const str = optStr(val);
  if (!str) return null;
  try {
    const parsed = new URL(str);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function normalizePublicOrigin(rawUrl: string): string {
  const cleaned = rawUrl.replace(/\/+$/, '');
  return cleaned.replace(/^https:\/\/ais-dev-/, 'https://ais-pre-');
}

function getBaseOrigin(req: express.Request): string {
  const customPublicUrl = getSiteSettings().public_base_url?.trim();
  if (customPublicUrl && (customPublicUrl.startsWith('http://') || customPublicUrl.startsWith('https://'))) {
    return customPublicUrl.replace(/\/+$/, '');
  }
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl && appUrl.startsWith('http') && !appUrl.includes('MY_APP_URL')) {
    return normalizePublicOrigin(appUrl);
  }
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() || req.protocol;
  const host = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim() || req.get('host');
  return normalizePublicOrigin(`${proto}://${host}`);
}

// ==================== PUBLIC ROUTES ====================

app.get('/api/health', (_req, res) => {
  res.json({status: 'ok'});
});

app.get('/api/settings', (_req, res) => {
  res.json(getSiteSettings());
});

app.get('/api/stats', (_req, res) => {
  res.json(getSiteStats());
});

app.get('/api/categories', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.id ASC`
    )
    .all();
  res.json(rows);
});

app.get('/api/products', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  res.json(listProducts(search, category));
});

app.get('/api/products/:slug', (req, res) => {
  const product = getProductBySlug(req.params.slug);
  if (!product) {
    res.status(404).json({error: 'Produk tidak ditemukan.'});
    return;
  }
  res.json(product);
});

app.get('/api/qr/:slug/png', async (req, res) => {
  const product = getProductBySlug(req.params.slug);
  if (!product || !product.qr_code) {
    res.status(404).json({error: 'QR Code produk tidak ditemukan.'});
    return;
  }
  const origin = getBaseOrigin(req);
  const targetUrl = `${origin}${product.qr_code.target_path}`;
  try {
    const pngBuffer = await QRCode.toBuffer(targetUrl, {
      type: 'png',
      width: 800,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-${product.slug}.png"`);
    res.send(pngBuffer);
  } catch {
    res.status(500).json({error: 'Gagal membuat gambar QR Code.'});
  }
});

app.get('/api/qr-store/png', async (req, res) => {
  const origin = getBaseOrigin(req);
  const targetUrl = `${origin}/`;
  try {
    const pngBuffer = await QRCode.toBuffer(targetUrl, {
      type: 'png',
      width: 900,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="qr-beranda-toko.png"');
    res.send(pngBuffer);
  } catch {
    res.status(500).json({error: 'Gagal membuat gambar QR Code toko.'});
  }
});

// ==================== AUTH ROUTES ====================

app.get('/api/auth/status', (_req, res) => {
  res.json({
    initialized: isAdminInitialized(),
    envAuthConfigured: isEnvAdminConfigured(),
  });
});

app.post('/api/auth/bootstrap', (req, res) => {
  if (isAdminInitialized()) {
    res.status(403).json({error: 'Akun admin sudah diinisialisasi. Silakan login.'});
    return;
  }

  const username = optStr(req.body?.username) ?? '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const fullName = optStr(req.body?.full_name) ?? 'Admin UNIKMA';

  if (username.length < 3 || username.length > 50 || !/^[a-zA-Z0-9_.-]+$/.test(username)) {
    res.status(400).json({error: 'Username harus 3–50 karakter (huruf, angka, titik, atau garis bawah).'});
    return;
  }
  if (password.length < 8) {
    res.status(400).json({error: 'Password minimal 8 karakter.'});
    return;
  }

  const passwordHash = hashPassword(password);
  const result = db
    .prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
    .run(username, passwordHash, fullName, 'admin');

  const user = {
    id: Number(result.lastInsertRowid),
    username,
    full_name: fullName,
    role: 'admin',
  };
  const token = signAuthToken(user);
  res.status(201).json({token, user});
});

app.post('/api/auth/login', (req, res) => {
  const username = optStr(req.body?.username) ?? '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    res.status(400).json({error: 'Username dan password wajib diisi.'});
    return;
  }

  // Check env-configured admin override if set
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  const envUser = process.env.ADMIN_USERNAME?.trim() || 'admin';
  if (envPass && username === envUser) {
    const a = Buffer.from(password, 'utf8');
    const b = Buffer.from(envPass, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      const user = {
        id: 0,
        username: envUser,
        full_name: 'Administrator Kampus',
        role: 'admin',
      };
      const token = signAuthToken(user);
      res.json({token, user});
      return;
    }
  }

  const row = db
    .prepare('SELECT id, username, password_hash, full_name, role FROM users WHERE username = ?')
    .get(username) as
    | {id: number; username: string; password_hash: string; full_name: string; role: string}
    | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({error: 'Username atau password salah.'});
    return;
  }

  const user = {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
  };
  const token = signAuthToken(user);
  res.json({token, user});
});

app.get('/api/auth/me', requireAdmin, (req: AuthenticatedRequest, res) => {
  res.json({user: req.adminUser});
});

// ==================== ADMIN ROUTES ====================

app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const stats = getSiteStats();
  const recentProducts = listProducts().slice(0, 6);
  res.json({stats, recentProducts});
});

app.post('/api/admin/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      res.status(400).json({error: err instanceof Error ? err.message : 'Gagal mengunggah file.'});
      return;
    }
    if (!req.file) {
      res.status(400).json({error: 'Tidak ada file yang dipilih.'});
      return;
    }
    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  });
});

// --- Admin Products CRUD ---

app.get('/api/admin/products', requireAdmin, (_req, res) => {
  res.json(listProducts());
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const name = optStr(req.body?.name);
  const umkmId = Number(req.body?.umkm_id);
  const categoryId = req.body?.category_id ? Number(req.body.category_id) : null;
  let certificateId = req.body?.certificate_id ? Number(req.body.certificate_id) : null;
  const mainImage = sanitizeMediaUrl(req.body?.main_image);
  const galleryImagesRaw = Array.isArray(req.body?.gallery_images) ? req.body.gallery_images : [];
  const galleryImages = galleryImagesRaw
    .map((u: unknown) => sanitizeMediaUrl(u))
    .filter((u: string | null): u is string => Boolean(u));
  const story = optStr(req.body?.story);
  const ingredients = optStr(req.body?.ingredients);
  const isFeatured = req.body?.is_featured ? 1 : 0;
  const variantsRaw = Array.isArray(req.body?.variants) ? req.body.variants : [];

  if (!name) {
    res.status(400).json({error: 'Nama produk wajib diisi.'});
    return;
  }
  const umkmRow = db.prepare('SELECT id FROM umkm WHERE id = ?').get(umkmId);
  if (!umkmRow) {
    res.status(400).json({error: 'UMKM tidak ditemukan.'});
    return;
  }

  // Optional inline certificate creation
  const inlineCertNo = optStr(req.body?.new_certificate_number);
  const inlineSppIrt = optStr(req.body?.new_spp_irt_number);

  const tx = db.transaction(() => {
    if (!certificateId && inlineCertNo) {
      const certRes = db
        .prepare(
          `INSERT INTO halal_certificates (certificate_number, spp_irt_number, verification_status)
           VALUES (?, ?, 'Data Sertifikat Tersedia')`
        )
        .run(inlineCertNo, inlineSppIrt);
      certificateId = Number(certRes.lastInsertRowid);
    }

    const baseSlug = slugify(name);
    const slug = ensureUniqueProductSlug(baseSlug);

    const prodRes = db
      .prepare(
        `INSERT INTO products
         (name, slug, umkm_id, category_id, certificate_id, main_image, gallery_images, story, ingredients, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        slug,
        umkmId,
        categoryId,
        certificateId,
        mainImage,
        JSON.stringify(galleryImages),
        story,
        ingredients,
        isFeatured
      );

    const productId = Number(prodRes.lastInsertRowid);

    const insertVar = db.prepare(
      'INSERT INTO product_variants (product_id, variant_name, image_url, description, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    variantsRaw.forEach((v: {variant_name?: unknown; image_url?: unknown; description?: unknown}, idx: number) => {
      const vName = optStr(v?.variant_name);
      if (vName) {
        insertVar.run(productId, vName, sanitizeMediaUrl(v?.image_url), optStr(v?.description), idx);
      }
    });

    const uniqueCode = `SHCM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    db.prepare('INSERT INTO qr_codes (product_id, unique_code, target_path) VALUES (?, ?, ?)').run(
      productId,
      uniqueCode,
      `/produk/${slug}`
    );

    return productId;
  });

  const newId = tx();
  res.status(201).json(getProductById(newId));
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = getProductById(id);
  if (!existing) {
    res.status(404).json({error: 'Produk tidak ditemukan.'});
    return;
  }

  const name = optStr(req.body?.name) ?? existing.name;
  const umkmId = req.body?.umkm_id ? Number(req.body.umkm_id) : existing.umkm_id;
  const categoryId = req.body?.category_id === null ? null : req.body?.category_id ? Number(req.body.category_id) : existing.category_id;
  const certificateId =
    req.body?.certificate_id === null
      ? null
      : req.body?.certificate_id
        ? Number(req.body.certificate_id)
        : existing.certificate_id;

  const mainImage =
    req.body?.main_image === null
      ? null
      : req.body?.main_image !== undefined
        ? sanitizeMediaUrl(req.body.main_image)
        : existing.main_image;

  const galleryImages = Array.isArray(req.body?.gallery_images)
    ? req.body.gallery_images
        .map((u: unknown) => sanitizeMediaUrl(u))
        .filter((u: string | null): u is string => Boolean(u))
    : existing.gallery_images;

  const story = req.body?.story !== undefined ? optStr(req.body.story) : existing.story;
  const ingredients = req.body?.ingredients !== undefined ? optStr(req.body.ingredients) : existing.ingredients;
  const isFeatured = req.body?.is_featured !== undefined ? (req.body.is_featured ? 1 : 0) : existing.is_featured ? 1 : 0;
  const variantsRaw = Array.isArray(req.body?.variants) ? req.body.variants : null;

  const umkmRow = db.prepare('SELECT id FROM umkm WHERE id = ?').get(umkmId);
  if (!umkmRow) {
    res.status(400).json({error: 'UMKM tidak ditemukan.'});
    return;
  }

  const tx = db.transaction(() => {
    // Note: Keep slug & qr_codes.target_path unchanged so printed QR codes remain permanently valid!
    db.prepare(
      `UPDATE products
       SET name = ?, umkm_id = ?, category_id = ?, certificate_id = ?,
           main_image = ?, gallery_images = ?, story = ?, ingredients = ?,
           is_featured = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      name,
      umkmId,
      categoryId,
      certificateId,
      mainImage,
      JSON.stringify(galleryImages),
      story,
      ingredients,
      isFeatured,
      id
    );

    if (variantsRaw !== null) {
      db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);
      const insertVar = db.prepare(
        'INSERT INTO product_variants (product_id, variant_name, image_url, description, sort_order) VALUES (?, ?, ?, ?, ?)'
      );
      variantsRaw.forEach((v: {variant_name?: unknown; image_url?: unknown; description?: unknown}, idx: number) => {
        const vName = optStr(v?.variant_name);
        if (vName) {
          insertVar.run(id, vName, sanitizeMediaUrl(v?.image_url), optStr(v?.description), idx);
        }
      });
    }
  });

  tx();
  res.json(getProductById(id));
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = getProductById(id);
  if (!existing) {
    res.status(404).json({error: 'Produk tidak ditemukan.'});
    return;
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({success: true});
});

// --- Admin UMKM CRUD ---

app.get('/api/admin/umkm', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.*, COUNT(p.id) as product_count
       FROM umkm u
       LEFT JOIN products p ON p.umkm_id = u.id
       GROUP BY u.id
       ORDER BY u.id ASC`
    )
    .all();
  res.json(rows);
});

app.post('/api/admin/umkm', requireAdmin, (req, res) => {
  const name = optStr(req.body?.name);
  if (!name) {
    res.status(400).json({error: 'Nama UMKM wajib diisi.'});
    return;
  }
  const result = db
    .prepare(
      `INSERT INTO umkm (name, owner_name, phone, address, maps_url, description)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      optStr(req.body?.owner_name),
      optStr(req.body?.phone),
      optStr(req.body?.address),
      sanitizeHttpUrl(req.body?.maps_url),
      optStr(req.body?.description)
    );
  const row = db.prepare('SELECT * FROM umkm WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(row);
});

app.put('/api/admin/umkm/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM umkm WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({error: 'UMKM tidak ditemukan.'});
    return;
  }
  const name = optStr(req.body?.name);
  if (!name) {
    res.status(400).json({error: 'Nama UMKM wajib diisi.'});
    return;
  }
  db.prepare(
    `UPDATE umkm
     SET name = ?, owner_name = ?, phone = ?, address = ?, maps_url = ?, description = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    name,
    optStr(req.body?.owner_name),
    optStr(req.body?.phone),
    optStr(req.body?.address),
    sanitizeHttpUrl(req.body?.maps_url),
    optStr(req.body?.description),
    id
  );
  res.json(db.prepare('SELECT * FROM umkm WHERE id = ?').get(id));
});

app.delete('/api/admin/umkm/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const count = (db.prepare('SELECT COUNT(*) as c FROM products WHERE umkm_id = ?').get(id) as {c: number}).c;
  if (count > 0) {
    res.status(409).json({
      error: `UMKM ini masih terhubung dengan ${count} produk. Pindahkan atau hapus produk terkait terlebih dahulu.`,
    });
    return;
  }
  db.prepare('DELETE FROM umkm WHERE id = ?').run(id);
  res.json({success: true});
});

// --- Admin Halal Certificates CRUD ---

const VALID_STATUSES = new Set<VerificationStatus>([
  'Data Sertifikat Tersedia',
  'Terverifikasi',
  'Perlu Pemeriksaan Ulang',
]);

app.get('/api/admin/certificates', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT hc.*, COUNT(p.id) as linked_products_count
       FROM halal_certificates hc
       LEFT JOIN products p ON p.certificate_id = hc.id
       GROUP BY hc.id
       ORDER BY hc.id ASC`
    )
    .all();
  res.json(rows);
});

app.post('/api/admin/certificates', requireAdmin, (req, res) => {
  const certNo = optStr(req.body?.certificate_number);
  if (!certNo) {
    res.status(400).json({error: 'ID Sertifikat Halal wajib diisi.'});
    return;
  }
  const statusRaw = optStr(req.body?.verification_status) ?? 'Data Sertifikat Tersedia';
  const status = VALID_STATUSES.has(statusRaw as VerificationStatus)
    ? (statusRaw as VerificationStatus)
    : 'Data Sertifikat Tersedia';
  const evidence = optStr(req.body?.verification_evidence);

  if (status === 'Terverifikasi' && !evidence) {
    res.status(400).json({
      error: 'Status Terverifikasi hanya boleh disimpan setelah bukti pemeriksaan verifikasi diisi.',
    });
    return;
  }

  const verifiedAt = status === 'Terverifikasi' ? new Date().toISOString() : null;

  const result = db
    .prepare(
      `INSERT INTO halal_certificates
       (certificate_number, spp_irt_number, issued_date, expiry_date, document_url, verification_status, verification_evidence, verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      certNo,
      optStr(req.body?.spp_irt_number),
      optStr(req.body?.issued_date),
      optStr(req.body?.expiry_date),
      sanitizeMediaUrl(req.body?.document_url),
      status,
      evidence,
      verifiedAt
    );

  const row = db.prepare('SELECT * FROM halal_certificates WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(row);
});

app.put('/api/admin/certificates/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM halal_certificates WHERE id = ?').get(id) as
    | {verification_status: string; verified_at: string | null}
    | undefined;
  if (!existing) {
    res.status(404).json({error: 'Data sertifikat tidak ditemukan.'});
    return;
  }

  const certNo = optStr(req.body?.certificate_number);
  if (!certNo) {
    res.status(400).json({error: 'ID Sertifikat Halal wajib diisi.'});
    return;
  }
  const statusRaw = optStr(req.body?.verification_status) ?? existing.verification_status;
  const status = VALID_STATUSES.has(statusRaw as VerificationStatus)
    ? (statusRaw as VerificationStatus)
    : 'Data Sertifikat Tersedia';
  const evidence = optStr(req.body?.verification_evidence);

  if (status === 'Terverifikasi' && !evidence) {
    res.status(400).json({
      error: 'Status Terverifikasi wajib menyertakan bukti pemeriksaan resmi BPJPH.',
    });
    return;
  }

  const verifiedAt =
    status === 'Terverifikasi'
      ? existing.verified_at || new Date().toISOString()
      : null;

  db.prepare(
    `UPDATE halal_certificates
     SET certificate_number = ?, spp_irt_number = ?, issued_date = ?, expiry_date = ?,
         document_url = ?, verification_status = ?, verification_evidence = ?, verified_at = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    certNo,
    optStr(req.body?.spp_irt_number),
    optStr(req.body?.issued_date),
    optStr(req.body?.expiry_date),
    sanitizeMediaUrl(req.body?.document_url),
    status,
    evidence,
    verifiedAt,
    id
  );

  res.json(db.prepare('SELECT * FROM halal_certificates WHERE id = ?').get(id));
});

app.delete('/api/admin/certificates/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE products SET certificate_id = NULL WHERE certificate_id = ?').run(id);
  db.prepare('DELETE FROM halal_certificates WHERE id = ?').run(id);
  res.json({success: true});
});

// --- Admin QR Codes ---

app.get('/api/admin/qrcodes', requireAdmin, (_req, res) => {
  res.json(listProducts());
});

app.post('/api/admin/qrcodes/:productId/regenerate', requireAdmin, (req, res) => {
  const productId = Number(req.params.productId);
  const existing = db.prepare('SELECT * FROM qr_codes WHERE product_id = ?').get(productId);
  if (!existing) {
    res.status(404).json({error: 'QR Code produk tidak ditemukan.'});
    return;
  }
  const newUniqueCode = `SHCM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  db.prepare(
    `UPDATE qr_codes
     SET unique_code = ?, regenerated_count = regenerated_count + 1, updated_at = datetime('now')
     WHERE product_id = ?`
  ).run(newUniqueCode, productId);
  res.json(getProductById(productId));
});

// --- Admin Categories CRUD ---

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const name = optStr(req.body?.name);
  if (!name) {
    res.status(400).json({error: 'Nama kategori wajib diisi.'});
    return;
  }
  const baseSlug = slugify(name) || `kategori-${Date.now()}`;
  let slug = baseSlug;
  let idx = 1;
  while (db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(slug)) {
    idx += 1;
    slug = `${baseSlug}-${idx}`;
  }

  const result = db
    .prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)')
    .run(name, slug, optStr(req.body?.description));
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(result.lastInsertRowid)));
});

app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const name = optStr(req.body?.name);
  if (!name) {
    res.status(400).json({error: 'Nama kategori wajib diisi.'});
    return;
  }
  db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(
    name,
    optStr(req.body?.description),
    id
  );
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({success: true});
});

// --- Admin Settings ---

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const allowedKeys = [
    'site_name',
    'subtitle',
    'institution',
    'hero_title',
    'hero_description',
    'about_title',
    'about_description',
    'about_purpose',
    'about_prodi_role',
    'contact_email',
    'contact_phone',
    'contact_address',
  ];
  const upsert = db.prepare(
    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value'
  );
  const tx = db.transaction(() => {
    for (const key of allowedKeys) {
      const val = optStr(req.body?.[key]);
      if (val !== null) {
        upsert.run(key, val);
      }
    }
    if (req.body?.public_base_url !== undefined) {
      const customUrl = sanitizeHttpUrl(req.body.public_base_url);
      upsert.run('public_base_url', customUrl ? customUrl.replace(/\/+$/, '') : '');
    }
  });
  tx();
  res.json(getSiteSettings());
});

// ==================== VITE / STATIC SETUP ====================

async function startServer(): Promise<void> {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMART HALAL CAMPUS MART server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
