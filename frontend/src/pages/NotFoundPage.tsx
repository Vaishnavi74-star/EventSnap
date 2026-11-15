import { Link } from 'react-router-dom';
import { Camera, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
        <Camera className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        The event page or dashboard path you were looking for doesn't exist or has moved.
      </p>
      <Link to="/" className="mt-6">
        <Button size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to EventSnap Home
        </Button>
      </Link>
    </div>
  );
}

