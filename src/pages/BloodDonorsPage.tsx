import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Droplet,
  Search,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  PlusCircle,
  X,
  AlertCircle,
  ShieldCheck,
  User,
  Filter,
  Activity as ActivityIcon,
  PhoneCall,
  MessageSquare,
} from 'lucide-react';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { BloodDonor } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatBengaliDate, toBengaliNumber } from '../utils/formatters';

interface BloodDonorsPageProps {
  onNavigate: (path: string) => void;
}

const BLOOD_GROUPS = ['সব', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const UPAZILAS = [
  'সব',
  'ভেদরগঞ্জ',
  'কোদালপুর',
  'গোসাইরহাট',
  'ডামুড্যা',
  'নড়িয়া',
  'জাজিরা',
  'শরীয়তপুর সদর',
];

export const BloodDonorsPage: React.FC<BloodDonorsPageProps> = ({ onNavigate }) => {
  const [donors, setDonors] = useState<BloodDonor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState('সব');
  const [selectedUpazila, setSelectedUpazila] = useState('সব');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Registration modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    bloodGroup: 'A+',
    phone: '',
    upazila: 'ভেদরগঞ্জ',
    union: '',
    lastDonationDate: '',
    isAvailable: true,
    notes: '',
  });

  useEffect(() => {
    try {
      const q = query(collection(db, 'bloodDonors'), orderBy('registeredAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: BloodDonor[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as Omit<BloodDonor, 'id'>) });
          });
          setDonors(list);
          setLoading(false);
        },
        (err) => {
          console.warn('Realtime bloodDonors fallback query:', err);
          // Fallback if index not ready
          const fallbackUnsub = onSnapshot(
            collection(db, 'bloodDonors'),
            (snapshot) => {
              const list: BloodDonor[] = [];
              snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...(docSnap.data() as Omit<BloodDonor, 'id'>) });
              });
              setDonors(list);
              setLoading(false);
            },
            (err2) => {
              setLoading(false);
              handleFirestoreError(err2, OperationType.LIST, 'bloodDonors');
            }
          );
          return () => fallbackUnsub();
        }
      );
      return () => unsub();
    } catch (err) {
      setError(handleFirestoreError(err, OperationType.READ, 'bloodDonors'));
      setLoading(false);
    }
  }, []);

  const filteredDonors = useMemo(() => {
    return donors.filter((donor) => {
      if (selectedGroup !== 'সব' && donor.bloodGroup !== selectedGroup) return false;
      if (selectedUpazila !== 'সব' && donor.upazila !== selectedUpazila && donor.union !== selectedUpazila) {
        return false;
      }
      if (onlyAvailable && !donor.isAvailable) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = donor.name?.toLowerCase().includes(q);
        const matchesPhone = donor.phone?.includes(q);
        const matchesLocation = donor.upazila?.toLowerCase().includes(q) || donor.union?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesLocation) return false;
      }
      return true;
    });
  }, [donors, selectedGroup, selectedUpazila, onlyAvailable, searchQuery]);

  const handleRegisterDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setSubmitError('অনুগ্রহ করে নাম ও মোবাইল নম্বর পূরণ করুন।');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await addDoc(collection(db, 'bloodDonors'), {
        name: formData.name.trim(),
        bloodGroup: formData.bloodGroup,
        phone: formData.phone.trim(),
        upazila: formData.upazila,
        union: formData.union.trim() || formData.upazila,
        lastDonationDate: formData.lastDonationDate || '',
        isAvailable: formData.isAvailable,
        notes: formData.notes.trim() || '',
        registeredAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
        setFormData({
          name: '',
          bloodGroup: 'A+',
          phone: '',
          upazila: 'ভেদরগঞ্জ',
          union: '',
          lastDonationDate: '',
          isAvailable: true,
          notes: '',
        });
      }, 1500);
    } catch (err) {
      setSubmitError(handleFirestoreError(err, OperationType.WRITE, 'bloodDonors'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-700 to-red-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
          <Droplet size={280} />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs sm:text-sm font-medium mb-4">
            <Heart size={16} className="text-red-200 fill-red-200 animate-pulse" />
            <span>জীবন বাঁচান, রক্ত দিন</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            জরুরি রক্তের প্রয়োজনে কোদালপুর ব্লাড ব্যাংক
          </h1>
          <p className="text-red-100 text-sm sm:text-base leading-relaxed mb-6">
            কোদালপুর ও পার্শ্ববর্তী অঞ্চলের স্বেচ্ছাসেবী রক্তদাতাদের তালিকা। জরুরি মুহূর্তে সরাসরি রক্তদাতার সাথে যোগাযোগ করুন অথবা রক্তদাতা হিসেবে নিজের নাম নিবন্ধন করুন।
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-red-700 hover:bg-red-50 font-bold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 text-sm sm:text-base"
            >
              <PlusCircle size={18} />
              <span>রক্তদাতা হতে নিবন্ধন করুন</span>
            </button>
            <a
              href="tel:01700000000"
              className="bg-red-900/60 hover:bg-red-900/80 text-white font-medium px-5 py-2.5 rounded-xl border border-white/20 transition-all flex items-center gap-2 text-sm sm:text-base"
            >
              <PhoneCall size={18} />
              <span>জরুরি হটলাইন</span>
            </a>
          </div>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 mb-8">
        {/* Blood Group Filter Bar */}
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            রক্তের গ্রুপ নির্বাচন করুন:
          </label>
          <div className="flex flex-wrap gap-2">
            {BLOOD_GROUPS.map((grp) => (
              <button
                key={grp}
                onClick={() => setSelectedGroup(grp)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  selectedGroup === grp
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-600 ring-offset-2'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Location Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
            />
          </div>

          <div className="relative">
            <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedUpazila}
              onChange={(e) => setSelectedUpazila(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white appearance-none"
            >
              {UPAZILAS.map((up) => (
                <option key={up} value={up}>
                  উপজেলা: {up}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm w-full hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <span className="font-medium text-slate-700">শুধু প্রস্তুত রক্তদাতাগণ</span>
            </label>
          </div>
        </div>
      </div>

      {/* Donors List */}
      {loading ? (
        <div className="py-16 text-center">
          <LoadingSpinner />
          <p className="text-slate-500 text-sm mt-3">রক্তদাতাদের তালিকা লোড হচ্ছে...</p>
        </div>
      ) : filteredDonors.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <Droplet size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800 mb-1">কোনো রক্তদাতা পাওয়া যায়নি</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-5">
            আপনার নির্বাচিত গ্রুপ বা এলাকায় এই মুহূর্তে কোনো নিবন্ধিত রক্তদাতা নেই। আপনি নিজেই রক্তদাতা হিসেবে যুক্ত হতে পারেন।
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-red-700 transition"
          >
            রক্তদাতা হিসেবে নিবন্ধন করুন
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-600">
              মোট রক্তদাতা: <span className="text-red-600 font-bold">{toBengaliNumber(filteredDonors.length)}</span> জন
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDonors.map((donor) => (
              <div
                key={donor.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-red-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-extrabold text-lg shadow-sm border border-red-200">
                        {donor.bloodGroup}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">{donor.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={13} className="text-slate-400" />
                          <span>{donor.union ? `${donor.union}, ` : ''}{donor.upazila}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        donor.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {donor.isAvailable ? 'রক্ত দিতে প্রস্তুত' : 'সম্প্রতি দিয়েছেন'}
                    </span>
                  </div>

                  {donor.lastDonationDate && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-2 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                      <Clock size={13} className="text-slate-400" />
                      <span>সর্বশেষ রক্তদান: {formatBengaliDate(donor.lastDonationDate)}</span>
                    </p>
                  )}

                  {donor.notes && (
                    <p className="text-xs text-slate-600 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100 mb-2">
                      &ldquo;{donor.notes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center gap-2">
                  <a
                    href={`tel:${donor.phone}`}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Phone size={14} />
                    <span>কল করুন ({toBengaliNumber(donor.phone)})</span>
                  </a>
                  <a
                    href={`https://wa.me/88${donor.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs transition"
                    title="WhatsApp মেসেজ"
                  >
                    <MessageSquare size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Guidelines Section */}
      <div className="mt-12 bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="text-emerald-600" size={22} />
          <span>রক্তদানের সাধারণ নিয়মাবলী ও যোগ্যতা</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm text-slate-600">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-1">বয়স ও ওজন</h4>
            <p>১৮ থেকে ৬০ বছর বয়স এবং ন্যূনতম ৪৫ কেজি শারীরিক ওজন থাকা জরুরি।</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-1">বিরতি কাল</h4>
            <p>একবার পূর্ণ রক্তদানের পর অন্তত ৩ থেকে ৪ মাস বিরতি নিতে হবে।</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-1">শারীরিক সুস্থতা</h4>
            <p>হিমোগ্লোবিন স্বাভাবিক এবং কোনো সংক্রামক বা বড় রোগ না থাকা আবশ্যক।</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-1">রক্তদানের পূর্বে</h4>
            <p>পর্যাপ্ত পানি পান করুন, পুষ্টিকর খাবার খান এবং ভালোভাবে ঘুমান।</p>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
                <Droplet size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">রক্তদাতা নিবন্ধন</h3>
                <p className="text-xs text-slate-500">আপনার এক ব্যাগ রক্ত বাঁচাতে পারে একটি জীবন</p>
              </div>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={56} className="text-emerald-500 mx-auto mb-3 animate-bounce" />
                <h4 className="text-lg font-bold text-slate-900">নিবন্ধন সফল হয়েছে!</h4>
                <p className="text-slate-600 text-sm mt-1">
                  স্বেচ্ছাসেবী রক্তদাতা হিসেবে যুক্ত হওয়ার জন্য আপনাকে আন্তরিক ধন্যবাদ।
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegisterDonor} className="space-y-4">
                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    আপনার পূর্ণ নাম *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="উদা: মোঃ আব্দুর রহমান"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      রক্তের গ্রুপ *
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((grp) => (
                        <option key={grp} value={grp}>
                          {grp}
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
                      placeholder="017XXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">উপজেলা *</label>
                    <select
                      value={formData.upazila}
                      onChange={(e) => setFormData({ ...formData, upazila: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                    >
                      {UPAZILAS.filter((u) => u !== 'সব').map((up) => (
                        <option key={up} value={up}>
                          {up}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ইউনিয়ন / গ্রাম
                    </label>
                    <input
                      type="text"
                      placeholder="উদা: কোদালপুর"
                      value={formData.union}
                      onChange={(e) => setFormData({ ...formData, union: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    সর্বশেষ রক্তদানের তারিখ (যদি থাকে)
                  </label>
                  <input
                    type="date"
                    value={formData.lastDonationDate}
                    onChange={(e) => setFormData({ ...formData, lastDonationDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    বিশেষ মন্তব্য বা নোট (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="উদা: শুক্রবার রক্ত দিতে বেশি সুবিধাজনক"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isAvailableCheck"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <label htmlFor="isAvailableCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                    আমি বর্তমানে জরুরি প্রয়োজনে রক্ত দিতে প্রস্তুত আছি
                  </label>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold py-2.5 shadow-md transition flex items-center justify-center gap-2"
                  >
                    {submitting ? 'সংরক্ষণ হচ্ছে...' : 'নিবন্ধন সম্পন্ন করুন'}
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
