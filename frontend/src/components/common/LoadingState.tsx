import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] w-full p-8 text-center animate-fade-in">
      <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 mb-3 border border-brand-100">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

