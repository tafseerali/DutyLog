import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Eye, EyeOff, LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, signInGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('dutylog_remembered_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [remember30Days, setRemember30Days] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Please enter your email address');
        return;
      }
      setLoading(true);
      try {
        await resetPassword(email);
        setInfoMsg('Password reset link sent to your email.');
      } catch (err: any) {
        setError(err.message || 'Failed to send reset link');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setError('Please provide both email and password');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your name');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      setLoading(true);
      try {
        await signUp(name, email, password);
      } catch (err: any) {
        setError(err.message || 'Failed to create account');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        await signIn(email, password, remember30Days);
      } catch (err: any) {
        setError(err.message || 'Invalid email or password');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-7 border border-slate-200 shadow-xl space-y-6">
        {/* App Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-blue-700 mx-auto flex items-center justify-center text-white shadow-lg">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">DutyLog</h1>
          <p className="text-xs text-slate-500 font-medium">
            Personal Attendance & Work Hours Tracker
          </p>
        </div>

        {/* Error / Info messages */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-blue-600 bg-white"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-blue-600 bg-white"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-blue-600 bg-white pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'signup' && (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Must be at least 6 characters
                </span>
              )}

              {mode === 'signin' && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="remember30"
                    checked={remember30Days}
                    onChange={(e) => setRemember30Days(e.target.checked)}
                    className="w-4 h-4 rounded-md text-blue-700 border-slate-300 focus:ring-blue-600 cursor-pointer"
                  />
                  <label
                    htmlFor="remember30"
                    className="text-xs font-medium text-slate-700 cursor-pointer select-none"
                  >
                    Stay signed in for 30 days (Recommended)
                  </label>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-blue-700 hover:bg-blue-800 active:scale-98 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {mode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Sending Link...' : 'Send Password Reset Link'}</span>
              </>
            )}
          </button>
        </form>

        {/* Google sign-in fallback button */}
        {mode !== 'forgot' && (
          <div className="space-y-3">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2 text-[11px] font-semibold text-slate-400 absolute">
                OR
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 active:scale-98 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {/* Toggle Mode */}
        <div className="text-center text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
          {mode === 'signin' && (
            <span>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="text-blue-700 font-bold hover:underline"
              >
                Create account
              </button>
            </span>
          )}

          {mode === 'signup' && (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className="text-blue-700 font-bold hover:underline"
              >
                Sign In
              </button>
            </span>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className="text-blue-700 font-bold hover:underline"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
