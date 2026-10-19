import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, Share, X, Info, Check } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const PWAInstallBanner: React.FC<Props> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  // If already running standalone on the phone home screen, suppress banner
  if (isInstalled || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  if (compact) {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-700 flex items-center justify-center text-white">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Install on Your Phone</h3>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isIOS ? (
                <div className="space-y-2 text-xs text-slate-600">
                  <p>To install on iPhone or iPad:</p>
                  <ol className="list-decimal list-inside space-y-1.5 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <li>Tap the <strong>Share</strong> button at bottom of Safari.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top right.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-2 text-xs text-slate-600">
                  <p>To install on Android Phone:</p>
                  <ol className="list-decimal list-inside space-y-1.5 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <li>Open this URL in <strong>Google Chrome</strong> on your phone.</li>
                    <li>Tap the <strong>⋮ (three dots)</strong> menu icon in Chrome.</li>
                    <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  </ol>
                </div>
              )}

              <button
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 rounded-xl bg-blue-700 text-white font-bold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-4 text-white shadow-md relative overflow-hidden flex items-center justify-between gap-3 animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs tracking-tight">Install DutyLog App</h4>
            <p className="text-[11px] text-blue-100 font-medium leading-tight">
              Add to your phone&apos;s home screen for fast one-tap logging
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-700 flex items-center justify-center text-white">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Install on Your Phone</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2 text-xs text-slate-600">
                <p>To install on iPhone or iPad:</p>
                <ol className="list-decimal list-inside space-y-1.5 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <li>Tap the <strong>Share</strong> button in Safari toolbar.</li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> in the top right corner.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-600">
                <p>To install on Android Phone:</p>
                <ol className="list-decimal list-inside space-y-1.5 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <li>Open this URL in <strong>Google Chrome</strong> on your phone.</li>
                  <li>Tap the <strong>⋮ (three dots)</strong> menu in the top-right corner.</li>
                  <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  <li>DutyLog will be added to your apps with its own icon!</li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-blue-700 text-white font-bold text-xs"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
