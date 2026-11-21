import {useState} from 'react';
import {Package} from 'lucide-react';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  productName: string;
  className?: string;
  aspectClass?: string;
}

export function ProductImage({
  src,
  alt,
  productName,
  className = '',
  aspectClass = 'aspect-[4/3]',
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${aspectClass} w-full bg-[#F5F7F5] flex flex-col items-center justify-center p-6 text-center select-none ${className}`}
      >
        <div className="w-12 h-12 rounded-xl bg-white border border-emerald-900/10 flex items-center justify-center text-[#168B50] mb-3 shadow-xs">
          <Package className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <p className="text-xs font-medium text-slate-500 max-w-[180px] leading-snug line-clamp-2">
          {productName}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">Foto belum diunggah admin</p>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full bg-[#F5F7F5] overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover transition-transform duration-300"
      />
    </div>
  );
}
