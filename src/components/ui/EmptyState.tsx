import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function EmptyState({ icon, title, description, action }: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-foreground/30 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold tracking-tight mb-1">{title}</h3>
      {description && <p className="text-sm text-foreground/50 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
