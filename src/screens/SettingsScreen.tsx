import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDuty } from '../context/DutyContext';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../config';
import { buildPowerQueryCode, buildMonthExport } from '../domain/exportBuilder';
import { FULL_WEEKDAYS } from '../domain/dateUtils';
import {
  User,
  Clock,
  FileSpreadsheet,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  LogOut,
  AlertTriangle,
  Download,
  Info,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { PWAInstallBanner } from '../components/PWAInstallBanner';

export const SettingsScreen: React.FC = () => {
  const { user, profile, sessionExpiresAt, updateName, signOut } = useAuth();
  const {
    settings,
    updateSettings,
    generateExcelToken,
    regenerateExcelToken,
    revokeExcelToken,
    rebuildExportData,
    lastExportUpdated,
    exportLoading,
    currentMonthKey,
    recordsMap,
    marksMap,
  } = useDuty();

  // Profile Edit
  const [displayName, setDisplayName] = useState<string>(profile?.displayName || '');
  const [nameSaving, setNameSaving] = useState<boolean>(false);
  const [nameSavedSuccess, setNameSavedSuccess] = useState<boolean>(false);

  // Duty Settings Edit
  const [dutyStart, setDutyStart] = useState<string>(settings.dutyStart);
  const [dutyEnd, setDutyEnd] = useState<string>(settings.dutyEnd);
  const [weeklyOff, setWeeklyOff] = useState<number>(settings.weeklyOff);

  React.useEffect(() => {
    setDutyStart(settings.dutyStart);
    setDutyEnd(settings.dutyEnd);
    setWeeklyOff(settings.weeklyOff);
  }, [settings.dutyStart, settings.dutyEnd, settings.weeklyOff]);

  // Copy Feedback
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedSummaryCode, setCopiedSummaryCode] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const token = profile?.exportToken;
  const currentExcelUrl = token
    ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/exports/${token}_current`
    : '';

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;
    setNameSaving(true);
    try {
      await updateName(displayName.trim());
      setNameSavedSuccess(true);
      setTimeout(() => setNameSavedSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Error updating name');
    } finally {
      setNameSaving(false);
    }
  };

  const handleSaveDutySettings = async (newStart: string, newEnd: string, newOff: number) => {
    if (newStart >= newEnd) {
      alert('Duty start time must be earlier than duty end time');
      return;
    }
    try {
      await updateSettings({
        dutyStart: newStart,
        dutyEnd: newEnd,
        weeklyOff: newOff,
      });
      setActionMessage('Duty settings updated and recalculated');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error saving settings');
    }
  };

  const handleCopy = (text: string, setCopiedState: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handleGenerateLink = async () => {
    try {
      await generateExcelToken();
      setActionMessage('Excel link created');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error creating Excel link');
    }
  };

  const handleRegenerateLink = async () => {
    if (!window.confirm('The old link will stop working. Continue?')) return;
    try {
      await regenerateExcelToken();
      setActionMessage('Excel link regenerated');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error regenerating link');
    }
  };

  const handleRevokeLink = async () => {
    if (!window.confirm('Excel will no longer be able to load your data. Continue?')) return;
    try {
      await revokeExcelToken();
      setActionMessage('Excel link revoked. Excel can no longer load your data');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error revoking link');
    }
  };

  const handleRebuild = async () => {
    try {
      await rebuildExportData();
      setActionMessage('Excel export data refreshed successfully');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error refreshing export data');
    }
  };

  const handleExportCsv = () => {
    const exportResult = buildMonthExport(currentMonthKey, recordsMap, marksMap, settings);
    const blob = new Blob([exportResult.daysCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DutyLog_${currentMonthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Toast / Notification */}
      {actionMessage && (
        <div className="p-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-lg text-center animate-in slide-in-from-top-2">
          {actionMessage}
        </div>
      )}

      {/* 1. Profile Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="w-4 h-4 text-blue-700" />
          <h3 className="font-bold text-slate-900 text-sm">User Profile</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Display Name</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-blue-600"
              />
              <button
                onClick={handleSaveProfile}
                disabled={nameSaving}
                className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
              >
                {nameSavedSuccess ? 'Saved!' : nameSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-sm font-medium"
            />
          </div>

          {sessionExpiresAt && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <span className="font-semibold">Session Status:</span>
              <span className="font-bold">
                Valid until {new Date(sessionExpiresAt).toLocaleDateString()} (Auto-renews)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Duty Hours & Calendar Settings */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock className="w-4 h-4 text-blue-700" />
          <h3 className="font-bold text-slate-900 text-sm">Duty & Shift Rules</h3>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Duty Start
              </label>
              <input
                type="time"
                value={dutyStart}
                onChange={(e) => {
                  setDutyStart(e.target.value);
                  handleSaveDutySettings(e.target.value, dutyEnd, weeklyOff);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:outline-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Duty End
              </label>
              <input
                type="time"
                value={dutyEnd}
                onChange={(e) => {
                  setDutyEnd(e.target.value);
                  handleSaveDutySettings(dutyStart, e.target.value, weeklyOff);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:outline-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Weekly Off Day
            </label>
            <select
              value={weeklyOff}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setWeeklyOff(val);
                handleSaveDutySettings(dutyStart, dutyEnd, val);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-blue-600 bg-white"
            >
              {FULL_WEEKDAYS.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <p className="text-[11px] text-slate-500 italic">
            * Changes take effect immediately and recalculate overtime and regular hours across all past and future records.
          </p>
        </div>
      </div>

      {/* 3. Excel Link (Free Sharing) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Excel Integration (Free)</h3>
          </div>
          {token && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              Active
            </span>
          )}
        </div>

        {!token ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Create a private link so Microsoft Excel can automatically load your attendance data through Power Query. No manual monthly exports needed.
            </p>
            <button
              onClick={handleGenerateLink}
              disabled={exportLoading}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{exportLoading ? 'Generating...' : 'Generate Excel Link'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Warning Box */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-medium">
                Anyone with this link can read your attendance data. Do not share it.
              </span>
            </div>

            {/* Read-only link */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Private Excel REST URL (Current Month)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentExcelUrl}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 select-all"
                />
                <button
                  onClick={() => handleCopy(currentExcelUrl, setCopiedLink)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                onClick={() => handleCopy(buildPowerQueryCode(currentExcelUrl, 'days'), setCopiedCode)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Excel Code Copied!' : 'Copy Excel Code (Days)'}</span>
              </button>

              <button
                onClick={() => handleCopy(buildPowerQueryCode(currentExcelUrl, 'summary'), setCopiedSummaryCode)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                {copiedSummaryCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSummaryCode ? 'Summary Code Copied!' : 'Copy Summary Code (Single Row)'}</span>
              </button>
            </div>

            {/* Rebuild, Regenerate, Revoke Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={handleRebuild}
                disabled={exportLoading}
                className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold text-center transition-colors flex flex-col items-center justify-center gap-1"
                title="Re-write CSV data for Excel"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${exportLoading ? 'animate-spin' : ''}`} />
                <span>Rebuild Data</span>
              </button>

              <button
                onClick={handleRegenerateLink}
                disabled={exportLoading}
                className="py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold text-center transition-colors flex flex-col items-center justify-center gap-1"
                title="Create a new token and invalidate old one"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Regenerate</span>
              </button>

              <button
                onClick={handleRevokeLink}
                disabled={exportLoading}
                className="py-2 px-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold text-center transition-colors flex flex-col items-center justify-center gap-1"
                title="Permanently remove Excel access"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revoke</span>
              </button>
            </div>

            {/* Status & Notes */}
            <div className="text-[11px] text-slate-500 space-y-1 pt-1">
              <p>
                Status:{' '}
                <span className="font-semibold text-slate-700">
                  {lastExportUpdated
                    ? `Excel data updated ${lastExportUpdated.toLocaleTimeString()}`
                    : 'Ready for Excel queries'}
                </span>
              </p>
              <p className="text-slate-400">Excel shows the data from your last sync, not live.</p>
            </div>

            {/* Step by Step Help */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info className="w-3.5 h-3.5 text-blue-700" />
                <span>How to use in Excel:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
                <li>Click <strong>Copy Excel Code</strong> above.</li>
                <li>In Excel: <strong>Data</strong> &gt; <strong>Get Data</strong> &gt; <strong>From Other Sources</strong> &gt; <strong>Blank Query</strong>.</li>
                <li>Click <strong>Advanced Editor</strong>, paste the copied code, and click <strong>Done</strong>.</li>
                <li>If prompted for credentials, choose <strong>Anonymous</strong>.</li>
                <li>Click <strong>Close &amp; Load</strong>. Refresh anytime!</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* 4. Data Export */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Download className="w-4 h-4 text-blue-700" />
          <h3 className="font-bold text-slate-900 text-sm">Offline CSV Export</h3>
        </div>
        <p className="text-xs text-slate-600">
          Save the current month&apos;s full attendance log as a standard CSV file directly to your device.
        </p>
        <button
          onClick={handleExportCsv}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Download {currentMonthKey} CSV</span>
        </button>
      </div>

      {/* 5. Install App on Phone */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Smartphone className="w-4 h-4 text-blue-700" />
          <h3 className="font-bold text-slate-900 text-sm">Phone Installation</h3>
        </div>
        <p className="text-xs text-slate-600">
          Install DutyLog directly on your Android phone home screen for quick 1-tap thumb log-ins.
        </p>
        <PWAInstallBanner compact={false} />
      </div>

      {/* 6. Logout */}
      <button
        onClick={signOut}
        className="w-full py-3.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-colors flex items-center justify-center gap-2 active:scale-98"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out of DutyLog</span>
      </button>
    </div>
  );
};
