import {type ChangeEvent, type FormEvent, useState} from 'react';
import {FileText, Upload, X} from 'lucide-react';
import {api} from '../../lib/api';
import type {HalalCertificate, Umkm, VerificationStatus} from '../../types';

interface UmkmFormModalProps {
  umkm: Umkm | null;
  token: string;
  onSaved: () => void;
  onClose: () => void;
}

export function UmkmFormModal({umkm, token, onSaved, onClose}: UmkmFormModalProps) {
  const [name, setName] = useState(umkm?.name ?? '');
  const [ownerName, setOwnerName] = useState(umkm?.owner_name ?? '');
  const [phone, setPhone] = useState(umkm?.phone ?? '');
  const [address, setAddress] = useState(umkm?.address ?? '');
  const [mapsUrl, setMapsUrl] = useState(umkm?.maps_url ?? '');
  const [description, setDescription] = useState(umkm?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        owner_name: ownerName.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        maps_url: mapsUrl.trim() || null,
        description: description.trim() || null,
      };
      if (umkm) {
        await api.updateUmkm(umkm.id, payload, token);
      } else {
        await api.createUmkm(payload, token);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data UMKM.');
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
      <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-[#075C3B] text-white flex items-center justify-between">
          <h2 className="font-display font-bold text-base">
            {umkm ? `Edit UMKM: ${umkm.name}` : 'Tambah Mitra UMKM Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/15"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama UMKM *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: UMKM Mba Diah"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Pemilik</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Contoh: Mba Diah"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nomor HP / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 082134755307"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#168B50]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat Lengkap</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Desa, Kecamatan, Kabupaten"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              URL Lokasi Google Maps
            </label>
            <input
              type="url"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deskripsi UMKM</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Profil singkat usaha atau produk unggulan UMKM..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
            />
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
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#168B50] hover:bg-[#075C3B] text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : 'Simpan Data UMKM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CertFormModalProps {
  certificate: HalalCertificate | null;
  token: string;
  onSaved: () => void;
  onClose: () => void;
}

export function CertFormModal({certificate, token, onSaved, onClose}: CertFormModalProps) {
  const [certNo, setCertNo] = useState(certificate?.certificate_number ?? '');
  const [sppIrt, setSppIrt] = useState(certificate?.spp_irt_number ?? '');
  const [issuedDate, setIssuedDate] = useState(certificate?.issued_date ?? '');
  const [expiryDate, setExpiryDate] = useState(certificate?.expiry_date ?? '');
  const [documentUrl, setDocumentUrl] = useState(certificate?.document_url ?? '');
  const [status, setStatus] = useState<VerificationStatus>(
    certificate?.verification_status ?? 'Data Sertifikat Tersedia'
  );
  const [evidence, setEvidence] = useState(certificate?.verification_evidence ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDocUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadFile(file, token);
      setDocumentUrl(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah dokumen sertifikat.');
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
      const payload = {
        certificate_number: certNo.trim(),
        spp_irt_number: sppIrt.trim() || null,
        issued_date: issuedDate.trim() || null,
        expiry_date: expiryDate.trim() || null,
        document_url: documentUrl.trim() || null,
        verification_status: status,
        verification_evidence: evidence.trim() || null,
      };
      if (certificate) {
        await api.updateCertificate(certificate.id, payload, token);
      } else {
        await api.createCertificate(payload, token);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan sertifikat.');
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
      <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-[#075C3B] text-white flex items-center justify-between">
          <h2 className="font-display font-bold text-base">
            {certificate ? 'Edit & Verifikasi Sertifikat Halal' : 'Tambah Data Sertifikat Halal'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/15"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ID Sertifikat Halal *
              </label>
              <input
                type="text"
                required
                value={certNo}
                onChange={(e) => setCertNo(e.target.value)}
                placeholder="ID331100..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#168B50]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nomor SPP-IRT
              </label>
              <input
                type="text"
                value={sppIrt}
                onChange={(e) => setSppIrt(e.target.value)}
                placeholder="20042600..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#168B50]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Penerbitan
              </label>
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Masa Berlaku
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Dokumen Sertifikat (JPG, PNG, WebP, atau PDF)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {documentUrl && (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F5F7F5] border border-slate-200 text-xs font-medium text-[#075C3B]"
                >
                  <FileText className="w-4 h-4" />
                  Dokumen Tersedia
                </a>
              )}
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#168B50] text-[#075C3B] text-xs font-semibold hover:bg-emerald-50 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Mengunggah...' : 'Unggah Dokumen'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleDocUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status Pemeriksaan Sertifikat
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VerificationStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#168B50]"
              >
                <option value="Data Sertifikat Tersedia">Data Sertifikat Tersedia (Data Awal UMKM)</option>
                <option value="Terverifikasi">Terverifikasi (Setelah Cek Sumber Resmi BPJPH)</option>
                <option value="Perlu Pemeriksaan Ulang">Perlu Pemeriksaan Ulang</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Bukti / Catatan Pemeriksaan {status === 'Terverifikasi' ? '*' : '(Opsional)'}
              </label>
              <textarea
                rows={3}
                required={status === 'Terverifikasi'}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Contoh: Diperiksa melalui portal info.halal.go.id tanggal ..., nomor sertifikat cocok atas nama pelaku usaha ..."
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
              {saving ? 'Menyimpan...' : 'Simpan Sertifikat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
