import { useState, type FormEvent } from 'react';
import { Lock, Mail, Phone, ShieldCheck, Ticket, User as UserIcon, X } from 'lucide-react';
import type { User } from '../types/cinema';
import { cineverseApi } from '../api/cineverseApi';
import { signInWithGooglePopup } from '../services/googleAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: User) => void;
}

export function AuthModal({ isOpen, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (mode === 'REGISTER' && (!name.trim() || password.length < 6)) {
      setErrorMsg('Please enter your full name and a password of at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res =
        mode === 'LOGIN'
          ? await cineverseApi.login(email, password)
          : await cineverseApi.register(name, email, phone || '+91 90000 00000', password);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = async (demoEmail: string, demoPass: string) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await cineverseApi.login(demoEmail, demoPass);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      const googleResult = await signInWithGooglePopup();
      const res = await cineverseApi.loginWithGoogle({
        idToken: googleResult.idToken,
        accessToken: googleResult.accessToken,
        email: googleResult.email,
        name: googleResult.name,
        avatarUrl: googleResult.avatarUrl,
      });
      onAuthenticated(res.user);
      onClose();
    } catch (err: unknown) {
      const code = (err as { code?: string } | null)?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg('Google sign-in popup was closed before completing authentication.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Popup blocked by your browser. Please allow popups for this site and try again.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to sign in with Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'LOGIN' ? 'Sign in to CINEVERSE' : 'Create CINEVERSE account'}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <div className="bg-[#0D1426] border border-white/15 rounded-2xl max-w-md w-full p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#F5C518] text-[#060913] flex items-center justify-center">
              <Ticket className="w-4 h-4 stroke-[2.5]" />
            </span>
            <h2 className="font-display text-xl font-bold text-white">
              {mode === 'LOGIN' ? 'Welcome Back' : 'Join CINEVERSE'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || submitting}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-60 text-[#1F1F1F] font-semibold text-sm flex items-center justify-center gap-3 transition-colors border border-white/20 shadow-sm cursor-pointer"
        >
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="w-4 h-4 shrink-0"
            aria-hidden="true"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          <span>{googleLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
        </button>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-white/10" />
          <span className="px-3 text-[11px] uppercase tracking-wider text-slate-400">
            or continue with email
          </span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-[#060913] p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'LOGIN' ? 'bg-[#F5C518] text-[#060913]' : 'text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'REGISTER' ? 'bg-[#F5C518] text-[#060913]' : 'text-slate-300'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'REGISTER' && (
            <>
              <div>
                <label htmlFor="auth-name" className="text-xs text-slate-300 block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aarav Menon"
                    className="w-full bg-[#060913] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C518]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="auth-phone" className="text-xs text-slate-300 block mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98401 11223"
                    className="w-full bg-[#060913] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C518]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="text-xs text-slate-300 block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cineverse.in"
                className="w-full bg-[#060913] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C518]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="text-xs text-slate-300 block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-[#060913] border border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F5C518]"
              />
            </div>
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs text-red-300 bg-red-950/50 border border-red-500/40 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] font-bold text-sm transition-colors"
          >
            {submitting
              ? 'Authenticating...'
              : mode === 'LOGIN'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        {/* Quick Demo Access */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <p className="text-[11px] text-slate-400 text-center">Quick Access Demo Accounts</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickLogin('user@cineverse.in', 'cinema123')}
              className="py-2 px-3 rounded-xl bg-[#060913] border border-white/10 hover:border-[#F5C518] text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#F5C518]" />
              Demo Guest
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin@cineverse.in', 'admin123')}
              className="py-2 px-3 rounded-xl bg-[#060913] border border-white/10 hover:border-[#F5C518] text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F5C518]" />
              Demo Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
