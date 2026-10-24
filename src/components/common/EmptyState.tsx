import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  subMessage?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, subMessage }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 my-6 shadow-xs">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <FolderOpen className="w-7 h-7 stroke-1.5" />
      </div>
      <h3 className="text-lg font-medium text-slate-700">{message}</h3>
      {subMessage && <p className="text-sm text-slate-500 mt-1 max-w-md">{subMessage}</p>}
    </div>
  );
};
