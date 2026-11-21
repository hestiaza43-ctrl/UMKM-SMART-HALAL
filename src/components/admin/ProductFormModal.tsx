import {type ChangeEvent, type FormEvent, useState} from 'react';
import {Plus, Trash2, Upload, X} from 'lucide-react';
import {api} from '../../lib/api';
import type {Category, HalalCertificate, Product, Umkm} from '../../types';

interface VariantDraft {
  variant_name: string;
  image_url: string;
  description: string;
}

interface ProductFormModalProps {
  product: Product | null;
  umkmList: Umkm[];
  categories: Category[];
  certificates: HalalCertificate[];
  token: string;
  onSaved: () => void;
  onClose: () => void;
}

export function ProductFormModal({
  product,
  umkmList,
  categories,
  certificates,
  token,
  onSaved,
  onClose,
}: ProductFormModalProps) {
  const [name, setName] = useState(product?.name ?? '');
  const [umkmId, setUmkmId] = useState<number>(product?.umkm_id ?? umkmList[0]?.id ?? 0);
  const [categoryId, setCategoryId] = useState<string>(
    product?.category_id ? String(product.category_id) : ''
  );
  const [certificateId, setCertificateId] = useState<string>(
    product?.certificate_id ? String(product.certificate_id) : ''
  );
  const [newCertNo, setNewCertNo] = useState('');
  const [newSppIrt, setNewSppIrt] = useState('');

  const [mainImage, setMainImage] = useState<string>(product?.main_image ?? '');
  const [galleryImages, setGalleryImages] = useState<string[]>(product?.gallery_images ?? []);
  const [story, setStory] = useState(product?.story ?? '');
  const [ingredients, setIngredients] = useState(product?.ingredients ?? '');
  const [variants, setVariants] = useState<VariantDraft[]>(
    product?.variants.map((v) => ({
      variant_name: v.variant_name,
      image_url: v.image_url ?? '',
      description: v.description ?? '',
    })) ?? []
  );

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMainImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadFile(file, token);
      setMainImage(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const res = await api.uploadFile(file, token);
        uploadedUrls.push(res.url);
      }
      setGalleryImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto galeri.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleVariantImageUpload = async (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadFile(file, token);
      setVariants((prev) =>
        prev.map((item, idx) => (idx === index ? {...item, image_url: res.url} : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto varian.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name,
        umkm_id: umkmId,
        category_id: categoryId ? Number(categoryId) : null,
        certificate_id: certificateId && certificateId !== 'new' ? Number(certificateId) : null,
        main_image: mainImage.trim() || null,
        gallery_images: galleryImages,
        story: story.trim() || null,
        ingredients: ingredients.trim() || null,
        variants: variants
          .filter((v) => v.variant_name.trim().length > 0)
          .map((v) => ({
            variant_name: v.variant_name.trim(),
            image_url: v.image_url.trim() || null,
            description: v.description.trim() || null,
          })),
      };

      if (!product && certificateId === 'new' && newCertNo.trim()) {
        payload.new_certificate_number = newCertNo.trim();
        payload.new_spp_irt_number = newSppIrt.trim() || null;
      }

      if (product) {
        await api.updateProduct(product.id, payload, token);
      } else {
        await api.createProduct(payload, token);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan produk.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-[#075C3B] text-white flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-base">
              {product ? `Edit Produk: ${product.name}` : 'Tambah Produk UMKM Baru'}
            </h2>
            <p className="text-xs text-emerald-100">
              {product
                ? `URL QR permanen (${product.qr_code?.target_path || `/produk/${product.slug}`}) tetap sama meskipun nama produk diubah.`
                : 'QR Code unik otomatis dibuat saat produk disimpan.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/15"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Produk *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Basreng Mba Diah"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Produsen / UMKM *
              </label>
              <select
                required
                value={umkmId}
                onChange={(e) => setUmkmId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#168B50]"
              >
                {umkmList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kategori Produk
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#168B50]"
              >
                <option value="">-- Tanpa Kategori --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sertifikat Halal &amp; SPP-IRT
              </label>
              <select
                value={certificateId}
                onChange={(e) => setCertificateId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#168B50]"
              >
                <option value="">-- Belum Dikaitkan --</option>
                {!product && <option value="new">+ Buat Data Sertifikat Baru Sekarang</option>}
                {certificates.map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.certificate_number}
                    {cert.spp_irt_number ? ` · SPP-IRT: ${cert.spp_irt_number}` : ''} ({cert.verification_status})
                  </option>
                ))}
              </select>
            </div>

            {!product && certificateId === 'new' && (
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F5F7F5] border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ID Sertifikat Halal Baru
                  </label>
                  <input
                    type="text"
                    value={newCertNo}
                    onChange={(e) => setNewCertNo(e.target.value)}
                    placeholder="Contoh: ID331100..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor SPP-IRT
                  </label>
                  <input
                    type="text"
                    value={newSppIrt}
                    onChange={(e) => setNewSppIrt(e.target.value)}
                    placeholder="Contoh: 20042600..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Main Photo Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Foto Utama Produk</label>
            <div className="flex flex-wrap items-center gap-3">
              {mainImage && (
                <div className="relative w-24 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                  <img
                    src={mainImage}
                    alt="Preview utama"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => setMainImage('')}
                    title="Hapus foto utama"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#168B50] text-[#075C3B] text-xs font-semibold hover:bg-emerald-50 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Mengunggah...' : 'Unggah Foto Utama'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleMainImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Multiple Gallery Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Galeri Foto Tambahan (Opsional)
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#168B50] hover:underline cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                Tambah Foto Galeri
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleGalleryUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            {galleryImages.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {galleryImages.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="relative w-20 h-16 rounded-xl overflow-hidden border border-slate-200"
                  >
                    <img
                      src={url}
                      alt={`Galeri ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setGalleryImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Variants */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">Varian Produk (Opsional)</p>
                <p className="text-[11px] text-slate-500">
                  Misalnya varian Original dan Pedas beserta foto masing-masing varian.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setVariants((prev) => [...prev, {variant_name: '', image_url: '', description: ''}])
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Varian
              </button>
            </div>

            {variants.map((variant, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#F5F7F5] border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
              >
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={variant.variant_name}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((v, i) => (i === idx ? {...v, variant_name: e.target.value} : v))
                      )
                    }
                    placeholder="Nama varian (mis: Original)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={variant.description}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((v, i) => (i === idx ? {...v, description: e.target.value} : v))
                      )
                    }
                    placeholder="Keterangan singkat varian"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  {variant.image_url && (
                    <img
                      src={variant.image_url}
                      alt={variant.variant_name}
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                  )}
                  <label className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:border-[#168B50] cursor-pointer">
                    <Upload className="w-3 h-3" />
                    Foto
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleVariantImageUpload(idx, e)}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Story & Ingredients */}
          <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cerita Produk
              </label>
              <textarea
                rows={3}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Ceritakan proses pembuatan, keunggulan, atau sejarah UMKM produk ini..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Komposisi Bahan
              </label>
              <textarea
                rows={2}
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="Contoh: Tepung tapioka, daging ikan, bawang putih, cabai, garam, minyak nabati."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2.5 rounded-xl bg-[#168B50] hover:bg-[#075C3B] text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : product ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
