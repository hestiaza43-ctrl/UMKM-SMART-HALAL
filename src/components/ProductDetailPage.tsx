import {useEffect, useState} from 'react';
import {
  ArrowLeft,
  ExternalLink,
  FileBadge2,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Store,
} from 'lucide-react';
import {api} from '../lib/api';
import {buildMapsUrl, buildWhatsAppUrl, formatHalalBannerText} from '../lib/format';
import type {Product, SiteSettings} from '../types';
import {CampusLogo, HalalSealIcon} from './CampusLogo';
import {CertificateModal} from './CertificateModal';
import {ProductImage} from './ProductImage';

interface ProductDetailPageProps {
  slug: string;
  settings: SiteSettings;
  onNavigate: (path: string) => void;
}

export function ProductDetailPage({slug, settings, onNavigate}: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedGalleryUrl, setSelectedGalleryUrl] = useState<string | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getProductBySlug(slug)
      .then((data) => {
        if (!active) return;
        setProduct(data);
        if (data.variants.length > 0) {
          setSelectedVariantId(data.variants[0].id);
          setSelectedGalleryUrl(data.variants[0].image_url || data.main_image);
        } else {
          setSelectedVariantId(null);
          setSelectedGalleryUrl(data.main_image);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Produk tidak ditemukan.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const activeVariant =
    product?.variants.find((v) => v.id === selectedVariantId) ?? null;

  const displayedImage =
    selectedGalleryUrl || activeVariant?.image_url || product?.main_image || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7F5] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="h-16 bg-[#168B50]" />
          <div className="p-6 space-y-4">
            <div className="aspect-[4/3] rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-7 w-2/3 bg-slate-100 rounded animate-pulse mx-auto" />
            <div className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#F5F7F5] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <p className="font-display font-bold text-xl text-slate-900">Produk Tidak Ditemukan</p>
          <p className="mt-2 text-sm text-slate-600">
            {error || 'Tautan produk yang Anda pindai tidak tersedia atau telah dihapus.'}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#168B50] text-white text-sm font-semibold hover:bg-[#075C3B] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Katalog
          </button>
        </div>
      </div>
    );
  }

  const cert = product.certificate;
  const statusInfo = formatHalalBannerText(cert?.verification_status);
  const waUrl = buildWhatsAppUrl(product.umkm.phone, product.name, product.umkm.name);
  const mapsUrl = buildMapsUrl(product.umkm.maps_url, product.umkm.address);

  // Deduplicate gallery thumbnails
  const allThumbnails = Array.from(
    new Set(
      [
        product.main_image,
        ...product.gallery_images,
        ...product.variants.map((v) => v.image_url),
      ].filter((x): x is string => Boolean(x))
    )
  );

  return (
    <div className="min-h-screen bg-[#F5F7F5] py-0 sm:py-8 px-0 sm:px-4">
      <div className="max-w-2xl mx-auto bg-white sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-sm overflow-hidden">
        {/* Green Header matching Reference Image 2 */}
        <header className="bg-[#168B50] px-5 py-4 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 shrink-0 shadow-xs">
              <CampusLogo className="w-full h-full" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-sm sm:text-base leading-tight tracking-tight truncate">
                {settings.site_name}
              </p>
              <p className="text-xs text-emerald-50 truncate">{settings.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Katalog
          </button>
        </header>

        {/* Main Content */}
        <main className="p-5 sm:p-8 space-y-6">
          {/* Large Product Photo */}
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-[#F5F7F5]">
              <ProductImage
                src={displayedImage}
                alt={activeVariant ? `${product.name} - ${activeVariant.variant_name}` : product.name}
                productName={
                  activeVariant ? `${product.name} (${activeVariant.variant_name})` : product.name
                }
                aspectClass="aspect-[4/3]"
              />
            </div>

            {/* Variant Selector (e.g., Sistik Original & Pedas) */}
            {product.variants.length > 0 && (
              <div className="bg-[#F5F7F5] rounded-2xl p-4 border border-slate-200/80">
                <p className="text-xs font-semibold text-slate-600 mb-2.5">
                  Pilih Varian Produk:
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const isSelected = variant.id === selectedVariantId;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          if (variant.image_url) {
                            setSelectedGalleryUrl(variant.image_url);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-[#168B50] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-[#168B50]'
                        }`}
                      >
                        {variant.variant_name}
                      </button>
                    );
                  })}
                </div>
                {activeVariant?.description && (
                  <p className="mt-2.5 text-xs text-slate-600">{activeVariant.description}</p>
                )}
              </div>
            )}

            {/* Additional Gallery Thumbnails */}
            {allThumbnails.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {allThumbnails.map((thumbUrl, idx) => (
                  <button
                    key={thumbUrl}
                    type="button"
                    onClick={() => setSelectedGalleryUrl(thumbUrl)}
                    className={`w-16 h-14 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                      displayedImage === thumbUrl
                        ? 'border-[#168B50] ring-2 ring-[#168B50]/20'
                        : 'border-slate-200 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={thumbUrl}
                      alt={`${product.name} foto ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Title & UMKM Name */}
          <div className="text-center space-y-1.5">
            {product.category && (
              <p className="text-xs font-medium text-slate-500">{product.category.name}</p>
            )}
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight text-balance">
              {product.name}
            </h1>
            <p className="text-sm sm:text-base font-medium text-[#075C3B]">{product.umkm.name}</p>
          </div>

          {/* Green Halal Certification Status Box matching Reference Image 2 */}
          <div className="space-y-3">
            <div
              className={`rounded-2xl px-5 py-4 flex items-center gap-4 text-white shadow-xs ${
                statusInfo.tone === 'emerald'
                  ? 'bg-[#168B50]'
                  : statusInfo.tone === 'amber'
                    ? 'bg-amber-600'
                    : 'bg-[#168B50]'
              }`}
            >
              <HalalSealIcon className="w-11 h-11 shrink-0" fill="#FFFFFF" checkColor="#168B50" />
              <div className="min-w-0">
                <p className="font-display font-bold text-sm sm:text-base leading-snug">
                  {statusInfo.headline}
                </p>
                <p className="text-xs text-emerald-50 mt-0.5 leading-snug">{statusInfo.subline}</p>
              </div>
            </div>

            {/* Certificate ID & SPP-IRT */}
            <div className="text-center space-y-1 py-1">
              <p className="text-sm text-slate-700 font-mono tabular-nums">
                <span className="font-sans font-medium text-slate-500">ID Sertifikat: </span>
                {cert?.certificate_number || 'Belum tersedia'}
              </p>
              <p className="text-sm text-slate-700 font-mono tabular-nums">
                <span className="font-sans font-medium text-slate-500">SPP-IRT No. </span>
                {cert?.spp_irt_number || 'Belum tersedia'}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowCertModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#168B50]/30 bg-emerald-50/70 text-[#075C3B] text-xs sm:text-sm font-semibold hover:bg-emerald-100/80 transition-colors cursor-pointer"
                >
                  <FileBadge2 className="w-4 h-4 text-[#168B50]" />
                  Lihat Detail Sertifikat
                </button>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Cerita Produk */}
          <section className="space-y-2">
            <h2 className="font-display font-bold text-lg text-slate-900">Cerita Produk</h2>
            {product.story ? (
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {product.story}
              </p>
            ) : (
              <p className="text-sm text-slate-500 italic bg-[#F5F7F5] rounded-xl px-4 py-3">
                Cerita produk belum dilengkapi oleh admin.
              </p>
            )}
          </section>

          {/* Komposisi Bahan */}
          <section className="space-y-2">
            <h2 className="font-display font-bold text-lg text-slate-900">Komposisi Bahan</h2>
            {product.ingredients ? (
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {product.ingredients}
              </p>
            ) : (
              <p className="text-sm text-slate-500 italic bg-[#F5F7F5] rounded-xl px-4 py-3">
                Komposisi bahan belum dilengkapi oleh admin.
              </p>
            )}
          </section>

          {/* Informasi Produsen / UMKM */}
          <section className="rounded-2xl bg-[#F5F7F5] border border-slate-200/80 p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#168B50]" />
                Informasi Produsen / UMKM
              </h2>
              <button
                type="button"
                onClick={() => onNavigate(`/poster/${product.slug}`)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075C3B] hover:underline cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                Poster QR Code
              </button>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <dt className="text-slate-500">Nama Produsen</dt>
                <dd className="font-semibold text-slate-900 sm:text-right">{product.umkm.name}</dd>
              </div>
              {product.umkm.owner_name && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <dt className="text-slate-500">Pemilik</dt>
                  <dd className="text-slate-800 sm:text-right">{product.umkm.owner_name}</dd>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <dt className="text-slate-500">Nomor HP / WhatsApp</dt>
                <dd className="font-mono text-slate-800 tabular-nums sm:text-right">
                  {product.umkm.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#168B50]" />
                      {product.umkm.phone}
                    </span>
                  ) : (
                    <span className="font-sans text-slate-400">Belum tersedia</span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <dt className="text-slate-500 shrink-0">Alamat Produksi</dt>
                <dd className="text-slate-800 sm:text-right">
                  {product.umkm.address || <span className="text-slate-400">Belum tersedia</span>}
                </dd>
              </div>
            </dl>
            {product.umkm.description && (
              <p className="text-xs text-slate-600 pt-2 border-t border-slate-200/80 leading-relaxed">
                {product.umkm.description}
              </p>
            )}
          </section>

          {/* Primary Action Buttons: Maps & WhatsApp matching Reference Image 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-[#168B50] hover:bg-[#075C3B] text-white text-sm font-semibold transition-colors shadow-xs"
              >
                <MapPin className="w-5 h-5 shrink-0" />
                <span>Lokasi Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-100 text-slate-400 text-sm font-medium cursor-not-allowed">
                <MapPin className="w-5 h-5 shrink-0" />
                <span>Lokasi Belum Tersedia</span>
              </div>
            )}

            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-[#168B50] hover:bg-[#075C3B] text-white text-sm font-semibold transition-colors shadow-xs"
              >
                <MessageCircle className="w-5 h-5 shrink-0" />
                <span>Pesan via WhatsApp</span>
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-100 text-slate-400 text-sm font-medium cursor-not-allowed">
                <MessageCircle className="w-5 h-5 shrink-0" />
                <span>WhatsApp Belum Tersedia</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-[#F5F7F5] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Katalog
            </button>

            <button
              type="button"
              onClick={() => onNavigate(`/poster/${product.slug}`)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#168B50]/30 text-[#075C3B] text-sm font-semibold hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              Cetak Poster QR Code
            </button>
          </div>
        </main>
      </div>

      {showCertModal && (
        <CertificateModal product={product} onClose={() => setShowCertModal(false)} />
      )}
    </div>
  );
}
