import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Camera, Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export function AdminLoginPage() {
  const [email, setEmail] = useState('admin@eventsnap.io');
  const [password, setPassword] = useState('eventpass123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/admin/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      success('Welcome back', 'Successfully authenticated as Admin');
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@eventsnap.io');
    setPassword('eventpass123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-brand-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo */}
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-11 h-11 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Camera className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">EventSnap</span>
        </Link>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
          Organizer Portal
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to manage multi-event QR codes, storage & photo galleries.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-elevated rounded-2xl border border-slate-200/90">
          {/* Demo Credentials Alert Banner */}
          <div className="mb-6 p-3.5 rounded-xl bg-brand-50/70 border border-brand-100 flex items-start justify-between gap-3 text-xs text-brand-900">
            <div className="flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-brand-950">Pre-configured Demo Account</p>
                <p className="text-brand-700 text-[11px] mt-0.5">Cognito User Pool Sandbox</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 underline shrink-0 cursor-pointer"
            >
              Fill Demo
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@eventsnap.io"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 animate-fade-in">
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full gap-2 h-11 text-sm font-semibold shadow-sm"
                isLoading={isLoading}
              >
                Sign In to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Secured via Amazon Cognito JWT</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            ← Back to EventSnap Home
          </Link>
        </div>
      </div>
    </div>
  );
}

