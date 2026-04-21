import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';

const variantClassMap: Record<BadgeVariant, string> = {
  default: 'ui-badge--default',
  secondary: 'ui-badge--secondary',
  success: 'ui-badge--success',
  warning: 'ui-badge--warning',
  destructive: 'ui-badge--destructive',
  outline: 'ui-badge--outline',
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return <span className={cn('ui-badge', variantClassMap[variant], className)} {...props} />;
}
