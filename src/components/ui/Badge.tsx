import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'primary' | 'default' | 'success' | 'warning' | 'error' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}

const variants: Record<BadgeVariant, string> = {
  primary: 'bg-primary text-white',
  default: 'bg-muted text-foreground/70',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  outline: 'border border-border text-foreground/70 bg-white',
};

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  );
}
