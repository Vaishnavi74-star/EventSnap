import { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Search, Plus, Calendar, Filter } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { EventCard } from '@/components/admin/EventCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { getEvents, deleteEvent } from '@/api/events';
import { EventItem, EventStatus } from '@/types';
import { useToast } from '@/context/ToastContext';

export function EventsManagementPage() {
  const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EventStatus>('ALL');
  const { success, error } = useToast();

  const fetchEvents = () => {
    setIsLoading(true);
    getEvents()
      .then((data) => setEvents(data))
      .catch((err) => error('Failed to load events', err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      success('Event Deleted', 'The event has been successfully removed.');
      setEvents((prev) => prev.filter((e) => e.eventId !== eventId));
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        onToggleSidebar={toggleSidebar}
        title="Events Management"
        description="Create, monitor, edit, and generate QR codes for all your events."
        action={{ label: 'New Event', to: '/admin/events/new' }}
      />

      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search by event name, venue, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Status Segmented Control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 shrink-0 self-start sm:self-auto text-xs font-medium">
            {(['ALL', 'ACTIVE', 'CLOSED', 'ARCHIVED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <LoadingState message="Loading events directory..." />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={events.length === 0 ? 'No events created yet' : 'No matching events found'}
            description={
              events.length === 0
                ? 'Create your first event to generate instant QR codes and start gathering attendee photos.'
                : 'Try adjusting your search query or status filter.'
            }
            actionLabel={events.length === 0 ? 'Create Event' : undefined}
            onAction={events.length === 0 ? () => window.location.assign('/admin/events/new') : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredEvents.map((event) => (
              <EventCard key={event.eventId} event={event} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

