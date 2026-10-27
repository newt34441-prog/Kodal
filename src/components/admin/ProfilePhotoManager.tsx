import React, { useState, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  Check,
  ShieldCheck,
  FileCheck,
  Clock,
  User,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { handleFirestoreError, OperationType } from '../../firebase/errorHandler';
import { FoundationInfo } from '../../types';
import { toBengaliNumber, formatBengaliDate } from '../../utils/formatters';

interface ProfilePhotoManagerProps {
  currentInfo: FoundationInfo | null;
  adminEmail?: string | null;
  onSuccess?: (newPhotoUrl: string) => void;
}

export const ProfilePhotoManager: React.FC<ProfilePhotoManagerProps> = ({
  currentInfo,
  adminEmail,
  onSuccess,
}) => {
  const currentPhoto =
    currentInfo?.profilePhotoUrl || currentInfo?.logoUrl || '/assets/images/foundation_logo.png';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{
    name: string;
    sizeKb: number;
    type: string;
  } | null>(null);

  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress image to high-fidelity WebP/JPEG data URL (< 400KB)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context could not be created'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          // Try webp first, fallback to jpeg
          let dataUrl = canvas.toDataURL('image/webp', 0.88);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          }
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
        img.src = readerEvent.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Handle file selection from mobile gallery or PC
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setStatusMessage({
        type: 'error',
        text: 'শুধুমাত্র JPG, PNG বা WebP ফরম্যাটের ছবি নির্বাচন করুন।',
      });
      return;
    }

    // Validate file size (max 5MB raw, will be optimized)
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({
        type: 'error',
        text: 'ছবির আকার ৫ মেগাবাইট (5MB)-এর কম হতে হবে।',
      });
      return;
    }

    setSelectedFile(file);
    setFileDetails({
      name: file.name,
      sizeKb: Math.round(file.size / 1024),
      type: file.type.replace('image/', '').toUpperCase(),
    });

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Cancel selection
  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileDetails(null);
    setStatusMessage(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Perform upload to Firebase Firestore
  const handleUpload = async () => {
    if (!selectedFile) {
      setStatusMessage({
        type: 'error',
        text: 'অনুগ্রহ করে প্রথমে একটি নতুন ছবি নির্বাচন করুন।',
      });
      return;
    }

    setUploading(true);
    setProgress(15);
    setStatusMessage(null);

    try {
      // Step 1: Compress & Optimize
      setProgress(35);
      const optimizedDataUrl = await compressImage(selectedFile);
      setProgress(65);

      // Step 2: Fetch existing foundation info to preserve all existing fields
      const docRef = doc(db, 'foundationInfo', 'main');
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists()
        ? docSnap.data()
        : {
            name: 'কোদালপুর মানবিক ফাউন্ডেশন',
            address: 'কোদালপুর, বাংলাদেশ',
            establishedDate: '২০২৪',
          };

      const nowIso = new Date().toISOString();
      const updatedPayload: FoundationInfo = {
        name: existingData.name || 'কোদালপুর মানবিক ফাউন্ডেশন',
        address: existingData.address || 'কোদালপুর, বাংলাদেশ',
        establishedDate: existingData.establishedDate || '২০২৪',
        motto: existingData.motto || 'মানবতার টানে, সমাজের কল্যাণে',
        introduction: existingData.introduction || '',
        mission: existingData.mission || '',
        vision: existingData.vision || '',
        futurePlans: existingData.futurePlans || '',
        logoUrl: optimizedDataUrl,
        profilePhotoUrl: optimizedDataUrl,
        photoUpdatedAt: nowIso,
        photoUpdatedBy: adminEmail || 'Admin',
        contactEmail: existingData.contactEmail || '',
        contactPhone: existingData.contactPhone || '',
        updatedAt: nowIso,
      };

      setProgress(85);
      await setDoc(docRef, updatedPayload, { merge: true });

      // Cache locally for instant offline/PWA speed
      try {
        localStorage.setItem('kmf_cached_profile_photo', optimizedDataUrl);
      } catch {
        // quota exceeded fallback
      }

      setProgress(100);
      setStatusMessage({
        type: 'success',
        text: 'প্রোফাইল ছবি সফলভাবে পরিবর্তন ও আপডেট করা হয়েছে! পুরো অ্যাপে নতুন ছবিটি তাৎক্ষণিকভাবে কার্যকর হয়েছে।',
      });

      if (onSuccess) {
        onSuccess(optimizedDataUrl);
      }

      // Reset selection state but keep success message
      setSelectedFile(null);
      setPreviewUrl(null);
      setFileDetails(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      console.error('Error uploading profile photo:', err);
      handleFirestoreError(err, OperationType.WRITE, 'foundationInfo/main');
      const errText = err instanceof Error ? err.message : 'ছবি আপলোড করতে সমস্যা হয়েছে।';
      setStatusMessage({
        type: 'error',
        text: `ছবি পরিবর্তন ব্যর্থ হয়েছে: ${errText}`,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-6">
      {/* Top Banner & Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-950 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </span>
            প্রোফাইল ছবি পরিবর্তন
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ফাউন্ডেশনের অফিসিয়াল প্রোফাইল ছবি ও লোগো পরিবর্তন করুন। পরিবর্তিত ছবিটি হোম পেজ, হেডার,
            প্রোফাইল সেকশন এবং অ্যাডমিন প্যানেল সহ সমগ্র অ্যাপ্লিকেশনে তাৎক্ষণিকভাবে স্বয়ংক্রিয়ভাবে
            আপডেট হবে।
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>অ্যাডমিন নিরাপদ এক্সেস</span>
        </div>
      </div>

      {/* Status Messages */}
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
            onClick={() => setStatusMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Dual Cards: Current Photo vs New Photo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Currently Used Profile Photo */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col items-center text-center">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              বর্তমান প্রোফাইল ছবি
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 text-2xs font-semibold">
              <Check className="w-3 h-3 text-blue-700" />
              লাইভ কার্যকর
            </span>
          </div>

          <div className="relative group my-2">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white border-2 border-slate-200 shadow-md p-2 flex items-center justify-center overflow-hidden">
              <img
                src={currentPhoto}
                alt="বর্তমান প্রোফাইল ছবি"
                className="w-full h-full object-contain rounded-2xl"
              />
            </div>
          </div>

          <div className="mt-4 space-y-1 text-xs text-slate-500">
            <p className="font-bold text-slate-800 text-sm">
              {currentInfo?.name || 'কোদালপুর মানবিক ফাউন্ডেশন'}
            </p>
            {currentInfo?.photoUpdatedAt && (
              <p className="flex items-center justify-center gap-1 text-slate-400">
                <Clock className="w-3 h-3" />
                সর্বশেষ আপডেট: {formatBengaliDate(currentInfo.photoUpdatedAt)}
              </p>
            )}
            {currentInfo?.photoUpdatedBy && (
              <p className="flex items-center justify-center gap-1 text-slate-400">
                <User className="w-3 h-3" />
                পরিবর্তনকারী: {currentInfo.photoUpdatedBy}
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Select & Preview New Photo */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                নতুন ছবি নির্বাচন ও প্রিভিউ
              </span>
              {selectedFile && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-2xs font-semibold">
                  অনুমোদনের অপেক্ষায়
                </span>
              )}
            </div>

            {/* Hidden Input for Mobile Gallery & Desktop */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
            />

            {previewUrl ? (
              <div className="flex flex-col items-center text-center">
                <div className="relative group my-2">
                  <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white border-2 border-blue-900 shadow-lg p-2 flex items-center justify-center overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="নতুন নির্বাচিত ছবি"
                      className="w-full h-full object-contain rounded-2xl animate-in zoom-in-95 duration-200"
                    />
                  </div>
                  <button
                    onClick={handleCancel}
                    className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 cursor-pointer"
                    title="ছবি বাতিল করুন"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {fileDetails && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
                    <FileCheck className="w-3.5 h-3.5 text-blue-900" />
                    <span className="font-medium truncate max-w-[150px]">{fileDetails.name}</span>
                    <span className="text-slate-400">|</span>
                    <span className="font-semibold text-slate-700">
                      {toBengaliNumber(fileDetails.sizeKb)} KB
                    </span>
                    <span className="text-2xs uppercase px-1.5 py-0.5 rounded bg-slate-100 font-bold">
                      {fileDetails.type}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="my-3 p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-900 bg-white hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-900 group-hover:scale-110 group-hover:bg-blue-100 transition-all flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-950">
                  নতুন ছবি নির্বাচন করুন
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  মোবাইল গ্যালারি বা কম্পিউটার ফাইল ম্যানেজার থেকে ছবি নির্বাচন করতে এখানে ট্যাপ
                  করুন।
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-2xs font-semibold">
                  <ImageIcon className="w-3 h-3 text-slate-400" />
                  JPG, PNG, WebP (সর্বোচ্চ 5MB)
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar during upload */}
          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>আপলোড ও সার্ভার সংরক্ষণ অগ্রগতি...</span>
                <span>{toBengaliNumber(progress)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-950 to-emerald-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <button
              type="button"
              disabled={!selectedFile || uploading}
              onClick={handleUpload}
              className="flex-1 py-3 px-4 rounded-xl bg-[#0B376B] hover:bg-[#072447] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>ছবি আপলোড হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>ছবি পরিবর্তন করুন</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                if (selectedFile) {
                  handleCancel();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {selectedFile ? (
                <>
                  <X className="w-4 h-4" />
                  <span>বাতিল</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>গ্যালারি থেকে নিন</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Helpful Guidelines Card */}
      <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950/80 space-y-1">
          <p className="font-bold text-blue-950">স্বয়ংক্রিয় সিঙ্ক ও ক্যাশ ব্যবস্থাপনা:</p>
          <p>
            নতুন ছবি আপলোড করার পর ক্লাউড ফায়ারস্টোর রিয়েল-টাইম লিসেনারের মাধ্যমে সব ব্যবহারকারীর
            মোবাইল অ্যাপ, ওয়েবসাইট এবং অ্যাডমিন প্যানেলে তাৎক্ষণিকভাবে নতুন ছবিটি লোড হবে। ছবির স্পষ্টতা
            বজায় রাখতে বর্গাকার (Square) লোগো বা প্রতিকৃতি ব্যবহার করার পরামর্শ দেওয়া হচ্ছে।
          </p>
        </div>
      </div>
    </div>
  );
};
