import React, { useState } from 'react';
import { ArrowLeft, MapPin, Smartphone } from 'lucide-react';
import { FoundationInfo } from '../../types';
import { AppDownloadModal } from './AppDownloadModal';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  info?: FoundationInfo | null;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate, info }) => {
  const isHome = currentPath === '/';
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  return (
    <>
      <header className="bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center gap-3.5 sm:gap-4 cursor-pointer group shrink min-w-0"
          >
            {/* Authentic Circular Foundation Logo */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 bg-white border border-slate-200/90 shadow-xs shrink-0 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
              <img
                src={info?.logoUrl || '/assets/images/foundation_logo.png'}
                alt="কোদালপুর মানবিক ফাউন্ডেশন লোগো"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== window.location.origin + '/assets/images/foundation_logo.png') {
                    target.src = '/assets/images/foundation_logo.png';
                  }
                }}
              />
            </div>

            <div className="truncate">
              <h1 className="text-lg sm:text-2xl font-bold text-[#0B376B] tracking-tight leading-tight group-hover:text-blue-900 transition-colors truncate">
                কোদালপুর মানবিক ফাউন্ডেশন
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#078747] shrink-0" />
                <span className="truncate">কোদালপুর, গোসাইরহাট, শরীয়তপুর</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* App Download & WhatsApp Share Button */}
            <button
              onClick={() => setShowDownloadModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white bg-[#078747] hover:bg-[#056032] rounded-lg transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
              title="অ্যান্ড্রয়েড অ্যাপ ডাউনলোড ও হোয়াটসঅ্যাপ শেয়ার"
            >
              <Smartphone className="w-4 h-4 text-emerald-200" />
              <span className="hidden sm:inline">অ্যাপ ডাউনলোড</span>
              <span className="sm:hidden">অ্যাপ</span>
            </button>

            {!isHome && (
              <button
                onClick={() => onNavigate('/')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#0B376B] bg-slate-100 hover:bg-[#0B376B] hover:text-white rounded-lg transition-all duration-200 cursor-pointer shadow-xs"
                title="প্রধান পাতায় ফিরুন"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">প্রধান পাতা</span>
              </button>
            )}
          </div>
        </div>

        {/* Modern Gradient Border Line (Navy to Green) */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#0B376B] via-[#0B376B] to-[#078747]" />
      </header>

      {/* App Download Modal */}
      <AppDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </>
  );
};
