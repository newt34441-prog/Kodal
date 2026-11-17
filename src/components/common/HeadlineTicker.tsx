import React, { useMemo } from 'react';
import { Megaphone } from 'lucide-react';
import { Headline } from '../../types';

interface HeadlineTickerProps {
  headlines: Headline[];
  onNavigate?: (path: string) => void;
  className?: string;
}

const DEFAULT_HEADLINES: Headline[] = [
  {
    id: 'default-1',
    title: 'কোদালপুর মানবিক ফাউন্ডেশনে আপনাকে স্বাগতম — মানবতার টানে, সমাজের কল্যাণে আমাদের সাথে যুক্ত হোন।',
    badge: 'স্বাগতম',
    isPublished: true,
    orderNumber: 1,
  },
  {
    id: 'default-2',
    title: 'অসহায় ও দুস্থ মানুষের সহায়তায় অনলাইন অনুদান প্রদান করতে অনুদান পেজ ভিজিট করুন।',
    badge: 'অনুদান',
    linkPath: '/donations',
    isPublished: true,
    orderNumber: 2,
  },
  {
    id: 'default-3',
    title: 'জরুরি রক্তের প্রয়োজনে কোদালপুর ব্লাড ব্যাংক ও স্বেচ্ছাসেবী রক্তদাতা কর্নারে যোগাযোগ করুন।',
    badge: 'রক্তদান',
    linkPath: '/blood-donors',
    isPublished: true,
    orderNumber: 3,
  },
];

export const HeadlineTicker: React.FC<HeadlineTickerProps> = ({
  headlines,
  onNavigate,
  className = '',
}) => {
  const activeHeadlines = useMemo(() => {
    const published = headlines.filter((h) => h.isPublished);
    return published.length > 0 ? published : DEFAULT_HEADLINES;
  }, [headlines]);

  // Repeat items within each half if the total text is short so the marquee stays continuous on wide screens
  const { repeatedItems, durationSeconds } = useMemo(() => {
    const totalChars = activeHeadlines.reduce(
      (sum, item) => sum + item.title.length + (item.badge ? item.badge.length : 0) + 14,
      0
    );
    const repeatCount = Math.max(1, Math.min(6, Math.ceil(160 / Math.max(1, totalChars))));
    const items: Headline[] = [];
    for (let i = 0; i < repeatCount; i++) {
      items.push(...activeHeadlines);
    }
    const effectiveChars = totalChars * repeatCount;
    const duration = Math.max(20, Math.min(75, Math.round(effectiveChars * 0.24)));
    return { repeatedItems: items, durationSeconds: duration };
  }, [activeHeadlines]);

  const renderTrackItems = (keyPrefix: string) =>
    repeatedItems.map((item, idx) => {
      const isClickable = Boolean(item.linkPath && onNavigate);
      return (
        <span
          key={`${keyPrefix}-${item.id}-${idx}`}
          className="inline-flex items-center shrink-0"
        >
          {item.badge && (
            <span className="inline-flex items-center px-1.5 py-0.5 mr-2 rounded bg-[#DC2626] border border-white/25 text-white text-[10px] sm:text-[11px] font-bold leading-none shadow-2xs">
              {item.badge}
            </span>
          )}
          {isClickable ? (
            <button
              type="button"
              onClick={() => item.linkPath && onNavigate?.(item.linkPath)}
              className="text-xs sm:text-sm font-semibold text-white hover:text-emerald-100 hover:underline underline-offset-2 whitespace-nowrap cursor-pointer transition-colors"
            >
              {item.title}
            </button>
          ) : (
            <span className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap">
              {item.title}
            </span>
          )}
          <span
            aria-hidden="true"
            className="mx-4 sm:mx-6 inline-flex items-center justify-center w-2 h-2 rounded-full bg-[#DC2626] ring-2 ring-white/75 shrink-0"
          />
        </span>
      );
    });

  return (
    <section
      aria-label="গুরুত্বপূর্ণ শিরোনাম ও ঘোষণা"
      className={`w-full bg-gradient-to-r from-[#078747] via-[#06743d] to-[#056032] text-white border-b border-[#044d28]/50 shadow-xs overflow-hidden ${className}`}
    >
      <div className="max-w-6xl mx-auto sm:px-6 flex items-stretch h-9 sm:h-10">
        {/* Left Fixed Brand Label: শিরোনাম */}
        <div className="shrink-0 z-10 relative flex items-center bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#DC2626] text-white px-3 sm:px-4 border-r-2 border-white/30 shadow-[4px_0_12px_rgba(0,0,0,0.2)]">
          <span className="relative flex h-2 w-2 mr-1.5 sm:mr-2 shrink-0" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 shrink-0 text-white" />
          <span className="text-xs sm:text-sm font-extrabold tracking-wide whitespace-nowrap">
            শিরোনাম
          </span>
        </div>

        {/* Right Scrolling Marquee Track (Right to Left) */}
        <div
          className="flex-1 min-w-0 overflow-hidden relative flex items-center kmf-ticker-container"
          style={{ '--ticker-duration': `${durationSeconds}s` } as React.CSSProperties}
        >
          {/* Subtle left & right fade edges */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 sm:w-6 bg-gradient-to-r from-[#078747] to-transparent z-10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 sm:w-6 bg-gradient-to-l from-[#056032] to-transparent z-10"
          />

          <div className="kmf-ticker-track items-center">
            <div className="flex items-center shrink-0 min-w-full">
              {renderTrackItems('track-a')}
            </div>
            <div className="flex items-center shrink-0 min-w-full" aria-hidden="true">
              {renderTrackItems('track-b')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
