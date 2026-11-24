import { Shield } from 'lucide-react';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { extractApiError } from '../services/api';

type AuthMode = 'login' | 'register' | 'claim-admin';

export function AuthPage() {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    claimInitialAdmin,
    canClaimInitialAdmin,
  } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/';

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (mode === 'login') {
        const u = await loginWithEmail(email.trim(), password);
        showToast(`Welcome back, ${u.name}`, 'success');
        navigate(u.role === 'admin' && redirectTo === '/' ? '/admin' : redirectTo, {
          replace: true,
        });
      } else if (mode === 'register') {
        const u = await registerWithEmail(name.trim(), email.trim(), password, phone.trim() || undefined);
        showToast('Account created successfully', 'success');
        navigate(redirectTo, { replace: true });
      } else {
        const u = await claimInitialAdmin(name.trim(), email.trim(), password);
        showToast('Administrator account initialized', 'success');
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      showToast(extractApiError(err, 'Authentication failed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setSubmitting(true);
      const u = await loginWithGoogle();
      showToast(`Signed in as ${u.name}`, 'success');
      navigate(u.role === 'admin' && redirectTo === '/' ? '/admin' : redirectTo, {
        replace: true,
      });
    } catch (err) {
      showToast(extractApiError(err, 'Google sign-in failed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border border-[#27272A] bg-[#111114] p-7 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold text-[#FAFAFA]">
            {mode === 'login'
              ? 'Sign in to NEXORA'
              : mode === 'register'
              ? 'Create NEXORA Account'
              : 'Initialize Admin Console'}
          </h1>
          <p className="text-xs text-[#A1A1AA]">
            {mode === 'claim-admin'
              ? 'First-run administrator bootstrap. Locks automatically once claimed.'
              : 'Access your orders, saved addresses, and hardware wishlist.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#27272A] bg-[#09090B] p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 text-xs font-medium rounded-md transition-colors ${
              mode === 'login' ? 'bg-[#8B5CF6] text-white' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 text-xs font-medium rounded-md transition-colors ${
              mode === 'register' ? 'bg-[#8B5CF6] text-white' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            Create Account
          </button>
        </div>

        {mode !== 'claim-admin' && (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-[#27272A] bg-[#18181B] py-2.5 text-sm font-medium text-[#FAFAFA] hover:border-[#8B5CF6] transition-colors"
            >
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-[#27272A]" />
              <span className="mx-3 text-xs text-[#A1A1AA]">or with email</span>
              <div className="flex-grow border-t border-[#27272A]" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'register' || mode === 'claim-admin') && (
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1.5">Full Name</label>
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1.5">Phone (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 0194"
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={mode === 'login' ? 1 : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#8B5CF6] py-3 text-sm font-medium text-white hover:bg-[#7C3AED] disabled:opacity-50 transition-colors"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'register'
              ? 'Create Account'
              : 'Claim Initial Admin Account'}
          </button>
        </form>

        {canClaimInitialAdmin && mode !== 'claim-admin' && (
          <div className="border-t border-[#27272A] pt-4 text-center">
            <button
              type="button"
              onClick={() => setMode('claim-admin')}
              className="inline-flex items-center gap-1.5 text-xs text-[#06B6D4] hover:underline"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>First-time setup? Claim initial Admin password</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
