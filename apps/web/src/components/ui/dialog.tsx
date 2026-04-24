import { createContext, forwardRef, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, KeyboardEvent, MutableRefObject, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type DialogContextValue = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
  contentRef: MutableRefObject<HTMLDivElement | null>;
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
  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const context = useMemo(
    () => ({ isOpen, setOpen, titleId, descriptionId, triggerRef, contentRef }),
    [descriptionId, isOpen, titleId],
  );

  return <DialogContext.Provider value={context}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen, triggerRef } = useDialogContext();
  return <button ref={triggerRef} className={cn(className)} onClick={() => setOpen(true)} {...props} />;
}

export function DialogContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { isOpen, setOpen, titleId, descriptionId, triggerRef, contentRef } = useDialogContext();

  useEffect(() => {
    if (!isOpen || !contentRef.current) {
      return;
    }

    const focusable = contentRef.current.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    focusable?.focus();
  }, [contentRef, isOpen]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    triggerRef.current?.focus();
  }, [isOpen, triggerRef]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key !== 'Tab' || !contentRef.current) {
      return;
    }

    const focusable = Array.from(
      contentRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="ui-dialog__overlay" role="presentation" onMouseDown={() => setOpen(false)}>
      <div
        ref={contentRef}
        className={cn('ui-dialog__content', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
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
  const { titleId } = useDialogContext();
  return <h2 id={titleId} className={cn('ui-dialog__title', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useDialogContext();
  return <p id={descriptionId} className={cn('ui-dialog__description', className)} {...props} />;
}

export const DialogClose = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function DialogClose(
  { className, ...props },
  ref,
) {
  const { setOpen } = useDialogContext();
  return <button ref={ref} className={cn(className)} onClick={() => setOpen(false)} {...props} />;
});
