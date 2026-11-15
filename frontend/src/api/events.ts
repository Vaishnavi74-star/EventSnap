import { EventItem, EventStatus, DashboardStats } from '@/types';
import { apiClient } from './client';

export interface ListEventsResponse {
  events: EventItem[];
  nextToken?: string;
}

export async function getEvents(
  status?: string,
  nextToken?: string,
  limit = 50
): Promise<EventItem[]> {
  const queryParams = new URLSearchParams();
  if (status && status !== 'ALL') queryParams.append('status', status);
  if (nextToken) queryParams.append('nextToken', nextToken);
  queryParams.append('limit', limit.toString());

  const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : '';

  try {
    const response = await apiClient<ListEventsResponse | EventItem[]>(`/events${queryStr}`);
    if (Array.isArray(response)) {
      return response;
    }
    return response.events || [];
  } catch (err: any) {
    // If backend is running in offline demo mode without DB seeded, fallback to stored events
    const stored = localStorage.getItem('eventsnap_events');
    if (stored) {
      const items: EventItem[] = JSON.parse(stored);
      if (status && status !== 'ALL') return items.filter((e) => e.status === status);
      return items;
    }
    throw err;
  }
}

export async function getEventById(eventId: string): Promise<EventItem> {
  try {
    return await apiClient<EventItem>(`/events/${eventId}`);
  } catch (err: any) {
    // Fallback if local storage has it
    const stored = localStorage.getItem('eventsnap_events');
    if (stored) {
      const items: EventItem[] = JSON.parse(stored);
      const match = items.find((e) => e.eventId === eventId);
      if (match) return match;
    }
    throw err;
  }
}

export async function createEvent(
  data: Omit<EventItem, 'eventId' | 'organizerId' | 'photoCount' | 'createdAt' | 'updatedAt'>
): Promise<EventItem> {
  const payload = {
    name: data.name,
    description: data.description,
    date: data.date,
    location: data.location,
    coverImageUrl: data.coverImageUrl,
    status: data.status || 'ACTIVE',
  };

  try {
    const created = await apiClient<EventItem>('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Sync into local backup storage
    updateLocalCache(created);
    return created;
  } catch (err: any) {
    // If local test without backend, save locally
    if (err.code === 'NETWORK_UNAVAILABLE') {
      const fallback: EventItem = {
        ...data,
        eventId: 'evt_' + Math.random().toString(36).substring(2, 10),
        organizerId: 'usr_admin_001',
        photoCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateLocalCache(fallback);
      return fallback;
    }
    throw err;
  }
}

export async function updateEvent(
  eventId: string,
  data: Partial<Omit<EventItem, 'eventId' | 'organizerId' | 'createdAt' | 'updatedAt'>>
): Promise<EventItem> {
  try {
    const updated = await apiClient<EventItem>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    updateLocalCache(updated);
    return updated;
  } catch (err: any) {
    if (err.code === 'NETWORK_UNAVAILABLE') {
      const current = await getEventById(eventId);
      const updated = { ...current, ...data, updatedAt: new Date().toISOString() };
      updateLocalCache(updated);
      return updated;
    }
    throw err;
  }
}

export async function updateEventStatus(eventId: string, status: EventStatus): Promise<EventItem> {
  try {
    const updated = await apiClient<EventItem>(`/events/${eventId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    updateLocalCache(updated);
    return updated;
  } catch (err: any) {
    if (err.code === 'NETWORK_UNAVAILABLE') {
      return updateEvent(eventId, { status });
    }
    throw err;
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  try {
    await apiClient<void>(`/events/${eventId}`, {
      method: 'DELETE',
    });
    removeLocalCache(eventId);
  } catch (err: any) {
    if (err.code === 'NETWORK_UNAVAILABLE') {
      removeLocalCache(eventId);
      return;
    }
    throw err;
  }
}

export async function getEventAnalytics(eventId: string): Promise<any> {
  return apiClient<any>(`/events/${eventId}/analytics`);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const events = await getEvents();
  const activeEvents = events.filter((e) => e.status === 'ACTIVE').length;
  const totalPhotos = events.reduce((sum, e) => sum + (e.photoCount || 0), 0);
  const totalStorageBytes = totalPhotos * 3.4 * 1024 * 1024;

  return {
    totalEvents: events.length,
    activeEvents,
    totalPhotos,
    totalStorageBytes,
    recentEvents: events.slice(0, 5),
    recentPhotos: [],
  };
}

function updateLocalCache(event: EventItem) {
  try {
    const stored = localStorage.getItem('eventsnap_events');
    const list: EventItem[] = stored ? JSON.parse(stored) : [];
    const idx = list.findIndex((e) => e.eventId === event.eventId);
    if (idx >= 0) {
      list[idx] = event;
    } else {
      list.unshift(event);
    }
    localStorage.setItem('eventsnap_events', JSON.stringify(list));
  } catch {}
}

function removeLocalCache(eventId: string) {
  try {
    const stored = localStorage.getItem('eventsnap_events');
    if (!stored) return;
    const list: EventItem[] = JSON.parse(stored);
    const filtered = list.filter((e) => e.eventId !== eventId);
    localStorage.setItem('eventsnap_events', JSON.stringify(filtered));
  } catch {}
}
