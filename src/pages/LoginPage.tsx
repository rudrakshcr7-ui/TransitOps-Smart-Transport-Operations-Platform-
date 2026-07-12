import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Mail, Lock, User, Shield, ChevronRight } from 'lucide-react';
import { UserRole } from '../lib/supabase';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('fleet_manager');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, fullName, role);
      if (error) setError(error);
    }
    setLoading(false);
  };

  const roleLabels: Record<UserRole, string> = {
    fleet_manager: 'Fleet Manager',
    driver: 'Driver',
    safety_officer: 'Safety Officer',
    financial_analyst: 'Financial Analyst',
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Truck size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">TransitOps</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Smart Transport<br />Operations Platform
            </h1>
            <p className="text-slate-400 text-lg max-w-md leading-relaxed">
              Manage your fleet, drivers, trips, maintenance, and expenses — all in one unified, real-time dashboard.
            </p>
            <div className="mt-8 space-y-3">
              {[
                'Real-time fleet status and trip tracking',
                'Automated vehicle & driver status updates',
                'Comprehensive maintenance and fuel logging',
                'Analytics with CSV export',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3 text-sm text-slate-300">
                  <ChevronRight size={16} className="text-blue-400" />
                  {feat}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500">© 2025 TransitOps. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Truck size={22} />
            </div>
            <span className="text-lg font-bold text-slate-800">TransitOps</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            {mode === 'signin' ? 'Sign in to manage your fleet operations.' : 'Sign up to get started with TransitOps.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Smith"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                <div className="relative">
                  <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                      <option key={r} value={r}>{roleLabels[r]}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(null); }} className="text-blue-600 font-medium hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(null); }} className="text-blue-600 font-medium hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
