import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { ArrowLeft, Building2, Calendar, MapPin, Target, Compass, Sparkles, UserCheck } from 'lucide-react';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Advisor, Executive, FoundationInfo } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface AboutPageProps {
  onNavigate: (path: string) => void;
  info?: FoundationInfo | null;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate, info }) => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load Advisors
    const unsubAdvisors = onSnapshot(
      collection(db, 'advisors'),
      (snapshot) => {
        const docs: Advisor[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...(docSnap.data() as Omit<Advisor, 'id'>) });
        });
        docs.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
        setAdvisors(docs);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'advisors')
    );

    // Load Executives
    const unsubExecutives = onSnapshot(
      collection(db, 'executives'),
      (snapshot) => {
        const docs: Executive[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...(docSnap.data() as Omit<Executive, 'id'>) });
        });
        docs.sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
        setExecutives(docs);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'executives');
      }
    );

    return () => {
      unsubAdvisors();
      unsubExecutives();
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page Title & Back */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-950 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>প্রধান পাতা</span>
          </button>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950">আমাদের পরিচিতি</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            কোদালপুর মানবিক ফাউন্ডেশন পরিচিতি, লক্ষ্য ও পরিচালনা পরিষদ
          </p>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6">
          <img
            src={info?.profilePhotoUrl || info?.logoUrl || '/assets/images/foundation_logo.png'}
            alt="কোদালপুর মানবিক ফাউন্ডেশন লোগো"
            className="w-20 h-20 rounded-2xl object-contain border border-slate-200 p-1 bg-white shrink-0 shadow-xs"
          />

          <div className="text-center sm:text-left">
            <h3 className="text-2xl font-bold text-blue-950">
              {info?.name || 'কোদালপুর মানবিক ফাউন্ডেশন'}
            </h3>
            {info?.motto && (
              <p className="text-emerald-700 font-semibold text-sm mt-0.5">
                "{info.motto}"
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-600 justify-center sm:justify-start">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>{info?.address || 'কোদালপুর, গোসাইরহাট, শরীয়তপুর, বাংলাদেশ।'}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>প্রতিষ্ঠার তারিখ: {info?.establishedDate || '১ জুন ২০২৬'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Introduction */}
        <div className="prose text-sm text-slate-700 leading-relaxed pt-4 border-t border-slate-100">
          <p>
            {info?.introduction ||
              'কোদালপুর মানবিক ফাউন্ডেশন একটি অরাজনৈতিক, অলাভজনক ও সম্পূর্ণ মানবকল্যাণমুখী সামাজিক প্রতিষ্ঠান। এলাকার অসহায়, সুবিধাবঞ্চিত ও দরিদ্র মানুষের পাশে দাঁড়ানো, শিক্ষা সহায়তা প্রদান, চিকিৎসা ও শীতবস্ত্র বিতরণ এবং রক্তদাতা ব্যবস্থাপনার মাধ্যমে একটি আত্মনির্ভরশীল ও মানবিক সমাজ গড়ে তোলাই আমাদের প্রধান অঙ্গীকার।'}
          </p>
        </div>
      </div>

      {/* Mission & Vision Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-lg">আমাদের মূল লক্ষ্য ও উদ্দেশ্য</h4>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {info?.mission ||
              '১. এলাকার দরিদ্র ও অসহায় মানুষের জরুরি আর্থিক ও চিকিৎসা সহায়তা প্রদান।\n২. মেধাবী ও অসচ্ছল শিক্ষার্থীদের শিক্ষা উপকরণ ও বৃত্তি সহায়তা।\n৩. রক্তদাতা নেটওয়ার্কের মাধ্যমে মুমূর্ষু রোগীর পাশে দাঁড়ানো।\n৪. শীতকালীন সময়ে বস্ত্র বিতরণ ও প্রাকৃতিক দুর্যোগে ত্রাণ কার্যক্রম পরিচালনা।\n৫. সম্পূর্ণ স্বচ্ছতার সাথে সকল অনুদান ও ব্যয়ের হিসাব প্রকাশ।'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-lg">ভবিষ্যৎ পরিকল্পনা</h4>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {info?.futurePlans ||
              'একটি স্বয়ংসম্পূর্ণ ফ্রি অ্যাম্বুলেন্স সেবা চালু করা, স্থায়ী রক্তদাতা ডাটাবেজ সম্প্রসারণ, কারিগরি প্রশিক্ষণ কেন্দ্রের মাধ্যমে বেকার তরুণদের কর্মসংস্থান সৃষ্টি এবং দরিদ্র পরিবারের জন্য স্থায়ী পুনর্বাসন প্রকল্প বাস্তবায়ন।'}
          </p>
        </div>
      </div>

      {/* Founders & Executive Committee */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="w-5 h-5 text-blue-950" />
          <h3 className="text-xl font-bold text-blue-950">প্রতিষ্ঠাতা ও দায়িত্বশীল ব্যক্তিবর্গ</h3>
        </div>

        {loading ? (
          <LoadingSpinner text="দায়িত্বশীলদের তালিকা লোড হচ্ছে..." />
        ) : executives.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500 text-sm">
            এখনও কোনো দায়িত্বশীল ব্যক্তির তথ্য যোগ করা হয়নি। অ্যাডমিন প্যানেল থেকে তথ্য সংযোজনের পর এখানে প্রদর্শিত হবে।
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {executives.map((ex) => (
              <div
                key={ex.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-center flex flex-col items-center"
              >
                {ex.photoUrl ? (
                  <img
                    src={ex.photoUrl}
                    alt={ex.name}
                    className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-emerald-600"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xl mb-3 border border-slate-200">
                    {ex.name.charAt(0)}
                  </div>
                )}
                <h4 className="font-bold text-slate-900 text-base">{ex.name}</h4>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">{ex.designation}</p>
                {ex.role && <p className="text-xs text-slate-400 mt-0.5">{ex.role}</p>}
                {ex.bio && <p className="text-xs text-slate-600 mt-2 line-clamp-3">{ex.bio}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advisory Board */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Compass className="w-5 h-5 text-emerald-700" />
          <h3 className="text-xl font-bold text-blue-950">উপদেষ্টামণ্ডলীর পরিচিতি</h3>
        </div>

        {advisors.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500 text-sm">
            এখনও কোনো উপদেষ্টার তথ্য যোগ করা হয়নি। অ্যাডমিন প্যানেল থেকে তথ্য সংযোজনের পর এখানে প্রদর্শিত হবে।
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {advisors.map((ad) => (
              <div
                key={ad.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-center flex flex-col items-center"
              >
                {ad.photoUrl ? (
                  <img
                    src={ad.photoUrl}
                    alt={ad.name}
                    className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-blue-900"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xl mb-3 border border-slate-200">
                    {ad.name.charAt(0)}
                  </div>
                )}
                <h4 className="font-bold text-slate-900 text-base">{ad.name}</h4>
                <p className="text-xs font-semibold text-blue-900 mt-0.5">{ad.designation}</p>
                {ad.organization && (
                  <p className="text-xs text-slate-400 mt-0.5">{ad.organization}</p>
                )}
                {ad.bio && <p className="text-xs text-slate-600 mt-2 line-clamp-3">{ad.bio}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
