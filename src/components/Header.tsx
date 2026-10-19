import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useDuty } from '../context/DutyContext';
import { SyncBadge } from './SyncBadge';
import { formatFullDateDisplay, getTodayDateKey } from '../domain/dateUtils';
import { Clock } from 'lucide-react';

export const Header: React.FC = () => {
  const { profile } = useAuth();
  const { syncStatus, pendingCount } = useDuty();
  const todayKey = getTodayDateKey();
  const dateFormatted = formatFullDateDisplay(todayKey);

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight text-base">DutyLog</h1>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[170px]">
              {profile?.displayName ? `Hi, ${profile.displayName}` : 'Welcome'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <SyncBadge status={syncStatus} pendingCount={pendingCount} />
          <span className="text-[11px] text-slate-500 font-medium">{dateFormatted}</span>
        </div>
      </div>
    </header>
  );
};
