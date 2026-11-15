import { Link } from 'react-router-dom';
import { Camera, ShieldCheck, ArrowRight, Sparkles, QrCode, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 group-hover:shadow-glow transition-all duration-200">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
                EventSnap
              </span>
              <span className="text-[10px] font-mono font-bold bg-slate-900 text-brand-300 px-1.5 py-0.2 rounded border border-slate-700">
                AWS
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 hidden sm:block">
              Tech Summits & Community Days
            </span>
          </div>
        </Link>

        {/* Navigation items */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
            Architecture
          </a>
          <a href="#features" className="hover:text-slate-900 transition-colors">
            Features
          </a>
          <Link
            to="/events/evt_techsummit2026"
            className="inline-flex items-center gap-1.5 text-slate-700 hover:text-brand-700 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-brand-50 transition-colors text-xs font-bold"
          >
            <QrCode className="w-3.5 h-3.5 text-brand-600" />
            <span>Attendee Demo (Scan QR)</span>
          </Link>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/admin/dashboard">
              <Button size="sm" className="gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold">
                <Terminal className="w-3.5 h-3.5" />
                Organizer Console
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/admin/login">
                <Button variant="ghost" size="sm" className="gap-1.5 text-slate-800 font-semibold hover:bg-slate-100">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  Organizer Login
                </Button>
              </Link>
              <Link to="/admin/events/new">
                <Button size="sm" className="gap-1.5 shadow-sm bg-slate-900 hover:bg-slate-800 text-white font-bold">
                  Host Tech Event
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
