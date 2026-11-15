export type EventStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type PhotoStatus = 'APPROVED' | 'FLAGGED' | 'DELETED';

export interface EventItem {
  eventId: string;
  name: string;
  description: string;
  date: string;
  location: string;
  coverImageUrl?: string;
  status: EventStatus;
  organizerId: string;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoItem {
  photoId: string;
  eventId: string;
  s3Key: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  status: PhotoStatus;
  uploadedAt: string;
  uploadedBy?: string;
  downloadUrl: string;
  thumbnailUrl?: string;
}

export interface UploadFileItem {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
  photoId?: string;
}

export interface PresignedUrlResponse {
  photoId: string;
  s3Key: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin';
  token: string;
}

export interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalPhotos: number;
  totalStorageBytes: number;
  recentEvents: EventItem[];
  recentPhotos: PhotoItem[];
}

