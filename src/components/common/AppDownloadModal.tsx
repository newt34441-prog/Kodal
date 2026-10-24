import React, { useState } from 'react';
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
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'install' | 'apk'>('whatsapp');

  if (!isOpen) return null;

  // Real app URL
  const appUrl = window.location.origin;

  // WhatsApp formatted message
  const whatsappMessage = encodeURIComponent(
    `আসসালামু আলাইকুম,\nকোদালপুর মানবিক ফাউন্ডেশনের অফিশিয়াল অ্যান্ড্রয়েড অ্যাপ ইনস্টল করুন:\n${appUrl}\n\nসহজেই অনুদান প্রদান, রক্তদাতা সন্ধান ও ফাউন্ডেশনের হিসাব দেখতে অ্যাপটি ফোনে ইনস্টল করে নিন।`
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `কোদালপুর মানবিক ফাউন্ডেশন অ্যাপ: ${appUrl}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${whatsappMessage}`, '_blank');
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
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-3 px-2 text-center transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'whatsapp'
                ? 'border-[#078747] text-[#078747] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>হোয়াটসঅ্যাপে পাঠান</span>
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
        <div className="p-5 sm:p-6 space-y-5">
          {/* TAB 1: WhatsApp Sharing */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#078747] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Share2 className="w-4 h-4" />
                </div>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <p className="font-semibold text-[#078747] mb-1">
                    হোয়াটসঅ্যাপে ১-ক্লিকে অ্যাপ পাঠান
                  </p>
                  যাঁদের হোয়াটসঅ্যাপে পাঠাবেন, তাঁরা লিংকে ক্লিক করলেই কোনো প্লে-স্টোর ছাড়াই সরাসরি তাঁদের ফোনে অ্যাপটি ইনস্টল করে নিতে পারবেন।
                </div>
              </div>

              {/* Message Preview Box */}
              <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50 text-xs text-slate-600 font-mono leading-relaxed relative">
                <p className="font-sans font-semibold text-slate-800 mb-1">
                  হোয়াটসঅ্যাপ মেসেজ প্রিভিউ:
                </p>
                <div className="text-slate-700 font-sans whitespace-pre-line text-xs">
                  আসসালামু আলাইকুম,{'\n'}
                  কোদালপুর মানবিক ফাউন্ডেশনের অফিশিয়াল অ্যান্ড্রয়েড অ্যাপ ইনস্টল করুন:{'\n'}
                  <span className="text-blue-600 underline font-semibold">{appUrl}</span>{'\n'}
                  সহজেই অনুদান প্রদান, রক্তদাতা সন্ধান ও ফাউন্ডেশনের হিসাব দেখতে অ্যাপটি ফোনে ইনস্টল করে নিন।
                </div>
              </div>

              {/* Primary Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={handleOpenWhatsApp}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all duration-200 cursor-pointer active:scale-98"
                >
                  <Share2 className="w-4 h-4" />
                  <span>হোয়াটসঅ্যাপে শেয়ার করুন</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">কপি হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>লিংক কপি</span>
                    </>
                  )}
                </button>
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
            </div>
          )}

          {/* TAB 3: Standalone Raw .apk File Guide */}
          {activeTab === 'apk' && (
            <div className="space-y-4 text-xs sm:text-sm text-slate-700">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-[#0B376B] text-sm">
                  হোয়াটসঅ্যাপে সরাসরি .APK ফাইল পাঠাতে চাইলে:
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
                <strong>পরামর্শ:</strong> হোয়াটসঅ্যাপে সরাসরি লিংক পাঠানোই সবচেয়ে সুবিধাজনক ও নিরাপদ। যেকোনো ইউজার লিংকে ক্লিক করে ১ সেকেন্ডেই অ্যাপ ইনস্টল করতে পারেন কোনো অজানা সোর্স বা সিকিউরিটি ওয়ার্নিং ছাড়াই।
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
