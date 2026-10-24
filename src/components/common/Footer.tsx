import React, { useState } from 'react';
import { Lock, MapPin, Smartphone, Share2 } from 'lucide-react';
import { AppDownloadModal } from './AppDownloadModal';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  return (
    <>
      <footer className="bg-[#0B376B] text-white mt-auto py-8 sm:py-10 border-t border-blue-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left Column: Official Logo, Title, Address */}
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white p-1 shrink-0 shadow-sm flex items-center justify-center overflow-hidden">
                <img
                  src="/assets/images/foundation_logo.png"
                  alt="কোদালপুর মানবিক ফাউন্ডেশন লোগো"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  কোদালপুর মানবিক ফাউন্ডেশন
                </h3>
                <p className="text-xs sm:text-sm text-blue-100/80 font-medium flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>কোদালপুর, গোসাইরহাট, শরীয়তপুর, বাংলাদেশ</span>
                </p>
              </div>
            </div>

            {/* Desktop Hairline Divider */}
            <div className="hidden md:block w-px h-14 bg-white/20 mx-4" />

            {/* Right Column: App Share, Copyright & Admin Portal Link */}
            <div className="flex flex-col md:items-end text-xs sm:text-sm text-blue-100/90 gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-white/10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDownloadModal(true)}
                  className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white transition-colors cursor-pointer py-1 px-2.5 rounded-md hover:bg-white/10"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="font-semibold">মোবাইল অ্যাপ / WhatsApp</span>
                </button>

                <button
                  onClick={() => onNavigate('/admin')}
                  className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors cursor-pointer py-1 px-2.5 rounded-md hover:bg-white/10"
                  title="অ্যাডমিন পোর্টাল লগইন"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="font-medium">অ্যাডমিন লগইন</span>
                </button>
              </div>

              <p className="font-normal text-blue-200/80 text-[11px] sm:text-xs">
                © ২০২৬ কোদালপুর মানবিক ফাউন্ডেশন। সকল অধিকার সংরক্ষিত।
              </p>
            </div>
          </div>
        </div>
      </footer>

      <AppDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </>
  );
};
