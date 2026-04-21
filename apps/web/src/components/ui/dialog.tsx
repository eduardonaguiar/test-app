import { createContext, useContext, useMemo, useState } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type DialogContextValue = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used inside DialogRoot.');
  }

  return context;
}

export function DialogRoot({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const context = useMemo(() => ({ isOpen, setOpen }), [isOpen]);

  return <DialogContext.Provider value={context}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useDialogContext();
  return <button className={cn(className)} onClick={() => setOpen(true)} {...props} />;
}

export function DialogContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { isOpen, setOpen } = useDialogContext();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="ui-dialog__overlay" role="presentation" onClick={() => setOpen(false)}>
      <div
        className={cn('ui-dialog__content', className)}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        {...props}
      />
    </div>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <header className={cn('ui-dialog__header', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <footer className={cn('ui-dialog__footer', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('ui-dialog__title', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('ui-dialog__description', className)} {...props} />;
}

export function DialogClose({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useDialogContext();
  return <button className={cn(className)} onClick={() => setOpen(false)} {...props} />;
}
