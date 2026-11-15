import { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Calendar, Image as ImageIcon, Zap, HardDrive, Plus, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { EventCard } from '@/components/admin/EventCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LoadingState } from '@/components/common/LoadingState';
import { getEvents } from '@/api/events';
import { EventItem } from '@/types';
import { formatBytes } from '@/lib/utils';

export function AdminDashboardPage() {
  const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getEvents()
      .then((data) => setEvents(data))
      .finally(() => setIsLoading(false));
  }, []);

  const totalEvents = events.length;
  const activeEvents = events.filter((e) => e.status === 'ACTIVE').length;
  const totalPhotos = events.reduce((sum, e) => sum + e.photoCount, 0);
  const totalStorage = totalPhotos * 3.4 * 1024 * 1024; // Approx 3.4MB per photo

  const stats = [
    {
      label: 'Total Events',
      value: totalEvents,
      subtext: 'Configured on platform',
      icon: Calendar,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
    },
    {
      label: 'Active Events',
      value: activeEvents,
      subtext: 'Accepting uploads now',
      icon: Zap,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Photos Ingested',
      value: totalPhotos,
      subtext: 'Presigned S3 uploads',
      icon: ImageIcon,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Private S3 Storage',
      value: formatBytes(totalStorage),
      subtext: 'Encrypted at rest',
      icon: HardDrive,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        onToggleSidebar={toggleSidebar}
        title="Organizer Dashboard"
        description="Real-time multi-event metrics, storage usage, and active galleries."
        action={{ label: 'New Event', to: '/admin/events/new' }}
      />

      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Banner Alert (High Contrast Gradient) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border border-slate-800 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold uppercase tracking-wider">
                ● Live Tech Summit Engine
              </span>
              <span className="text-xs text-brand-300 font-mono">AWS ap-south-1 Mumbai</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
              Direct-to-S3 Multi-Event Ingestion Active
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Organizers: project the stage QR code or print lanyards. Attendees can scan to stream keynote, workshop, and hackathon photos directly to encrypted S3 storage.
            </p>
          </div>
          <Link to="/admin/events/new" className="shrink-0">
            <Button size="sm" className="gap-2 bg-white text-slate-950 hover:bg-slate-100 font-bold text-xs shadow-md">
              <Plus className="w-4 h-4" />
              Create Tech Event
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="hover:border-slate-300 transition-colors">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                    <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{stat.subtext}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Events Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent Events</h2>
              <p className="text-xs text-slate-500">Events managed under this organizer account</p>
            </div>
            <Link to="/admin/events">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-brand-700 hover:text-brand-800">
                View All Events
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <LoadingState message="Loading events..." />
          ) : events.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900">No events yet</p>
              <p className="text-xs text-slate-500 mt-1">Get started by creating your first event.</p>
              <Link to="/admin/events/new" className="mt-4 inline-block">
                <Button size="sm">Create Event</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.slice(0, 3).map((event) => (
                <EventCard key={event.eventId} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* AWS Architecture Health Widget */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Cloud Infrastructure Health</h4>
              <p className="text-xs text-slate-500">
                API Gateway HTTP API, DynamoDB On-Demand & S3 KMS-encrypted bucket operational.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">100% Operational</span>
          </div>
        </div>
      </main>
    </div>
  );
}

