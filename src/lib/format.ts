import type {VerificationStatus} from '../types';

export function buildWhatsAppUrl(phone: string | null | undefined, productName: string, umkmName: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith('0')) {
    normalized = `62${normalized.slice(1)}`;
  } else if (!normalized.startsWith('62')) {
    normalized = `62${normalized}`;
  }
  const message = encodeURIComponent(
    `Halo ${umkmName}, saya melihat produk "${productName}" di SMART HALAL CAMPUS MART (Prodi Bisnis Digital UNIKMA) dan ingin menanyakan informasi pemesanan.`
  );
  return `https://wa.me/${normalized}?text=${message}`;
}

export function buildMapsUrl(mapsUrl: string | null | undefined, address: string | null | undefined): string | null {
  if (mapsUrl && (mapsUrl.startsWith('https://') || mapsUrl.startsWith('http://'))) {
    return mapsUrl;
  }
  if (address && address.trim().length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }
  return null;
}

export function formatHalalBannerText(status: VerificationStatus | undefined): {
  headline: string;
  subline: string;
  tone: 'emerald' | 'amber' | 'slate';
} {
  if (status === 'Terverifikasi') {
    return {
      headline: 'STATUS: TERVERIFIKASI HALAL (BPJPH)',
      subline: 'Data sertifikat telah diperiksa admin beserta bukti pemeriksaan resmi.',
      tone: 'emerald',
    };
  }
  if (status === 'Perlu Pemeriksaan Ulang') {
    return {
      headline: 'STATUS: PERLU PEMERIKSAAN ULANG',
      subline: 'Sedang dalam peninjauan ulang oleh tim pengelola Smart Halal Campus Mart.',
      tone: 'amber',
    };
  }
  return {
    headline: 'STATUS: DATA SERTIFIKAT TERSEDIA',
    subline: 'Data awal dari pemilik UMKM — belum diklaim terverifikasi resmi BPJPH sebelum pemeriksaan.',
    tone: 'slate',
  };
}

export function formatDateId(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Belum tersedia';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
