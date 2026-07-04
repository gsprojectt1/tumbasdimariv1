import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="label block">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-11 rounded-btn border border-border bg-white px-4 text-sm font-medium text-foreground placeholder:text-foreground/30 transition-colors',
              'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10',
              icon && 'pl-10',
              error && 'border-error focus:border-error focus:ring-error/10',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-error font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="label block">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-btn border border-border bg-white px-4 py-3 text-sm font-medium text-foreground placeholder:text-foreground/30 transition-colors resize-none',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10',
            error && 'border-error',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-error font-medium">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
