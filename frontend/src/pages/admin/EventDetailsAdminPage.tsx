import { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  QrCode,
  Edit2,
  Trash2,
  Download,
  Copy,
  ExternalLink,
  Check,
  ArrowLeft,
  Image as ImageIcon,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { PhotoModerationCard } from '@/components/admin/PhotoModerationCard';
import { QRCodeModal } from '@/components/admin/QRCodeModal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { getEventById, updateEventStatus, deleteEvent } from '@/api/events';
import { getEventPhotos, deletePhoto } from '@/api/photos';
import { EventItem, EventStatus, PhotoItem } from '@/types';
import { generateQRCodeDataUrl, downloadQRCode } from '@/utils/qrcode';
import { formatDate, formatBytes } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

export function EventDetailsAdminPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
  const { success, error } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [showDeleteEventDialog, setShowDeleteEventDialog] = useState(false);

  const publicUrl = eventId ? `${window.location.origin}/events/${eventId}` : '';

  const loadData = async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      const [eventData, photosData] = await Promise.all([
        getEventById(eventId),
        getEventPhotos(eventId),
      ]);
      setEvent(eventData);
      setPhotos(photosData.photos);
      setNextToken(photosData.nextToken);

      const qr = await generateQRCodeDataUrl(`${window.location.origin}/events/${eventId}`);
      setQrDataUrl(qr);
    } catch (err: any) {
      error('Failed to load event', err.message);
      navigate('/admin/events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!eventId || !nextToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const morePhotos = await getEventPhotos(eventId, nextToken);
      setPhotos((prev) => [...prev, ...morePhotos.photos]);
      setNextToken(morePhotos.nextToken);
    } catch (err: any) {
      error('Load More Failed', err.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const handleStatusChange = async (newStatus: EventStatus) => {
    if (!eventId || !event) return;
    try {
      const updated = await updateEventStatus(eventId, newStatus);
      setEvent(updated);
      success('Status Updated', `Event is now ${newStatus}`);
    } catch (err: any) {
      error('Update Failed', err.message);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      success('Link Copied', 'Attendee URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!eventId) return;
    try {
      await deletePhoto(eventId, photoId);
      setPhotos((prev) => prev.filter((p) => p.photoId !== photoId));
      if (event) {
        setEvent({ ...event, photoCount: Math.max(0, event.photoCount - 1) });
      }
      success('Photo Deleted', 'Removed from S3 and DynamoDB index');
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventId) return;
    setIsDeletingEvent(true);
    try {
      await deleteEvent(eventId);
      success('Event Deleted', 'Event and associations removed');
      navigate('/admin/events');
    } catch (err: any) {
      error('Delete Failed', err.message);
      setIsDeletingEvent(false);
    }
  };

  if (isLoading || !event) {
    return (
      <div className="flex-1 flex flex-col">
        <AdminHeader onToggleSidebar={toggleSidebar} title="Event Details" />
        <LoadingState message="Loading event and gallery records..." />
      </div>
    );
  }

  const totalBytes = photos.reduce((sum, p) => sum + (p.fileSize || 0), 0);

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        onToggleSidebar={toggleSidebar}
        title={event.name}
        description="Monitor attendee uploads, inspect photos, and distribute QR codes."
      />

      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Navigation Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            to="/admin/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Events
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Selector Dropdown */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              {(['ACTIVE', 'CLOSED', 'ARCHIVED'] as EventStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    event.status === st
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <Link to={`/admin/events/${event.eventId}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Edit2 className="w-3.5 h-3.5" />
                Edit Details
              </Button>
            </Link>

            <a href={publicUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="subtle" className="gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" />
                Open Attendee View
              </Button>
            </a>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteEventDialog(true)}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Top Overview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Information Card */}
          <Card className="lg:col-span-2 overflow-hidden flex flex-col justify-between">
            <div className="relative h-48 w-full bg-slate-100">
              {event.coverImageUrl ? (
                <img
                  src={event.coverImageUrl}
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent flex items-end p-6">
                <div>
                  <Badge
                    variant={
                      event.status === 'ACTIVE'
                        ? 'success'
                        : event.status === 'CLOSED'
                        ? 'warning'
                        : 'neutral'
                    }
                    dot
                  >
                    {event.status}
                  </Badge>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-2">
                    {event.name}
                  </h2>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                {event.description || 'No description provided for this event.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
                  <span className="font-medium">{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
                  <span className="font-medium truncate">{event.location || 'Global / Virtual'}</span>
                </div>
              </div>

              {/* Stats Summary Bar */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Total Photos
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{photos.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    S3 Storage
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{formatBytes(totalBytes)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Access URL
                  </p>
                  <p className="text-xs font-semibold text-brand-600 mt-1 truncate">
                    /{event.eventId}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Action Card */}
          <Card className="flex flex-col items-center justify-between p-6 text-center">
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-brand-600" />
                  Event QR Code
                </h3>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Ready to Scan
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4 text-left">
                Print this QR code to place on venue tables, projection screens, or flyers.
              </p>

              {/* QR Code Box */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 inline-block shadow-inner mb-4">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Event QR Code"
                    className="w-44 h-44 object-contain rounded-lg"
                  />
                )}
              </div>

              {/* Copy URL Input */}
              <div className="w-full mb-3">
                <div className="flex items-center gap-1 p-1 rounded-xl border border-slate-200 bg-slate-50 text-left">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="w-full bg-transparent px-2 text-[11px] text-slate-600 outline-none truncate font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="h-7 px-2.5 text-xs gap-1 bg-white"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadQRCode(qrDataUrl, event.name)}
                className="gap-1.5 text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download PNG
              </Button>
              <Button
                size="sm"
                onClick={() => setShowQRModal(true)}
                className="gap-1.5 text-xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                Full View & Print
              </Button>
            </div>
          </Card>
        </div>

        {/* Photo Gallery & Moderation Stream */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Uploaded Photos Gallery ({photos.length})
              </h3>
              <p className="text-xs text-slate-500">
                Direct S3 image stream. Review uploads, inspect full-res images, and remove any inappropriate content.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Test Attendee Upload
                </Button>
              </a>
            </div>
          </div>

          {photos.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="No photos uploaded yet"
              description="When attendees scan the QR code and upload photos from their phones, they will appear here instantly."
              actionLabel="Open Attendee Page"
              onAction={() => window.open(publicUrl, '_blank')}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 animate-fade-in">
              {photos.map((photo) => (
                <PhotoModerationCard
                  key={photo.photoId}
                  photo={photo}
                  onDelete={handleDeletePhoto}
                  onSelectPhoto={(p) => setSelectedPhoto(p)}
                />
              ))}
            </div>
          )}

          {nextToken && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                isLoading={isLoadingMore}
                className="gap-2 text-xs"
              >
                Load More Photos
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Full QR Modal */}
      <QRCodeModal
        event={event}
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />

      {/* Photo Inspector Modal */}
      <Dialog
        isOpen={Boolean(selectedPhoto)}
        onClose={() => setSelectedPhoto(null)}
        title={selectedPhoto?.fileName || 'Photo Inspection'}
        className="max-w-3xl"
      >
        {selectedPhoto && (
          <div className="space-y-4">
            <div className="relative max-h-[65vh] w-full bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
              <img
                src={selectedPhoto.downloadUrl}
                alt={selectedPhoto.fileName}
                className="max-h-[65vh] w-auto object-contain mx-auto"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500">
              <div>
                <p className="font-semibold text-slate-900">{selectedPhoto.fileName}</p>
                <p>
                  Uploaded on {formatDate(selectedPhoto.uploadedAt)} • {formatBytes(selectedPhoto.fileSize)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedPhoto.downloadUrl}
                  download={selectedPhoto.fileName}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Download className="w-3.5 h-3.5" />
                    Download File
                  </Button>
                </a>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDeletePhoto(selectedPhoto.photoId);
                    setSelectedPhoto(null);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Event Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteEventDialog}
        onClose={() => setShowDeleteEventDialog(false)}
        title="Delete Entire Event?"
        description="Are you sure you want to delete this event? This will permanently erase the event record, QR codes, and all associated photo records."
      >
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" size="sm" onClick={() => setShowDeleteEventDialog(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" isLoading={isDeletingEvent} onClick={handleDeleteEvent}>
            Yes, Delete Event
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

