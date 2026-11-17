import React, { useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  Image as ImageIcon,
  Link as LinkIcon,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User,
  X,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { handleFirestoreError, OperationType } from '../../firebase/errorHandler';
import { SiteAsset } from '../../types';
import { formatBengaliDate, toBengaliNumber } from '../../utils/formatters';

export const DEFAULT_HERO_BANNER_SRC = '/assets/images/hero_plant_clean.png';
const DEFAULT_HERO_ALT = 'মানবতার সেবায় চারা রোপণ ও নদীমাতৃক বাংলাদেশ';

interface HeroBannerManagerProps {
  currentBanner: SiteAsset | null;
  isSuperAdmin: boolean;
  adminEmail?: string | null;
  onSuccess?: (newBanner: SiteAsset) => void;
}

const VALID_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const VALID_EXT_REGEX = /\.(jpe?g|png|webp)$/i;

export const HeroBannerManager: React.FC<HeroBannerManagerProps> = ({
  currentBanner,
  isSuperAdmin,
  adminEmail,
  onSuccess,
}) => {
  const rawActiveUrl = currentBanner?.imageUrl?.trim();
  const activeBannerUrl = rawActiveUrl
    ? rawActiveUrl.startsWith('http') && currentBanner?.updatedAt
      ? `${rawActiveUrl}${rawActiveUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(currentBanner.updatedAt)}`
      : rawActiveUrl
    : DEFAULT_HERO_BANNER_SRC;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [externalUrlInput, setExternalUrlInput] = useState<string>('');
  const [showUrlMode, setShowUrlMode] = useState<boolean>(false);
  const [fileDetails, setFileDetails] = useState<{
    name: string;
    sizeKb: number;
    type: string;
    dimensions?: string;
  } | null>(null);

  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 shadow-xs p-6 sm:p-8 text-center max-w-xl mx-auto space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">সুপার অ্যাডমিন অনুমতি সংরক্ষিত</h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          হোমপেজের বড় ব্যানার ছবি পরিবর্তন করার অনুমতি শুধুমাত্র <strong>Super Admin</strong>-এর কাছে সংরক্ষিত। সাধারণ অ্যাডমিন বা সদস্যরা এই ছবি পরিবর্তন করতে পারবেন না।
        </p>
      </div>
    );
  }

  // Compress & optimize uploaded banner for crisp 16:9 display (fits safely under Firestore 950KB field limit)
  const optimizeBannerImage = (file: File): Promise<{ dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 960;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('ছবি প্রসেস করার ক্যানভাস তৈরি করা যায়নি।'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Iteratively choose high quality while keeping size well within 780KB
          const qualities = [0.9, 0.84, 0.78, 0.72];
          let chosen = '';
          for (const q of qualities) {
            let candidate = canvas.toDataURL('image/webp', q);
            if (!candidate.startsWith('data:image/webp')) {
              candidate = canvas.toDataURL('image/jpeg', q);
            }
            chosen = candidate;
            if (candidate.length <= 780000) {
              break;
            }
          }

          // Final downscale fallback if an ultra-detailed photo is still over 880KB
          if (chosen.length > 880000) {
            const scale = 0.75;
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            chosen = canvas.toDataURL('image/jpeg', 0.78);
          }

          resolve({ dataUrl: chosen, width: canvas.width, height: canvas.height });
        };
        img.onerror = () => reject(new Error('নির্বাচিত ছবিটি পড়া যায়নি।'));
        img.src = readerEvent.target?.result as string;
      };
      reader.onerror = () => reject(new Error('ফাইল রিড করতে সমস্যা হয়েছে।'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const isValidType =
      VALID_MIME_TYPES.includes(file.type.toLowerCase()) ||
      (!file.type && VALID_EXT_REGEX.test(file.name)) ||
      VALID_EXT_REGEX.test(file.name);

    if (!isValidType) {
      setStatusMessage({
        type: 'error',
        text: 'অনুগ্রহ করে শুধুমাত্র JPG, JPEG, PNG অথবা WebP ফরম্যাটের ছবি নির্বাচন করুন।',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage({
        type: 'error',
        text: 'ছবির আকার ১০ মেগাবাইট (10MB)-এর কম হতে হবে।',
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      setFileDetails({
        name: file.name || 'camera-photo.jpg',
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
        type: (file.type ? file.type.replace('image/', '') : 'IMAGE').toUpperCase(),
        dimensions: `${probe.naturalWidth}×${probe.naturalHeight}`,
      });
    };
    probe.src = objectUrl;

    setShowUrlMode(false);
    setExternalUrlInput('');
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setExternalUrlInput('');
    setShowUrlMode(false);
    setFileDetails(null);
    setStatusMessage(null);
    setProgress(0);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const clearCachedBannerCopies = async (previousUrl?: string) => {
    try {
      localStorage.removeItem('kmf_cached_hero_banner');
    } catch {
      // ignore storage errors
    }
    if (typeof window !== 'undefined' && 'caches' in window && previousUrl?.startsWith('http')) {
      try {
        const keys = await caches.keys();
        for (const k of keys) {
          const cache = await caches.open(k);
          await cache.delete(previousUrl);
        }
      } catch {
        // ignore cache purge errors
      }
    }
  };

  const handleSaveBanner = async () => {
    const trimmedExternalUrl = externalUrlInput.trim();
    if (!selectedFile && !trimmedExternalUrl) {
      setStatusMessage({
        type: 'error',
        text: 'অনুগ্রহ করে প্রথমে গ্যালারি/ক্যামেরা থেকে ছবি নির্বাচন করুন অথবা ছবির লিংক দিন।',
      });
      return;
    }

    if (!selectedFile && trimmedExternalUrl && !/^https:\/\/.+/i.test(trimmedExternalUrl)) {
      setStatusMessage({
        type: 'error',
        text: 'বিকল্প URL হিসেবে শুধুমাত্র নিরাপদ HTTPS (https://...) ইমেজ লিংক ব্যবহার করুন।',
      });
      return;
    }

    setUploading(true);
    setProgress(20);
    setStatusMessage(null);

    try {
      let finalUrl = trimmedExternalUrl;
      if (selectedFile) {
        setProgress(45);
        const optimized = await optimizeBannerImage(selectedFile);
        finalUrl = optimized.dataUrl;
      }

      if (finalUrl.length > 940000) {
        throw new Error('ছবির ফাইল সাইজ সীমার চেয়ে বড় হয়ে গেছে। অনুগ্রহ করে অন্য একটি ছবি চেষ্টা করুন।');
      }

      setProgress(75);
      const nowIso = new Date().toISOString();
      const payload: SiteAsset = {
        imageUrl: finalUrl,
        altText: DEFAULT_HERO_ALT,
        updatedAt: nowIso,
        updatedBy: adminEmail || 'Super Admin',
        isDefault: false,
      };

      await setDoc(doc(db, 'siteAssets', 'heroBanner'), payload);
      await clearCachedBannerCopies(currentBanner?.imageUrl);

      try {
        localStorage.setItem('kmf_cached_hero_banner', JSON.stringify(payload));
      } catch {
        // ignore localStorage quota overflow
      }

      setProgress(100);
      setStatusMessage({
        type: 'success',
        text: 'হোমপেজের বড় ব্যানার ছবি সফলভাবে সংরক্ষণ ও পরিবর্তন করা হয়েছে! সব ব্যবহারকারীর হোমপেজে তাৎক্ষণিকভাবে নতুন ছবিটি প্রদর্শিত হচ্ছে।',
      });

      if (onSuccess) {
        onSuccess(payload);
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      setExternalUrlInput('');
      setShowUrlMode(false);
      setFileDetails(null);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    } catch (err: unknown) {
      const msg = handleFirestoreError(err, OperationType.WRITE, 'siteAssets/heroBanner');
      setStatusMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleResetDefault = async () => {
    if (!window.confirm('আপনি কি নিশ্চিতভাবে হোমপেজের বড় ছবিটি ডিফল্ট ছবিতে ফিরিয়ে নিতে চান?')) {
      return;
    }

    setUploading(true);
    setProgress(50);
    setStatusMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const payload: SiteAsset = {
        imageUrl: DEFAULT_HERO_BANNER_SRC,
        altText: DEFAULT_HERO_ALT,
        updatedAt: nowIso,
        updatedBy: adminEmail || 'Super Admin',
        isDefault: true,
      };

      await setDoc(doc(db, 'siteAssets', 'heroBanner'), payload);
      await clearCachedBannerCopies(currentBanner?.imageUrl);

      setProgress(100);
      setStatusMessage({
        type: 'success',
        text: 'হোমপেজের বড় ছবিটি সফলভাবে ডিফল্ট ছবিতে ফিরিয়ে নেওয়া হয়েছে।',
      });
      if (onSuccess) onSuccess(payload);
    } catch (err: unknown) {
      const msg = handleFirestoreError(err, OperationType.WRITE, 'siteAssets/heroBanner');
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setUploading(false);
    }
  };

  const effectivePreview = previewUrl || (showUrlMode && externalUrlInput.trim() ? externalUrlInput.trim() : null);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-[#078747] flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </span>
            হোমপেজের বড় ছবি পরিবর্তন
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            হোমপেজের হিরো/ব্যানার ছবি পরিবর্তন করুন। সেভ করার সাথে সাথেই সকল ব্যবহারকারীর মোবাইল অ্যাপ ও ওয়েবসাইটে লাইভ আপডেট হয়ে যাবে।
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-[#0B376B] border border-blue-200 text-xs font-bold shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-[#078747]" />
          <span>শুধুমাত্র Super Admin অনুমোদিত</span>
        </div>
      </div>

      {/* Feedback alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-start gap-3 animate-in fade-in duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">
              {statusMessage.type === 'success' ? 'সফল হয়েছে!' : 'ত্রুটি হয়েছে'}
            </p>
            <p className="mt-0.5">{statusMessage.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dual 16:9 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Current Active Hero Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                বর্তমান হোমপেজ বড় ছবি (১৬:৯)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[#078747] border border-emerald-200 text-2xs font-semibold">
                <Check className="w-3 h-3" />
                {currentBanner && !currentBanner.isDefault ? 'কাস্টম ব্যানার লাইভ' : 'ডিফল্ট ব্যানার'}
              </span>
            </div>

            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-white border-2 border-white shadow-md">
              <img
                src={activeBannerUrl}
                alt={currentBanner?.altText || DEFAULT_HERO_ALT}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== window.location.origin + DEFAULT_HERO_BANNER_SRC) {
                    target.src = DEFAULT_HERO_BANNER_SRC;
                  }
                }}
              />
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              {currentBanner?.updatedAt && (
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>সর্বশেষ পরিবর্তন: {formatBengaliDate(currentBanner.updatedAt)}</span>
                </p>
              )}
              {currentBanner?.updatedBy && (
                <p className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>পরিবর্তনকারী: {currentBanner.updatedBy}</span>
                </p>
              )}
            </div>
          </div>

          {currentBanner && !currentBanner.isDefault && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleResetDefault}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ডিফল্ট ছবিতে ফিরে যান</span>
            </button>
          )}
        </div>

        {/* Card 2: Select, Preview & Upload New Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                নতুন ছবি নির্বাচন ও প্রিভিউ (১৬:৯)
              </span>
              {effectivePreview && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-2xs font-semibold">
                  প্রিভিউ প্রস্তুত
                </span>
              )}
            </div>

            {/* Hidden File Inputs: Gallery & Camera */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {effectivePreview ? (
              <div className="space-y-3">
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-white border-2 border-[#0B376B] shadow-md">
                  <img
                    src={effectivePreview}
                    alt="নতুন হোমপেজ ব্যানার প্রিভিউ"
                    className="w-full h-full object-cover object-center"
                  />
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 cursor-pointer"
                    title="বাতিল করুন"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {fileDetails && (
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
                    <FileCheck className="w-3.5 h-3.5 text-[#0B376B] shrink-0" />
                    <span className="font-medium truncate max-w-[140px]">{fileDetails.name}</span>
                    <span className="text-slate-300">|</span>
                    <span className="font-semibold text-slate-700">
                      {toBengaliNumber(fileDetails.sizeKb)} KB
                    </span>
                    {fileDetails.dimensions && (
                      <>
                        <span className="text-slate-300">|</span>
                        <span className="font-mono text-2xs text-slate-500">
                          {fileDetails.dimensions}
                        </span>
                      </>
                    )}
                    <span className="ml-auto text-2xs uppercase px-1.5 py-0.5 rounded bg-slate-100 font-bold">
                      {fileDetails.type}
                    </span>
                  </div>
                )}
              </div>
            ) : showUrlMode ? (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-700">
                  অনলাইন ছবির সরাসরি HTTPS লিংক দিন (যেমন Supabase / CDN URL)
                </label>
                <input
                  type="url"
                  value={externalUrlInput}
                  onChange={(e) => setExternalUrlInput(e.target.value)}
                  placeholder="https://example.com/banner-image.webp"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#078747]/30 focus:border-[#078747]"
                />
                <p className="text-[11px] text-slate-500">
                  ১৬:৯ অনুপাতের ছবি হলে মোবাইল ও কম্পিউটারে সবচেয়ে সুন্দর দেখাবে।
                </p>
              </div>
            ) : (
              <div
                onClick={() => galleryInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#0B376B] bg-white hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center text-center cursor-pointer group aspect-video"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0B376B] group-hover:scale-110 transition-transform flex items-center justify-center mb-2.5">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">নতুন ব্যানার ছবি নির্বাচন করুন</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  গ্যালারি বা ক্যামেরা থেকে ছবি নিতে নিচের বাটন অথবা এখানে ক্লিক করুন।
                </p>
                <span className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-2xs font-semibold">
                  JPG, JPEG, PNG, WebP (সর্বোচ্চ ১০MB)
                </span>
              </div>
            )}

            {/* Quick Pick Buttons: Gallery, Camera, Optional URL */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => galleryInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 text-[#0B376B] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>গ্যালারি থেকে নিন</span>
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={() => cameraInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 text-[#078747] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ক্যামেরা দিয়ে তুলুন</span>
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setFileDetails(null);
                  setShowUrlMode((prev) => !prev);
                }}
                className="col-span-2 sm:col-span-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{showUrlMode ? 'ফাইল আপলোড' : 'ছবির URL দিন'}</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>ছবি অপ্টিমাইজ ও ডাটাবেজে সংরক্ষণ হচ্ছে...</span>
                <span>{toBengaliNumber(progress)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0B376B] to-[#078747] transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Save / Change / Cancel Buttons */}
          <div className="pt-3 border-t border-slate-200/80 flex items-center gap-2.5">
            <button
              type="button"
              disabled={(!selectedFile && !externalUrlInput.trim()) || uploading}
              onClick={handleSaveBanner}
              className="flex-1 py-3 px-4 rounded-xl bg-[#078747] hover:bg-[#056032] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>ছবি সংরক্ষণ ও পরিবর্তন করুন</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={uploading || (!selectedFile && !externalUrlInput.trim() && !showUrlMode)}
              onClick={handleCancel}
              className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>বাতিল</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-[#0B376B] shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950/85 space-y-1 leading-relaxed">
          <p className="font-bold text-[#0B376B]">নিরাপত্তা ও লাইভ ক্যাশ রিফ্রেশ:</p>
          <p>
            এই ছবিটি সরাসরি অনলাইন ক্লাউড ডাটাবেজে সংরক্ষিত থাকে, ফলে প্রতিবার GitHub-এ কোড বা ছবি Commit করতে হয় না। শুধুমাত্র Super Admin-এর অনুমোদিত অ্যাকাউন্ট থেকেই পরিবর্তন করা সম্ভব এবং পরিবর্তন করার সাথে সাথেই ইনস্টল করা PWA অ্যাপ ও ব্রাউজারে নতুন ছবিটি আপডেট হয়।
          </p>
        </div>
      </div>
    </div>
  );
};
