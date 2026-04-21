import { createContext, useContext } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used inside TabsRoot.');
  }

  return context;
}

export function TabsRoot({ value, onValueChange, className, children }: { value: string; onValueChange: (value: string) => void; className?: string; children: ReactNode; }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('ui-tabs', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-tabs__list', className)} role="tablist" {...props} />;
}

export function TabsTrigger({ className, value, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const tabs = useTabsContext();
  const isSelected = tabs.value === value;

  return (
    <button
      className={cn('ui-tabs__trigger', isSelected && 'is-active', className)}
      role="tab"
      aria-selected={isSelected}
      onClick={() => tabs.onValueChange(value)}
      {...props}
    />
  );
}

export function TabsContent({ className, value, ...props }: HTMLAttributes<HTMLDivElement> & { value: string }) {
  const tabs = useTabsContext();
  if (tabs.value !== value) {
    return null;
  }

  return <div className={cn('ui-tabs__content', className)} role="tabpanel" {...props} />;
}
