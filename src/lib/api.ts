import type {
  AdminUser,
  AuthStatus,
  Category,
  HalalCertificate,
  Product,
  SiteSettings,
  SiteStats,
  Umkm,
} from '../types';

async function request<T>(url: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {...options, headers});
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {error: text};
    }
  }
  if (!res.ok) {
    const errMsg =
      data && typeof data === 'object' && 'error' in data && typeof (data as {error?: unknown}).error === 'string'
        ? (data as {error: string}).error
        : `Permintaan gagal (${res.status})`;
    throw new Error(errMsg);
  }
  return data as T;
}

// Public API
export const api = {
  getSettings: () => request<SiteSettings>('/api/settings'),
  getStats: () => request<SiteStats>('/api/stats'),
  getCategories: () => request<Category[]>('/api/categories'),
  getProducts: (search?: string, category?: string) => {
    const params = new URLSearchParams();
    if (search && search.trim()) params.set('search', search.trim());
    if (category && category !== 'all') params.set('category', category);
    const qs = params.toString();
    return request<Product[]>(`/api/products${qs ? `?${qs}` : ''}`);
  },
  getProductBySlug: (slug: string) => request<Product>(`/api/products/${encodeURIComponent(slug)}`),

  // Auth API
  getAuthStatus: () => request<AuthStatus>('/api/auth/status'),
  bootstrapAdmin: (payload: {username: string; password: string; full_name: string}) =>
    request<{token: string; user: AdminUser}>('/api/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  loginAdmin: (payload: {username: string; password: string}) =>
    request<{token: string; user: AdminUser}>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMe: (token: string) => request<{user: AdminUser}>('/api/auth/me', {}, token),

  // Admin API
  uploadFile: (file: File, token: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{url: string; filename: string; mimetype: string; size: number}>(
      '/api/admin/upload',
      {method: 'POST', body: formData},
      token
    );
  },
  getOverview: (token: string) =>
    request<{stats: SiteStats; recentProducts: Product[]}>('/api/admin/overview', {}, token),

  // Products
  getAdminProducts: (token: string) => request<Product[]>('/api/admin/products', {}, token),
  createProduct: (payload: Record<string, unknown>, token: string) =>
    request<Product>('/api/admin/products', {method: 'POST', body: JSON.stringify(payload)}, token),
  updateProduct: (id: number, payload: Record<string, unknown>, token: string) =>
    request<Product>(`/api/admin/products/${id}`, {method: 'PUT', body: JSON.stringify(payload)}, token),
  deleteProduct: (id: number, token: string) =>
    request<{success: boolean}>(`/api/admin/products/${id}`, {method: 'DELETE'}, token),

  // UMKM
  getAdminUmkm: (token: string) => request<Umkm[]>('/api/admin/umkm', {}, token),
  createUmkm: (payload: Record<string, unknown>, token: string) =>
    request<Umkm>('/api/admin/umkm', {method: 'POST', body: JSON.stringify(payload)}, token),
  updateUmkm: (id: number, payload: Record<string, unknown>, token: string) =>
    request<Umkm>(`/api/admin/umkm/${id}`, {method: 'PUT', body: JSON.stringify(payload)}, token),
  deleteUmkm: (id: number, token: string) =>
    request<{success: boolean}>(`/api/admin/umkm/${id}`, {method: 'DELETE'}, token),

  // Certificates
  getAdminCertificates: (token: string) =>
    request<HalalCertificate[]>('/api/admin/certificates', {}, token),
  createCertificate: (payload: Record<string, unknown>, token: string) =>
    request<HalalCertificate>(
      '/api/admin/certificates',
      {method: 'POST', body: JSON.stringify(payload)},
      token
    ),
  updateCertificate: (id: number, payload: Record<string, unknown>, token: string) =>
    request<HalalCertificate>(
      `/api/admin/certificates/${id}`,
      {method: 'PUT', body: JSON.stringify(payload)},
      token
    ),
  deleteCertificate: (id: number, token: string) =>
    request<{success: boolean}>(`/api/admin/certificates/${id}`, {method: 'DELETE'}, token),

  // QR Codes
  getAdminQrCodes: (token: string) => request<Product[]>('/api/admin/qrcodes', {}, token),
  regenerateQrCode: (productId: number, token: string) =>
    request<Product>(`/api/admin/qrcodes/${productId}/regenerate`, {method: 'POST'}, token),

  // Categories
  createCategory: (payload: {name: string; description: string | null}, token: string) =>
    request<Category>('/api/admin/categories', {method: 'POST', body: JSON.stringify(payload)}, token),
  updateCategory: (id: number, payload: {name: string; description: string | null}, token: string) =>
    request<Category>(`/api/admin/categories/${id}`, {method: 'PUT', body: JSON.stringify(payload)}, token),
  deleteCategory: (id: number, token: string) =>
    request<{success: boolean}>(`/api/admin/categories/${id}`, {method: 'DELETE'}, token),

  // Settings
  updateSettings: (payload: SiteSettings, token: string) =>
    request<SiteSettings>('/api/admin/settings', {method: 'PUT', body: JSON.stringify(payload)}, token),
};
