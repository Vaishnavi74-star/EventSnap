import { useState } from 'react';
import { Download, ZoomIn, Image as ImageIcon } from 'lucide-react';
import { PhotoItem } from '@/types';
import { Lightbox } from './Lightbox';
import { EmptyState } from '@/components/common/EmptyState';

interface PhotoGalleryProps {
  photos: PhotoItem[];
  eventName: string;
}

export function PhotoGallery({ photos, eventName }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No photos shared yet"
        description="Be the first attendee to capture and share a moment from this event! Use the upload box above."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4 animate-fade-in">
        {photos.map((photo, index) => (
          <div
            key={photo.photoId || index}
            onClick={() => setSelectedPhoto(photo)}
            className="group relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 cursor-pointer shadow-subtle hover:shadow-premium transition-all duration-200 border border-slate-200/60"
          >
            {/* Photo Image */}
            <img
              src={photo.thumbnailUrl || photo.downloadUrl}
              alt={photo.fileName || `Photo ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />

            {/* Gradient Overlay on Hover/Tap */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 sm:p-3.5">
              <div className="flex items-center justify-between text-white">
                <span className="text-[11px] font-medium truncate max-w-[70%]">
                  {photo.fileName}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-xs transition-colors">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Lightbox */}
      <Lightbox
        photo={selectedPhoto}
        photos={photos}
        onClose={() => setSelectedPhoto(null)}
        onNavigate={(p) => setSelectedPhoto(p)}
      />
    </>
  );
}

