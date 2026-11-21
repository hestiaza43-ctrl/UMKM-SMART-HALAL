import {useMemo, useState} from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Menu,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {Category, Product, SiteSettings, SiteStats} from '../types';
import {CampusLogo, HalalSealIcon} from './CampusLogo';
import {ProductImage} from './ProductImage';
import {buildProductTargetUrl, QRCodeGraphic} from './QRCodeView';

interface LandingPageProps {
  settings: SiteSettings;
  stats: SiteStats;
  categories: Category[];
  products: Product[];
  loading: boolean;
  onNavigate: (path: string) => void;
  initialFocusCatalog?: boolean;
}

export function LandingPage({
  settings,
  stats,
  categories,
  products,
  loading,
  onNavigate,
}: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.category?.slug === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.umkm.name.toLowerCase().includes(q) ||
        (p.certificate?.certificate_number || '').toLowerCase().includes(q) ||
        (p.certificate?.spp_irt_number || '').toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, selectedCategory]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-6">
          {/* Brand */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
              window.scrollTo({top: 0, behavior: 'smooth'});
            }}
            className="flex items-center gap-3 min-w-0 shrink-0"
          >
            <div className="w-10 h-10 rounded-xl border border-emerald-900/10 shadow-xs overflow-hidden shrink-0">
              <CampusLogo className="w-full h-full" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-sm sm:text-base tracking-tight text-[#075C3B] whitespace-nowrap">
                {settings.site_name}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 whitespace-nowrap truncate">
                {settings.subtitle} · {settings.institution}
              </p>
            </div>
          </a>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection('beranda')}
              className="hover:text-[#168B50] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('katalog')}
              className="hover:text-[#168B50] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Katalog Produk
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('tentang')}
              className="hover:text-[#168B50] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Tentang Kami
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('kontak')}
              className="hover:text-[#168B50] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Kontak
            </button>
          </nav>

          {/* Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#168B50] text-white text-xs sm:text-sm font-semibold hover:bg-[#075C3B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Dashboard Admin
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu navigasi"
              className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-2">
            <button
              type="button"
              onClick={() => scrollToSection('beranda')}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-[#F5F7F5]"
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('katalog')}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-[#F5F7F5]"
            >
              Katalog Produk
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('tentang')}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-[#F5F7F5]"
            >
              Tentang Kami
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('kontak')}
              className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-[#F5F7F5]"
            >
              Kontak
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('/admin');
              }}
              className="w-full mt-2 px-4 py-2.5 rounded-xl bg-[#168B50] text-white text-sm font-semibold text-center"
            >
              Dashboard Admin
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section id="beranda" className="bg-[#F5F7F5] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center">
                <p className="text-xs sm:text-sm font-semibold text-[#168B50] mb-3">
                  {settings.subtitle} · {settings.institution}
                </p>
                <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-[44px] text-[#075C3B] leading-[1.15] tracking-tight text-balance">
                  {settings.hero_title}
                </h1>
                <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                  {settings.hero_description}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => scrollToSection('katalog')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#168B50] text-white text-sm font-semibold hover:bg-[#075C3B] transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    Jelajahi Produk
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('/poster-toko')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 text-[#075C3B] text-sm font-semibold hover:border-[#168B50] hover:bg-emerald-50/50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <QrCode className="w-4 h-4 text-[#168B50]" />
                    Poster QR Toko
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[260px] lg:min-h-[360px] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <img
                    src="/src/assets/images/hero_umkm_halal_showcase_1795265543247.jpg"
                    alt="Showcase Produk UMKM Tersertifikasi Halal Smart Halal Campus Mart"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Live Database Statistics Strip */}
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <p className="text-xs font-medium text-slate-500">Total Produk UMKM</p>
                <p className="mt-2 font-display font-bold text-2xl sm:text-3xl text-[#075C3B] tabular-nums">
                  {stats.total_products}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <p className="text-xs font-medium text-slate-500">Total Mitra UMKM</p>
                <p className="mt-2 font-display font-bold text-2xl sm:text-3xl text-[#075C3B] tabular-nums">
                  {stats.total_umkm}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <p className="text-xs font-medium text-slate-500">Data Sertifikat Halal</p>
                <p className="mt-2 font-display font-bold text-2xl sm:text-3xl text-[#075C3B] tabular-nums">
                  {stats.total_certificates}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <p className="text-xs font-medium text-slate-500">Kategori Produk</p>
                <p className="mt-2 font-display font-bold text-2xl sm:text-3xl text-[#075C3B] tabular-nums">
                  {stats.total_categories}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Catalog Section */}
        <section id="katalog" className="py-14 lg:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200">
              <div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#075C3B] tracking-tight">
                  Katalog Produk UMKM
                </h2>
                <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
                  Pilih produk untuk melihat profil UMKM, nomor sertifikat halal, SPP-IRT, komposisi bahan, serta QR Code resmi produk.
                </p>
              </div>

              {/* Search Box */}
              <div className="w-full md:w-80 shrink-0">
                <label htmlFor="catalog-search" className="sr-only">
                  Cari produk atau UMKM
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="catalog-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama produk, UMKM, atau ID Halal..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-[#F5F7F5] text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#168B50] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Category Filters */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#168B50] text-white'
                    : 'bg-[#F5F7F5] text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                Semua Produk ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === cat.slug
                      ? 'bg-[#168B50] text-white'
                      : 'bg-[#F5F7F5] text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            {loading ? (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({length: 6}).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 overflow-hidden bg-white p-4 space-y-3"
                  >
                    <div className="aspect-[4/3] rounded-xl bg-slate-100 animate-pulse" />
                    <div className="h-5 w-2/3 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-slate-200 bg-[#F5F7F5] p-12 text-center">
                <p className="font-display font-semibold text-base text-slate-800">
                  Produk tidak ditemukan
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Coba ubah kata kunci pencarian atau pilih kategori lainnya.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#168B50] text-white text-sm font-semibold hover:bg-[#075C3B] transition-colors"
                >
                  Tampilkan Semua Produk
                </button>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const isVerified = product.certificate?.verification_status === 'Terverifikasi';
                  return (
                    <article
                      key={product.id}
                      onClick={() => onNavigate(`/produk/${product.slug}`)}
                      className="group rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer"
                    >
                      <div className="border-b border-slate-100 overflow-hidden">
                        <ProductImage
                          src={product.main_image}
                          alt={product.name}
                          productName={product.name}
                          className="group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>

                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="truncate">{product.category?.name || 'Produk UMKM'}</span>
                          {product.variants.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="whitespace-nowrap">{product.variants.length} Varian</span>
                            </>
                          )}
                        </div>

                        <h3 className="mt-1.5 font-display font-bold text-lg text-slate-900 group-hover:text-[#168B50] transition-colors leading-snug">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-sm font-medium text-slate-600">{product.umkm.name}</p>

                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center gap-2 text-[#075C3B] font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-[#168B50] shrink-0" />
                            <span>
                              {isVerified ? 'Terverifikasi Halal (BPJPH)' : 'Data Sertifikat Tersedia'}
                            </span>
                          </div>
                          <p className="font-mono text-slate-500 tabular-nums truncate">
                            ID Halal: {product.certificate?.certificate_number || 'Belum tersedia'}
                          </p>
                        </div>

                        <div className="mt-5 pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate(`/produk/${product.slug}`);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#168B50] text-white text-sm font-semibold hover:bg-[#075C3B] transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Lihat Detail
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Buka Poster QR Code"
                            aria-label={`Poster QR Code ${product.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate(`/poster/${product.slug}`);
                            }}
                            className="w-10 h-10 rounded-xl border border-slate-200 bg-[#F5F7F5] text-[#075C3B] hover:border-[#168B50] hover:bg-emerald-50 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* About Us Section */}
        <section id="tentang" className="py-14 lg:py-16 bg-[#F5F7F5] border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <p className="text-xs font-semibold text-[#168B50] mb-2">
                    Inisiatif Digitalisasi UMKM Kampus
                  </p>
                  <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#075C3B] tracking-tight">
                    {settings.about_title}
                  </h2>
                </div>

                <p className="text-base text-slate-700 leading-relaxed">{settings.about_description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#168B50] flex items-center justify-center mb-3">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-bold text-base text-slate-900">
                      Tujuan Pengembangan
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {settings.about_purpose}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#168B50] flex items-center justify-center mb-3">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-bold text-base text-slate-900">
                      Peran Prodi Bisnis Digital UNIKMA
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {settings.about_prodi_role}
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Poster Concept Card */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <div className="bg-[#168B50] px-6 py-6 text-center text-white">
                    <p className="font-display font-extrabold text-lg tracking-tight">
                      SMART HALAL CAMPUS MART
                    </p>
                    <p className="text-xs text-emerald-50 mt-1">
                      {settings.subtitle} · {settings.institution}
                    </p>
                  </div>
                  <div className="p-6 text-center space-y-4">
                    <div className="relative inline-flex items-center justify-center p-3.5 rounded-2xl border-2 border-[#168B50] bg-white">
                      <QRCodeGraphic
                        value={buildProductTargetUrl('/', settings.public_base_url)}
                        size={144}
                        darkColor="#111827"
                      />
                      <div className="absolute -top-3 -right-3 bg-white rounded-full p-0.5">
                        <HalalSealIcon className="w-8 h-8" fill="#168B50" checkColor="#FFFFFF" />
                      </div>
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm text-[#075C3B]">
                        SCAN UNTUK LIHAT KATALOG TOKO
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Tempel poster QR ini di pintu masuk atau meja kasir agar pengunjung langsung melihat semua produk di toko.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('/poster-toko')}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#168B50] text-white text-xs font-semibold hover:bg-[#075C3B] transition-colors cursor-pointer"
                    >
                      Buka &amp; Cetak Poster QR Toko
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Contact & Footer */}
      <footer id="kontak" className="bg-[#075C3B] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/15">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                  <CampusLogo className="w-full h-full" />
                </div>
                <div>
                  <p className="font-display font-bold text-base">{settings.site_name}</p>
                  <p className="text-xs text-emerald-100">
                    {settings.subtitle} · {settings.institution}
                  </p>
                </div>
              </div>
              <p className="text-sm text-emerald-100/90 leading-relaxed max-w-md pt-2">
                Sistem informasi katalog produk UMKM tersertifikasi halal untuk mendukung transparansi produk dan kemudahan akses ke produsen lokal Cilacap dan sekitarnya.
              </p>
            </div>

            <div className="md:col-span-4 space-y-3 text-sm">
              <p className="font-display font-semibold text-white">Kontak Pengelola</p>
              <div className="space-y-2.5 text-emerald-100">
                <p className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-emerald-200" />
                  <span>{settings.contact_address}</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 shrink-0 text-emerald-200" />
                  <span>{settings.contact_email}</span>
                </p>
                <p className="flex items-center gap-2.5 tabular-nums">
                  <Phone className="w-4 h-4 shrink-0 text-emerald-200" />
                  <span>{settings.contact_phone}</span>
                </p>
              </div>
            </div>

            <div className="md:col-span-3 space-y-3 text-sm">
              <p className="font-display font-semibold text-white">Navigasi Cepat</p>
              <ul className="space-y-2 text-emerald-100">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('beranda')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Beranda
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('katalog')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Katalog Produk UMKM
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('tentang')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Tentang Kami
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/admin')}
                    className="hover:text-white transition-colors cursor-pointer font-medium"
                  >
                    Login Admin Pengelola
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-100/80">
            <p>
              © {new Date().getFullYear()} {settings.site_name} — {settings.subtitle} {settings.institution}
            </p>
            <p>Transparansi Informasi Halal &amp; Digitalisasi UMKM</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
