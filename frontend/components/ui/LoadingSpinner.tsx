import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const colorClasses = {
  primary: 'text-indigo-600',
  secondary: 'text-gray-600',
  white: 'text-white',
  gray: 'text-gray-400',
};

export default function LoadingSpinner({
  size = 'md',
  color = 'primary',
  text,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <div
          className={`animate-spin rounded-full border-2 border-gray-300 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}
        />
        {text && (
          <p className={`text-sm ${colorClasses[color]}`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

// Predefined loading states for common use cases
export function PageLoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="xl" text={text} />
    </div>
  );
}

export function CardLoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export function ButtonLoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2">
      <LoadingSpinner size="sm" color="white" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

export function InlineLoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2">
      <LoadingSpinner size="sm" />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
}
