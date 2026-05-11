import React from 'react';
import { motion } from 'framer-motion';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig: Record<string, { size: string; stroke: string }> = {
  sm: { size: 'w-4 h-4', stroke: '2' },
  md: { size: 'w-6 h-6', stroke: '2.5' },
  lg: { size: 'w-8 h-8', stroke: '3' },
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
}) => {
  const config = sizeConfig[size];

  return (
    <motion.svg
      className={`animate-spin ${config.size} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <motion.circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth={config.stroke}
        initial={{ opacity: 0.25 }}
        animate={{ opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        className="opacity-75 text-orange-500"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        initial={{ opacity: 0.75 }}
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ color: 'inherit' }}
      />
    </motion.svg>
  );
};

export const PageSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" className="text-orange-500" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
);

export default Spinner;