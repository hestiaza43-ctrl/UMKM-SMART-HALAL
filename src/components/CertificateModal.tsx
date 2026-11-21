import {ExternalLink, FileText, ShieldCheck, X} from 'lucide-react';
import {formatDateId, formatHalalBannerText} from '../lib/format';
import type {Product} from '../types';
import {HalalSealIcon} from './CampusLogo';

interface CertificateModalProps {
  product: Product;
  onClose: () => void;
}

export function CertificateModal({product, onClose}: CertificateModalProps) {
  const cert = product.certificate;
  const statusInfo = formatHalalBannerText(cert?.verification_status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cert-modal-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-xl">
        <div className="bg-[#168B50] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <HalalSealIcon className="w-8 h-8 shrink-0" />
            <div>
              <h2 id="cert-modal-title" className="font-display font-bold text-base">
                Detail Informasi Sertifikat Halal
              </h2>
              <p className="text-xs text-emerald-50">Smart Halal Campus Mart · UNIKMA</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal sertifikat"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div
            className={`rounded-xl p-4 border ${
              statusInfo.tone === 'emerald'
                ? 'bg-emerald-50 border-emerald-200 text-[#075C3B]'
                : statusInfo.tone === 'amber'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-[#F5F7F5] border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-[#168B50]" />
              <div>
                <p className="font-display font-bold text-sm">{statusInfo.headline}</p>
                <p className="text-xs mt-1 leading-relaxed opacity-90">{statusInfo.subline}</p>
              </div>
            </div>
          </div>

          <dl className="divide-y divide-slate-100 text-sm">
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-slate-500">Nama Produk</dt>
              <dd className="font-semibold text-slate-900 text-right">{product.name}</dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-slate-500">Nama Produsen / UMKM</dt>
              <dd className="font-medium text-slate-900 text-right">{product.umkm.name}</dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-slate-500">ID Sertifikat Halal</dt>
              <dd className="font-mono font-medium text-slate-900 tabular-nums text-right">
                {cert?.certificate_number || 'Belum tersedia'}
              </dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-slate-500">Nomor SPP-IRT</dt>
              <dd className="font-mono font-medium text-slate-900 tabular-nums text-right">
                {cert?.spp_irt_number || 'Belum tersedia'}
              </dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-slate-500">Tanggal Penerbitan</dt>
              <dd className="text-slate-800 text-right">{formatDateId(cert?.issued_date)}</dd>
            </div>
            <div className="py-3 flex justify-between gap-4">
              <dt className="text-slate-500">Masa Berlaku</dt>
              <dd className="text-slate-800 text-right">{formatDateId(cert?.expiry_date)}</dd>
            </div>
            {cert?.verification_evidence && (
              <div className="py-3">
                <dt className="text-slate-500 mb-1">Catatan / Bukti Pemeriksaan</dt>
                <dd className="text-slate-800 bg-[#F5F7F5] rounded-lg p-3 text-xs leading-relaxed">
                  {cert.verification_evidence}
                </dd>
              </div>
            )}
          </dl>

          {cert?.document_url ? (
            <div className="border border-slate-200 rounded-xl p-4 bg-[#F5F7F5] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#168B50] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">Dokumen Sertifikat</p>
                  <p className="text-xs text-slate-500">Diunggah oleh admin pengelola</p>
                </div>
              </div>
              <a
                href={cert.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#168B50] text-white text-xs font-semibold hover:bg-[#075C3B] transition-colors whitespace-nowrap shrink-0"
              >
                Buka Dokumen
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-500 bg-[#F5F7F5] rounded-xl p-3.5 text-center">
              Dokumen pindaian sertifikat belum diunggah oleh admin.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#168B50] text-white text-sm font-semibold hover:bg-[#075C3B] transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
