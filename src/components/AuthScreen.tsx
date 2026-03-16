import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';
import { isSupabaseConfigured } from '../lib/supabase';
import logoImg from '../assets/logo.svg';

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const configured = isSupabaseConfigured();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email, password);
      if (error) setError(error.message);
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex">
      <div className="w-full lg:w-[480px] flex flex-col px-8 sm:px-12 lg:px-16">
        <div className="pt-8 pb-4">
          <img src={logoImg} alt="Dayframe" className="h-9" />
        </div>
        <div className="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl font-medium text-zinc-900 tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-zinc-400 mt-2 mb-8">
              {mode === 'signin'
                ? 'Sign in to continue planning your day'
                : 'Start organizing your day with Dayframe'}
            </p>

            {!configured && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-bold text-amber-800 mb-1">Supabase 설정 필요</p>
                <p className="text-[11px] text-amber-700">
                  .env 파일에 <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>를 Supabase 대시보드에서 복사한 <strong>anon public</strong> 키로 교체하세요.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={!configured}
              className={clsx(
                "w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border text-sm font-semibold transition-colors",
                configured
                  ? "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                  : "border-zinc-100 bg-zinc-50 text-zinc-400 cursor-not-allowed"
              )}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-zinc-300 uppercase tracking-wider font-medium">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  data-1p-ignore
                  data-lpignore="true"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-xs font-medium text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !configured}
                className={clsx(
                  "w-full py-3 rounded-xl text-sm font-bold transition-all",
                  loading
                    ? "bg-zinc-200 text-zinc-500 cursor-not-allowed"
                    : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]"
                )}
              >
                {loading ? '...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-zinc-400">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
                className="font-semibold text-zinc-700 hover:text-zinc-900 underline underline-offset-2"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </motion.div>
        </div>
      </div>

      <HeroPanel />
    </div>
  );
}

function HeroPanel() {
  return (
    <div className="hidden lg:flex flex-1 relative overflow-hidden">
      <motion.img
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        src="/login-hero.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-right"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col items-center justify-start w-full p-12 lg:p-16 pt-24 lg:pt-32 text-center">
        <h2 className="text-3xl lg:text-4xl font-normal text-white tracking-tight leading-tight mb-4">
          Frame your day.<br/>
          Focus on what matters.
        </h2>
        <p className="text-sm text-white/70 leading-relaxed max-w-md">
          Plan your schedule, prioritize tasks, and stay productive — all in one beautifully simple daily planner.
        </p>
      </div>
    </div>
  );
}
