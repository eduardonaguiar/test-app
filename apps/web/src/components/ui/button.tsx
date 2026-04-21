import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

const variantClassMap: Record<ButtonVariant, string> = {
  default: 'ui-button--default',
  secondary: 'ui-button--secondary',
  outline: 'ui-button--outline',
  ghost: 'ui-button--ghost',
  destructive: 'ui-button--destructive',
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: 'ui-button--sm',
  default: 'ui-button--default-size',
  lg: 'ui-button--lg',
  icon: 'ui-button--icon',
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingLabel?: string;
  children?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'default', type = 'button', disabled, isLoading = false, loadingLabel, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('ui-button', variantClassMap[variant], sizeClassMap[size], isLoading && 'is-loading', className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? <span aria-hidden="true" className="ui-button__spinner" /> : null}
      <span>{isLoading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
});
