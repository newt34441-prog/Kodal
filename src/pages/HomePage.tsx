import React, { useState } from 'react';
import {
  HeartHandshake,
  Users,
  Wallet,
  CalendarCheck,
  FileText,
  Building2,
  Droplet,
  ArrowRight,
  Smartphone,
  Share2,
} from 'lucide-react';
import { FoundationInfo } from '../types';
import { AppDownloadModal } from '../components/common/AppDownloadModal';

interface HomePageProps {
  onNavigate: (path: string) => void;
  info?: FoundationInfo | null;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, info }) => {
  const [showAppModal, setShowAppModal] = useState(false);

  // Exactly 7 primary cards configured as per the reference design
  const primaryCardsRow1 = [
    {
      id: 'donations',
      title: 'অনুদান',
      path: '/donations',
      icon: HeartHandshake,
      iconBg: 'bg-rose-100 text-rose-600',
      subtitleLine1: 'মানবতার সেবায়',
      subtitleLine2: 'আপনার পাশে আমরা',
      arrowBg: 'bg-[#0B376B] hover:bg-[#072549]',
      bottomBorder: 'border-b-[#0B376B]',
    },
    {
      id: 'members',
      title: 'সদস্য',
      path: '/members',
      icon: Users,
      iconBg: 'bg-emerald-100 text-[#078747]',
      subtitleLine1: 'একসাথে কাজ করি',
      subtitleLine2: 'সুন্দর সমাজ গড়ি',
      arrowBg: 'bg-[#078747] hover:bg-[#056032]',
      bottomBorder: 'border-b-[#078747]',
    },
    {
      id: 'accounts',
      title: 'আয়-ব্যয়',
      path: '/accounts',
      icon: Wallet,
      iconBg: 'bg-blue-100 text-[#0A64C9]',
      subtitleLine1: 'স্বচ্ছ হিসাব,',
      subtitleLine2: 'বিশ্বাসের বন্ধন',
      arrowBg: 'bg-[#0A64C9] hover:bg-[#084e9c]',
      bottomBorder: 'border-b-[#0A64C9]',
    },
    {
      id: 'activities',
      title: 'কার্যক্রম',
      path: '/activities',
      icon: CalendarCheck,
      iconBg: 'bg-purple-100 text-[#6B21A8]',
      subtitleLine1: 'মানবতার কাজে',
      subtitleLine2: 'আমাদের অগ্রযাত্রা',
      arrowBg: 'bg-[#6B21A8] hover:bg-[#531883]',
      bottomBorder: 'border-b-[#6B21A8]',
    },
  ];

  const primaryCardsRow2 = [
    {
      id: 'policies',
      title: 'নীতিমালা',
      path: '/policies',
      icon: FileText,
      iconBg: 'bg-amber-100 text-[#D97706]',
      subtitleLine1: 'সুশাসন ও স্বচ্ছতায়',
      subtitleLine2: 'আমাদের অঙ্গীকার',
      arrowBg: 'bg-[#F59E0B] hover:bg-[#d97706]',
      bottomBorder: 'border-b-[#F59E0B]',
    },
    {
      id: 'about',
      title: 'আমাদের পরিচিতি',
      path: '/about',
      icon: Building2,
      iconBg: 'bg-teal-100 text-[#0D9488]',
      subtitleLine1: 'আমাদের লক্ষ্য, উদ্দেশ্য',
      subtitleLine2: 'ও কার্যক্রম সম্পর্কে জানুন',
      arrowBg: 'bg-[#0D9488] hover:bg-[#0b746a]',
      bottomBorder: 'border-b-[#0D9488]',
    },
    {
      id: 'blood-donors',
      title: 'রক্তদাতা',
      path: '/blood-donors',
      icon: Droplet,
      iconBg: 'bg-red-100 text-[#DC2626]',
      subtitleLine1: 'রক্ত দিন, জীবন বাঁচান',
      subtitleLine2: 'মানবতার পাশে থাকুন',
      arrowBg: 'bg-[#DC2626] hover:bg-[#b01e1e]',
      bottomBorder: 'border-b-[#DC2626]',
    },
  ];

  return (
    <div className="bg-[#F4F8FC] min-h-screen">
      {/* 1. HERO SECTION (Identical to reference mockup) */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#F0F7FF] via-[#E8F3FC] to-[#DEF0FD] border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-left">
              {/* Foundation Profile Emblem & Slogan */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white p-1 border border-slate-200/90 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={info?.profilePhotoUrl || info?.logoUrl || '/assets/images/foundation_logo.png'}
                    alt="কোদালপুর মানবিক ফাউন্ডেশন প্রোফাইল"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 text-[#078747] font-semibold text-xs sm:text-sm tracking-wide">
                    <span className="w-3.5 h-[2px] bg-[#078747]" />
                    <span>মানবতার টানে, সমাজের কল্যাণে</span>
                    <span className="w-3.5 h-[2px] bg-[#078747]" />
                  </div>
                  <div className="text-2xs text-slate-500 font-medium">একটা মানবিক ও সামাজিক সংস্থা</div>
                </div>
              </div>

              {/* Bold Dark Navy Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0B376B] tracking-tight leading-[1.2]">
                কোদালপুর মানবিক<br />
                <span className="text-[#0B376B]">ফাউন্ডেশন</span>
              </h1>

              {/* Description Paragraph */}
              <p className="text-slate-700 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl font-normal">
                {info?.introduction ||
                  'কোদালপুর মানবিক ফাউন্ডেশন একটি স্বেচ্ছাসেবী সামাজিক সংগঠন, যা মানবতার সেবায়, অসহায় মানুষের পাশে দাঁড়ানো এবং সমাজের সামগ্রিক কল্যাণে কাজ করে।'}
              </p>

              {/* WhatsApp Share & App Download Action */}
              <div className="pt-1 flex flex-wrap gap-2.5">
                <button
                  onClick={() => setShowAppModal(true)}
                  className="inline-flex items-center gap-2 bg-[#078747] hover:bg-[#056032] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>হোয়াটসঅ্যাপে অ্যাপ পাঠান</span>
                </button>
                <button
                  onClick={() => setShowAppModal(true)}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-[#0B376B] border border-slate-200/90 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#078747]" />
                  <span>মোবাইল অ্যাপ / APK</span>
                </button>
              </div>
            </div>

            {/* Right Visual Column: High-fidelity River & Sapling image */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-lg border-2 border-white/80 bg-white">
                <img
                  src="/assets/images/hero_plant_clean.png"
                  alt="মানবতার সেবায় চারা রোপণ ও নদীমাতৃক বাংলাদেশ"
                  className="w-full h-auto object-cover max-h-[340px] transform hover:scale-102 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SEVEN PRIMARY CARDS SECTION */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        {/* Desktop View: 4 in Row 1, 3 Centered in Row 2 */}
        <div className="hidden md:block space-y-6">
          {/* Row 1: 4 Cards */}
          <div className="grid grid-cols-4 gap-5">
            {primaryCardsRow1.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => onNavigate(card.path)}
                  className={`bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_-4px_rgba(11,55,107,0.08)] hover:shadow-[0_12px_28px_-6px_rgba(11,55,107,0.18)] hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col items-center text-center cursor-pointer group border-b-[4px] ${card.bottomBorder}`}
                >
                  {/* Top Pastel Circle Icon */}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${card.iconBg}`}
                  >
                    <Icon className="w-8 h-8 stroke-[2]" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-[#0B376B] mb-2">
                    {card.title}
                  </h3>

                  {/* 2-line Subtitle */}
                  <div className="text-xs text-slate-500 leading-snug mb-5 min-h-[32px] flex flex-col justify-center">
                    <span>{card.subtitleLine1}</span>
                    <span>{card.subtitleLine2}</span>
                  </div>

                  {/* Circular Arrow Button */}
                  <div
                    className={`mt-auto w-9 h-9 rounded-full flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 shadow-xs ${card.arrowBg}`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Row 2: 3 Cards Centered */}
          <div className="flex justify-center gap-5">
            {primaryCardsRow2.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => onNavigate(card.path)}
                  className={`w-[calc(25%-15px)] bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_-4px_rgba(11,55,107,0.08)] hover:shadow-[0_12px_28px_-6px_rgba(11,55,107,0.18)] hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col items-center text-center cursor-pointer group border-b-[4px] ${card.bottomBorder}`}
                >
                  {/* Top Pastel Circle Icon */}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${card.iconBg}`}
                  >
                    <Icon className="w-8 h-8 stroke-[2]" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-[#0B376B] mb-2">
                    {card.title}
                  </h3>

                  {/* 2-line Subtitle */}
                  <div className="text-xs text-slate-500 leading-snug mb-5 min-h-[32px] flex flex-col justify-center">
                    <span>{card.subtitleLine1}</span>
                    <span>{card.subtitleLine2}</span>
                  </div>

                  {/* Circular Arrow Button */}
                  <div
                    className={`mt-auto w-9 h-9 rounded-full flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 shadow-xs ${card.arrowBg}`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile / Tablet View: 2 per row for comfortable tap targets */}
        <div className="md:hidden grid grid-cols-2 gap-3.5 sm:gap-4">
          {[...primaryCardsRow1, ...primaryCardsRow2].map((card, idx) => {
            const Icon = card.icon;
            const isLastOdd = idx === 6; // Blood donor card can span or stay centered

            return (
              <div
                key={card.id}
                onClick={() => onNavigate(card.path)}
                className={`bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_-4px_rgba(11,55,107,0.08)] active:scale-98 transition-all duration-200 p-4 sm:p-5 flex flex-col items-center text-center cursor-pointer group border-b-[3px] ${card.bottomBorder} ${
                  isLastOdd ? 'col-span-2 sm:col-span-1 max-w-xs mx-auto w-full' : ''
                }`}
              >
                <div
                  className={`w-13 h-13 rounded-full flex items-center justify-center mb-3 ${card.iconBg}`}
                >
                  <Icon className="w-6 h-6 stroke-[2]" />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#0B376B] mb-1">
                  {card.title}
                </h3>

                <div className="text-[11px] sm:text-xs text-slate-500 leading-snug mb-3">
                  <span>{card.subtitleLine1}</span>
                  <br />
                  <span>{card.subtitleLine2}</span>
                </div>

                <div
                  className={`mt-auto w-8 h-8 rounded-full flex items-center justify-center text-white shadow-xs ${card.arrowBg}`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. "আমাদের লক্ষ্য" SECTION (Exact match to reference mockup) */}
      <section className="pb-16 sm:pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-10 md:p-12 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Mission Description & Green Highlight Button */}
            <div className="lg:col-span-6 space-y-5 text-left">
              {/* Kicker */}
              <div className="inline-flex items-center gap-2 text-[#078747] font-semibold text-sm sm:text-base">
                <span className="w-6 h-[2px] bg-[#078747]" />
                <span>আমাদের লক্ষ্য</span>
              </div>

              {/* Bold Dark Navy Heading */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0B376B] tracking-tight leading-tight">
                মানবতার সেবায়<br />
                সবার পাশে
              </h2>

              {/* Paragraph */}
              <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                কোদালপুর মানবিক ফাউন্ডেশন সমাজের অসহায়, দুঃস্থ ও প্রান্তিক মানুষের পাশে দাঁড়াতে প্রতিশ্রুতিবদ্ধ। আমরা শিক্ষা সহায়তা, শীতবস্ত্র বিতরণ, রক্তদাতা ব্যবস্থাপনা এবং অন্যান্য মানবিক কার্যক্রমের মাধ্যমে সমাজের কল্যাণে কাজ করে যাচ্ছি।
              </p>

              {/* Green Action Badge/Pill */}
              <div className="pt-2">
                <button
                  onClick={() => onNavigate('/about')}
                  className="inline-flex items-center gap-3 bg-[#078747] hover:bg-[#056032] text-white px-5 py-2.5 rounded-full font-semibold text-sm sm:text-base shadow-sm transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-700/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span>একসাথে গড়বো মানবিক সমাজ</span>
                </button>
              </div>
            </div>

            {/* Right Column: River with Wooden Boat and Painted Corner Badge */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-100 w-full max-w-lg">
                <img
                  src="/assets/images/mission_boat.png"
                  alt="নদীমাতৃক বাংলাদেশ এবং মানবতার টানে সমাজের কল্যাণে"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Download & WhatsApp Sharing Modal */}
      <AppDownloadModal
        isOpen={showAppModal}
        onClose={() => setShowAppModal(false)}
      />
    </div>
  );
};
