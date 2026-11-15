import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AttendeeHeader } from '@/components/attendee/AttendeeHeader';
import { PhotoUploader } from '@/components/attendee/PhotoUploader';
import { PhotoGallery } from '@/components/attendee/PhotoGallery';
import { LoadingState } from '@/components/common/LoadingState';
import { getEventById } from '@/api/events';
import { getEventPhotos } from '@/api/photos';
import { EventItem, PhotoItem } from '@/types';
import { Camera, Sparkles, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function PublicEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadEventData = async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      setErrorMessage('');
      const [eventData, photosData] = await Promise.all([
        getEventById(eventId),
        getEventPhotos(eventId),
      ]);
      setEvent(eventData);
      setPhotos(photosData.photos);
      setNextToken(photosData.nextToken);
    } catch (err: any) {
      setErrorMessage(err.message || 'Event not found or has been removed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const handleLoadMore = async () => {
    if (!eventId || !nextToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const morePhotos = await getEventPhotos(eventId, nextToken);
      setPhotos((prev) => [...prev, ...morePhotos.photos]);
      setNextToken(morePhotos.nextToken);
    } catch (err: any) {
      console.error('Failed to load more photos:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleUploadSuccess = (newPhotos: PhotoItem[]) => {
    // Prepend newly uploaded verified photos to top of gallery
    setPhotos((prev) => [...newPhotos, ...prev]);
    if (event) {
      setEvent({ ...event, photoCount: (event.photoCount || 0) + newPhotos.length });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message="Connecting to event live gallery..." />
      </div>
    );
  }

  if (errorMessage || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <Camera className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Event Not Found</h2>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          {errorMessage || 'The QR code or link you opened does not match an active event.'}
        </p>
        <Link to="/" className="mt-6">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Go to EventSnap Home
          </Button>
        </Link>
      </div>
    );
  }

  const isUploadAllowed = event.status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Mobile-optimized Header */}
      <AttendeeHeader event={event} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-8">
        {/* Photo Uploader Card (if active) */}
        {isUploadAllowed ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand-600" />
                Upload Your Photos
              </h2>
              <span className="text-[11px] font-medium text-slate-500">
                Direct to S3 • High Quality
              </span>
            </div>

            <PhotoUploader
              eventId={event.eventId}
              onUploadSuccess={handleUploadSuccess}
            />
          </section>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>This event is currently {event.status.toLowerCase()}. Photo uploads are locked, but you can view and download photos below.</span>
          </div>
        )}

        {/* Live Photo Gallery Grid */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Shared Moments
              </h2>
              <p className="text-xs text-slate-500">
                {photos.length} {photos.length === 1 ? 'photo' : 'photos'} shared by attendees
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadEventData}
                title="Refresh gallery"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>Tap any photo for full size</span>
              </div>
            </div>
          </div>

          <PhotoGallery photos={photos} eventName={event.name} />

          {/* Pagination: Load More */}
          {nextToken && (
            <div className="flex justify-center pt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                isLoading={isLoadingMore}
                className="gap-2"
              >
                Load More Photos
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Minimal Attendee Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-6 px-4 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted Amazon S3 Storage • Zero Compression Loss</span>
          </div>
          <p>
            Powered by <span className="font-semibold text-slate-700">EventSnap</span> Multi-Event Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
