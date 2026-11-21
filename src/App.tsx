import {useCallback, useEffect, useState} from 'react';
import {AdminDashboard} from './components/AdminDashboard';
import {AdminLoginPage} from './components/AdminLoginPage';
import {LandingPage} from './components/LandingPage';
import {PosterPage} from './components/PosterPage';
import {ProductDetailPage} from './components/ProductDetailPage';
import {StorePosterPage} from './components/StorePosterPage';
import {api} from './lib/api';
import type {AdminUser, Category, Product, SiteSettings, SiteStats} from './types';

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

export default function App() {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname || '/');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<SiteStats>({
    total_products: 0,
    total_umkm: 0,
    total_certificates: 0,
    total_categories: 0,
    total_verified: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin session held strictly in React state (in-memory Bearer token)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const navigate = useCallback((nextPath: string) => {
    if (nextPath !== window.location.pathname) {
      window.history.pushState({}, '', nextPath);
    }
    setPathname(nextPath);
    window.scrollTo({top: 0, behavior: 'auto'});
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const refreshPublicData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, statsRes, catRes, prodRes] = await Promise.all([
        api.getSettings(),
        api.getStats(),
        api.getCategories(),
        api.getProducts(),
      ]);
      setSettings(sRes);
      setStats(statsRes);
      setCategories(catRes);
      setProducts(prodRes);
    } catch {
      // Keep graceful defaults if request fails transiently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPublicData();
  }, [refreshPublicData]);

  // Route matching
  if (pathname.startsWith('/produk/')) {
    const slug = decodeURIComponent(pathname.slice('/produk/'.length).replace(/\/+$/, ''));
    return <ProductDetailPage slug={slug} settings={settings} onNavigate={navigate} />;
  }

  if (pathname === '/poster-toko') {
    return <StorePosterPage settings={settings} stats={stats} onNavigate={navigate} />;
  }

  if (pathname.startsWith('/poster/')) {
    const slug = decodeURIComponent(pathname.slice('/poster/'.length).replace(/\/+$/, ''));
    return <PosterPage slug={slug} settings={settings} onNavigate={navigate} />;
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!adminToken || !adminUser) {
      return (
        <AdminLoginPage
          settings={settings}
          onSuccess={(token, user) => {
            setAdminToken(token);
            setAdminUser(user);
            navigate('/admin');
          }}
          onNavigate={navigate}
        />
      );
    }
    return (
      <AdminDashboard
        token={adminToken}
        user={adminUser}
        settings={settings}
        onSettingsUpdated={(next) => setSettings(next)}
        onCatalogUpdated={refreshPublicData}
        onLogout={() => {
          setAdminToken(null);
          setAdminUser(null);
          navigate('/admin/login');
        }}
        onNavigate={navigate}
      />
    );
  }

  return (
    <LandingPage
      settings={settings}
      stats={stats}
      categories={categories}
      products={products}
      loading={loading}
      onNavigate={navigate}
    />
  );
}
