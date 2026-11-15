import React, { useState } from 'react';
import { Trash2, ZoomIn, FileText, Calendar } from 'lucide-react';
import { PhotoItem } from '@/types';
import { formatBytes, formatDate } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface PhotoModerationCardProps {
  photo: PhotoItem;
  onDelete: (photoId: string) => void;
  onSelectPhoto: (photo: PhotoItem) => void;
}

export function PhotoModerationCard({ photo, onDelete, onSelectPhoto }: PhotoModerationCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(photo.photoId);
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="group relative rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-subtle transition-all duration-150 flex flex-col">
        {/* Image thumbnail container */}
        <div className="relative aspect-square w-full bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onSelectPhoto(photo)}>
          <img
            src={photo.thumbnailUrl || photo.downloadUrl}
            alt={photo.fileName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectPhoto(photo);
              }}
              className="p-2 rounded-xl bg-white/90 text-slate-900 hover:bg-white shadow-xs"
              title="Inspect Photo"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
              title="Delete Photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Photo Info */}
        <div className="p-3 text-left">
          <p className="text-xs font-medium text-slate-800 truncate" title={photo.fileName}>
            {photo.fileName}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(photo.uploadedAt).split(',')[0]}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {formatBytes(photo.fileSize)}
            </span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Photo?"
        description="This will permanently delete this image from Amazon S3 and remove its metadata from DynamoDB. This action cannot be undone."
      >
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" isLoading={isDeleting} onClick={handleDelete}>
            Yes, Delete Permanently
          </Button>
        </div>
      </Dialog>
    </>
  );
}

