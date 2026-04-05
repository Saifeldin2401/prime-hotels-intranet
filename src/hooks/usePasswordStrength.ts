import { useMemo } from 'react';

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const LABELS = ['weak', 'weak', 'fair', 'good', 'strong'];
const COLORS = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

/**
 * Hook to calculate password strength
 * @param password - The password to evaluate
 * @returns PasswordStrength object with score (0-4), label, and color class
 */
export function usePasswordStrength(password: string): PasswordStrength {
  return useMemo(() => {
    if (!password) return { score: 0, label: 'too_short', color: 'bg-gray-200' };
    if (password.length < 6) return { score: 1, label: 'too_short', color: 'bg-red-500' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    return {
      score,
      label: LABELS[score] || 'weak',
      color: COLORS[score] || 'bg-red-500',
    };
  }, [password]);
}

export default usePasswordStrength;
