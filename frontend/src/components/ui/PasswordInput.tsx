import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input, InputProps } from './Input';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showStrength?: boolean;
}

type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

const strengthConfig: Record<StrengthLevel, { label: string; color: string; width: string }> = {
  empty: { label: '', color: 'bg-gray-200', width: '0%' },
  weak: { label: 'Weak', color: 'bg-red-500', width: '25%' },
  fair: { label: 'Fair', color: 'bg-orange-500', width: '50%' },
  good: { label: 'Good', color: 'bg-yellow-500', width: '75%' },
  strong: { label: 'Strong', color: 'bg-green-500', width: '100%' },
};

const calculateStrength = (password: string): StrengthLevel => {
  if (!password) return 'empty';
  if (password.length < 6) return 'weak';

  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  return ['weak', 'fair', 'good', 'strong'][Math.min(score, 4) - 1] as StrengthLevel;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength = false, value, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);
    const password = typeof value === 'string' ? value : '';
    const strength = calculateStrength(password);
    const strengthData = strengthConfig[strength];

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="relative">
          <Input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            value={value}
            className={`pr-10 ${className}`}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        <AnimatePresence>
          {showStrength && password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-1"
            >
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${strengthData.color} rounded-full`}
                  initial={{ width: '0%' }}
                  animate={{ width: strengthData.width }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <p className={`text-xs font-medium ${
                strength === 'weak' ? 'text-red-500' :
                strength === 'fair' ? 'text-orange-500' :
                strength === 'good' ? 'text-yellow-600' :
                strength === 'strong' ? 'text-green-500' : 'text-gray-400'
              }`}>
                {strengthData.label}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;