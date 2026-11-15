import React, { useState, useRef } from 'react';
import { Upload, Camera, X, CheckCircle, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { requestPresignedUploadUrls, uploadBinaryToS3, confirmPhotoUpload } from '@/api/photos';
import { UploadFileItem, PhotoItem } from '@/types';
import { formatBytes } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

interface PhotoUploaderProps {
  eventId: string;
  onUploadSuccess: (newPhotos: PhotoItem[]) => void;
  disabled?: boolean;
}

export function PhotoUploader({ eventId, onUploadSuccess, disabled = false }: PhotoUploaderProps) {
  const [queue, setQueue] = useState<UploadFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  const handleFiles = (files: FileList | null) => {
    if (!files || disabled) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
    const newItems: UploadFileItem[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!allowed.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
        error('Invalid File Type', `${file.name} is not a supported image file.`);
        return;
      }

      // Max 25MB per file
      if (file.size > 25 * 1024 * 1024) {
        error('File Too Large', `${file.name} exceeds the 25MB limit.`);
        return;
      }

      const id = Math.random().toString(36).substring(2, 10);
      const previewUrl = URL.createObjectURL(file);

      newItems.push({
        id,
        file,
        previewUrl,
        progress: 0,
        status: 'pending',
      });
    });

    setQueue((prev) => [...prev, ...newItems]);
  };

  const removeFile = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearQueue = () => {
    queue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setQueue([]);
  };

  const handleStartUpload = async () => {
    if (queue.length === 0 || isUploading) return;
    setIsUploading(true);

    try {
      // Step 1: Request S3 Presigned PUT URLs for all items in batch
      const uploadRequests = queue.map((item) => ({
        fileName: item.file.name,
        contentType: item.file.type || 'image/jpeg',
        fileSize: item.file.size,
      }));

      const presignedUrls = await requestPresignedUploadUrls(eventId, uploadRequests);

      // Step 2: Concurrently upload binaries directly from browser to Amazon S3
      const uploadPromises = queue.map(async (item, index) => {
        const presigned = presignedUrls[index];

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', photoId: presigned.photoId } : q))
        );

        try {
          await uploadBinaryToS3(presigned.uploadUrl, item.file, (percent) => {
            setQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress: percent } : q))
            );
          });

          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'completed', progress: 100 } : q))
          );

          return {
            photoId: presigned.photoId,
            s3Key: presigned.s3Key,
            fileName: item.file.name,
            contentType: item.file.type || 'image/jpeg',
            fileSize: item.file.size,
            localPreviewUrl: item.previewUrl,
          };
        } catch (uploadErr: any) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: 'error', errorMessage: uploadErr.message || 'Upload failed' }
                : q
            )
          );
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((r): r is NonNullable<typeof r> => r !== null);

      if (successfulUploads.length > 0) {
        // Step 3: Inform backend / DynamoDB that upload succeeded
        const savedPhotos = await confirmPhotoUpload(eventId, successfulUploads);
        success(
          'Upload Complete!',
          `Successfully uploaded ${successfulUploads.length} photo${successfulUploads.length > 1 ? 's' : ''}.`
        );
        onUploadSuccess(savedPhotos);

        // Clear completed items after brief celebration
        setTimeout(() => {
          setQueue((prev) => prev.filter((q) => q.status === 'error'));
        }, 1200);
      }
    } catch (err: any) {
      error('Upload Error', err.message || 'Could not complete upload');
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and drop events
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  if (disabled) return null;

  return (
    <div className="w-full space-y-4">
      {/* Upload Dropzone */}
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
          dragActive
            ? 'border-brand-500 bg-brand-50/60 ring-4 ring-brand-500/10'
            : 'border-slate-200 hover:border-brand-400 bg-white hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-brand-100 transition-all shadow-xs">
          <Camera className="w-7 h-7" />
        </div>

        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight text-center">
          Capture Keynote & Summit Photos
        </h3>
        <p className="mt-1 text-xs text-slate-600 font-medium text-center max-w-sm">
          Snap live stage demos or select multiple photos from your library. High-resolution upload directly to private Amazon S3.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cameraInputRef.current?.click();
            }}
            className="flex items-center gap-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Snap with Camera</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2 rounded-xl transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-slate-700" />
            <span>Select from Library</span>
          </button>
        </div>
      </div>

      {/* Upload Queue Previews & Progress */}
      {queue.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-subtle space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Selected Photos ({queue.length})
              </h4>
              <p className="text-xs text-slate-500">
                Total size:{' '}
                {formatBytes(queue.reduce((acc, curr) => acc + curr.file.size, 0))}
              </p>
            </div>

            {!isUploading && (
              <button
                onClick={clearQueue}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Queue Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 group flex flex-col justify-between"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Remove Button (Before upload) */}
                  {item.status === 'pending' && !isUploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(item.id);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Status Overlay */}
                  {item.status === 'uploading' && (
                    <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center p-2 text-white">
                      <Loader2 className="w-6 h-6 animate-spin text-brand-400 mb-1" />
                      <span className="text-[11px] font-bold">{item.progress}%</span>
                    </div>
                  )}

                  {item.status === 'completed' && (
                    <div className="absolute inset-0 bg-emerald-950/75 flex flex-col items-center justify-center p-2 text-white">
                      <CheckCircle className="w-7 h-7 text-emerald-400 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Uploaded</span>
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="absolute inset-0 bg-rose-950/80 flex flex-col items-center justify-center p-2 text-white text-center">
                      <AlertCircle className="w-6 h-6 text-rose-400 mb-1" />
                      <span className="text-[10px] font-medium leading-tight">{item.errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Progress bar line */}
                {item.status === 'uploading' && (
                  <div className="w-full bg-slate-200 h-1">
                    <div
                      className="bg-brand-600 h-1 transition-all duration-150"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                <div className="p-2 text-left">
                  <p className="text-[11px] font-medium text-slate-800 truncate" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatBytes(item.file.size)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add More
            </Button>

            <Button
              size="default"
              isLoading={isUploading}
              onClick={handleStartUpload}
              className="gap-2 px-6 shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Upload {queue.filter((i) => i.status !== 'completed').length} Photos to S3
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

