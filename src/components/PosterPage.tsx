import {useEffect, useState} from 'react';
import {ArrowLeft, Check, Copy, Download, ExternalLink, Printer, QrCode} from 'lucide-react';
import {api} from '../lib/api';
import type {Product, SiteSettings} from '../types';
import {HalalSealIcon} from './CampusLogo';
import {
  buildProductTargetUrl,
  downloadPosterPng,
  downloadQrPng,
  QRCodeGraphic,
} from './QRCodeView';

interface PosterPageProps {
  slug: string;
  settings: SiteSettings;
  onNavigate: (path: string) => void;
}

export function PosterPage({slug, settings, onNavigate}: PosterPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPoster, setDownloadingPoster] = useState(false);
  const [customOrigin, setCustomOrigin] = useState(settings.public_base_url || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getProductBySlug(slug)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch(() => {
        if (active) setProduct(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center p-6">
        <div className="w-full max-w-md h-[640px] rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F5F7F5] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="font-display font-bold text-lg text-slate-900">Poster QR Tidak Ditemukan</p>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="mt-4 px-5 py-2.5 rounded-xl bg-[#168B50] text-white text-sm font-semibold"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const targetPath = product.qr_code?.target_path || `/produk/${product.slug}`;
  const targetUrl = buildProductTargetUrl(targetPath, customOrigin || settings.public_base_url);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleDownloadPoster = async () => {
    setDownloadingPoster(true);
    try {
      await downloadPosterPng(product, targetUrl);
    } finally {
      setDownloadingPoster(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F5] py-6 sm:py-10 px-4">
      {/* Control Toolbar (hidden when printing) */}
      <div className="no-print max-w-2xl mx-auto mb-6 bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <button
          type="button"
          onClick={() => onNavigate(`/produk/${product.slug}`)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Detail Produk
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadQrPng(targetUrl, product.slug)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#168B50]/30 text-[#075C3B] text-xs sm:text-sm font-semibold hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            Download QR Code
          </button>

          <button
            type="button"
            disabled={downloadingPoster}
            onClick={handleDownloadPoster}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#168B50] text-white text-xs sm:text-sm font-semibold hover:bg-[#075C3B] disabled:opacity-60 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {downloadingPoster ? 'Menyiapkan PNG...' : 'Download Poster PNG'}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#075C3B] text-white text-xs sm:text-sm font-semibold hover:opacity-95 transition-opacity cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Poster
          </button>
        </div>
      </div>

      {/* Printable Poster matching Reference Image 1 */}
      <div className="max-w-[440px] mx-auto bg-white shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-0">
        {/* Top Green Area */}
        <div className="bg-[#168B50] px-6 pt-8 pb-32 text-center text-white">
          <h1 className="font-display font-extrabold text-3xl leading-[1.1] tracking-tight">
            {settings.site_name}
          </h1>
          <p className="mt-2 font-display font-semibold text-lg text-white">
            {settings.subtitle}
          </p>
          <p className="mt-0.5 text-sm text-emerald-50">{settings.institution}</p>
        </div>

        {/* Overlapping Large QR Card with Scalloped Checkmark Seal */}
        <div className="px-8 -mt-24">
          <div className="relative bg-white rounded-3xl border-[5px] border-[#168B50] p-5 shadow-md flex items-center justify-center">
            <div className="absolute -top-5 -right-5 bg-white rounded-full p-0.5 shadow-xs">
              <HalalSealIcon className="w-12 h-12" fill="#168B50" checkColor="#FFFFFF" />
            </div>
            <QRCodeGraphic value={targetUrl} size={240} darkColor="#111827" />
          </div>
        </div>

        {/* Bottom White Area */}
        <div className="px-6 pt-7 pb-8 text-center">
          <p className="font-display font-extrabold text-xl text-[#075C3B] leading-tight tracking-tight">
            SCAN UNTUK CEK HALAL &amp; PROFIL UMKM
          </p>
          <p className="mt-2.5 text-base font-medium text-slate-800 leading-snug">
            Katalog Produk UMKM
            <br />
            Tersertifikasi Halal
          </p>

          <div className="mt-6 pt-5 border-t border-slate-200 space-y-1">
            <p className="font-display font-bold text-lg text-[#168B50] leading-snug">
              {product.name}
            </p>
            <p className="text-sm font-medium text-slate-600">{product.umkm.name}</p>
            {product.certificate?.certificate_number && (
              <p className="text-xs font-mono text-slate-500 tabular-nums pt-1">
                ID Halal: {product.certificate.certificate_number}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Direct Test Link & URL Controls (hidden when printing) */}
      <div className="no-print max-w-xl mx-auto mt-6 bg-white rounded-2xl border border-slate-200 p-4 space-y-3 text-center">
        <p className="text-xs font-semibold text-slate-700">URL Tujuan Publik QR Code:</p>
        <div className="flex items-center justify-center gap-2">
          <code className="font-mono text-xs text-[#075C3B] bg-[#F5F7F5] px-3 py-1.5 rounded-lg break-all">
            {targetUrl}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#168B50]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Tersalin' : 'Salin'}
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 text-left">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Domain / URL Publik Kustom (opsional):
          </label>
          <input
            type="url"
            value={customOrigin}
            onChange={(e) => setCustomOrigin(e.target.value)}
            placeholder="Otomatis menggunakan URL publik aplikasi"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#168B50]"
          />
        </div>

        <button
          type="button"
          onClick={() => onNavigate(targetPath)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#168B50] hover:underline cursor-pointer pt-1"
        >
          Uji Buka Halaman Detail Produk
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
