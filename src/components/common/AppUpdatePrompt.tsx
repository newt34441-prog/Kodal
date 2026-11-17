import React, { useEffect, useState } from 'react';
import {
  Download,
  RefreshCw,
  Bell,
  BellRing,
  Sparkles,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import {
  AppUpdateState,
  applyAppUpdate,
  getAppUpdateState,
  requestUpdateNotificationPermission,
  subscribeAppUpdate,
} from '../../utils/pwaAutoUpdate';

export const AppUpdatePrompt: React.FC = () => {
  const [updateState, setUpdateState] = useState<AppUpdateState>(() => getAppUpdateState());
  const [minimized, setMinimized] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  useEffect(() => {
    const unsubscribe = subscribeAppUpdate((nextState) => {
      setUpdateState(nextState);
    });
    return () => unsubscribe();
  }, []);

  const handleEnableNotifications = async () => {
    const perm = await requestUpdateNotificationPermission();
    setNotifPermission(perm);
  };

  // Non-intrusive offline status pill when internet is unavailable (only shown if no update modal is covering screen)
  if (!updateState.updateAvailable) {
    if (!updateState.isOnline) {
      return (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-lg border border-amber-400/50"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>অফলাইন মোড — সংরক্ষিত সংস্করণ চালু আছে</span>
        </div>
      );
    }
    return null;
  }

  // Minimized floating update banner after "পরে আপডেট করুন"
  if (minimized) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 bg-[#0B376B] text-white rounded-2xl shadow-2xl border border-emerald-400/40 p-3.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#078747] flex items-center justify-center shrink-0 shadow-xs">
            <Download className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold truncate">নতুন আপডেট পাওয়া গেছে</p>
            <p className="text-[11px] text-blue-100 truncate">
              {updateState.latestVersionNumber
                ? `সংস্করণ ${updateState.latestVersionNumber} প্রস্তুত`
                : 'সর্বশেষ সুবিধা পেতে আপডেট করুন'}
            </p>
          </div>
        </button>

        <button
          type="button"
          disabled={updateState.updating}
          onClick={() => applyAppUpdate()}
          className="px-3 py-2 rounded-xl bg-[#078747] hover:bg-[#056032] disabled:opacity-60 text-white text-xs font-bold shrink-0 cursor-pointer transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${updateState.updating ? 'animate-spin' : ''}`} />
          <span>{updateState.updating ? 'আপডেট হচ্ছে...' : 'এখনই আপডেট করুন'}</span>
        </button>
      </div>
    );
  }

  // Prominent Update Notification Modal with exact requested copy & buttons
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kmf-update-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B376B] via-[#0B376B] to-[#078747] p-5 text-white relative">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 text-white/85 hover:text-white transition-colors cursor-pointer"
            aria-label="পরে আপডেট করুন"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#DC2626] text-white text-[10px] font-bold mb-1">
                <Sparkles className="w-3 h-3" />
                <span>{updateState.isApkMode ? 'APK / অ্যাপ আপডেট' : 'নতুন ভার্সন'}</span>
              </div>
              <h3 id="kmf-update-title" className="text-lg font-extrabold leading-tight">
                {updateState.appName}
              </h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-sm text-slate-800 font-medium leading-relaxed">
            নতুন আপডেট পাওয়া গেছে। সর্বশেষ সুবিধা পেতে অ্যাপটি আপডেট করুন।
            {updateState.latestVersionNumber && (
              <p className="text-xs font-semibold text-[#078747] mt-1.5">
                নতুন ভার্সন: {updateState.latestVersionNumber}
              </p>
            )}
          </div>

          {notifPermission === 'default' && (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0B376B] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#078747]" />
              <span>নতুন আপডেট এলে ফোনে নোটিফিকেশন পেতে অনুমতি দিন</span>
            </button>
          )}

          {notifPermission === 'granted' && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#078747]">
              <BellRing className="w-3.5 h-3.5" />
              <span>অ্যাপ আপডেট নোটিফিকেশন চালু আছে</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              disabled={updateState.updating}
              onClick={() => applyAppUpdate()}
              className="flex-1 py-3 px-4 rounded-xl bg-[#078747] hover:bg-[#056032] disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <RefreshCw className={`w-4 h-4 ${updateState.updating ? 'animate-spin' : ''}`} />
              <span>{updateState.updating ? 'আপডেট হচ্ছে...' : 'এখনই আপডেট করুন'}</span>
            </button>

            <button
              type="button"
              disabled={updateState.updating}
              onClick={() => setMinimized(true)}
              className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              পরে আপডেট করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
