import React from 'react';
import { Home, Calendar, BarChart3, Settings } from 'lucide-react';

export type NavTab = 'home' | 'history' | 'summary' | 'settings';

interface Props {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<Props> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'history', label: 'History', icon: Calendar },
    { id: 'summary', label: 'Summary', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200">
      <div className="max-w-[480px] mx-auto h-16 flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div
                className={`w-9 h-7 flex items-center justify-center rounded-full mb-0.5 transition-colors ${
                  isActive ? 'bg-blue-100 text-blue-700' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
