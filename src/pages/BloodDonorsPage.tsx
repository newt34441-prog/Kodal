import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Search,
  Droplet,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Heart,
  PlusCircle,
  X,
  AlertCircle,
} from 'lucide-react';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { BloodDonor } from '../types';
import { toBengaliNumber, formatBengaliDate } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface BloodDonorsPageProps {
  onNavigate: (path: string) => void;
}

const BLOOD_GROUPS = ['সকল', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const BloodDonorsPage: React.FC<BloodDonorsPageProps> = ({ onNavigate }) => {
  const [donors, setDonors] = useState<BloodDonor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('সকল');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);

  // Registration Form
  const [formData, setFormData] = useState<{
    name: string;
    bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    area: string;
    contactNumber: string;
    lastDonationDate: string;
    hasConsent: boolean;
  }>({
    name: '',
    bloodGroup: 'O+',
    area: '',
    contactNumber: '',
    lastDonationDate: '',
    hasConsent: true,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'bloodDonors'),
      (snapshot) => {
        const docs: BloodDonor[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...(docSnap.data() as Omit<BloodDonor, 'id'>) });
        });
        setDonors(docs);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'bloodDonors');
      }
    );

    return () => unsub();
  }, []);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contactNumber.trim() || !formData.area.trim()) {
      alert('অনুগ্রহ করে নাম, এলাকা ও ফোন নম্বর প্রদান করুন।');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'bloodDonors'), {
        ...formData,
        hasConsent: true,
        isAvailable: true,
        createdAt: new Date().toISOString(),
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowRegisterModal(false);
        setFormData({
          name: '',
          bloodGroup: 'O+',
          area: '',
          contactNumber: '',
          lastDonationDate: '',
          hasConsent: true,
        });
      }, 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'bloodDonors');
      alert('নিবন্ধন সম্পন্ন করা সম্ভব হয়নি। পরে আবার চেষ্টা করুন।');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDonors = donors.filter((d) => {
    const matchGroup = selectedGroup === 'সকল' || d.bloodGroup === selectedGroup;
    const matchSearch =
      !searchQuery.trim() ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.contactNumber && d.contactNumber.includes(searchQuery.trim()));
    return matchGroup && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/')}
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="হোম পেজে ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <Droplet className="w-5 h-5" />
              </span>
              রক্তদাতা তালিকা
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              কোদালপুর মানবিক ফাউন্ডেশনের নিবন্ধিত স্বেচ্ছাসেবী রক্তদাতাবৃন্দ
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm shadow-sm transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          রক্তদাতা হতে আবেদন
        </button>
      </div>

      {/* Blood Group Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80 mb-6">
        <div className="text-xs font-semibold text-slate-400 mb-2.5">রক্তের গ্রুপ নির্বাচন:</div>
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
          {BLOOD_GROUPS.map((group) => {
            const isSelected = selectedGroup === group;
            return (
              <button
                key={group}
                onClick={() => setSelectedGroup(group)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {group}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="রক্তদাতার নাম, এলাকা বা মোবাইল নম্বর দিয়ে খুঁজুন..."
          className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 shadow-2xs"
        />
      </div>

      {/* Donors Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : filteredDonors.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80">
          <Droplet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">কোনো রক্তদাতার তথ্য পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            নির্বাচিত গ্রুপের কোনো রক্তদাতা খুঁজে পাওয়া যায়নি। আপনি চাইলে রক্তদাতা হিসেবে নিবন্ধন করতে পারেন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDonors.map((donor) => (
            <div
              key={donor.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{donor.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{donor.area}</span>
                    </div>
                  </div>
                  <span className="w-11 h-11 rounded-xl bg-red-50 text-red-600 font-extrabold text-base flex items-center justify-center shrink-0 border border-red-200/60 shadow-2xs">
                    {donor.bloodGroup}
                  </span>
                </div>

                {donor.lastDonationDate && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>সর্বশেষ রক্তদান: {donor.lastDonationDate}</span>
                  </div>
                )}
              </div>

              {donor.contactNumber && (
                <a
                  href={`tel:${donor.contactNumber}`}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  কল করুন ({donor.contactNumber})
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowRegisterModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">স্বেচ্ছাসেবী রক্তদাতা নিবন্ধন</h2>
                <p className="text-xs text-slate-500">আপনার রক্তদানের মাধ্যমে একটি জীবন বাঁচতে পারে</p>
              </div>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">নিবন্ধন সফল হয়েছে!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  কোদালপুর মানবিক ফাউন্ডেশনের পাশে থাকার জন্য আপনাকে আন্তরিক ধন্যবাদ।
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    আপনার পূর্ণ নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="যেমন: মোঃ সাকিব আহমেদ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      রক্তের গ্রুপ *
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bloodGroup: e.target.value as
                            | 'A+'
                            | 'A-'
                            | 'B+'
                            | 'B-'
                            | 'AB+'
                            | 'AB-'
                            | 'O+'
                            | 'O-',
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      মোবাইল নম্বর *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.contactNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, contactNumber: e.target.value })
                      }
                      placeholder="017xxxxxxxx"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    বর্তমান এলাকা / গ্রাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="যেমন: কোদালপুর বাজার"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    সর্বশেষ রক্তদানের তারিখ (যদি থাকে)
                  </label>
                  <input
                    type="text"
                    value={formData.lastDonationDate}
                    onChange={(e) =>
                      setFormData({ ...formData, lastDonationDate: e.target.value })
                    }
                    placeholder="যেমন: জানুয়ারি ২০২৬"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    {submitting ? 'নিবন্ধন করা হচ্ছে...' : 'নিবন্ধন নিশ্চিত করুন'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
