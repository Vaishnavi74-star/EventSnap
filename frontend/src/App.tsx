import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { LandingPage } from '@/pages/LandingPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { EventsManagementPage } from '@/pages/admin/EventsManagementPage';
import { CreateEditEventPage } from '@/pages/admin/CreateEditEventPage';
import { EventDetailsAdminPage } from '@/pages/admin/EventDetailsAdminPage';
import { PublicEventPage } from '@/pages/attendee/PublicEventPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      {/* Public Landing & Marketing */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/404" element={<NotFoundPage />} />
      </Route>

      {/* Public Attendee Photo Experience (Mobile-First) */}
      <Route path="/events/:eventId" element={<PublicEventPage />} />

      {/* Admin Authentication */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Protected Admin Portal */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="events" element={<EventsManagementPage />} />
        <Route path="events/new" element={<CreateEditEventPage />} />
        <Route path="events/:eventId" element={<EventDetailsAdminPage />} />
        <Route path="events/:eventId/edit" element={<CreateEditEventPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

