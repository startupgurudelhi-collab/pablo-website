import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loginAdmin } from '../../lib/api';
import type { AdminUserPublic } from '../../types/studio';

interface AdminLoginProps {
  onSuccess: (user: AdminUserPublic) => void;
}

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginAdmin(email, password);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#171614] flex flex-col justify-center px-5 py-10">
      <div className="max-w-md w-full mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-[#5C5750] hover:text-[#171614] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to PABLO Website</span>
        </Link>

        <div className="bg-white p-8 sm:p-10">
          <h1 className="font-serif text-3xl font-normal text-[#171614]">PABLO</h1>

          {error && (
            <div
              role="alert"
              className="mt-6 p-3.5 bg-[#FDF4F3] text-xs sm:text-sm text-[#8A1C13]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-medium text-[#5C5750] mb-2">
                Admin Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pablo.studio"
                className="w-full px-4 py-3 text-sm bg-[#FAF8F5] text-[#171614] focus:outline-none focus:ring-1 focus:ring-[#171614]"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-medium text-[#5C5750] mb-2"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 text-sm bg-[#FAF8F5] text-[#171614] focus:outline-none focus:ring-1 focus:ring-[#171614]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
