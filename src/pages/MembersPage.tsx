import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  Search,
  Users,
  UserCheck,
  Briefcase,
  User,
  Star,
  HeartHandshake,
  Calendar,
  MapPin,
  FileText,
  Eye,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Info,
  X,
  CreditCard,
  ShieldCheck,
  ArrowLeft,
  PlusCircle,
  RotateCw,
} from 'lucide-react';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { Member } from '../types';
import { formatBengaliDate, toBengaliNumber } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MemberDetailModal } from '../components/members/MemberDetailModal';
import { forcePurgeCacheAndReload } from '../utils/pwaAutoUpdate';

interface MembersPageProps {
  onNavigate: (path: string) => void;
}

type CategoryType =
  | 'সকল'
  | 'উপদেষ্টা পরিষদ'
  | 'কার্যনির্বাহী পরিষদ'
  | 'সাধারণ সদস্য'
  | 'সম্মানিত সদস্য'
  | 'দাতা সদস্য';

interface CategoryTab {
  id: CategoryType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryTab[] = [
  { id: 'সকল', label: 'সকল', icon: Users },
  { id: 'উপদেষ্টা পরিষদ', label: 'উপদেষ্টা পরিষদ', icon: UserCheck },
  { id: 'কার্যনির্বাহী পরিষদ', label: 'কার্যনির্বাহী পরিষদ', icon: Briefcase },
  { id: 'সাধারণ সদস্য', label: 'সাধারণ সদস্য', icon: User },
  { id: 'সম্মানিত সদস্য', label: 'সম্মানিত সদস্য', icon: Star },
  { id: 'দাতা সদস্য', label: 'দাতা সদস্য', icon: HeartHandshake },
];

const ITEMS_PER_PAGE = 6;

export const MembersPage: React.FC<MembersPageProps> = ({ onNavigate }) => {
  const [dbMembers, setDbMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('সকল');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Real-time synchronization exclusively from Firestore database
  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('memberId', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: Member[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...(docSnap.data() as Omit<Member, 'id'>) });
        });
        setDbMembers(docs);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        console.warn('Firestore members fetch note:', error);
        handleFirestoreError(error, OperationType.LIST, 'members');
      }
    );

    return () => unsubscribe();
  }, []);

  // ONLY real members uploaded via Admin Panel from Firestore
  const allMembers = dbMembers;

  // Determine category of any member dynamically
  const getMemberCategory = (member: Member): string => {
    // 1. Explicit category field
    if (member.category) {
      if (member.category.includes('উপদেষ্টা') || member.category.includes('উপদেস্টা')) return 'উপদেষ্টা পরিষদ';
      if (member.category.includes('কার্যনির্বাহী')) return 'কার্যনির্বাহী পরিষদ';
      if (member.category.includes('সম্মানিত')) return 'সম্মানিত সদস্য';
      if (member.category.includes('দাতা')) return 'দাতা সদস্য';
      if (member.category.includes('সাধারণ')) return 'সাধারণ সদস্য';
      return member.category;
    }
    // 2. Member Type field
    if (member.memberType) {
      if (member.memberType.includes('উপদেষ্টা') || member.memberType.includes('উপদেস্টা')) return 'উপদেষ্টা পরিষদ';
      if (
        member.memberType.includes('কার্যনির্বাহী') ||
        member.memberType.includes('সভাপতি') ||
        member.memberType.includes('সম্পাদক') ||
        member.memberType.includes('আহবায়ক')
      )
        return 'কার্যনির্বাহী পরিষদ';
      if (member.memberType.includes('সম্মানিত')) return 'সম্মানিত সদস্য';
      if (member.memberType.includes('দাতা')) return 'দাতা সদস্য';
      if (member.memberType.includes('সাধারণ')) return 'সাধারণ সদস্য';
    }
    // 3. Designation field
    if (member.designation) {
      if (member.designation.includes('উপদেষ্টা') || member.designation.includes('উপদেস্টা')) return 'উপদেষ্টা পরিষদ';
      if (
        member.designation.includes('সভাপতি') ||
        member.designation.includes('সম্পাদক') ||
        member.designation.includes('আহবায়ক') ||
        member.designation.includes('নির্বাহী') ||
        member.designation.includes('সাংগঠনিক') ||
        member.designation.includes('প্রচার')
      )
        return 'কার্যনির্বাহী পরিষদ';
      if (member.designation.includes('সম্মানিত')) return 'সম্মানিত সদস্য';
      if (member.designation.includes('দাতা')) return 'দাতা সদস্য';
    }
    return 'সাধারণ সদস্য';
  };

  // Filter members based on category and search
  const filteredMembers = useMemo(() => {
    return allMembers.filter((m) => {
      // Category match
      const memberCategory = getMemberCategory(m);
      const matchesCategory =
        selectedCategory === 'সকল' ||
        memberCategory === selectedCategory;

      // Search match (name, memberId, registrationNo, village, designation)
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        m.name.toLowerCase().includes(term) ||
        m.memberId.toLowerCase().includes(term) ||
        (m.registrationNo && m.registrationNo.toLowerCase().includes(term)) ||
        (m.village && m.village.toLowerCase().includes(term)) ||
        (m.designation && m.designation.toLowerCase().includes(term));

      return matchesCategory && matchesSearch;
    });
  }, [allMembers, selectedCategory, searchTerm]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / ITEMS_PER_PAGE));
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm]);

  // Styling helper for designation badge
  const getDesignationBadgeStyle = (designation: string, category: string) => {
    if (designation.includes('উপদেষ্টা') || designation.includes('প্রতিষ্ঠাতা')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
    }
    if (designation.includes('সভাপতি')) {
      return 'bg-sky-50 text-sky-800 border-sky-200/80';
    }
    if (designation.includes('সম্পাদক')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
    }
    if (designation.includes('সম্মানিত') || category.includes('সম্মানিত')) {
      return 'bg-purple-50 text-purple-800 border-purple-200/80';
    }
    if (designation.includes('দাতা') || category.includes('দাতা')) {
      return 'bg-rose-50 text-rose-800 border-rose-200/80';
    }
    return 'bg-teal-50 text-teal-800 border-teal-200/80';
  };

  // Styling helper for category badge
  const getCategoryBadgeStyle = (category: string) => {
    if (category.includes('উপদেষ্টা')) {
      return 'bg-blue-50 text-blue-700 border-blue-200/80';
    }
    if (category.includes('কার্যনির্বাহী')) {
      return 'bg-blue-50 text-blue-700 border-blue-200/80';
    }
    if (category.includes('সম্মানিত')) {
      return 'bg-purple-50 text-purple-700 border-purple-200/80';
    }
    if (category.includes('দাতা')) {
      return 'bg-rose-50 text-rose-700 border-rose-200/80';
    }
    return 'bg-amber-50 text-amber-800 border-amber-200/80';
  };

  // Display actual member count directly from database
  const displayTotalCount = allMembers.length;

  return (
    <div className="min-h-screen bg-[#F4F8FC] pb-16">
      {/* 1. HERO BANNER: Dark Navy (#0B376B) with seedling hands image on right */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0B376B] via-[#0B376B] to-[#082952] text-white py-10 sm:py-14 px-4 sm:px-6 shadow-md">
        {/* Seedling hands visual background on the right */}
        <div
          className="absolute right-0 top-0 bottom-0 w-full sm:w-1/2 md:w-5/12 pointer-events-none opacity-35 sm:opacity-90 bg-no-repeat bg-right-center bg-cover mix-blend-luminosity sm:mix-blend-normal"
          style={{
            backgroundImage: "url('/members_hero_plant.jpg')",
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 20%, black 60%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 20%, black 60%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto flex flex-col justify-center z-10">
          {/* Breadcrumb / Back Navigation */}
          <div className="mb-4">
            <button
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-blue-200 hover:text-white transition-colors cursor-pointer bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>প্রধান পাতায় ফিরুন</span>
            </button>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-2 leading-tight">
            ফাউন্ডেশনের সদস্যবৃন্দ
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-200 font-normal max-w-xl mb-4">
            কোদালপুর মানবিক ফাউন্ডেশনের সকল সদস্যের তালিকা।
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Real Total Member Count Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#078747]/30 border border-[#078747]/60 text-emerald-200 text-xs sm:text-sm font-semibold backdrop-blur-xs w-fit shadow-xs">
              <div className="w-5 h-5 rounded-full bg-[#078747] flex items-center justify-center text-white">
                <Users className="w-3 h-3" />
              </div>
              <span>মোট সদস্য: {toBengaliNumber(displayTotalCount)} জন</span>
            </div>

            {/* Quick Force Refresh Button */}
            <button
              onClick={() => forcePurgeCacheAndReload()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-xs cursor-pointer border border-white/20 transition-all active:scale-95 shadow-xs"
              title="নতুন তথ্য ও অ্যাপ ভার্সন রিফ্রেশ করুন"
            >
              <RotateCw className="w-3.5 h-3.5 text-emerald-300" />
              <span>রিফ্রেশ</span>
            </button>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT CONTAINER */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* 2. CATEGORY FILTER BUTTONS */}
        <div className="relative">
          <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-2 scrollbar-none sm:flex-wrap">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 border ${
                    isActive
                      ? 'bg-[#0B376B] text-white border-[#0B376B] shadow-sm ring-2 ring-[#0B376B]/20'
                      : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 hover:text-[#0B376B]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : 'text-[#078747]'
                    }`}
                  />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. SEARCH INPUT BOX */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="সদস্যের নাম বা আইডি দিয়ে অনুসন্ধান করুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-slate-200/90 bg-white text-slate-900 placeholder:text-slate-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#0B376B]/25 focus:border-[#0B376B] shadow-2xs transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="মুছে ফেলুন"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 4. MEMBER CARDS OR AUTHENTIC EMPTY STATE */}
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="সদস্যদের তথ্য লোড হচ্ছে..." />
          </div>
        ) : allMembers.length === 0 ? (
          /* Empty Database State: When no members are in Firestore yet */
          <div className="bg-white rounded-3xl p-10 sm:p-14 border border-slate-200/80 text-center space-y-4 my-6 shadow-2xs">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-[#0B376B] flex items-center justify-center mx-auto border border-blue-100 shadow-2xs">
              <Users className="w-8 h-8 stroke-1.5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-800">
                এখনও কোনো সদস্যের তথ্য যোগ করা হয়নি
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                এডমিন প্যানেল থেকে সদস্য নিবন্ধন ও তথ্য আপলোড করা হলে এখানে রিয়েল-টাইমে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => onNavigate('/admin')}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#0B376B] hover:bg-[#07264a] rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-emerald-300" />
                <span>এডমিন প্যানেলে সদস্য যোগ করুন</span>
              </button>
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          /* Filter/Search No Match State */
          <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center space-y-4 my-6 shadow-2xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              অনুসন্ধানে কোনো সদস্য পাওয়া যায়নি
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              আপনার অনুসন্ধান “{searchTerm}” অথবা নির্বাচিত ফিল্টারে কোনো সদস্য মেলেনি।
            </p>
            <button
              onClick={() => {
                setSelectedCategory('সকল');
                setSearchTerm('');
              }}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0B376B] rounded-xl hover:bg-[#07264a] transition-colors cursor-pointer"
            >
              সকল ফিল্টার রিসেট করুন
            </button>
          </div>
        ) : (
          /* Real Members Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {paginatedMembers.map((member) => {
              const category = getMemberCategory(member);
              const designationBadgeStyle = getDesignationBadgeStyle(
                member.designation,
                category
              );
              const categoryBadgeStyle = getCategoryBadgeStyle(category);

              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-[#0B376B]/30 transition-all duration-200 flex flex-col justify-between cursor-pointer group relative"
                >
                  <div>
                    {/* Top Section: Photo + Name + Badges */}
                    <div className="flex items-start gap-4 mb-4">
                      {/* Circular Member Photo */}
                      <div className="relative shrink-0">
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt={member.name}
                            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-slate-200/80 group-hover:border-[#0B376B]/40 transition-colors bg-slate-50 shadow-2xs"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              if (target.nextElementSibling) {
                                (target.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-slate-100 text-slate-500 border-2 border-slate-200 flex items-center justify-center font-bold text-xl group-hover:bg-blue-50 group-hover:text-[#0B376B] transition-colors ${
                            member.photoUrl ? 'hidden' : 'flex'
                          }`}
                        >
                          <User className="w-8 h-8 stroke-1.5" />
                        </div>
                      </div>

                      {/* Name & Badges */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h3
                          className="font-bold text-slate-900 text-base sm:text-lg group-hover:text-[#0B376B] transition-colors truncate"
                          title={member.name}
                        >
                          {member.name}
                        </h3>

                        <div className="flex flex-col gap-1 items-start">
                          {/* Designation Badge */}
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border ${designationBadgeStyle} truncate max-w-full`}
                            title={member.designation}
                          >
                            {member.designation}
                          </span>

                          {/* Category Badge */}
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border ${categoryBadgeStyle} truncate max-w-full`}
                            title={category}
                          >
                            {category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Metadata Table with Icons & Colon alignment */}
                    <div className="space-y-2 text-xs sm:text-sm text-slate-600 pt-3 border-t border-slate-100">
                      {/* Member ID */}
                      <div className="grid grid-cols-[110px_12px_1fr] items-center">
                        <span className="text-slate-500 flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>সদস্য আইডি</span>
                        </span>
                        <span className="text-slate-400 font-bold">:</span>
                        <span className="font-mono font-bold text-slate-800 truncate">
                          {member.memberId}
                        </span>
                      </div>

                      {/* Registration No */}
                      <div className="grid grid-cols-[110px_12px_1fr] items-center">
                        <span className="text-slate-500 flex items-center gap-1.5 truncate">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>নিবন্ধন নং</span>
                        </span>
                        <span className="text-slate-400 font-bold">:</span>
                        <span className="font-mono font-medium text-slate-800 truncate">
                          {member.registrationNo || 'তথ্য নেই'}
                        </span>
                      </div>

                      {/* Joining Date */}
                      <div className="grid grid-cols-[110px_12px_1fr] items-center">
                        <span className="text-slate-500 flex items-center gap-1.5 truncate">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>যোগদানের তারিখ</span>
                        </span>
                        <span className="text-slate-400 font-bold">:</span>
                        <span className="font-medium text-slate-800 truncate">
                          {formatBengaliDate(member.joinDate)}
                        </span>
                      </div>

                      {/* Village / Area */}
                      <div className="grid grid-cols-[110px_12px_1fr] items-center">
                        <span className="text-slate-500 flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>এলাকা / গ্রাম</span>
                        </span>
                        <span className="text-slate-400 font-bold">:</span>
                        <span className="font-medium text-slate-800 truncate">
                          {member.village || member.area || 'কোদালপুর'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Button: Full width Dark Navy (#0B376B) */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMember(member);
                      }}
                      className="w-full py-2.5 px-4 bg-[#0B376B] hover:bg-[#082952] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-2xs group-hover:shadow transition-all duration-150 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-emerald-300" />
                      <span>বিস্তারিত প্রোফাইল</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. PAGINATION CONTROLS (Only visible when items exceed per page) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            {/* Previous Button */}
            <button
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage((p) => p - 1);
                  window.scrollTo({ top: 220, behavior: 'smooth' });
                }
              }}
              disabled={currentPage === 1}
              className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
              title="পূর্ববর্তী পেজ"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Number Buttons */}
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => {
                    setCurrentPage(pageNum);
                    window.scrollTo({ top: 220, behavior: 'smooth' });
                  }}
                  className={`w-9 h-9 rounded-lg font-bold text-sm flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#078747] text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {toBengaliNumber(pageNum)}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              onClick={() => {
                if (currentPage < totalPages) {
                  setCurrentPage((p) => p + 1);
                  window.scrollTo({ top: 220, behavior: 'smooth' });
                }
              }}
              disabled={currentPage === totalPages}
              className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
              title="পরবর্তী পেজ"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 6. BOTTOM INFORMATIONAL BANNER */}
        <div className="bg-[#078747]/10 border border-[#078747]/25 rounded-2xl p-4 sm:p-4.5 flex items-start sm:items-center gap-3 text-xs sm:text-sm text-[#078747] font-medium shadow-2xs mt-8">
          <div className="w-6 h-6 rounded-full bg-[#078747] text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <p className="leading-relaxed">
            কোদালপুর মানবিক ফাউন্ডেশনের নিবন্ধিত ও সক্রিয় সদস্যদের তথ্য এডমিন ডাটাবেস থেকে সরাসরি প্রদর্শিত হচ্ছে।
          </p>
        </div>
      </div>

      {/* 7. COMPLETE MEMBER DETAIL MODAL */}
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
