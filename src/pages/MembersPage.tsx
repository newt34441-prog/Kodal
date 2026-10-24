import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ArrowLeft, Search, Calendar, User as UserIcon, ChevronRight, ShieldCheck, CreditCard } from 'lucide-react';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Member } from '../types';
import { formatBengaliDate, getMemberStatusLabel, toBengaliNumber } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { MemberDetailModal } from '../components/members/MemberDetailModal';

interface MembersPageProps {
  onNavigate: (path: string) => void;
}

export const MembersPage: React.FC<MembersPageProps> = ({ onNavigate }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('memberId', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: Member[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...(docSnap.data() as Omit<Member, 'id'>) });
        });
        setMembers(docs);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'members');
      }
    );

    return () => unsubscribe();
  }, []);

  const filtered = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.designation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-950">ফাউন্ডেশনের সদস্যবৃন্দ</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            মোট সদস্য: {toBengaliNumber(members.length)} জন
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      {members.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="সদস্যের নাম, আইডি বা পদবি দিয়ে অনুসন্ধান করুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-blue-950 text-white border-blue-950'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              সকল
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              সক্রিয়
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              নিষ্ক্রিয়
            </button>
          </div>
        </div>
      )}

      {/* Members Grid */}
      {loading ? (
        <LoadingSpinner text="সদস্যদের তালিকা লোড হচ্ছে..." />
      ) : members.length === 0 ? (
        <EmptyState
          message="এখনও কোনো সদস্যের তথ্য যোগ করা হয়নি।"
          subMessage="অ্যাডমিন কর্তৃক সদস্য নিবন্ধনের পর এখানে সদস্যদের তথ্য দেখতে পাবেন।"
        />
      ) : filtered.length === 0 ? (
        <EmptyState message="অনুসন্ধানের ফলাফলে কোনো সদস্য পাওয়া যায়নি।" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((member) => {
            const statusConfig = getMemberStatusLabel(member.status);
            return (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-blue-900/30 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-3.5 mb-3">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-13 h-13 rounded-full object-cover border-2 border-emerald-600/30 group-hover:border-emerald-600 transition-colors shrink-0"
                      />
                    ) : (
                      <div className="w-13 h-13 rounded-full bg-blue-50 text-blue-900 border border-blue-200 flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-blue-100 transition-colors">
                        <UserIcon className="w-6 h-6 stroke-1.5" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h3
                        className="font-bold text-slate-900 text-base truncate group-hover:text-blue-950 transition-colors"
                        title={member.name}
                      >
                        {member.name}
                      </h3>
                      <p className="text-xs font-medium text-emerald-700 truncate" title={member.designation}>
                        {member.designation}
                        {member.memberType && ` • ${member.memberType}`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <p className="flex justify-between">
                      <span className="text-slate-400">সদস্য আইডি:</span>
                      <span className="font-mono font-medium text-slate-700">
                        {toBengaliNumber(member.memberId)}
                      </span>
                    </p>
                    {member.registrationNo && (
                      <p className="flex justify-between">
                        <span className="text-slate-400">নিবন্ধন নং:</span>
                        <span className="font-mono font-medium text-slate-700">
                          {toBengaliNumber(member.registrationNo)}
                        </span>
                      </p>
                    )}
                    <p className="flex justify-between">
                      <span className="text-slate-400">যোগদানের তারিখ:</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatBengaliDate(member.joinDate)}
                      </span>
                    </p>
                    {member.village && (
                      <p className="flex justify-between">
                        <span className="text-slate-400">এলাকা / গ্রাম:</span>
                        <span className="font-medium text-slate-700 truncate max-w-[140px]">
                          {member.village}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.bgClass} ${statusConfig.textClass}`}
                  >
                    {statusConfig.label}
                  </span>

                  <span className="text-xs font-bold text-blue-950 group-hover:text-emerald-700 flex items-center gap-1 transition-colors">
                    <span>বিস্তারিত প্রোফাইল</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onEditMember={() => {
            setSelectedMember(null);
            onNavigate('/admin');
          }}
        />
      )}
    </div>
  );
};
