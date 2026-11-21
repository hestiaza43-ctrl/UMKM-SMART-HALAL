import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  Category,
  HalalCertificate,
  Product,
  ProductVariant,
  QRCodeRecord,
  SiteSettings,
  SiteStats,
  Umkm,
} from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {recursive: true});
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, {recursive: true});
}

const DB_PATH = path.join(DATA_DIR, 'smart_halal_mart.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT 'Admin UNIKMA',
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS umkm (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_name TEXT,
      phone TEXT,
      address TEXT,
      maps_url TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS halal_certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_number TEXT NOT NULL,
      spp_irt_number TEXT,
      issued_date TEXT,
      expiry_date TEXT,
      document_url TEXT,
      verification_status TEXT NOT NULL DEFAULT 'Data Sertifikat Tersedia'
        CHECK (verification_status IN ('Data Sertifikat Tersedia', 'Terverifikasi', 'Perlu Pemeriksaan Ulang')),
      verification_evidence TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      umkm_id INTEGER NOT NULL REFERENCES umkm(id) ON DELETE RESTRICT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      certificate_id INTEGER REFERENCES halal_certificates(id) ON DELETE SET NULL,
      main_image TEXT,
      gallery_images TEXT NOT NULL DEFAULT '[]',
      story TEXT,
      ingredients TEXT,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      variant_name TEXT NOT NULL,
      image_url TEXT,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS qr_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
      unique_code TEXT NOT NULL UNIQUE,
      target_path TEXT NOT NULL UNIQUE,
      regenerated_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL
    );
  `);

  seedInitialSettings();
  seedInitialCatalog();
  backfillProductStoriesAndIngredients();
}

const INITIAL_PRODUCT_DETAILS: Record<
  string,
  {story: string; ingredients: string; mainImage?: string}
> = {
  'basreng-mba-diah': {
    mainImage: '/src/assets/images/product_basreng_mba_diah_1795266640092.jpg',
    story:
      'Diproduksi oleh UMKM Mba Diah di Desa Cijati, Kecamatan Cimanggu, Cilacap. Basreng (bakso goreng) diiris tipis lalu digoreng hingga renyah dan dipadukan dengan racikan bumbu gurih serta aroma daun jeruk yang menggugah selera.',
    ingredients:
      'Bakso ikan olahan, tepung tapioka, bawang putih, cabai bubuk, daun jeruk, garam, gula, minyak goreng nabati, dan bumbu penyedap halal.',
  },
  'talas-mustofa-mba-diah': {
    mainImage: '/src/assets/images/product_talas_mustofa_1795266639867.jpg',
    story:
      'Diproduksi oleh UMKM Mba Diah di Desa Cijati, Kecamatan Cimanggu, Cilacap. Terbuat dari umbi talas pilihan yang diserut tipis, digoreng kering hingga renyah, lalu dibalut bumbu balado manis-pedas khas rumahan.',
    ingredients:
      'Talas pilihan, gula pasir, cabai merah, bawang merah, bawang putih, asam jawa, garam, dan minyak goreng nabati.',
  },
  'kerupuk-seblak-mba-diah': {
    mainImage: '/src/assets/images/product_kerupuk_seblak_1795266640066.jpg',
    story:
      'Diproduksi oleh UMKM Mba Diah di Desa Cijati, Kecamatan Cimanggu, Cilacap. Camilan kerupuk seblak kering dengan cita rasa kencur autentik, gurih, dan pedas pas yang cocok dinikmati kapan saja.',
    ingredients:
      'Kerupuk aci pilihan, tepung tapioka, kencur segar, bawang putih, cabai rawit kering, daun jeruk, garam, gula, dan minyak goreng nabati.',
  },
  'sale-pisang-abah-soleh': {
    mainImage: '/src/assets/images/product_sale_pisang_abah_soleh_1795266640515.jpg',
    story:
      'Diproduksi oleh UMKM Abah Soleh di Dusun Cicadas, Desa Pesahangan, Kecamatan Cimanggu, Cilacap. Mengolah pisang matang pilihan melalui proses pengeringan dan penggorengan berbalut tepung renyah sehingga menghasilkan rasa manis legit khas sale tradisional.',
    ingredients:
      'Pisang matang pilihan, tepung beras, tepung terigu, gula pasir, garam, dan minyak goreng nabati.',
  },
  'keripik-pangsit-ananda-guntur': {
    mainImage: '/src/assets/images/product_keripik_pangsit_1795266640809.jpg',
    story:
      'Diproduksi oleh UMKM Ananda Guntur di Cinengah, Desa Pesahangan, Kecamatan Cimanggu, Cilacap. Kulit pangsit olahan sendiri dipotong rapi dan digoreng pada suhu terkontrol untuk menghasilkan keripik yang renyah, ringan, dan gurih.',
    ingredients:
      'Tepung terigu, tepung tapioka, telur, bawang putih, daun seledri, garam, air bersih, dan minyak goreng nabati.',
  },
  'keripik-pisang-ananda-guntur': {
    mainImage: '/src/assets/images/product_sriping_pisang_1795266640050.jpg',
    story:
      'Diproduksi oleh UMKM Ananda Guntur di Cinengah, Desa Pesahangan, Kecamatan Cimanggu, Cilacap. Terbuat dari pisang kepok pilihan yang diiris tipis memanjang (sriping) dan diolah secara higienis untuk menjaga kerenyahan serta rasa gurih alaminya.',
    ingredients:
      'Pisang kepok pilihan, garam halus, air kapur sirih (food grade), dan minyak goreng nabati.',
  },
  'sistik-ananda-guntur': {
    mainImage: '/src/assets/images/product_sistik_original_1795265543802.jpg',
    story:
      'Diproduksi oleh UMKM Ananda Guntur di Cinengah, Desa Pesahangan, Kecamatan Cimanggu, Cilacap. Kue stik renyah berbahan dasar terigu dan keju pilihan, tersedia dalam varian Original yang gurih klasik dan varian Pedas berbumbu cabai.',
    ingredients:
      'Tepung terigu, tepung tapioka, margarin, telur, keju parut, bawang putih, garam, bubuk cabai (varian pedas), dan minyak goreng nabati.',
  },
  'teng-teng-jahe-berkah-mulia': {
    mainImage: '/src/assets/images/product_teng_teng_jahe_1795266640369.jpg',
    story:
      'Diproduksi oleh UMKM Berkah Mulia di Rejodadi, Cimanggu, Cilacap. Perpaduan hangatnya sari jahe alami dengan gula merah dan kacang sangrai yang dicetak rapi sebagai camilan tradisional yang menghangatkan tubuh.',
    ingredients:
      'Jahe segar pilihan, gula merah, gula pasir, kacang tanah sangrai, wijen, dan garam.',
  },
  'marning-jagung-bu-tik': {
    mainImage: '/src/assets/images/product_marning_jagung_1795266639937.jpg',
    story:
      'Diproduksi oleh Butik Banyumas sebagai camilan tradisional berbahan jagung pilihan. Biji jagung diolah hingga empuk lalu digoreng renyah bersama bumbu bawang gurih khas Banyumas.',
    ingredients:
      'Jagung pipil pilihan, bawang putih, ketumbar, garam, gula, kapur sirih (food grade), dan minyak goreng nabati.',
  },
  'combro-azka-food': {
    mainImage: '/src/assets/images/product_combro_azka_1795266640452.jpg',
    story:
      'Diproduksi oleh Agri Sari Kandangan Abadi Food. Combro kering renyah yang diolah dari parutan singkong segar dengan isian bumbu oncom gurih pedas yang tahan lama sebagai camilan maupun oleh-oleh.',
    ingredients:
      'Singkong parut pilihan, oncom, cabai merah, bawang merah, bawang putih, kencur, daun bawang, garam, gula, dan minyak goreng nabati.',
  },
  'sale-kering-azka-foods': {
    mainImage: '/src/assets/images/product_sale_kering_azka_1795266639506.jpg',
    story:
      'Diproduksi oleh Agri Sari Kandangan Abadi Food. Pisang matang manis diiris tipis lalu dikeringkan dan diolah menjadi keripik sale kering yang renyah dan tahan lama.',
    ingredients:
      'Pisang matang pilihan, tepung beras, sedikit garam, dan minyak goreng nabati.',
  },
};

function backfillProductStoriesAndIngredients(): void {
  const fillStory = db.prepare(
    `UPDATE products SET story = ? WHERE slug = ? AND (story IS NULL OR TRIM(story) = '')`
  );
  const fillIngredients = db.prepare(
    `UPDATE products SET ingredients = ? WHERE slug = ? AND (ingredients IS NULL OR TRIM(ingredients) = '')`
  );
  const fillImage = db.prepare(
    `UPDATE products SET main_image = ? WHERE slug = ? AND (main_image IS NULL OR TRIM(main_image) = '')`
  );
  const tx = db.transaction(() => {
    for (const [slug, detail] of Object.entries(INITIAL_PRODUCT_DETAILS)) {
      fillStory.run(detail.story, slug);
      fillIngredients.run(detail.ingredients, slug);
      if (detail.mainImage) {
        fillImage.run(detail.mainImage, slug);
      }
    }
  });
  tx();
}

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'SMART HALAL CAMPUS MART',
  subtitle: 'Prodi Bisnis Digital',
  institution: 'Universitas Komputama Cilacap (UNIKMA)',
  hero_title: 'Temukan Produk UMKM Tersertifikasi Halal',
  hero_description:
    'Jelajahi berbagai produk UMKM pilihan dengan informasi sertifikasi halal yang transparan dan mudah diakses.',
  about_title: 'Tentang Smart Halal Campus Mart',
  about_description:
    'Smart Halal Campus Mart adalah etalase digital terpadu yang mendokumentasikan produk pangan UMKM mitra kampus beserta identitas produsen, nomor sertifikat halal, SPP-IRT, dan komposisi bahan.',
  about_purpose:
    'Memudahkan masyarakat, mahasiswa, dan konsumen untuk memverifikasi informasi awal sertifikat halal melalui pemindaian QR Code serta terhubung langsung dengan produsen UMKM melalui WhatsApp.',
  about_prodi_role:
    'Dikembangkan oleh Program Studi Bisnis Digital Universitas Komputama Cilacap (UNIKMA) sebagai inisiatif digitalisasi pemasaran UMKM lokal, literasi jaminan produk halal, dan penguatan ekonomi kerakyatan berbasis teknologi.',
  contact_email: 'bisnisdigital@unikma.ac.id',
  contact_phone: '082134755307',
  contact_address: 'Jl. Kemerdekaan Barat No. 2, Kesugihan, Kabupaten Cilacap, Jawa Tengah',
  public_base_url: '',
};

function seedInitialSettings(): void {
  const upsert = db.prepare(`
    INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)
  `);
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      upsert.run(key, value);
    }
  });
  tx();
}

function seedInitialCatalog(): void {
  const existingCount = (db.prepare('SELECT COUNT(*) as count FROM products').get() as {count: number}).count;
  if (existingCount > 0) {
    return;
  }

  const insertCategory = db.prepare(
    'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)'
  );
  const insertUmkm = db.prepare(
    'INSERT INTO umkm (name, owner_name, phone, address, maps_url, description) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertCert = db.prepare(
    `INSERT INTO halal_certificates
     (certificate_number, spp_irt_number, issued_date, expiry_date, document_url, verification_status, verification_evidence, verified_at)
     VALUES (?, ?, NULL, NULL, NULL, 'Data Sertifikat Tersedia', NULL, NULL)`
  );
  const insertProduct = db.prepare(
    `INSERT INTO products
     (name, slug, umkm_id, category_id, certificate_id, main_image, gallery_images, story, ingredients, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertVariant = db.prepare(
    'INSERT INTO product_variants (product_id, variant_name, image_url, description, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  const insertQr = db.prepare(
    'INSERT INTO qr_codes (product_id, unique_code, target_path) VALUES (?, ?, ?)'
  );

  const tx = db.transaction(() => {
    // Categories
    const catKeripik = Number(
      insertCategory.run('Keripik & Snack Renyah', 'keripik-snack-renyah', 'Aneka keripik gurih, basreng, dan camilan renyah.').lastInsertRowid
    );
    const catOlahanPisang = Number(
      insertCategory.run('Olahan Pisang & Manisan', 'olahan-pisang-manisan', 'Sale pisang, keripik pisang, dan olahan buah.').lastInsertRowid
    );
    const catTradisional = Number(
      insertCategory.run('Camilan Tradisional', 'camilan-tradisional', 'Jajanan khas daerah, teng-teng jahe, marning, dan combro.').lastInsertRowid
    );

    // 6 UMKM entities (1 UMKM can have multiple products)
    const umkmMbaDiah = Number(
      insertUmkm.run(
        'UMKM Mba Diah',
        'Mba Diah',
        '082134755307',
        'Desa Cijati, Kecamatan Cimanggu, Cilacap',
        'https://maps.google.com/?q=Desa+Cijati+Kecamatan+Cimanggu+Cilacap',
        null
      ).lastInsertRowid
    );
    const umkmAbahSoleh = Number(
      insertUmkm.run(
        'UMKM Abah Soleh',
        'Abah Soleh',
        '083870834609',
        'Dusun Cicadas, Desa Pesahangan, Kecamatan Cimanggu, Cilacap',
        'https://maps.google.com/?q=Desa+Pesahangan+Kecamatan+Cimanggu+Cilacap',
        null
      ).lastInsertRowid
    );
    const umkmAnandaGuntur = Number(
      insertUmkm.run(
        'UMKM Ananda Guntur',
        'Ananda Guntur',
        '081804899888',
        'Cinengah, Desa Pesahangan, Kecamatan Cimanggu, Cilacap',
        'https://maps.google.com/?q=Desa+Pesahangan+Kecamatan+Cimanggu+Cilacap',
        null
      ).lastInsertRowid
    );
    const umkmBerkahMulia = Number(
      insertUmkm.run(
        'Berkah Mulia',
        null,
        null,
        'Rejodadi, Cimanggu, Cilacap',
        'https://maps.google.com/?q=Rejodadi+Cimanggu+Cilacap',
        null
      ).lastInsertRowid
    );
    const umkmButikBanyumas = Number(
      insertUmkm.run(
        'Butik Banyumas',
        'Bu Tik',
        null,
        null,
        null,
        null
      ).lastInsertRowid
    );
    const umkmAzka = Number(
      insertUmkm.run(
        'Agri Sari Kandangan Abadi Food',
        null,
        null,
        null,
        null,
        null
      ).lastInsertRowid
    );

    // Halal certificates mapped accurately to each product's certificate & SPP-IRT data
    const certMbaDiah = Number(
      insertCert.run('33110067950610526', '200426008211300000001').lastInsertRowid
    );
    const certAbahSoleh = Number(
      insertCert.run('33110007452400723', '060723033751500000001').lastInsertRowid
    );
    const certAnandaGuntur = Number(
      insertCert.run('ID33110002342300223', '07002230091258').lastInsertRowid
    );
    const certBerkahMulia = Number(
      insertCert.run('ID33110002625330423', '2093301010530-25').lastInsertRowid
    );
    const certBuTik = Number(
      insertCert.run('ID33110015122200124', '211330211088-29').lastInsertRowid
    );
    const certAzkaCombro = Number(
      insertCert.run('ID33410029656101025', '2113304040507-30').lastInsertRowid
    );
    const certAzkaSale = Number(
      insertCert.run('ID33410029656101025', '2043304030507-30').lastInsertRowid
    );

    const makeQrCode = () => `SHCM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const initialProducts: Array<{
      name: string;
      slug: string;
      umkmId: number;
      categoryId: number;
      certId: number;
      mainImage: string | null;
      gallery: string[];
      featured: number;
      variants?: Array<{name: string; image: string | null; desc: string | null}>;
    }> = [
      {
        name: 'Basreng Mba Diah',
        slug: 'basreng-mba-diah',
        umkmId: umkmMbaDiah,
        categoryId: catKeripik,
        certId: certMbaDiah,
        mainImage: null,
        gallery: [],
        featured: 1,
      },
      {
        name: 'Talas Mustafa Mba Diah',
        slug: 'talas-mustofa-mba-diah',
        umkmId: umkmMbaDiah,
        categoryId: catKeripik,
        certId: certMbaDiah,
        mainImage: null,
        gallery: [],
        featured: 0,
      },
      {
        name: 'Kerupuk Seblak Mba Diah',
        slug: 'kerupuk-seblak-mba-diah',
        umkmId: umkmMbaDiah,
        categoryId: catKeripik,
        certId: certMbaDiah,
        mainImage: null,
        gallery: [],
        featured: 0,
      },
      {
        name: 'Sale Pisang Abah Soleh',
        slug: 'sale-pisang-abah-soleh',
        umkmId: umkmAbahSoleh,
        categoryId: catOlahanPisang,
        certId: certAbahSoleh,
        mainImage: null,
        gallery: [],
        featured: 1,
      },
      {
        name: 'Keripik Pangsit Ananda Guntur',
        slug: 'keripik-pangsit-ananda-guntur',
        umkmId: umkmAnandaGuntur,
        categoryId: catKeripik,
        certId: certAnandaGuntur,
        mainImage: null,
        gallery: [],
        featured: 0,
      },
      {
        name: 'Sriping Pisang Ananda Guntur',
        slug: 'keripik-pisang-ananda-guntur',
        umkmId: umkmAnandaGuntur,
        categoryId: catOlahanPisang,
        certId: certAnandaGuntur,
        mainImage: null,
        gallery: [],
        featured: 0,
      },
      {
        name: 'Sistik Ananda Guntur',
        slug: 'sistik-ananda-guntur',
        umkmId: umkmAnandaGuntur,
        categoryId: catKeripik,
        certId: certAnandaGuntur,
        mainImage: '/src/assets/images/product_sistik_original_1795265543802.jpg',
        gallery: [
          '/src/assets/images/product_sistik_original_1795265543802.jpg',
          '/src/assets/images/product_sistik_pedas_1795265544469.jpg',
        ],
        featured: 1,
        variants: [
          {
            name: 'Original',
            image: '/src/assets/images/product_sistik_original_1795265543802.jpg',
            desc: 'Varian rasa gurih original',
          },
          {
            name: 'Pedas',
            image: '/src/assets/images/product_sistik_pedas_1795265544469.jpg',
            desc: 'Varian bumbu pedas',
          },
        ],
      },
      {
        name: 'Teng-Teng Jahe Berkah Mulia',
        slug: 'teng-teng-jahe-berkah-mulia',
        umkmId: umkmBerkahMulia,
        categoryId: catTradisional,
        certId: certBerkahMulia,
        mainImage: null,
        gallery: [],
        featured: 0,
      },
      {
        name: 'Marning Jagung Bu Tik',
        slug: 'marning-jagung-bu-tik',
        umkmId: umkmButikBanyumas,
        categoryId: catTradisional,
        certId: certBuTik,
        mainImage: null,
        gallery: [],
        featured: 0,
      },
      {
        name: 'Combro Azka Food',
        slug: 'combro-azka-food',
        umkmId: umkmAzka,
        categoryId: catTradisional,
        certId: certAzkaCombro,
        mainImage: null,
        gallery: [],
        featured: 0,
      },
      {
        name: 'Keripik Sale Kering Azka Foods',
        slug: 'sale-kering-azka-foods',
        umkmId: umkmAzka,
        categoryId: catOlahanPisang,
        certId: certAzkaSale,
        mainImage: null,
        gallery: [],
        featured: 0,
      },
    ];

    for (const item of initialProducts) {
      const detail = INITIAL_PRODUCT_DETAILS[item.slug];
      const productId = Number(
        insertProduct.run(
          item.name,
          item.slug,
          item.umkmId,
          item.categoryId,
          item.certId,
          item.mainImage ?? detail?.mainImage ?? null,
          JSON.stringify(item.gallery),
          detail?.story ?? null,
          detail?.ingredients ?? null,
          item.featured
        ).lastInsertRowid
      );

      if (item.variants) {
        item.variants.forEach((v, idx) => {
          insertVariant.run(productId, v.name, v.image, v.desc, idx);
        });
      }

      insertQr.run(productId, makeQrCode(), `/produk/${item.slug}`);
    }
  });

  tx();
}

export function getSiteSettings(): SiteSettings {
  const rows = db.prepare('SELECT setting_key, setting_value FROM site_settings').all() as Array<{
    setting_key: string;
    setting_value: string;
  }>;
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.setting_key] = row.setting_value;
  }
  return {
    site_name: map.site_name ?? DEFAULT_SETTINGS.site_name,
    subtitle: map.subtitle ?? DEFAULT_SETTINGS.subtitle,
    institution: map.institution ?? DEFAULT_SETTINGS.institution,
    hero_title: map.hero_title ?? DEFAULT_SETTINGS.hero_title,
    hero_description: map.hero_description ?? DEFAULT_SETTINGS.hero_description,
    about_title: map.about_title ?? DEFAULT_SETTINGS.about_title,
    about_description: map.about_description ?? DEFAULT_SETTINGS.about_description,
    about_purpose: map.about_purpose ?? DEFAULT_SETTINGS.about_purpose,
    about_prodi_role: map.about_prodi_role ?? DEFAULT_SETTINGS.about_prodi_role,
    contact_email: map.contact_email ?? DEFAULT_SETTINGS.contact_email,
    contact_phone: map.contact_phone ?? DEFAULT_SETTINGS.contact_phone,
    contact_address: map.contact_address ?? DEFAULT_SETTINGS.contact_address,
    public_base_url: map.public_base_url ?? DEFAULT_SETTINGS.public_base_url,
  };
}

export function getSiteStats(): SiteStats {
  const total_products = (db.prepare('SELECT COUNT(*) as c FROM products').get() as {c: number}).c;
  const total_umkm = (db.prepare('SELECT COUNT(*) as c FROM umkm').get() as {c: number}).c;
  const total_certificates = (
    db.prepare('SELECT COUNT(DISTINCT certificate_number) as c FROM halal_certificates').get() as {c: number}
  ).c;
  const total_categories = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as {c: number}).c;
  const total_verified = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM products p
         JOIN halal_certificates hc ON p.certificate_id = hc.id
         WHERE hc.verification_status = 'Terverifikasi'`
      )
      .get() as {c: number}
  ).c;

  return {
    total_products,
    total_umkm,
    total_certificates,
    total_categories,
    total_verified,
  };
}

interface RawProductRow {
  id: number;
  name: string;
  slug: string;
  umkm_id: number;
  category_id: number | null;
  certificate_id: number | null;
  main_image: string | null;
  gallery_images: string;
  story: string | null;
  ingredients: string | null;
  is_featured: number;
  created_at: string;
  updated_at: string;
}

export function hydrateProduct(row: RawProductRow): Product {
  const umkm = db.prepare('SELECT * FROM umkm WHERE id = ?').get(row.umkm_id) as Umkm;
  const category = row.category_id
    ? (db.prepare('SELECT * FROM categories WHERE id = ?').get(row.category_id) as Category | undefined) ?? null
    : null;
  const certificate = row.certificate_id
    ? (db
        .prepare('SELECT * FROM halal_certificates WHERE id = ?')
        .get(row.certificate_id) as HalalCertificate | undefined) ?? null
    : null;
  const variants = db
    .prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC, id ASC')
    .all(row.id) as ProductVariant[];
  const qr_code =
    (db.prepare('SELECT * FROM qr_codes WHERE product_id = ?').get(row.id) as QRCodeRecord | undefined) ?? null;

  let gallery_images: string[] = [];
  try {
    const parsed = JSON.parse(row.gallery_images);
    if (Array.isArray(parsed)) {
      gallery_images = parsed.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    gallery_images = [];
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    umkm_id: row.umkm_id,
    category_id: row.category_id,
    certificate_id: row.certificate_id,
    main_image: row.main_image,
    gallery_images,
    story: row.story,
    ingredients: row.ingredients,
    is_featured: Boolean(row.is_featured),
    created_at: row.created_at,
    updated_at: row.updated_at,
    umkm,
    category,
    certificate,
    variants,
    qr_code,
  };
}

export function listProducts(search?: string, categorySlug?: string): Product[] {
  let sql = `
    SELECT p.* FROM products p
    LEFT JOIN umkm u ON p.umkm_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN halal_certificates hc ON p.certificate_id = hc.id
    WHERE 1=1
  `;
  const params: Array<string> = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ` AND (p.name LIKE ? OR u.name LIKE ? OR hc.certificate_number LIKE ? OR hc.spp_irt_number LIKE ?)`;
    params.push(term, term, term, term);
  }

  if (categorySlug && categorySlug.trim() && categorySlug !== 'all') {
    sql += ` AND c.slug = ?`;
    params.push(categorySlug.trim());
  }

  sql += ` ORDER BY p.id ASC`;
  const rows = db.prepare(sql).all(...params) as RawProductRow[];
  return rows.map(hydrateProduct);
}

export function getProductBySlug(slug: string): Product | null {
  const row = db.prepare('SELECT * FROM products WHERE slug = ?').get(slug) as RawProductRow | undefined;
  return row ? hydrateProduct(row) : null;
}

export function getProductById(id: number): Product | null {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as RawProductRow | undefined;
  return row ? hydrateProduct(row) : null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ensureUniqueProductSlug(baseSlug: string): string {
  let candidate = baseSlug || `produk-${Date.now()}`;
  let suffix = 1;
  while (
    db.prepare('SELECT 1 FROM products WHERE slug = ?').get(candidate) ||
    db.prepare('SELECT 1 FROM qr_codes WHERE target_path = ?').get(`/produk/${candidate}`)
  ) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
  return candidate;
}
