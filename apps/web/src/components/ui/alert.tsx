import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type AlertVariant = 'default' | 'success' | 'warning' | 'destructive';

const variantClassMap: Record<AlertVariant, string> = {
  default: 'ui-alert--default',
  success: 'ui-alert--success',
  warning: 'ui-alert--warning',
  destructive: 'ui-alert--destructive',
};

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return <div role="alert" className={cn('ui-alert', variantClassMap[variant], className)} {...props} />;
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('ui-alert__title', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('ui-alert__description', className)} {...props} />;
}
