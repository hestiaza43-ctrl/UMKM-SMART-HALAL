export type VerificationStatus =
  | 'Data Sertifikat Tersedia'
  | 'Terverifikasi'
  | 'Perlu Pemeriksaan Ulang';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  product_count?: number;
}

export interface Umkm {
  id: number;
  name: string;
  owner_name: string | null;
  phone: string | null;
  address: string | null;
  maps_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface HalalCertificate {
  id: number;
  certificate_number: string;
  spp_irt_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
  verification_status: VerificationStatus;
  verification_evidence: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  linked_products_count?: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  variant_name: string;
  image_url: string | null;
  description: string | null;
  sort_order: number;
}

export interface QRCodeRecord {
  id: number;
  product_id: number;
  unique_code: string;
  target_path: string;
  regenerated_count: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  umkm_id: number;
  category_id: number | null;
  certificate_id: number | null;
  main_image: string | null;
  gallery_images: string[];
  story: string | null;
  ingredients: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  umkm: Umkm;
  category: Category | null;
  certificate: HalalCertificate | null;
  variants: ProductVariant[];
  qr_code: QRCodeRecord | null;
}

export interface SiteStats {
  total_products: number;
  total_umkm: number;
  total_certificates: number;
  total_categories: number;
  total_verified: number;
}

export interface SiteSettings {
  site_name: string;
  subtitle: string;
  institution: string;
  hero_title: string;
  hero_description: string;
  about_title: string;
  about_description: string;
  about_purpose: string;
  about_prodi_role: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  public_base_url: string;
}

export interface AuthStatus {
  initialized: boolean;
  envAuthConfigured: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
}
