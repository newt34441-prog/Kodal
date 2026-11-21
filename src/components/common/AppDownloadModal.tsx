import React, { useEffect, useState } from 'react';
import {
  Smartphone,
  Share2,
  Download,
  CheckCircle2,
  X,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  HelpCircle,
  RefreshCw,
  Bell,
  BellRing,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  AppUpdateState,
  checkForAppUpdate,
  forcePurgeCacheAndReload,
  formatBengaliBuildDate,
  getAppUpdateState,
  requestUpdateNotificationPermission,
  subscribeAppUpdate,
} from '../../utils/pwaAutoUpdate';

const MessengerIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.454 5.504 3.727 7.197V22l3.405-1.869c.909.252 1.872.386 2.868.386 5.523 0 10-4.145 10-9.259C22 6.145 17.523 2 12 2zm.993 12.468l-2.545-2.715-4.967 2.715 5.464-5.798 2.607 2.715 4.905-2.715-5.464 5.798z" />
  </svg>
);

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'share' | 'install' | 'apk';
  initialPlatform?: 'whatsapp' | 'messenger';
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'share',
  initialPlatform = 'whatsapp',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [messengerNotice, setMessengerNotice] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'install' | 'apk'>(initialTab);
  const [highlightedPlatform, setHighlightedPlatform] = useState<'whatsapp' | 'messenger'>(initialPlatform);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateCheckMsg, setUpdateCheckMsg] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<AppUpdateState>(() => getAppUpdateState());
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setHighlightedPlatform(initialPlatform);
      setMessengerNotice(false);
    }
  }, [isOpen, initialTab, initialPlatform]);

  useEffect(() => {
    return subscribeAppUpdate((next) => setUpdateState(next));
  }, []);

  if (!isOpen) return null;

  const handleManualUpdateCheck = async () => {
    setCheckingUpdate(true);
    setUpdateCheckMsg(null);
    const res = await checkForAppUpdate(true);
    setCheckingUpdate(false);
    if (res.updateAvailable) {
      setUpdateCheckMsg('নতুন আপডেট পাওয়া গেছে! আপডেট পপআপ প্রদর্শিত হয়েছে।');
      onClose();
    } else {
      setUpdateCheckMsg('আপনার অ্যাপটি ইতিমধ্যেই সর্বশেষ সংস্করণে রয়েছে।');
    }
  };

  const handleEnableNotif = async () => {
    const perm = await requestUpdateNotificationPermission();
    setNotifPerm(perm);
  };

  // Real app URL
  const appUrl = window.location.origin;

  const plainShareMessage = `আসসালামু আলাইকুম,\nকোদালপুর মানবিক ফাউন্ডেশনের অফিশিয়াল অ্যান্ড্রয়েড অ্যাপ ইনস্টল করুন:\n${appUrl}\n\nসহজেই অনুদান প্রদান, রক্তদাতা সন্ধান ও ফাউন্ডেশনের হিসাব দেখতে অ্যাপটি ফোনে ইনস্টল করে নিন।`;
  const encodedShareMessage = encodeURIComponent(plainShareMessage);
  const supportsWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainShareMessage);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleShareMessenger = async () => {
    setHighlightedPlatform('messenger');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainShareMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // ignore clipboard errors
    }

    setMessengerNotice(true);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const anchor = document.createElement('a');
    if (isMobile) {
      anchor.href = `fb-messenger://share/?link=${encodeURIComponent(appUrl)}`;
      anchor.rel = 'noopener noreferrer';
    } else {
      anchor.href = 'https://www.messenger.com/';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleNativeShare = async () => {
    if (!supportsWebShare) return;
    try {
      await navigator.share({
        title: 'কোদালপুর মানবিক ফাউন্ডেশন',
        text: plainShareMessage,
        url: appUrl,
      });
    } catch {
      // user cancelled native share
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Navy to Green gradient line */}
        <div className="relative bg-gradient-to-r from-[#0B376B] to-[#078747] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Smartphone className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">মোবাইল অ্যাপ ও APK</h3>
              <p className="text-xs text-blue-100">কোদালপুর মানবিক ফাউন্ডেশন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'share'
                ? 'border-[#078747] text-[#078747] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>অ্যাপ শেয়ার করুন</span>
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'install'
                ? 'border-[#0B376B] text-[#0B376B] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>ফোনে ইনস্টল</span>
          </button>

          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'apk'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>APK ফাইল গাইড</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: WhatsApp & Messenger Sharing */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  highlightedPlatform === 'messenger'
                    ? 'bg-blue-50/80 border-blue-200'
                    : 'bg-emerald-50/80 border-emerald-100'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 ${
                    highlightedPlatform === 'messenger' ? 'bg-[#0084FF]' : 'bg-[#078747]'
                  }`}
                >
                  {highlightedPlatform === 'messenger' ? (
                    <MessengerIcon className="w-4 h-4" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </div>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <p
                    className={`font-semibold mb-1 ${
                      highlightedPlatform === 'messenger' ? 'text-[#0084FF]' : 'text-[#078747]'
                    }`}
                  >
                    হোয়াটসঅ্যাপ ও মেসেন্জারে ১-ক্লিকে অ্যাপ পাঠান
                  </p>
                  যাঁদের কাছে পাঠাবেন, তাঁরা লিংকে ক্লিক করলেই কোনো প্লে-স্টোর ছাড়াই সরাসরি তাঁদের ফোনে অ্যাপটি ইনস্টল করে নিতে পারবেন।
                </div>
              </div>

              {/* Message Preview Box */}
              <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-xs text-slate-600 font-mono leading-relaxed relative">
                <p className="font-sans font-semibold text-slate-800 mb-1">
                  শেয়ার মেসেজ প্রিভিউ:
                </p>
                <div className="text-slate-700 font-sans whitespace-pre-line text-xs">
                  আসসালামু আলাইকুম,{'\n'}
                  কোদালপুর মানবিক ফাউন্ডেশনের অফিশিয়াল অ্যান্ড্রয়েড অ্যাপ ইনস্টল করুন:{'\n'}
                  <span className="text-blue-600 underline font-semibold break-all">{appUrl}</span>{'\n'}
                  সহজেই অনুদান প্রদান, রক্তদাতা সন্ধান ও ফাউন্ডেশনের হিসাব দেখতে অ্যাপটি ফোনে ইনস্টল করে নিন।
                </div>
              </div>

              {/* Primary Share Buttons: Messenger & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleShareMessenger}
                  className={`inline-flex items-center justify-center gap-2 bg-[#0084FF] hover:bg-[#006FE0] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all duration-200 cursor-pointer active:scale-98 text-xs sm:text-sm ${
                    highlightedPlatform === 'messenger' ? 'ring-2 ring-[#0084FF]/40 ring-offset-2' : ''
                  }`}
                >
                  <MessengerIcon className="w-4 h-4" />
                  <span>মেসেন্জারে শেয়ার করুন</span>
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodedShareMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setHighlightedPlatform('whatsapp')}
                  className={`inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all duration-200 cursor-pointer active:scale-98 text-xs sm:text-sm ${
                    highlightedPlatform === 'whatsapp' ? 'ring-2 ring-[#25D366]/40 ring-offset-2' : ''
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  <span>হোয়াটসঅ্যাপে শেয়ার করুন</span>
                </a>
              </div>

              {/* Messenger helper notice with fallback links */}
              {messengerNotice && (
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1.5 animate-in fade-in duration-200">
                  <p className="font-bold text-[#0084FF]">
                    মেসেজ ও অ্যাপের লিংক কপি করা হয়েছে!
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    মোবাইলে মেসেন্জার অ্যাপ সরাসরি ওপেন না হলে বা কম্পিউটার থেকে শেয়ার করতে চাইলে নিচের অপশন থেকে মেসেন্জার ওয়েব খুলে চ্যাটে পেস্ট (Paste) করে পাঠান।
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-0.5">
                    <a
                      href="https://www.messenger.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-[#0084FF] hover:underline"
                    >
                      <span>মেসেন্জার ওয়েব খুলুন</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {supportsWebShare && (
                      <button
                        type="button"
                        onClick={handleNativeShare}
                        className="inline-flex items-center gap-1 font-bold text-[#0B376B] hover:underline cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>অন্যান্য অ্যাপে শেয়ার করুন</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Secondary Utility Row: Copy & Native Share */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 cursor-pointer text-xs sm:text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">মেসেজ ও লিংক কপি হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>মেসেজ ও লিংক কপি করুন</span>
                    </>
                  )}
                </button>

                {supportsWebShare && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="inline-flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-[#0B376B] border border-blue-200 font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 cursor-pointer text-xs sm:text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>আরও অ্যাপে পাঠান</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Direct Phone Install */}
          {activeTab === 'install' && (
            <div className="space-y-4">
              {isInstalled ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h4 className="font-bold text-emerald-800 text-base">
                    অ্যাপটি ইতিমধ্যে আপনার ফোনে ইনস্টল রয়েছে!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    আপনি আপনার মোবাইলের হোম স্ক্রিনে বা অ্যাপ মেন্যুতে অ্যাপটি পেয়ে যাবেন।
                  </p>
                </div>
              ) : isInstallable ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-slate-700 text-xs sm:text-sm">
                    নিচের বাটনে চাপ দিলে সরাসরি আপনার ফোনের হোম স্ক্রিনে অফিশিয়াল অ্যাপ হিসেবে যুক্ত হবে।
                  </div>
                  <button
                    onClick={install}
                    className="w-full inline-flex items-center justify-center gap-2.5 bg-[#0B376B] hover:bg-[#072549] text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all duration-200 cursor-pointer text-sm"
                  >
                    <Download className="w-4 h-4 text-emerald-300" />
                    <span>সরাসরি ফোনে ইনস্টল করুন (WebAPK)</span>
                  </button>
                </div>
              ) : isIOS ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 space-y-2">
                  <p className="font-bold text-slate-900">iPhone / iPad ব্যবহারকারীদের জন্য:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600">
                    <li>Safari ব্রাউজারে নিচের <strong>Share (শেয়ার)</strong> বাটনে ট্যাপ করুন।</li>
                    <li>নিচে স্ক্রোল করে <strong>Add to Home Screen</strong> চাপুন।</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-amber-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      অ্যান্ড্রয়েড ফোনে ইনস্টল করার সহজ নিয়ম:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-amber-800/90 leading-relaxed">
                      <li>Chrome ব্রাউজারে ডানদিকের উপরে <strong>তিনটি ডট (⋮)</strong> মেনুতে ক্লিক করুন।</li>
                      <li><strong>“Install app”</strong> বা <strong>“Add to Home screen”</strong> অপশনটি বেছে নিন।</li>
                      <li>“Install” বাটনে চাপ দিলেই অ্যাপটি হোমস্ক্রিনে ডাউনলোড হয়ে যাবে।</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* App Update Check, Version Info & Notification Controls (especially for Installed/APK Mode) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">অ্যাপ ভার্সন ও আপডেট তথ্য</span>
                  {notifPerm === 'granted' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#078747]">
                      <BellRing className="w-3.5 h-3.5" />
                      চালু আছে
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-500 block">ভার্সন নম্বর</span>
                    <span className="font-bold text-[#0B376B] font-mono">
                      {updateState.currentVersionNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">আপডেটের অবস্থা</span>
                    <span
                      className={`font-bold ${
                        updateState.updateAvailable
                          ? 'text-[#DC2626]'
                          : !updateState.isOnline
                          ? 'text-amber-700'
                          : 'text-[#078747]'
                      }`}
                    >
                      {updateState.updateAvailable
                        ? 'নতুন আপডেট পাওয়া গেছে'
                        : !updateState.isOnline
                        ? 'অফলাইন মোড'
                        : 'আপ-টু-ডেট'}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-100">
                    <span className="text-slate-500">সর্বশেষ আপডেটের তারিখ: </span>
                    <span className="font-semibold text-slate-700">
                      {formatBengaliBuildDate(updateState.buildTime)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={checkingUpdate}
                    onClick={handleManualUpdateCheck}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[#0B376B] text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                    <span>{checkingUpdate ? 'যাচাই হচ্ছে...' : 'নতুন আপডেট চেক করুন'}</span>
                  </button>

                  {notifPerm === 'default' && (
                    <button
                      type="button"
                      onClick={handleEnableNotif}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#078747] hover:bg-[#056032] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>আপডেট অ্যালার্ট চালু করুন</span>
                    </button>
                  )}
                </div>

                {updateCheckMsg && (
                  <p className="text-[11px] font-semibold text-[#078747] text-center">
                    {updateCheckMsg}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => forcePurgeCacheAndReload()}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-[#0B376B] hover:bg-slate-200/70 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>ক্যাশ পরিষ্কার করে নতুন সংস্করণ রিলোড করুন</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Standalone Raw .apk File Guide */}
          {activeTab === 'apk' && (
            <div className="space-y-4 text-xs sm:text-sm text-slate-700">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-[#0B376B] text-sm">
                  হোয়াটসঅ্যাপ বা মেসেন্জারে সরাসরি .APK ফাইল পাঠাতে চাইলে:
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  গুগল ও মাইক্রোসফটের অফিশিয়াল <strong>PWABuilder</strong> টুল দিয়ে আপনার এই ওয়েবসাইটের লিংক থেকে সরাসরি ইনস্টলেবল <strong>.apk ফাইল</strong> বিনামূল্যে বানিয়ে নেওয়া যায়।
                </p>
                <div className="pt-1">
                  <a
                    href={`https://www.pwabuilder.com?url=${encodeURIComponent(appUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#0B376B] hover:bg-[#072549] text-white py-2 px-3.5 rounded-lg font-semibold text-xs transition-colors shadow-xs"
                  >
                    <span>PWABuilder-এ APK তৈরি করুন</span>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
                  </a>
                </div>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed border-l-2 border-emerald-500 pl-3">
                <strong>পরামর্শ:</strong> হোয়াটসঅ্যাপ বা মেসেন্জারে সরাসরি লিংক পাঠানোই সবচেয়ে সুবিধাজনক ও নিরাপদ। যেকোনো ইউজার লিংকে ক্লিক করে ১ সেকেন্ডেই অ্যাপ ইনস্টল করতে পারেন কোনো অজানা সোর্স বা সিকিউরিটি ওয়ার্নিং ছাড়াই।
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ১০০% নিরাপদ ও ভাইরাস মুক্ত
          </span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
