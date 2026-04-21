import type { HTMLAttributes, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type SuccessAlertProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SuccessAlert({ title, description, action, ...props }: SuccessAlertProps) {
  return (
    <Alert variant="success" {...props}>
      <AlertTitle>{title}</AlertTitle>
      {description ? <AlertDescription>{description}</AlertDescription> : null}
      {action ? <div className="feedback-success-alert__actions">{action}</div> : null}
    </Alert>
  );
}
