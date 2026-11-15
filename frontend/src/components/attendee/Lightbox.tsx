import { useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { PhotoItem } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface LightboxProps {
  photo: PhotoItem | null;
  photos: PhotoItem[];
  onClose: () => void;
  onNavigate: (photo: PhotoItem) => void;
}

export function Lightbox({ photo, photos, onClose, onNavigate }: LightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!photo) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    if (photo) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [photo, photos]);

  if (!photo) return null;

  const currentIndex = photos.findIndex((p) => p.photoId === photo.photoId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handlePrev = () => {
    if (hasPrev) onNavigate(photos[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onNavigate(photos[currentIndex + 1]);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(photo.downloadUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = photo.fileName || `eventsnap_${photo.photoId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback
      window.open(photo.downloadUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in select-none">
      {/* Top Action Bar */}
      <div className="absolute top-0 inset-x-0 h-16 px-4 sm:px-6 flex items-center justify-between text-white z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-medium text-slate-300">
            {currentIndex + 1} of {photos.length}
          </span>
          <span className="hidden sm:inline text-xs text-slate-500">•</span>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(photo.uploadedAt)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleDownload}
            className="bg-white/10 hover:bg-white/20 text-white border-0 gap-1.5 text-xs h-9 px-3.5 rounded-xl backdrop-blur-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download High-Res</span>
          </Button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {hasPrev && (
        <button
          onClick={handlePrev}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all z-10"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={handleNext}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all z-10"
          aria-label="Next image"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Main Image Container */}
      <div className="relative max-h-[85vh] max-w-[92vw] flex items-center justify-center p-2">
        <img
          src={photo.downloadUrl}
          alt={photo.fileName}
          className="max-h-[85vh] max-w-[92vw] w-auto h-auto object-contain rounded-lg shadow-2xl transition-transform"
        />
      </div>

      {/* Bottom info caption */}
      <div className="absolute bottom-4 inset-x-0 text-center text-xs text-slate-400 px-4">
        {photo.fileName}
      </div>
    </div>
  );
}

