import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowLeft, Droplet, Search, MapPin, Calendar, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { BloodDonor } from '../types';
import { formatBengaliDate, toBengaliNumber } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

interface BloodDonorsPageProps {
  onNavigate: (path: string) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const BloodDonorsPage: React.FC<BloodDonorsPageProps> = ({ onNavigate }) => {
  const [donors, setDonors] = useState<BloodDonor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    // Only load donors with consent for public view
    const q = query(collection(db, 'bloodDonors'), where('hasConsent', '==', true));
    const unsubscribe = onSnapshot(
      q,
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

    return () => unsubscribe();
  }, []);

  const filtered = donors.filter((d) => {
    const matchesGroup = selectedGroup === 'all' || d.bloodGroup === selectedGroup;
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.area.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGroup && matchesSearch;
  });

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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950">স্বেচ্ছায় রক্তদাতা ডিরেক্টরি</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            জরুরি প্রয়োজনে রক্তদাতার সন্ধান ও এলাকার স্বেচ্ছাসেবীদের তালিকা
          </p>
        </div>
      </div>

      {/* Blood Group Filter Bar */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="রক্তদাতার নাম বা এলাকা (যেমন: কোদালপুর, গোসাইরহাট) দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setSelectedGroup('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
              selectedGroup === 'all'
                ? 'bg-rose-700 text-white border-rose-700'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            সকল গ্রুপ
          </button>
          {BLOOD_GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                selectedGroup === group
                  ? 'bg-rose-700 text-white border-rose-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Donors Content */}
      {loading ? (
        <LoadingSpinner text="রক্তদাতাদের তালিকা লোড হচ্ছে..." />
      ) : donors.length === 0 ? (
        <EmptyState
          message="এখনও কোনো রক্তদাতার তথ্য যোগ করা হয়নি।"
          subMessage="সম্মতিপ্রাপ্ত রক্তদাতাদের তথ্য অ্যাডমিন প্যানেল থেকে যুক্ত করার পর এখানে পাওয়া যাবে।"
        />
      ) : filtered.length === 0 ? (
        <EmptyState message="অনুসন্ধানের শর্তে কোনো রক্তদাতা পাওয়া যায়নি।" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((donor) => (
            <div
              key={donor.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-black text-lg">
                      {donor.bloodGroup}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{donor.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{donor.area}</span>
                      </p>
                    </div>
                  </div>
                  {donor.isAvailable !== false && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      প্রস্তুত
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  {donor.lastDonationDate && (
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>সর্বশেষ রক্তদান: {formatBengaliDate(donor.lastDonationDate)}</span>
                    </p>
                  )}

                  {donor.contactNumber && donor.hasConsent && (
                    <div className="pt-2">
                      <a
                        href={`tel:${donor.contactNumber}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs hover:bg-emerald-100 transition-colors w-full justify-center"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>যোগাযোগ: {toBengaliNumber(donor.contactNumber)}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 text-[11px] text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
                <span>রক্তদাতার সম্মতিক্রমে তথ্য প্রকাশিত</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
