import { Calendar, MapPin, Camera, QrCode, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EventItem } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

interface AttendeeHeaderProps {
  event: EventItem;
}

export function AttendeeHeader({ event }: AttendeeHeaderProps) {
  const isClosed = event.status === 'CLOSED';
  const isArchived = event.status === 'ARCHIVED';

  return (
    <div className="w-full">
      {/* Top minimal bar */}
      <div className="h-14 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <Camera className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
              EventSnap
            </span>
            <span className="text-[10px] font-mono font-bold bg-slate-900 text-brand-300 px-1 py-0.2 rounded">
              AWS
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <QrCode className="w-3 h-3 text-emerald-600" />
            Attendee View (No Login Required)
          </span>
          <Badge
            variant={event.status === 'ACTIVE' ? 'success' : isClosed ? 'warning' : 'neutral'}
            dot
          >
            {event.status === 'ACTIVE' ? 'Live Stream' : event.status}
          </Badge>
          <Link
            to="/admin/login"
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 px-2 py-1 rounded transition-colors"
          >
            Organizer Login
          </Link>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative w-full h-48 sm:h-64 bg-slate-950 overflow-hidden">
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt={event.name}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent flex flex-col justify-end p-4 sm:p-8">
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-brand-300 uppercase tracking-widest bg-brand-950/70 border border-brand-800 px-2 py-0.5 rounded">
                Official Tech Summit Gallery
              </span>
              <span className="text-[11px] text-slate-300 font-mono">
                Direct to S3
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-1 drop-shadow-sm">
              {event.name}
            </h1>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-slate-200 font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                {formatDate(event.date)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-400" />
                  {event.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description & Notice */}
      {event.description && (
        <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-8">
          <div className="max-w-4xl mx-auto flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                {event.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attendee Instruction Banner */}
      <div className="bg-brand-50/80 border-b border-brand-200/80 py-2.5 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-brand-900">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">
              Attendee Mode: You scanned the stage QR code. Tap below to upload photos from your smartphone camera directly to AWS S3.
            </span>
          </div>
        </div>
      </div>

      {isClosed && (
        <div className="bg-amber-50 border-b border-amber-200 py-3 px-4 text-center text-xs font-semibold text-amber-900">
          ⚠️ <strong>Event Concluded:</strong> Photo uploads are locked by the organizer, but you can browse and download all shared high-resolution photos below.
        </div>
      )}

      {isArchived && (
        <div className="bg-slate-100 border-b border-slate-200 py-3 px-4 text-center text-xs font-semibold text-slate-800">
          📁 <strong>Event Archived:</strong> This event gallery has been archived. Photo uploads and interactions are disabled.
        </div>
      )}
    </div>
  );
}
