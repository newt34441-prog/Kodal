import React, { useState } from 'react';
import { ArrowLeft, MapPin, Smartphone, ChevronDown, Phone, Heart } from 'lucide-react';
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <>
      <header className="bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo & Foundation Identity */}
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            {/* Authentic Circular Foundation Logo */}
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full p-0.5 bg-white border border-slate-200/90 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
              <img
                src={info?.profilePhotoUrl || info?.logoUrl || '/assets/images/foundation_logo.png'}
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
              <h1 className="text-base sm:text-xl font-bold text-[#0B376B] tracking-tight leading-tight group-hover:text-blue-900 transition-colors truncate">
                কোদালপুর মানবিক ফাউন্ডেশন
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
                মানবতার টানে, সমাজের কল্যাণে
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links (matching reference image) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-700">
            <button
              onClick={() => onNavigate('/')}
              className={`hover:text-[#0B376B] transition-colors cursor-pointer py-1 ${
                currentPath === '/'
                  ? 'text-[#078747] font-bold border-b-2 border-[#078747]'
                  : 'text-slate-700'
              }`}
            >
              হোম
            </button>

            <button
              onClick={() => onNavigate('/about')}
              className={`hover:text-[#0B376B] transition-colors cursor-pointer py-1 ${
                currentPath === '/about'
                  ? 'text-[#078747] font-bold border-b-2 border-[#078747]'
                  : 'text-slate-700'
              }`}
            >
              আমাদের সম্পর্কে
            </button>

            <button
              onClick={() => onNavigate('/activities')}
              className={`hover:text-[#0B376B] transition-colors cursor-pointer py-1 ${
                currentPath === '/activities'
                  ? 'text-[#078747] font-bold border-b-2 border-[#078747]'
                  : 'text-slate-700'
              }`}
            >
              কার্যক্রম
            </button>

            <button
              onClick={() => onNavigate('/members')}
              className={`hover:text-[#0B376B] transition-colors cursor-pointer py-1 ${
                currentPath === '/members'
                  ? 'text-[#078747] font-bold border-b-2 border-[#078747]'
                  : 'text-slate-700'
              }`}
            >
              সদস্যবৃন্দ
            </button>

            {/* "More" Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                onBlur={() => setTimeout(() => setShowMoreMenu(false), 200)}
                className={`flex items-center gap-1 hover:text-[#0B376B] transition-colors cursor-pointer py-1 ${
                  ['/donations', '/accounts', '/policies', '/blood-donors', '/admin'].includes(currentPath)
                    ? 'text-[#078747] font-bold border-b-2 border-[#078747]'
                    : 'text-slate-700'
                }`}
              >
                <span>আরো</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    onClick={() => {
                      onNavigate('/donations');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0B376B] cursor-pointer flex items-center gap-2"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>অনলাইন অনুদান</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('/accounts');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0B376B] cursor-pointer"
                  >
                    আয়-ব্যয়ের হিসাব
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('/policies');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0B376B] cursor-pointer"
                  >
                    গঠনতন্ত্র ও নীতিমালা
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('/blood-donors');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0B376B] cursor-pointer"
                  >
                    রক্তদান কর্নার
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={() => {
                      onNavigate('/admin');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[#0B376B] hover:bg-blue-50 cursor-pointer"
                  >
                    অ্যাডমিন প্যানেল
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Action Buttons: App Download & Contact */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* App Download Button */}
            <button
              onClick={() => setShowDownloadModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
              title="অ্যান্ড্রয়েড অ্যাপ ডাউনলোড ও শেয়ার"
            >
              <Smartphone className="w-4 h-4 text-[#078747]" />
              <span className="hidden sm:inline">অ্যাপ</span>
            </button>

            {/* Contact Button */}
            <button
              onClick={() => onNavigate('/about')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-[#078747] hover:bg-[#056032] rounded-lg transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 hidden sm:inline" />
              <span>যোগাযোগ</span>
            </button>

            {/* Back to Home if not on home */}
            {!isHome && (
              <button
                onClick={() => onNavigate('/')}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#0B376B] bg-blue-50 hover:bg-[#0B376B] hover:text-white rounded-lg transition-all duration-200 cursor-pointer shadow-2xs"
                title="প্রধান পাতায় ফিরুন"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline">হোম</span>
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
