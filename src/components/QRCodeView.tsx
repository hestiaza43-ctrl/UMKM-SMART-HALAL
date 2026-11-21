import {useEffect, useState} from 'react';
import QRCode from 'qrcode';
import type {Product, SiteSettings, SiteStats} from '../types';

export function buildProductTargetUrl(targetPath: string, customBaseUrl?: string): string {
  const custom = customBaseUrl?.trim();
  if (custom && (custom.startsWith('http://') || custom.startsWith('https://'))) {
    return `${custom.replace(/\/+$/, '')}${targetPath}`;
  }
  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicOrigin = rawOrigin.replace(/^https:\/\/ais-dev-/, 'https://ais-pre-');
  return `${publicOrigin}${targetPath}`;
}

export function QRCodeGraphic({
  value,
  size = 220,
  className = '',
  darkColor = '#075C3B',
}: {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: darkColor,
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [value, size, darkColor]);

  if (!dataUrl) {
    return (
      <div
        style={{width: size, height: size}}
        className={`bg-slate-100 animate-pulse rounded-lg ${className}`}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR Code ${value}`}
      width={size}
      height={size}
      className={`block ${className}`}
    />
  );
}

export async function downloadQrPng(targetUrl: string, slug: string): Promise<void> {
  const dataUrl = await QRCode.toDataURL(targetUrl, {
    width: 1000,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111827',
      light: '#FFFFFF',
    },
  });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `qr-${slug}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function downloadPosterPng(product: Product, targetUrl: string): Promise<void> {
  const width = 1200;
  const height = 1760;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Top emerald section matching reference image 1
  const headerSplitY = 740;
  ctx.fillStyle = '#168B50';
  ctx.fillRect(0, 0, width, headerSplitY);

  // Header typography
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';

  ctx.font = '800 74px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('SMART HALAL', width / 2, 130);
  ctx.fillText('CAMPUS MART', width / 2, 215);

  ctx.font = '600 42px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Prodi Bisnis Digital', width / 2, 290);

  ctx.font = '500 32px "DM Sans", Arial, sans-serif';
  ctx.fillText('Universitas Komputama Cilacap (UNIKMA)', width / 2, 344);

  // QR Frame Box overlapping green/white boundary
  const boxSize = 680;
  const boxX = (width - boxSize) / 2;
  const boxY = 415;

  // Soft shadow for QR frame
  ctx.save();
  ctx.shadowColor = 'rgba(7, 92, 59, 0.16)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, boxX, boxY, boxSize, boxSize, 52);
  ctx.fill();
  ctx.restore();

  // Emerald border around QR card
  ctx.lineWidth = 18;
  ctx.strokeStyle = '#168B50';
  drawRoundedRect(ctx, boxX, boxY, boxSize, boxSize, 52);
  ctx.stroke();

  // Render QR code inside box
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, targetUrl, {
    width: 560,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111827',
      light: '#FFFFFF',
    },
  });
  ctx.drawImage(qrCanvas, boxX + 60, boxY + 60, 560, 560);

  // Top-right scalloped green checkmark seal
  const badgeCx = boxX + boxSize - 18;
  const badgeCy = boxY + 18;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, 76, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#168B50';
  const spikes = 12;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 64 : 52;
    const angle = (i * Math.PI) / spikes;
    const px = badgeCx + Math.cos(angle) * r;
    const py = badgeCy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Checkmark inside seal
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(badgeCx - 24, badgeCy + 2);
  ctx.lineTo(badgeCx - 6, badgeCy + 20);
  ctx.lineTo(badgeCx + 26, badgeCy - 18);
  ctx.stroke();

  // Scan CTA Text below QR box
  ctx.fillStyle = '#075C3B';
  ctx.font = '800 50px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('SCAN UNTUK CEK', width / 2, 1215);
  ctx.fillText('HALAL & PROFIL UMKM', width / 2, 1280);

  ctx.fillStyle = '#1F2937';
  ctx.font = '500 36px "DM Sans", Arial, sans-serif';
  ctx.fillText('Katalog Produk UMKM', width / 2, 1365);
  ctx.fillText('Tersertifikasi Halal', width / 2, 1412);

  // Divider and Product Name Footer Box
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 1475);
  ctx.lineTo(width - 160, 1475);
  ctx.stroke();

  ctx.fillStyle = '#168B50';
  ctx.font = '700 42px "Plus Jakarta Sans", Arial, sans-serif';
  const nameLines = wrapTextLines(ctx, product.name, width - 180).slice(0, 2);
  let textY = 1545;
  for (const line of nameLines) {
    ctx.fillText(line, width / 2, textY);
    textY += 52;
  }

  ctx.fillStyle = '#4B5563';
  ctx.font = '500 30px "DM Sans", Arial, sans-serif';
  ctx.fillText(product.umkm.name, width / 2, textY + 8);

  if (product.certificate?.certificate_number) {
    ctx.fillStyle = '#6B7280';
    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillText(`ID Halal: ${product.certificate.certificate_number}`, width / 2, 1705);
  }

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `poster-qr-${product.slug}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadStorePosterPng(
  settings: SiteSettings,
  stats: SiteStats,
  targetUrl: string
): Promise<void> {
  const width = 1200;
  const height = 1760;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const headerSplitY = 740;
  ctx.fillStyle = '#168B50';
  ctx.fillRect(0, 0, width, headerSplitY);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';

  ctx.font = '800 74px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('SMART HALAL', width / 2, 130);
  ctx.fillText('CAMPUS MART', width / 2, 215);

  ctx.font = '600 42px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(settings.subtitle, width / 2, 290);

  ctx.font = '500 32px "DM Sans", Arial, sans-serif';
  ctx.fillText(settings.institution, width / 2, 344);

  const boxSize = 680;
  const boxX = (width - boxSize) / 2;
  const boxY = 415;

  ctx.save();
  ctx.shadowColor = 'rgba(7, 92, 59, 0.16)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, boxX, boxY, boxSize, boxSize, 52);
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 18;
  ctx.strokeStyle = '#168B50';
  drawRoundedRect(ctx, boxX, boxY, boxSize, boxSize, 52);
  ctx.stroke();

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, targetUrl, {
    width: 560,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111827',
      light: '#FFFFFF',
    },
  });
  ctx.drawImage(qrCanvas, boxX + 60, boxY + 60, 560, 560);

  const badgeCx = boxX + boxSize - 18;
  const badgeCy = boxY + 18;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, 76, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#168B50';
  const spikes = 12;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 64 : 52;
    const angle = (i * Math.PI) / spikes;
    const px = badgeCx + Math.cos(angle) * r;
    const py = badgeCy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(badgeCx - 24, badgeCy + 2);
  ctx.lineTo(badgeCx - 6, badgeCy + 20);
  ctx.lineTo(badgeCx + 26, badgeCy - 18);
  ctx.stroke();

  ctx.fillStyle = '#075C3B';
  ctx.font = '800 50px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('SCAN UNTUK LIHAT', width / 2, 1215);
  ctx.fillText('KATALOG TOKO', width / 2, 1280);

  ctx.fillStyle = '#1F2937';
  ctx.font = '500 36px "DM Sans", Arial, sans-serif';
  ctx.fillText('Lihat Semua Produk UMKM', width / 2, 1365);
  ctx.fillText('Tersertifikasi Halal di Toko Ini', width / 2, 1412);

  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 1475);
  ctx.lineTo(width - 160, 1475);
  ctx.stroke();

  ctx.fillStyle = '#168B50';
  ctx.font = '700 40px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Etalase Resmi Toko Kampus', width / 2, 1550);

  ctx.fillStyle = '#4B5563';
  ctx.font = '500 32px "DM Sans", Arial, sans-serif';
  ctx.fillText(`${stats.total_products} Produk UMKM · ${stats.total_umkm} Mitra Produsen`, width / 2, 1612);

  ctx.fillStyle = '#6B7280';
  ctx.font = '500 24px "DM Sans", Arial, sans-serif';
  ctx.fillText('Cek daftar produk, komposisi bahan, & sertifikat halal', width / 2, 1685);

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'poster-qr-beranda-toko.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

