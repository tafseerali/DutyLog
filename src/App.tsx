import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DutyProvider } from './context/DutyContext';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AuthScreen } from './screens/AuthScreen';
import { Clock } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('home');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl animate-pulse mb-4">
          <Clock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight">DutyLog</h2>
        <p className="text-xs text-slate-400 mt-1">Starting attendance engine...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <DutyProvider>
      <div className="min-h-screen bg-slate-100 flex justify-center">
        {/* Mobile viewport container: phone portrait first, max 480px centered */}
        <div className="w-full max-w-[480px] min-h-screen bg-slate-50 flex flex-col relative shadow-xl border-x border-slate-200">
          <Header />

          <main className="flex-1 p-4 overflow-y-auto">
            {currentTab === 'home' && <HomeScreen />}
            {currentTab === 'history' && <HistoryScreen />}
            {currentTab === 'summary' && <SummaryScreen />}
            {currentTab === 'settings' && <SettingsScreen />}
          </main>

          <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
        </div>
      </div>
    </DutyProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
