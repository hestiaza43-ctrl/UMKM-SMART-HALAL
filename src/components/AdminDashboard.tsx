import {type FormEvent, useCallback, useEffect, useState} from 'react';
import {
  Award,
  Download,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import {api} from '../lib/api';
import {formatDateId} from '../lib/format';
import type {
  AdminUser,
  Category,
  HalalCertificate,
  Product,
  SiteSettings,
  SiteStats,
  Umkm,
} from '../types';
import {CampusLogo} from './CampusLogo';
import {buildProductTargetUrl, downloadQrPng, QRCodeGraphic} from './QRCodeView';
import {ProductFormModal} from './admin/ProductFormModal';
import {CertFormModal, UmkmFormModal} from './admin/UmkmAndCertModals';

type AdminTab =
  | 'dashboard'
  | 'products'
  | 'umkm'
  | 'certificates'
  | 'qrcodes'
  | 'categories'
  | 'settings';

interface AdminDashboardProps {
  token: string;
  user: AdminUser;
  settings: SiteSettings;
  onSettingsUpdated: (next: SiteSettings) => void;
  onCatalogUpdated: () => void;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

export function AdminDashboard({
  token,
  user,
  settings,
  onSettingsUpdated,
  onCatalogUpdated,
  onLogout,
  onNavigate,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stats, setStats] = useState<SiteStats>({
    total_products: 0,
    total_umkm: 0,
    total_certificates: 0,
    total_categories: 0,
    total_verified: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [umkmList, setUmkmList] = useState<Umkm[]>([]);
  const [certificates, setCertificates] = useState<HalalCertificate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [productModal, setProductModal] = useState<{open: boolean; item: Product | null}>({
    open: false,
    item: null,
  });
  const [umkmModal, setUmkmModal] = useState<{open: boolean; item: Umkm | null}>({
    open: false,
    item: null,
  });
  const [certModal, setCertModal] = useState<{open: boolean; item: HalalCertificate | null}>({
    open: false,
    item: null,
  });

  // Category inline form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Settings form
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(settings);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const loadAllAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, prodRes, umkmRes, certRes, catRes] = await Promise.all([
        api.getOverview(token),
        api.getAdminProducts(token),
        api.getAdminUmkm(token),
        api.getAdminCertificates(token),
        api.getCategories(),
      ]);
      setStats(overviewRes.stats);
      setProducts(prodRes);
      setUmkmList(umkmRes);
      setCertificates(certRes);
      setCategories(catRes);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal memuat data admin.',
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAllAdminData();
  }, [loadAllAdminData]);

  const notifyAndRefresh = async (message: string) => {
    setFeedback({type: 'success', message});
    await loadAllAdminData();
    onCatalogUpdated();
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Hapus produk "${p.name}"? QR Code produk ini juga akan terhapus.`)) return;
    try {
      await api.deleteProduct(p.id, token);
      await notifyAndRefresh(`Produk "${p.name}" berhasil dihapus.`);
    } catch (err) {
      setFeedback({type: 'error', message: err instanceof Error ? err.message : 'Gagal menghapus produk.'});
    }
  };

  const handleDeleteUmkm = async (u: Umkm) => {
    if (!window.confirm(`Hapus UMKM "${u.name}"?`)) return;
    try {
      await api.deleteUmkm(u.id, token);
      await notifyAndRefresh(`Data UMKM "${u.name}" berhasil dihapus.`);
    } catch (err) {
      setFeedback({type: 'error', message: err instanceof Error ? err.message : 'Gagal menghapus UMKM.'});
    }
  };

  const handleDeleteCert = async (c: HalalCertificate) => {
    if (!window.confirm(`Hapus data sertifikat "${c.certificate_number}"?`)) return;
    try {
      await api.deleteCertificate(c.id, token);
      await notifyAndRefresh(`Sertifikat "${c.certificate_number}" berhasil dihapus.`);
    } catch (err) {
      setFeedback({type: 'error', message: err instanceof Error ? err.message : 'Gagal menghapus sertifikat.'});
    }
  };

  const handleRegenerateQr = async (productId: number, productName: string) => {
    try {
      await api.regenerateQrCode(productId, token);
      await notifyAndRefresh(`Kode QR untuk "${productName}" berhasil diperbarui.`);
    } catch (err) {
      setFeedback({type: 'error', message: err instanceof Error ? err.message : 'Gagal menghasilkan ulang QR.'});
    }
  };

  const handleCategorySubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await api.updateCategory(editingCat.id, {name: catName, description: catDesc || null}, token);
        setEditingCat(null);
        setCatName('');
        setCatDesc('');
        await notifyAndRefresh('Kategori berhasil diperbarui.');
      } else {
        await api.createCategory({name: catName, description: catDesc || null}, token);
        setCatName('');
        setCatDesc('');
        await notifyAndRefresh('Kategori baru berhasil ditambahkan.');
      }
    } catch (err) {
      setFeedback({type: 'error', message: err instanceof Error ? err.message : 'Gagal menyimpan kategori.'});
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Hapus kategori "${cat.name}"?`)) return;
    try {
      await api.deleteCategory(cat.id, token);
      await notifyAndRefresh(`Kategori "${cat.name}" berhasil dihapus.`);
    } catch (err) {
      setFeedback({type: 'error', message: err instanceof Error ? err.message : 'Gagal menghapus kategori.'});
    }
  };

  const handleSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateSettings(settingsForm, token);
      onSettingsUpdated(updated);
      setFeedback({type: 'success', message: 'Pengaturan website berhasil disimpan.'});
    } catch (err) {
      setFeedback({type: 'error', message: err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.'});
    }
  };

  const menuItems: Array<{id: AdminTab; label: string; icon: typeof LayoutDashboard}> = [
    {id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard},
    {id: 'products', label: 'Data Produk', icon: Package},
    {id: 'umkm', label: 'Data UMKM', icon: Store},
    {id: 'certificates', label: 'Sertifikat Halal', icon: Award},
    {id: 'qrcodes', label: 'QR Code Produk', icon: QrCode},
    {id: 'categories', label: 'Kategori Produk', icon: FolderTree},
    {id: 'settings', label: 'Pengaturan Website', icon: Settings},
  ];

  const filteredProducts = products.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.umkm.name.toLowerCase().includes(q) ||
      (p.certificate?.certificate_number || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-white flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Green Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#075C3B] text-white flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-white/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white p-0.5 shrink-0">
              <CampusLogo className="w-full h-full" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-xs tracking-tight truncate">
                SMART HALAL MART
              </p>
              <p className="text-[11px] text-emerald-100 truncate">Admin Panel UNIKMA</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#168B50] text-white shadow-xs'
                    : 'text-emerald-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/15 space-y-1.5">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-emerald-100 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>Lihat Website Publik</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-100 hover:bg-red-500/20 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main White Content Area */}
      <div className="flex-1 min-w-0 flex flex-col bg-white">
        <header className="h-16 px-4 sm:px-8 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg text-slate-900">
                {menuItems.find((m) => m.id === activeTab)?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <span className="text-slate-500 hidden sm:inline">Masuk sebagai</span>
            <span className="font-semibold text-[#075C3B]">{user.full_name}</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 space-y-6 bg-[#F5F7F5]/40">
          {feedback && (
            <div
              className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-[#075C3B]'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <span>{feedback.message}</span>
              <button type="button" onClick={() => setFeedback(null)} className="p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs font-medium text-slate-500">Total Produk</p>
                  <p className="mt-2 font-display font-bold text-3xl text-[#075C3B] tabular-nums">
                    {stats.total_products}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs font-medium text-slate-500">Total UMKM</p>
                  <p className="mt-2 font-display font-bold text-3xl text-[#075C3B] tabular-nums">
                    {stats.total_umkm}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs font-medium text-slate-500">Total Sertifikat</p>
                  <p className="mt-2 font-display font-bold text-3xl text-[#075C3B] tabular-nums">
                    {stats.total_certificates}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs font-medium text-slate-500">Produk Terverifikasi</p>
                  <p className="mt-2 font-display font-bold text-3xl text-[#168B50] tabular-nums">
                    {stats.total_verified}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                  <h2 className="font-display font-bold text-base text-slate-900">
                    Produk Terbaru
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className="text-xs font-semibold text-[#168B50] hover:underline cursor-pointer"
                  >
                    Kelola Semua Produk
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F5F7F5] text-xs font-semibold text-slate-600">
                      <tr>
                        <th className="px-5 py-3">Nama Produk</th>
                        <th className="px-5 py-3">UMKM</th>
                        <th className="px-5 py-3">ID Sertifikat Halal</th>
                        <th className="px-5 py-3">Status Sertifikat</th>
                        <th className="px-5 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.slice(0, 8).map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-semibold text-slate-900">{p.name}</td>
                          <td className="px-5 py-3 text-slate-600">{p.umkm.name}</td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-700 tabular-nums">
                            {p.certificate?.certificate_number || '—'}
                          </td>
                          <td className="px-5 py-3 text-xs font-medium text-[#075C3B]">
                            {p.certificate?.verification_status || 'Belum ada data'}
                          </td>
                          <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onNavigate(`/produk/${p.slug}`)}
                              className="text-xs font-semibold text-[#168B50] hover:underline cursor-pointer"
                            >
                              Detail
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductModal({open: true, item: p})}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. DATA PRODUK */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari produk atau UMKM..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#168B50]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setProductModal({open: true, item: null})}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#168B50] hover:bg-[#075C3B] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Produk
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F5F7F5] text-xs font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Produk</th>
                        <th className="px-4 py-3">UMKM &amp; Kategori</th>
                        <th className="px-4 py-3">Sertifikat &amp; SPP-IRT</th>
                        <th className="px-4 py-3">Foto &amp; Varian</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            Memuat data produk...
                          </td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                            Tidak ada produk sesuai pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-10 rounded-lg bg-[#F5F7F5] border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                  {p.main_image ? (
                                    <img
                                      src={p.main_image}
                                      alt={p.name}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <Package className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{p.name}</p>
                                  <p className="text-[11px] font-mono text-slate-400">
                                    /produk/{p.slug}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800">{p.umkm.name}</p>
                              <p className="text-xs text-slate-500">
                                {p.category?.name || 'Tanpa kategori'}
                              </p>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs tabular-nums">
                              <p className="text-slate-800">
                                {p.certificate?.certificate_number || '—'}
                              </p>
                              <p className="text-slate-500">
                                SPP-IRT: {p.certificate?.spp_irt_number || '—'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              <p>{p.main_image ? 'Foto tersedia' : 'Belum ada foto'}</p>
                              {p.variants.length > 0 && (
                                <p className="text-[#075C3B] font-medium">
                                  {p.variants.length} varian
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                              <button
                                type="button"
                                onClick={() => onNavigate(`/produk/${p.slug}`)}
                                title="Lihat halaman detail"
                                className="p-2 rounded-lg text-[#168B50] hover:bg-emerald-50 cursor-pointer"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setProductModal({open: true, item: p})}
                                title="Edit produk"
                                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p)}
                                title="Hapus produk"
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. DATA UMKM */}
          {activeTab === 'umkm' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Kelola profil produsen UMKM, nomor WhatsApp, alamat, dan lokasi Google Maps.
                </p>
                <button
                  type="button"
                  onClick={() => setUmkmModal({open: true, item: null})}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#168B50] hover:bg-[#075C3B] text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Tambah UMKM
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {umkmList.map((u) => (
                  <div
                    key={u.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display font-bold text-base text-slate-900">
                            {u.name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Pemilik: {u.owner_name || 'Belum tersedia'} ·{' '}
                            <span className="tabular-nums">{u.product_count ?? 0} produk</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setUmkmModal({open: true, item: u})}
                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUmkm(u)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">
                        HP/WA:{' '}
                        <span className="font-mono tabular-nums">
                          {u.phone || 'Belum tersedia'}
                        </span>
                      </p>
                      <p className="text-xs text-slate-600">
                        Alamat: {u.address || 'Belum tersedia'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. SERTIFIKAT HALAL */}
          {activeTab === 'certificates' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Status awal adalah Data Sertifikat Tersedia. Ubah menjadi Terverifikasi hanya setelah pemeriksaan resmi dan melampirkan bukti pemeriksaan.
                </p>
                <button
                  type="button"
                  onClick={() => setCertModal({open: true, item: null})}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#168B50] hover:bg-[#075C3B] text-white text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Sertifikat
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F5F7F5] text-xs font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-3">ID Sertifikat Halal</th>
                        <th className="px-4 py-3">Nomor SPP-IRT</th>
                        <th className="px-4 py-3">Terbit / Berlaku</th>
                        <th className="px-4 py-3">Status Pemeriksaan</th>
                        <th className="px-4 py-3">Produk</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {certificates.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                            {c.certificate_number}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums">
                            {c.spp_irt_number || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            <p>Terbit: {formatDateId(c.issued_date)}</p>
                            <p>Berlaku: {formatDateId(c.expiry_date)}</p>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span
                              className={`font-semibold ${
                                c.verification_status === 'Terverifikasi'
                                  ? 'text-[#168B50]'
                                  : c.verification_status === 'Perlu Pemeriksaan Ulang'
                                    ? 'text-amber-700'
                                    : 'text-slate-700'
                              }`}
                            >
                              {c.verification_status}
                            </span>
                            {c.document_url && (
                              <a
                                href={c.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-[#168B50] hover:underline mt-0.5"
                              >
                                Lihat Dokumen
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums text-slate-600">
                            {c.linked_products_count ?? 0} produk
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                            <button
                              type="button"
                              onClick={() => setCertModal({open: true, item: c})}
                              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCert(c)}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. QR CODE PRODUK & TOKO */}
          {activeTab === 'qrcodes' && (
            <div className="space-y-6">
              {/* Storefront / Entrance QR Code Card */}
              <div className="bg-white rounded-2xl border-2 border-[#168B50]/30 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-white shrink-0">
                    <QRCodeGraphic
                      value={buildProductTargetUrl('/', settings.public_base_url)}
                      size={104}
                      darkColor="#111827"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#168B50]">QR Code Pintu Masuk Toko</p>
                    <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">
                      QR Code Beranda &amp; Seluruh Katalog Toko
                    </h2>
                    <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                      Pasang poster QR Code ini di pintu masuk toko atau meja kasir agar setiap pengunjung yang datang dapat langsung memindai dan melihat seluruh daftar produk yang tersedia.
                    </p>
                    <p className="font-mono text-[11px] text-[#075C3B] break-all pt-1">
                      {buildProductTargetUrl('/', settings.public_base_url)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => onNavigate('/poster-toko')}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#168B50] hover:bg-[#075C3B] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Printer className="w-4 h-4" />
                    Poster QR Toko
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadQrPng(
                        buildProductTargetUrl('/', settings.public_base_url),
                        'beranda-toko'
                      )
                    }
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    Download QR PNG
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-600">
                Kelola QR Code unik untuk setiap produk. URL detail produk bersifat permanen sehingga QR Code yang sudah dicetak tetap berfungsi meskipun informasi produk diperbarui.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map((p) => {
                  const targetPath = p.qr_code?.target_path || `/produk/${p.slug}`;
                  const targetUrl = buildProductTargetUrl(targetPath, settings.public_base_url);
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-xl border border-slate-200 bg-white shrink-0">
                          <QRCodeGraphic value={targetUrl} size={88} darkColor="#111827" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display font-bold text-sm text-slate-900 leading-snug">
                            {p.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">{p.umkm.name}</p>
                          <p className="mt-2 font-mono text-[11px] text-[#075C3B] break-all">
                            {targetPath}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-slate-400">
                            Kode: {p.qr_code?.unique_code || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => downloadQrPng(targetUrl, p.slug)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PNG
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate(`/poster/${p.slug}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#168B50] text-white text-xs font-semibold hover:bg-[#075C3B] cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Poster QR
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegenerateQr(p.id, p.name)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Regenerate
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. KATEGORI PRODUK */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <form
                  onSubmit={handleCategorySubmit}
                  className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
                >
                  <h2 className="font-display font-bold text-base text-slate-900">
                    {editingCat ? `Edit Kategori: ${editingCat.name}` : 'Tambah Kategori Baru'}
                  </h2>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nama Kategori *
                    </label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Contoh: Minuman Herbal"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Deskripsi
                    </label>
                    <textarea
                      rows={2}
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-[#168B50] hover:bg-[#075C3B] text-white text-sm font-semibold cursor-pointer"
                    >
                      {editingCat ? 'Simpan Perubahan' : 'Tambah Kategori'}
                    </button>
                    {editingCat && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCat(null);
                          setCatName('');
                          setCatDesc('');
                        }}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F5F7F5] text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-5 py-3">Kategori</th>
                      <th className="px-5 py-3">Jumlah Produk</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((cat) => (
                      <tr key={cat.id}>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">{cat.name}</p>
                          {cat.description && (
                            <p className="text-xs text-slate-500">{cat.description}</p>
                          )}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-slate-600">
                          {cat.product_count ?? 0}
                        </td>
                        <td className="px-5 py-3 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCat(cat);
                              setCatName(cat.name);
                              setCatDesc(cat.description ?? '');
                            }}
                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. PENGATURAN WEBSITE */}
          {activeTab === 'settings' && (
            <form
              onSubmit={handleSettingsSubmit}
              className="bg-white rounded-2xl border border-slate-200 p-6 max-w-3xl space-y-5"
            >
              <h2 className="font-display font-bold text-base text-slate-900">
                Identitas &amp; Konten Halaman Utama
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Website
                  </label>
                  <input
                    type="text"
                    value={settingsForm.site_name}
                    onChange={(e) => setSettingsForm({...settingsForm, site_name: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Subjudul Prodi
                  </label>
                  <input
                    type="text"
                    value={settingsForm.subtitle}
                    onChange={(e) => setSettingsForm({...settingsForm, subtitle: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Institusi
                  </label>
                  <input
                    type="text"
                    value={settingsForm.institution}
                    onChange={(e) => setSettingsForm({...settingsForm, institution: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Judul Hero
                  </label>
                  <input
                    type="text"
                    value={settingsForm.hero_title}
                    onChange={(e) => setSettingsForm({...settingsForm, hero_title: e.target.value})}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Deskripsi Hero
                  </label>
                  <textarea
                    rows={2}
                    value={settingsForm.hero_description}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, hero_description: e.target.value})
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Deskripsi Tentang Kami
                  </label>
                  <textarea
                    rows={3}
                    value={settingsForm.about_description}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, about_description: e.target.value})
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Kontak
                  </label>
                  <input
                    type="email"
                    value={settingsForm.contact_email}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, contact_email: e.target.value})
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nomor Telepon / WA Kontak
                  </label>
                  <input
                    type="text"
                    value={settingsForm.contact_phone}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, contact_phone: e.target.value})
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Alamat Kampus / Pengelola
                  </label>
                  <input
                    type="text"
                    value={settingsForm.contact_address}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, contact_address: e.target.value})
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    URL Publik Kustom untuk QR Code (Opsional)
                  </label>
                  <input
                    type="url"
                    value={settingsForm.public_base_url}
                    onChange={(e) =>
                      setSettingsForm({...settingsForm, public_base_url: e.target.value})
                    }
                    placeholder="Contoh: https://ais-pre-...run.app atau https://halalmart.unikma.ac.id"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Kosongkan agar sistem otomatis memakai URL publik (Shared URL) aplikasi saat membuat QR Code.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#168B50] hover:bg-[#075C3B] text-white text-sm font-semibold cursor-pointer"
                >
                  Simpan Pengaturan Website
                </button>
              </div>
            </form>
          )}
        </main>
      </div>

      {/* Modals */}
      {productModal.open && (
        <ProductFormModal
          product={productModal.item}
          umkmList={umkmList}
          categories={categories}
          certificates={certificates}
          token={token}
          onClose={() => setProductModal({open: false, item: null})}
          onSaved={async () => {
            const wasEdit = Boolean(productModal.item);
            setProductModal({open: false, item: null});
            await notifyAndRefresh(
              wasEdit ? 'Perubahan produk berhasil disimpan.' : 'Produk baru & QR Code berhasil ditambahkan.'
            );
          }}
        />
      )}

      {umkmModal.open && (
        <UmkmFormModal
          umkm={umkmModal.item}
          token={token}
          onClose={() => setUmkmModal({open: false, item: null})}
          onSaved={async () => {
            const wasEdit = Boolean(umkmModal.item);
            setUmkmModal({open: false, item: null});
            await notifyAndRefresh(
              wasEdit ? 'Data UMKM berhasil diperbarui.' : 'Mitra UMKM baru berhasil ditambahkan.'
            );
          }}
        />
      )}

      {certModal.open && (
        <CertFormModal
          certificate={certModal.item}
          token={token}
          onClose={() => setCertModal({open: false, item: null})}
          onSaved={async () => {
            const wasEdit = Boolean(certModal.item);
            setCertModal({open: false, item: null});
            await notifyAndRefresh(
              wasEdit ? 'Data sertifikat halal berhasil diperbarui.' : 'Sertifikat halal baru berhasil disimpan.'
            );
          }}
        />
      )}
    </div>
  );
}
