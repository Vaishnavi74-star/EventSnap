import { Menu, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  title: string;
  description?: string;
  action?: {
    label: string;
    to: string;
  };
}

export function AdminHeader({ onToggleSidebar, title, description, action }: AdminHeaderProps) {
  return (
    <header className="h-16 px-4 sm:px-8 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden"
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 leading-none">
            {title}
          </h1>
          {description && (
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>S3 & DynamoDB Ready</span>
        </div>

        {action && (
          <Link to={action.to}>
            <Button size="sm" className="gap-1.5 shadow-xs">
              <Plus className="w-4 h-4" />
              <span>{action.label}</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}

