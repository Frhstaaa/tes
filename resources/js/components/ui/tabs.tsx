import * as React from 'react';
import { cn } from '@/lib/cn';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

export function Tabs({ value, onValueChange, className, children, ...props }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      data-slot="tabs-list"
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1 text-muted-foreground shadow-2xs',
        className
      )}
      {...props}
    />
  )
);
TabsList.displayName = 'TabsList';

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, ...props }, ref) => {
    const ctx = React.useContext(TabsContext);
    const active = ctx?.value === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={active}
        data-state={active ? 'active' : 'inactive'}
        data-slot="tabs-trigger"
        onClick={() => ctx?.onValueChange(value)}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none',
          active
            ? 'bg-primary text-primary-foreground shadow-xs'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const ctx = React.useContext(TabsContext);
    if (ctx?.value !== value) return null;

    return (
      <div ref={ref} role="tabpanel" data-slot="tabs-content" className={cn('outline-none', className)} {...props}>
        {children}
      </div>
    );
  }
);
TabsContent.displayName = 'TabsContent';
