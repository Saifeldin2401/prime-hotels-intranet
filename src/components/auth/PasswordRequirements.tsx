/**
 * PasswordRequirements Component
 * 
 * Displays live password requirements checklist with visual feedback.
 * Helps users understand what makes a valid password as they type.
 */

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordRequirementsProps {
  password: string;
  className?: string;
  showTitle?: boolean;
  minLength?: number;
}

// Password validation patterns
const PATTERNS = {
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  number: /\d/,
  special: /[@$!%*?&]/,
};

export function getPasswordRequirements(
  password: string,
  minLength: number = 12
): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: `At least ${minLength} characters`,
      met: password.length >= minLength,
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter',
      met: PATTERNS.lowercase.test(password),
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter',
      met: PATTERNS.uppercase.test(password),
    },
    {
      id: 'number',
      label: 'One number',
      met: PATTERNS.number.test(password),
    },
    {
      id: 'special',
      label: 'One special character (@$!%*?&)',
      met: PATTERNS.special.test(password),
    },
  ];
}

export function isPasswordValid(password: string, minLength: number = 12): boolean {
  const requirements = getPasswordRequirements(password, minLength);
  return requirements.every(req => req.met);
}

export function PasswordRequirements({
  password,
  className,
  showTitle = true,
  minLength = 12,
}: PasswordRequirementsProps) {
  const requirements = getPasswordRequirements(password, minLength);
  const metCount = requirements.filter(r => r.met).length;
  const allMet = metCount === requirements.length;

  return (
    <div className={cn('space-y-3', className)}>
      {showTitle && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Password Requirements
          </p>
          <span
            className={cn(
              'text-xs font-medium',
              allMet ? 'text-green-600' : 'text-muted-foreground'
            )}
          >
            {metCount}/{requirements.length}
          </span>
        </div>
      )}
      
      <ul className="space-y-2">
        {requirements.map((requirement) => (
          <li
            key={requirement.id}
            className={cn(
              'flex items-center gap-2 text-sm transition-colors duration-200',
              requirement.met ? 'text-green-600' : 'text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                requirement.met
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-400'
              )}
              aria-hidden="true"
            >
              {requirement.met ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </span>
            <span className={requirement.met ? 'line-through opacity-70' : ''}>
              {requirement.label}
            </span>
          </li>
        ))}
      </ul>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            allMet
              ? 'w-full bg-green-500'
              : metCount >= 3
              ? 'bg-amber-500'
              : 'bg-red-500'
          )}
          style={{ width: `${(metCount / requirements.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={metCount}
          aria-valuemin={0}
          aria-valuemax={requirements.length}
          aria-label="Password requirements progress"
        />
      </div>
    </div>
  );
}

export default PasswordRequirements;
