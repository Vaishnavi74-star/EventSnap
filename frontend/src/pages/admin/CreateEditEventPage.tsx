import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext, Link } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, Image as ImageIcon, Calendar, MapPin, CheckCircle2 } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { LoadingState } from '@/components/common/LoadingState';
import { createEvent, getEventById, updateEvent } from '@/api/events';
import { EventStatus } from '@/types';
import { useToast } from '@/context/ToastContext';

export function CreateEditEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const isEditing = Boolean(eventId);
  const navigate = useNavigate();
  const { toggleSidebar } = useOutletContext<{ toggleSidebar: () => void }>();
  const { success, error } = useToast();

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [status, setStatus] = useState<EventStatus>('ACTIVE');

  // Suggested preset covers tailored for Technical Events
  const PRESET_COVERS = [
    { label: 'Keynote & Tech Summit', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80' },
    { label: 'AWS Community Day', url: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Serverless Hackathon', url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80' },
    { label: 'DevOps & Cloud Arena', url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80' },
  ];

  useEffect(() => {
    if (isEditing && eventId) {
      getEventById(eventId)
        .then((ev) => {
          setName(ev.name);
          setDescription(ev.description || '');
          // Format date for datetime-local input
          try {
            const d = new Date(ev.date);
            setDate(d.toISOString().slice(0, 16));
          } catch {
            setDate(ev.date);
          }
          setLocation(ev.location || '');
          setCoverImageUrl(ev.coverImageUrl || '');
          setStatus(ev.status);
        })
        .catch((err) => {
          error('Error', err.message);
          navigate('/admin/events');
        })
        .finally(() => setIsLoading(false));
    } else {
      // Default date to next weekend
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(18, 0, 0, 0);
      setDate(nextWeek.toISOString().slice(0, 16));
      setCoverImageUrl(PRESET_COVERS[0].url);
    }
  }, [eventId, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      error('Validation Error', 'Event name is required');
      return;
    }

    if (!date) {
      error('Validation Error', 'Event date is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        date: new Date(date).toISOString(),
        location: location.trim(),
        coverImageUrl: coverImageUrl.trim(),
        status,
      };

      if (isEditing && eventId) {
        await updateEvent(eventId, payload);
        success('Event Updated', 'Changes have been saved successfully.');
        navigate(`/admin/events/${eventId}`);
      } else {
        const created = await createEvent(payload);
        success('Event Created', `"${created.name}" is ready with its unique QR code!`);
        navigate(`/admin/events/${created.eventId}`);
      }
    } catch (err: any) {
      error('Save Failed', err.message || 'An error occurred while saving the event');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <AdminHeader onToggleSidebar={toggleSidebar} title={isEditing ? 'Edit Event' : 'Create Event'} />
        <LoadingState message="Loading event configuration..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        onToggleSidebar={toggleSidebar}
        title={isEditing ? 'Edit Event Details' : 'Create New Event'}
        description="Configure event details, cover image, and real-time upload status."
      />

      <main className="flex-1 p-4 sm:p-8 max-w-4xl w-full mx-auto space-y-6">
        <Link
          to={isEditing ? `/admin/events/${eventId}` : '/admin/events'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {isEditing ? 'Event Details' : 'Events'}
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
              <CardDescription>
                Details visible to attendees when scanning the QR code or visiting the shared gallery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Input
                label="Event Name"
                placeholder="e.g. AWS Cloud Community Day 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Textarea
                label="Description"
                placeholder="Share a short welcome message or instructions for attendees..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Date & Time"
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  leftIcon={<Calendar className="w-4 h-4" />}
                />

                <Input
                  label="Venue / Location"
                  placeholder="e.g. Grand Ballroom, San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  leftIcon={<MapPin className="w-4 h-4" />}
                />
              </div>

              {/* Status Radio Group */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Event Status
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      value: 'ACTIVE',
                      label: 'Active',
                      desc: 'Attendees can upload & view photos',
                      badge: 'success',
                    },
                    {
                      value: 'CLOSED',
                      label: 'Closed',
                      desc: 'Uploads locked; gallery viewable',
                      badge: 'warning',
                    },
                    {
                      value: 'ARCHIVED',
                      label: 'Archived',
                      desc: 'Hidden from public feed',
                      badge: 'neutral',
                    },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.value}
                      onClick={() => setStatus(s.value as EventStatus)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        status === s.value
                          ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">{s.label}</span>
                        {status === s.value && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cover Image Section */}
          <Card>
            <CardHeader>
              <CardTitle>Cover Image</CardTitle>
              <CardDescription>
                Hero banner displayed at the top of the attendee's mobile upload page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Cover Image URL"
                placeholder="https://images.unsplash.com/..."
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                leftIcon={<ImageIcon className="w-4 h-4" />}
                helperText="Enter a direct image URL or pick one of the curated presets below"
              />

              {/* Image Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Quick Presets
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_COVERS.map((preset, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setCoverImageUrl(preset.url)}
                      className={`group relative h-20 rounded-xl overflow-hidden border transition-all ${
                        coverImageUrl === preset.url
                          ? 'border-brand-600 ring-2 ring-brand-500/30'
                          : 'border-slate-200 hover:opacity-90'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 flex items-end p-2">
                        <span className="text-[10px] font-medium text-white truncate">
                          {preset.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              {coverImageUrl && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Live Banner Preview
                  </span>
                  <div className="relative h-40 sm:h-48 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                    <img
                      src={coverImageUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-4">
                      <div>
                        <span className="text-xs font-semibold text-brand-300">Preview</span>
                        <h4 className="text-base font-bold text-white tracking-tight">{name || 'Your Event Title'}</h4>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link to={isEditing ? `/admin/events/${eventId}` : '/admin/events'}>
              <Button type="button" variant="outline" size="default">
                Cancel
              </Button>
            </Link>
            <Button type="submit" size="default" isLoading={isSaving} className="gap-2 px-6">
              <Save className="w-4 h-4" />
              {isEditing ? 'Save Changes' : 'Create & Generate QR Code'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

