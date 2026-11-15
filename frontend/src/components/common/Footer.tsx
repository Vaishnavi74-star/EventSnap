import { Camera, Shield, Server, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <Camera className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-slate-900 tracking-tight">EventSnap</span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Production-grade serverless photo-sharing infrastructure for summits, weddings, galas, and corporate events. Direct-to-S3 ingestion with zero server bottlenecks.
            </p>
            <div className="flex items-center gap-4 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Serverless Speed
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-500" /> Private S3 Presigned URLs
              </span>
              <span className="flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-brand-500" /> Multi-Event DynamoDB
              </span>
            </div>
          </div>

          {/* Navigation Column */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/events/evt_techsummit2026" className="hover:text-slate-900 transition-colors">Demo Attendee View</Link>
              </li>
              <li>
                <Link to="/admin/events/new" className="hover:text-slate-900 transition-colors">Host an Event</Link>
              </li>
              <li>
                <Link to="/admin/dashboard" className="hover:text-slate-900 transition-colors">Admin Portal</Link>
              </li>
            </ul>
          </div>

          {/* Tech Architecture Column */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">AWS Architecture</h4>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Amazon S3 (Encrypted Storage)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> AWS Lambda & API Gateway
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Amazon DynamoDB
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Amazon Cognito Auth
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} EventSnap Platform. Built for real production event hosting.</p>
          <div className="flex items-center gap-6">
            <span>Privacy</span>
            <span>Terms of Service</span>
            <span>Security Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

