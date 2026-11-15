import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Image as ImageIcon, QrCode, MoreVertical, Edit2, ExternalLink, Trash2 } from 'lucide-react';
import { EventItem } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { QRCodeModal } from './QRCodeModal';

interface EventCardProps {
  event: EventItem;
  onDelete?: (eventId: string) => void;
}

export function EventCard({ event, onDelete }: EventCardProps) {
  const [showQR, setShowQR] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const statusVariant =
    event.status === 'ACTIVE'
      ? 'success'
      : event.status === 'CLOSED'
      ? 'warning'
      : 'neutral';

  return (
    <>
      <div className="group rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-subtle hover:shadow-premium transition-all duration-200 flex flex-col justify-between">
        {/* Cover Header */}
        <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
          {event.coverImageUrl ? (
            <img
              src={event.coverImageUrl}
              alt={event.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
              <ImageIcon className="w-10 h-10 stroke-1" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant={statusVariant} dot>
              {event.status}
            </Badge>
          </div>

          {/* QR Code Quick Button */}
          <button
            onClick={() => setShowQR(true)}
            className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 backdrop-blur-sm text-slate-700 hover:text-brand-600 shadow-xs transition-colors"
            title="View QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <Link
              to={`/admin/events/${event.eventId}`}
              className="block group-hover:text-brand-600 transition-colors"
            >
              <h3 className="text-base font-semibold text-slate-900 tracking-tight line-clamp-1">
                {event.name}
              </h3>
            </Link>

            <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {event.description || 'No description provided.'}
            </p>

            <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{event.location || 'Online / Global'}</span>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <ImageIcon className="w-3.5 h-3.5 text-brand-600" />
              <span>{event.photoCount} photos</span>
            </div>

            <div className="flex items-center gap-1.5 relative">
              <Link to={`/admin/events/${event.eventId}`}>
                <Button size="sm" variant="outline" className="h-8 text-xs px-2.5">
                  Manage
                </Button>
              </Link>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Popup menu */}
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl bg-white border border-slate-200 shadow-elevated z-30 py-1 text-xs text-slate-700 animate-scale-in">
                    <Link
                      to={`/admin/events/${event.eventId}/edit`}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      Edit Details
                    </Link>
                    <a
                      href={`/events/${event.eventId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      Public Page
                    </a>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setShowQR(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                    >
                      <QrCode className="w-3.5 h-3.5 text-slate-400" />
                      Show QR Code
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(event.eventId);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 text-rose-600 text-left border-t border-slate-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Event
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <QRCodeModal
        event={event}
        isOpen={showQR}
        onClose={() => setShowQR(false)}
      />
    </>
  );
}

