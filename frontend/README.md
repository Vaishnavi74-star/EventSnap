# EventSnap — Modern Multi-Event Photo Sharing Platform

EventSnap is a centralized, production-grade photo-sharing platform where event organizers can host unlimited events, generate unique QR codes, and gather attendee photos in real time.

## 🚀 Key Features

* **SaaS Aesthetic:** Inspired by Linear, Vercel, and Notion with clean typography, soft neutral surfaces, subtle shadows, and crisp status badges.
* **Direct-to-S3 Uploads:** Browser uploads binary images directly to Amazon S3 via presigned PUT URLs with real-time per-file progress tracking (0–100%). Backend Lambdas never handle binary image data.
* **Zero Friction for Attendees:** No app install or registration needed. Attendees simply scan the event's QR code on their smartphone to open the mobile-optimized gallery and start uploading.
* **Organizer Dashboard:** Manage unlimited events, monitor live metrics, change event statuses (`ACTIVE`, `CLOSED`, `ARCHIVED`), and print or export vector QR codes.
* **Content Moderation:** In-flight photo moderation allows organizers to inspect high-resolution images, view upload metadata, and delete inappropriate content with one click.
* **Decoupled Architecture:** Clean API service layer (`src/api/`) designed to query API Gateway HTTP APIs with Cognito JWT authentication while providing local fallback simulation for instant offline previewing.

---

## 🛠️ Technology Stack

* **Framework:** React 18 with TypeScript
* **Bundler:** Vite 6
* **Styling:** Tailwind CSS with custom Linear-style color tokens and glass surfaces
* **Icons:** Lucide React
* **QR Engine:** QRCode library (supports vector SVG & high-res PNG download)
* **Routing:** React Router v6

---

## 📂 Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts             # API client with token injector & error handling
│   │   ├── auth.ts               # Cognito JWT authentication service
│   │   ├── events.ts             # Event CRUD and metrics
│   │   └── photos.ts             # Presigned S3 upload, direct PUT, and moderation
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminHeader.tsx   # Top navigation with status pill
│   │   │   ├── AdminSidebar.tsx  # Responsive collapsible sidebar navigation
│   │   │   ├── EventCard.tsx     # SaaS event card with cover, badges & actions
│   │   │   ├── PhotoModerationCard.tsx # Thumbnail, metadata & delete dialog
│   │   │   └── QRCodeModal.tsx   # Interactive QR viewer, PNG download & print
│   │   ├── attendee/
│   │   │   ├── AttendeeHeader.tsx # Mobile-optimized hero banner & live pill
│   │   │   ├── PhotoUploader.tsx  # Multi-file drag & drop, camera & progress
│   │   │   ├── PhotoGallery.tsx   # Masonry-feel responsive grid
│   │   │   └── Lightbox.tsx       # Fullscreen preview, zoom & download
│   │   ├── common/
│   │   │   ├── Navbar.tsx        # Public marketing header
│   │   │   ├── Footer.tsx        # Platform specifications footer
│   │   │   ├── LoadingState.tsx  # Spinner states
│   │   │   └── EmptyState.tsx    # Empty illustration & action
│   │   └── ui/                   # Reusable UI primitives (Button, Input, Card, Badge, Dialog)
│   ├── context/
│   │   ├── AuthContext.tsx       # Admin authentication state provider
│   │   └── ToastContext.tsx      # Linear-style notifications
│   ├── layouts/
│   │   ├── PublicLayout.tsx      # Public landing layout
│   │   └── AdminLayout.tsx       # Protected dashboard layout
│   ├── pages/
│   │   ├── LandingPage.tsx       # Marketing & feature showcase
│   │   ├── NotFoundPage.tsx      # 404 page
│   │   ├── attendee/
│   │   │   └── PublicEventPage.tsx # Mobile-first QR attendee view
│   │   └── admin/
│   │       ├── AdminLoginPage.tsx
│   │       ├── AdminDashboardPage.tsx
│   │       ├── EventsManagementPage.tsx
│   │       ├── CreateEditEventPage.tsx
│   │       └── EventDetailsAdminPage.tsx
│   ├── types/
│   │   └── index.ts              # Strongly typed TypeScript interfaces
│   ├── utils/
│   │   └── qrcode.ts             # QR Code generator utilities
│   ├── App.tsx                   # Central router configuration
│   └── main.tsx
```

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build for Production
```bash
npm run build
```

---

## 🔑 Demo Access

* **Admin Portal:** Visit `/admin/login` and click **"Fill Demo"** (pre-configured with `admin@eventsnap.io` / `eventpass123`).
* **Live Attendee Demo:** Visit `/events/evt_techsummit2026` or scan the QR code from the event details page to test direct S3 photo uploads and gallery viewing.

