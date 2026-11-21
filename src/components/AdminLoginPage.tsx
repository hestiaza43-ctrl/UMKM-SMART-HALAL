import {type FormEvent, useEffect, useState} from 'react';
import {ArrowLeft, Lock, ShieldCheck, UserPlus} from 'lucide-react';
import {api} from '../lib/api';
import type {AdminUser, AuthStatus, SiteSettings} from '../types';
import {CampusLogo} from './CampusLogo';

interface AdminLoginPageProps {
  settings: SiteSettings;
  onSuccess: (token: string, user: AdminUser) => void;
  onNavigate: (path: string) => void;
}

export function AdminLoginPage({settings, onSuccess, onNavigate}: AdminLoginPageProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('Admin UNIKMA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAuthStatus()
      .then(setAuthStatus)
      .catch(() => setAuthStatus({initialized: true, envAuthConfigured: false}));
  }, []);

  const isFirstRunSetup = authStatus !== null && !authStatus.initialized && !authStatus.envAuthConfigured;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isFirstRunSetup) {
        const res = await api.bootstrapAdmin({username, password, full_name: fullName});
        onSuccess(res.token, res.user);
      } else {
        const res = await api.loginAdmin({username, password});
        onSuccess(res.token, res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke dashboard admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#075C3B] px-6 py-6 text-white flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white p-0.5 shrink-0">
            <CampusLogo className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-base tracking-tight truncate">
              {settings.site_name}
            </h1>
            <p className="text-xs text-emerald-100 truncate">
              Portal Pengelola · {settings.subtitle}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {authStatus === null ? (
            <div className="py-8 text-center text-sm text-slate-500">Memeriksa status autentikasi...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
                  {isFirstRunSetup ? (
                    <>
                      <UserPlus className="w-5 h-5 text-[#168B50]" />
                      Aktivasi Akun Admin Pertama
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 text-[#168B50]" />
                      Login Dashboard Admin
                    </>
                  )}
                </h2>
                <p className="mt-1.5 text-sm text-slate-600">
                  {isFirstRunSetup
                    ? 'Belum ada akun admin terdaftar. Buat kredensial admin pertama untuk mengelola produk UMKM, sertifikat halal, dan QR Code.'
                    : 'Masukkan username dan password pengelola Smart Halal Campus Mart.'}
                </p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}

              {isFirstRunSetup && (
                <div>
                  <label htmlFor="admin-fullname" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Pengelola
                  </label>
                  <input
                    id="admin-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Pengelola Prodi Bisnis Digital"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
                  />
                </div>
              )}

              <div>
                <label htmlFor="admin-username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username
                </label>
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password {isFirstRunSetup && <span className="text-slate-400 font-normal">(minimal 8 karakter)</span>}
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  minLength={isFirstRunSetup ? 8 : 1}
                  autoComplete={isFirstRunSetup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#168B50]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#168B50] hover:bg-[#075C3B] text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {loading
                  ? 'Memproses...'
                  : isFirstRunSetup
                    ? 'Simpan & Masuk Dashboard'
                    : 'Masuk ke Dashboard'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#168B50] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Halaman Publik
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
