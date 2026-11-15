import { Link } from 'react-router-dom';
import {
  Camera,
  QrCode,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Layers,
  HardDrive,
  Download,
  Users,
  Eye,
  Radio,
  Cpu,
  Monitor,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function LandingPage() {
  const steps = [
    {
      number: '01',
      title: 'Organizer Creates Tech Event',
      role: 'Admin / Organizer',
      description:
        'Set up your AWS Community Day, Tech Summit, or Hackathon in 30 seconds. EventSnap provisions an immutable event ID and creates custom QR codes.',
      icon: Terminal,
    },
    {
      number: '02',
      title: 'Project QR on Stage & Badges',
      role: 'Venue Display',
      description:
        'Display the high-res QR code on keynote projector screens, venue banners, booth signage, and attendee lanyard cards.',
      icon: Monitor,
    },
    {
      number: '03',
      title: 'Attendees Scan & Send Photos',
      role: 'Attendee (No App / No Login)',
      description:
        'Attendees point their phone camera at the screen to open the event stream instantly. Snap keynote talks, speaker demos, and awards.',
      icon: QrCode,
    },
    {
      number: '04',
      title: 'Direct-to-S3 Cloud Stream',
      role: 'AWS Cloud Engine',
      description:
        'Full-resolution photos stream straight into private Amazon S3 storage using presigned PUT URLs, bypassing Lambda memory limits.',
      icon: HardDrive,
    },
  ];

  const features = [
    {
      icon: Monitor,
      title: 'Keynote Stage QR Projection',
      description:
        'Render crisp 4K vector SVG and high-resolution PNG QR codes tailored for presentation slides, keynote hall screens, and venue roll-ups.',
    },
    {
      icon: ShieldCheck,
      title: 'Zero-Binary Serverless Ingestion',
      description:
        '100% private Amazon S3 architecture. Attendees upload directly via temporary signed PUT tokens; image binaries never slow down backend Lambda functions.',
    },
    {
      icon: Users,
      title: 'Zero Friction for Summit Attendees',
      description:
        'No App Store downloads, no passwords, no email registrations. Attendees scan the QR code and begin contributing keynote moments immediately.',
    },
    {
      icon: Eye,
      title: 'Organizer Moderation & Controls',
      description:
        'Live moderation suite for event organizers. Filter photos by session, inspect S3 metadata, feature keynote highlights, and remove duplicates with 1 click.',
    },
    {
      icon: Cpu,
      title: 'Multi-Track Tech Event Engine',
      description:
        'Organize multiple concurrent conferences, workshop breakout tracks, hackathons, and after-parties independently under one centralized platform.',
    },
    {
      icon: Zap,
      title: 'Original Fidelity & Instant Export',
      description:
        'No lossy compression. Download original RAW DSLR & mobile photo resolutions on-demand using secure, expiring S3 presigned GET URLs.',
    },
  ];

  return (
    <div className="space-y-24 py-10 md:py-16 selection:bg-brand-500 selection:text-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Tech Summit Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-white text-xs font-semibold shadow-md animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-brand-300 font-mono">AWS Serverless • EventSnap</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-200">The Photo Sharing Hub for Tech Summits & Hackathons</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-5 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.08]">
            Every Tech Summit. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600">
              Every Developer Moment.
            </span>{' '}
            One Shared Stream.
          </h1>

          <p className="text-base sm:text-xl text-slate-700 font-normal max-w-3xl mx-auto leading-relaxed">
            Built for <strong>AWS Community Days, Tech Summits, and Hackathons</strong>. Event organizers project a unique QR code on the keynote stage screen. Attendees scan with their phone cameras to snap and send photos directly to private Amazon S3—<strong>no app downloads or accounts required</strong>.
          </p>
        </div>

        {/* Role Quick Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2 text-left">
          <div className="p-4 rounded-2xl bg-white border-2 border-brand-200 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 font-bold">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Organizer (Admin)</span>
                <span className="text-[10px] bg-brand-50 text-brand-800 px-2 py-0.5 rounded-full border border-brand-200 font-medium">Full Control</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Create events, download 4K stage QR codes, moderate submissions, and export high-res archives.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border-2 border-emerald-200 shadow-sm flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Attendee (Guest)</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">No Login Needed</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Scan stage QR code, snap keynote slides, sponsor booth demos, and team hackathon moments.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link to="/admin/events/new">
            <Button size="lg" className="w-full sm:w-auto gap-2 px-8 text-sm font-bold shadow-glow bg-brand-600 hover:bg-brand-700 text-white">
              Create Tech Event (Organizer)
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/events/evt_techsummit2026">
            <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 px-7 text-sm font-semibold border-slate-300 text-slate-800 hover:bg-slate-50">
              <Camera className="w-4 h-4 text-brand-600" />
              Try Attendee Demo (Scan & Snap)
            </Button>
          </Link>
        </div>

        {/* Hero Interactive App Mockup Preview */}
        <div className="pt-6 max-w-5xl mx-auto">
          <div className="rounded-3xl border border-slate-300 bg-white p-2.5 sm:p-4 shadow-elevated overflow-hidden">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-16/9 flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=85"
                alt="AWS Community Day & Tech Summit Live Stream"
                className="w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent flex flex-col justify-end p-6 sm:p-12 text-left">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                    ● Live Conference Stream
                  </span>
                  <span className="text-xs font-medium text-slate-200">Stage Screen QR Active</span>
                  <span className="text-xs text-brand-300 bg-brand-950/60 px-2 py-0.5 rounded border border-brand-800">AWS ap-south-1 Mumbai</span>
                </div>
                <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">
                  AWS Community Day & Tech Summit 2026
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 max-w-xl mt-2 leading-relaxed hidden sm:block">
                  Attendees are scanning the projector QR code from their seats to upload full-resolution photos directly to private S3 buckets.
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <Link to="/events/evt_techsummit2026">
                    <Button size="sm" className="bg-white text-slate-950 hover:bg-slate-100 gap-1.5 font-bold text-xs shadow-md">
                      Enter Attendee Gallery
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link to="/admin/events/evt_techsummit2026">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/15 gap-1.5 text-xs font-medium border border-white/20">
                      Open Organizer Console
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-slate-100/70 border-y border-slate-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs font-bold text-brand-700 uppercase tracking-widest">
              Simple 4-Step Technical Workflow
            </h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              How Tech Summit Photo Sharing Works
            </h3>
            <p className="text-sm text-slate-600 font-medium">
              Zero apps for attendees. Zero server lag for organizers. Pure serverless efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="relative p-6 rounded-2xl bg-white border border-slate-200 shadow-subtle hover:shadow-premium transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {step.number}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 block mb-1">
                      {step.role}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {step.title}
                    </h4>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed font-normal">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-xs font-bold text-brand-700 uppercase tracking-widest">
            Engineered for High Concurrency
          </h2>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Designed for Tech Conferences & Hackathons
          </h3>
          <p className="text-sm text-slate-600">
            Handle thousands of simultaneous attendees uploading multi-megabyte photos without crashing compute layers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-slate-200 shadow-subtle hover:shadow-premium transition-all duration-200 space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-brand-700 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-slate-900 tracking-tight">
                  {feat.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* High-Contrast Bottom CTA Section (Fixed Gradient & High Legibility) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border border-slate-800 p-8 sm:p-14 text-white overflow-hidden shadow-2xl text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8">
          {/* Background Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 max-w-xl relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-bold uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
              Ready to Host Your Tech Event?
            </span>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Launch your Tech Summit photo gallery in minutes.
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              Generate custom QR codes, project them on keynote stage screens, and let attendees capture the developer moments that matter.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 relative z-10 w-full sm:w-auto">
            <Link to="/admin/events/new" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-white text-slate-950 hover:bg-slate-100 font-bold gap-2 text-sm shadow-xl px-7">
                Create Event Now (Organizer)
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/admin/login" className="w-full sm:w-auto">
              <Button variant="ghost" size="lg" className="w-full sm:w-auto text-white hover:bg-white/10 font-semibold text-sm border border-white/20">
                Organizer Login
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
