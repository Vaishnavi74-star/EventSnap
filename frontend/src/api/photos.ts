import { PhotoItem, PresignedUrlResponse } from '@/types';
import { apiClient } from './client';

export interface PhotosListResponse {
  eventId: string;
  photos: PhotoItem[];
  count: number;
  nextToken?: string;
}

export interface RequestUploadUrlPayload {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface ConfirmPhotoPayload {
  photoId: string;
  s3Key: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  localPreviewUrl?: string;
}

/**
 * Step 2: Request presigned S3 PUT URL from backend.
 * Backend verifies event exists and is ACTIVE, validates MIME type and file size,
 * and generates a private presigned S3 PUT URL.
 */
export async function requestPresignedUploadUrl(
  eventId: string,
  payload: RequestUploadUrlPayload
): Promise<PresignedUrlResponse> {
  return apiClient<PresignedUrlResponse>(`/events/${eventId}/upload-url`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Batch upload URLs request helper.
 */
export async function requestPresignedUploadUrls(
  eventId: string,
  files: RequestUploadUrlPayload[]
): Promise<PresignedUrlResponse[]> {
  try {
    const res = await apiClient<{ uploadUrls: PresignedUrlResponse[] } | PresignedUrlResponse>(
      `/events/${eventId}/photos/upload-urls`,
      {
        method: 'POST',
        body: JSON.stringify({ files }),
      }
    );

    if (res && 'uploadUrls' in res) {
      return res.uploadUrls;
    }
  } catch (err) {
    // If batch endpoint not available, fallback to individual requests in parallel
    console.debug('Batch upload-urls fallback to individual:', err);
  }

  // Request each file's presigned URL
  return Promise.all(files.map((file) => requestPresignedUploadUrl(eventId, file)));
}

/**
 * Step 4: Direct binary upload from browser to Amazon S3 using Presigned PUT URL.
 * Employs native browser XMLHttpRequest with upload progress event tracking (0-100%).
 * Lambda never touches the image binary.
 */
export function uploadBinaryToS3(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Mock simulation for offline fallback
    if (uploadUrl.includes('mock-s3')) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 20) + 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          onProgress(100);
          resolve();
        } else {
          onProgress(progress);
        }
      }, 80);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(
          new Error(
            `Amazon S3 direct upload rejected with status ${xhr.status} (${xhr.statusText}). Check bucket CORS policy.`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'Network error during S3 direct upload. Ensure your connection is active and S3 CORS allows PUT requests.'
        )
      );
    };

    xhr.send(file);
  });
}

/**
 * Step 5 & 6: Confirm upload with backend.
 * Backend verifies object in S3 via HeadObject and writes metadata to DynamoDB.
 */
export async function confirmPhotoUpload(
  eventId: string,
  photos: ConfirmPhotoPayload[]
): Promise<PhotoItem[]> {
  try {
    const response = await apiClient<{ confirmed: PhotoItem[]; count: number } | PhotoItem[]>(
      `/events/${eventId}/photos/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({
          photos: photos.map((p) => ({
            photoId: p.photoId,
            s3Key: p.s3Key,
            fileName: p.fileName,
            contentType: p.contentType,
            fileSize: p.fileSize,
          })),
        }),
      }
    );

    if (response && 'confirmed' in response) {
      return response.confirmed;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  } catch (err: any) {
    // If backend unavailable in offline mode, save local preview
    if (err.code === 'NETWORK_UNAVAILABLE') {
      const fallbackItems: PhotoItem[] = photos.map((p) => ({
        photoId: p.photoId,
        eventId,
        s3Key: p.s3Key,
        fileName: p.fileName,
        contentType: p.contentType,
        fileSize: p.fileSize,
        status: 'APPROVED',
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'attendee',
        downloadUrl: p.localPreviewUrl || '',
        thumbnailUrl: p.localPreviewUrl || '',
      }));
      return fallbackItems;
    }
    throw err;
  }
}

/**
 * Step 7: Retrieve gallery photos for an event.
 * Backend generates temporary presigned GET URLs for viewing/downloading each photo.
 */
export async function getEventPhotos(
  eventId: string,
  nextToken?: string,
  limit = 50
): Promise<{ photos: PhotoItem[]; nextToken?: string }> {
  const queryParams = new URLSearchParams();
  if (nextToken) queryParams.append('nextToken', nextToken);
  queryParams.append('limit', limit.toString());

  const queryStr = `?${queryParams.toString()}`;

  try {
    const response = await apiClient<PhotosListResponse | PhotoItem[]>(
      `/events/${eventId}/photos${queryStr}`
    );

    if (Array.isArray(response)) {
      // Ensure photos strictly belong to this eventId
      return { photos: response.filter((p) => p.eventId === eventId) };
    }

    const items = response.photos || [];
    return {
      photos: items.filter((p) => p.eventId === eventId),
      nextToken: response.nextToken,
    };
  } catch (err: any) {
    // Fallback to local storage if network unreachable
    const key = `eventsnap_photos_${eventId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return { photos: JSON.parse(stored) };
    }
    throw err;
  }
}

/**
 * Admin: Delete photo from both Amazon S3 and DynamoDB.
 */
export async function deletePhoto(eventId: string, photoId: string): Promise<void> {
  await apiClient<void>(`/events/${eventId}/photos/${photoId}`, {
    method: 'DELETE',
  });

  // Clean local cache if present
  try {
    const key = `eventsnap_photos_${eventId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const list: PhotoItem[] = JSON.parse(stored);
      const filtered = list.filter((p) => p.photoId !== photoId);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch {}
}
