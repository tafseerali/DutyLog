import React from 'react';
import { SyncStatus } from '../context/DutyContext';
import { CloudCheck, CloudOff, RefreshCw } from 'lucide-react';

interface Props {
  status: SyncStatus;
  pendingCount?: number;
}

export const SyncBadge: React.FC<Props> = ({ status, pendingCount = 0 }) => {
  if (status === 'Offline') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
        <CloudOff className="w-3.5 h-3.5" />
        <span>Offline{pendingCount > 0 ? ` (${pendingCount})` : ''}</span>
      </div>
    );
  }

  if (status === 'Syncing') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Syncing</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
      <CloudCheck className="w-3.5 h-3.5" />
      <span>Synced</span>
    </div>
  );
};
