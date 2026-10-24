import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text = 'তথ্য লোড হচ্ছে...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Loader2 className="w-8 h-8 text-blue-900 animate-spin mb-3 stroke-[2.2]" />
      <p className="text-sm font-medium text-slate-600">{text}</p>
    </div>
  );
};
