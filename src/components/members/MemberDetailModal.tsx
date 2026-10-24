import React, { useEffect, useState } from 'react';
import {
  X,
  User as UserIcon,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  Droplet,
  Shield,
  CreditCard,
  PlusCircle,
  Trash2,
  Lock,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Clock,
  Copy,
  Check,
  Building,
  HeartHandshake,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { handleFirestoreError, OperationType } from '../../firebase/errorHandler';
import { Member, MemberFeePayment } from '../../types';
import { formatBengaliDate, formatTaka, toBengaliNumber } from '../../utils/formatters';
import { calculateMemberSubscription } from '../../utils/memberSubscription';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface MemberDetailModalProps {
  member: Member;
  onClose: () => void;
  onEditMember?: (member: Member) => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  onClose,
  onEditMember,
}) => {
  const { user, isAdmin, signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'fees'>('info');

  // Real-time fee payments for this member
  const [payments, setPayments] = useState<MemberFeePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(true);

  // New Fee Payment Form state (for admin)
  const [showAddPayment, setShowAddPayment] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<string>(
    member.subscriptionAmount ? String(member.subscriptionAmount) : ''
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('নগদ');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [syncToGeneralIncome, setSyncToGeneralIncome] = useState<boolean>(false);
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  // Feedback states
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch member fee payments (only if admin, to honor privacy rules)
  useEffect(() => {
    if (!isAdmin) {
      setLoadingPayments(false);
      return;
    }

    const paymentsRef = collection(db, 'members', member.id, 'feePayments');
    const q = query(paymentsRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MemberFeePayment[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<MemberFeePayment, 'id'>) });
        });
        setPayments(list);
        setLoadingPayments(false);
      },
      (error) => {
        setLoadingPayments(false);
        console.warn('Fee payments read note:', error);
      }
    );

    return () => unsubscribe();
  }, [member.id, isAdmin]);

  // Subscription calculation
  const summary = calculateMemberSubscription(member, payments);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Add Fee Payment Submission
  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const numAmount = parseFloat(paymentAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showNotification('error', 'অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন।');
      return;
    }

    setSubmittingPayment(true);
    try {
      const paymentData: Record<string, any> = {
        memberDocId: member.id,
        date: paymentDate,
        amount: numAmount,
        paymentMethod: paymentMethod.trim() || 'নগদ',
        recordedBy: user?.email || 'অ্যাডমিন',
        createdAt: new Date().toISOString(),
      };

      if (receiptNo.trim()) {
        paymentData.receiptNo = receiptNo.trim();
      }
      if (remarks.trim()) {
        paymentData.remarks = remarks.trim();
      }

      // If admin opted to also reflect in general income ledger
      if (syncToGeneralIncome) {
        const txId = 'tx_fee_' + Date.now();
        const txData = {
          type: 'income',
          category: 'সদস্য চাঁদা',
          amount: numAmount,
          date: paymentDate,
          description: `সদস্য চাঁদা: ${member.name} (${member.memberId})`,
          voucherNo: receiptNo.trim() || `MEM-${member.memberId}`,
          createdAt: new Date().toISOString(),
          createdBy: user?.email || 'অ্যাডমিন',
        };
        await setDoc(doc(db, 'transactions', txId), txData);
        paymentData.linkedTransactionId = txId;
      }

      const paymentsRef = collection(db, 'members', member.id, 'feePayments');
      await addDoc(paymentsRef, paymentData);

      showNotification('success', 'সদস্যের চাঁদা জমার রেকর্ড সফলভাবে সংরক্ষিত হয়েছে।');
      setPaymentAmount(member.subscriptionAmount ? String(member.subscriptionAmount) : '');
      setReceiptNo('');
      setRemarks('');
      setShowAddPayment(false);
    } catch (err) {
      showNotification('error', 'চাঁদা জমা সংরক্ষণে সমস্যা হয়েছে।');
      handleFirestoreError(err, OperationType.CREATE, `members/${member.id}/feePayments`);
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Delete payment record
  const handleDeletePayment = async (paymentId: string, pAmount: number) => {
    if (!isAdmin) return;
    if (
      !window.confirm(
        `আপনি কি নিশ্চিতভাবে ${toBengaliNumber(pAmount)} টাকার এই জমার রেকর্ড মুছে ফেলতে চান?`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'members', member.id, 'feePayments', paymentId));
      showNotification('success', 'জমার রেকর্ড মুছে ফেলা হয়েছে। হিসাব স্বয়ংক্রিয়ভাবে পুনর্গণনা হয়েছে।');
    } catch (err) {
      showNotification('error', 'রেকর্ড মুছতে ব্যর্থ হয়েছে।');
      handleFirestoreError(err, OperationType.DELETE, `members/${member.id}/feePayments/${paymentId}`);
    }
  };

  // Subscription frequency label
  const getSubscriptionTypeLabel = () => {
    if (member.subscriptionType === 'monthly') {
      return `মাসিক ${formatTaka(member.subscriptionAmount || 0)}`;
    }
    if (member.subscriptionType === 'yearly') {
      return `বার্ষিক ${formatTaka(member.subscriptionAmount || 0)}`;
    }
    return 'নির্ধারিত চাঁদা প্রযোজ্য নয়';
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-3 border-emerald-400 shadow-md shrink-0"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 text-white border-2 border-white/20 flex items-center justify-center text-3xl font-bold shrink-0">
                <UserIcon className="w-10 h-10 text-emerald-300 stroke-1.5" />
              </div>
            )}

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="font-mono text-xs font-bold bg-white/15 px-2.5 py-0.5 rounded-lg border border-white/20 text-emerald-200">
                  আইডি: {toBengaliNumber(member.memberId)}
                </span>
                {member.registrationNo && (
                  <span className="font-mono text-xs font-bold bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/15 text-slate-200">
                    রেজিস্ট্রেশন: {toBengaliNumber(member.registrationNo)}
                  </span>
                )}
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    member.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                  }`}
                >
                  {member.status === 'active' ? 'সক্রিয় সদস্য' : 'নিষ্ক্রিয় সদস্য'}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight">{member.name}</h2>

              <p className="text-emerald-300 font-semibold text-sm">
                {member.designation}
                {member.memberType && ` • ${member.memberType}`}
              </p>

              <p className="text-xs text-slate-300 flex items-center justify-center sm:justify-start gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>যোগদান: {formatBengaliDate(member.joinDate)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'bg-white text-blue-950 border-t-2 border-x border-slate-200 border-t-blue-950 -mb-px'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserIcon className="w-4 h-4 text-blue-600" />
            <span>সদস্যের সম্পূর্ণ তথ্য</span>
          </button>

          <button
            onClick={() => setActiveTab('fees')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'fees'
                ? 'bg-white text-blue-950 border-t-2 border-x border-slate-200 border-t-emerald-600 -mb-px'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>চাঁদার হিসাব ও ইতিহাস</span>
            {isAdmin && summary.totalDue > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            )}
          </button>

          {isAdmin && onEditMember && (
            <div className="ml-auto flex items-center pb-2">
              <button
                onClick={() => {
                  onClose();
                  onEditMember(member);
                }}
                className="text-xs font-bold px-3 py-1.5 bg-blue-50 text-blue-950 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
              >
                তথ্য সম্পাদনা
              </button>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: COMPLETE MEMBER INFO */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
                <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  <span>ব্যক্তিগত তথ্য</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">পূর্ণ নাম:</span>
                    <strong className="text-slate-800 text-sm font-bold">{member.name}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">সদস্য আইডি / কোড:</span>
                    <strong className="text-slate-800 text-sm font-mono font-bold">
                      {member.memberId}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">নিবন্ধন নম্বর:</span>
                    <strong className="text-slate-800 font-mono">
                      {member.registrationNo || 'তথ্য প্রদান করা হয়নি'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">রক্তের গ্রুপ:</span>
                    <strong className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                      <Droplet className="w-3.5 h-3.5" />
                      {member.bloodGroup || 'অজানা'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">পেশা:</span>
                    <strong className="text-slate-700 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {member.occupation || 'তথ্য প্রদান করা হয়নি'}
                    </strong>
                  </div>

                  {/* Privacy Sensitive: Father, Mother, DOB */}
                  <div>
                    <span className="text-slate-400 block mb-0.5">পিতার নাম:</span>
                    {isAdmin ? (
                      <strong className="text-slate-800">{member.fatherName || 'তথ্য নেই'}</strong>
                    ) : (
                      <span className="text-slate-400 italic flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>শুধুমাত্র অ্যাডমিনের জন্য সংরক্ষিত</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">মাতার নাম:</span>
                    {isAdmin ? (
                      <strong className="text-slate-800">{member.motherName || 'তথ্য নেই'}</strong>
                    ) : (
                      <span className="text-slate-400 italic flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>শুধুমাত্র অ্যাডমিনের জন্য সংরক্ষিত</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">জন্মতারিখ:</span>
                    {isAdmin ? (
                      <strong className="text-slate-800">
                        {member.dateOfBirth ? formatBengaliDate(member.dateOfBirth) : 'তথ্য নেই'}
                      </strong>
                    ) : (
                      <span className="text-slate-400 italic flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>শুধুমাত্র অ্যাডমিনের জন্য সংরক্ষিত</span>
                      </span>
                    )}
                  </div>

                  {/* Sensitive Phone Numbers */}
                  <div>
                    <span className="text-slate-400 block mb-0.5">মোবাইল নম্বর:</span>
                    {isAdmin ? (
                      member.phone ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${member.phone}`}
                            className="font-mono font-bold text-blue-900 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            {member.phone}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(member.phone!, 'phone')}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                            title="কপি করুন"
                          >
                            {copiedKey === 'phone' ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">তথ্য নেই</span>
                      )
                    ) : (
                      <span className="text-slate-400 italic flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>শুধুমাত্র অ্যাডমিনের জন্য সংরক্ষিত</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">জরুরি যোগাযোগ নম্বর:</span>
                    {isAdmin ? (
                      member.emergencyContact ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${member.emergencyContact}`}
                            className="font-mono font-bold text-rose-900 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5 text-rose-600" />
                            {member.emergencyContact}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(member.emergencyContact!, 'emergency')}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                            title="কপি করুন"
                          >
                            {copiedKey === 'emergency' ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">তথ্য নেই</span>
                      )
                    ) : (
                      <span className="text-slate-400 italic flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>শুধুমাত্র অ্যাডমিনের জন্য সংরক্ষিত</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
                <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>ঠিকানা ও এলাকা</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">গ্রাম:</span>
                    <strong className="text-slate-800">{member.village || 'কোদালপুর'}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">ওয়ার্ড নম্বর:</span>
                    <strong className="text-slate-800">
                      {member.wardNo ? toBengaliNumber(member.wardNo) : 'তথ্য নেই'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">ইউনিয়ন:</span>
                    <strong className="text-slate-800">{member.union || 'কোদালপুর'}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">উপজেলা:</span>
                    <strong className="text-slate-800">{member.upazila || 'গোসাইরহাট'}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">জেলা:</span>
                    <strong className="text-slate-800">{member.district || 'শরীয়তপুর'}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">দেশ:</span>
                    <strong className="text-slate-800">বাংলাদেশ</strong>
                  </div>
                </div>
              </div>

              {/* Foundation Details */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
                <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span>ফাউন্ডেশনের তথ্য ও চাঁদার ধরন</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">ফাউন্ডেশনে পদবি:</span>
                    <strong className="text-blue-950 text-sm font-bold">{member.designation}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">সদস্যের ধরন:</span>
                    <strong className="text-slate-800 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                      {member.memberType || 'সাধারণ সদস্য'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">সদস্য হওয়ার তারিখ:</span>
                    <strong className="text-slate-800">{formatBengaliDate(member.joinDate)}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">নির্ধারিত চাঁদার পরিমাণ:</span>
                    <strong className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {getSubscriptionTypeLabel()}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUBSCRIPTION ACCOUNTING & HISTORY */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              {/* Privacy protection notice if user is not admin */}
              {!isAdmin ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                    <Shield className="w-7 h-7" />
                  </div>

                  <div className="max-w-md mx-auto space-y-1.5">
                    <h4 className="text-lg font-bold text-slate-800">
                      সদস্য চাঁদার হিসাব গোপনীয় রাখা হয়েছে
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      ফাউন্ডেশনের নীতিমালা ও গোপনীয়তা রক্ষার স্বার্থে সদস্যদের ব্যক্তিগত আর্থিক লেনদেন ও চাঁদার হিসাব সাধারণ দর্শকদের কাছে উন্মুক্ত নয়। শুধুমাত্র অনুমোদিত অ্যাডমিনগণ লগইন করে এই হিসাব দেখতে ও পরিচালনা করতে পারেন।
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => signInWithGoogle()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-xs cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>অ্যাডমিন হিসেবে লগইন করে বিস্তারিত হিসাব দেখুন</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* ADMIN VIEW: SUMMARY METRICS */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>সদস্যের চাঁদার লাইভ সারসংক্ষেপ</span>
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        হিসাবের ভিত্তি: {getSubscriptionTypeLabel()} ({summary.periodLabel})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Total Payable */}
                      <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-3.5">
                        <span className="text-[11px] font-semibold text-blue-900 block mb-1">
                          মোট প্রদেয় চাঁদা
                        </span>
                        <p className="text-lg sm:text-xl font-bold font-mono text-blue-950">
                          {formatTaka(summary.totalPayable)}
                        </p>
                      </div>

                      {/* Total Paid */}
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5">
                        <span className="text-[11px] font-semibold text-emerald-900 block mb-1">
                          মোট জমাকৃত চাঁদা
                        </span>
                        <p className="text-lg sm:text-xl font-bold font-mono text-emerald-700">
                          {formatTaka(summary.totalPaid)}
                        </p>
                      </div>

                      {/* Overdue Due */}
                      <div
                        className={`rounded-2xl p-3.5 border ${
                          summary.totalDue > 0
                            ? 'bg-rose-50 border-rose-200 text-rose-950'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-[11px] font-semibold block mb-1">মোট বকেয়া চাঁদা</span>
                        <p className="text-lg sm:text-xl font-bold font-mono">
                          {formatTaka(summary.totalDue)}
                        </p>
                      </div>

                      {/* Advance Amount */}
                      <div
                        className={`rounded-2xl p-3.5 border ${
                          summary.advanceAmount > 0
                            ? 'bg-teal-50 border-teal-200 text-teal-950'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-[11px] font-semibold block mb-1">অগ্রিম জমা</span>
                        <p className="text-lg sm:text-xl font-bold font-mono">
                          {formatTaka(summary.advanceAmount)}
                        </p>
                      </div>

                      {/* Last Payment Date */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                        <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                          সর্বশেষ জমার তারিখ
                        </span>
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {summary.lastPaymentDate
                            ? formatBengaliDate(summary.lastPaymentDate)
                            : 'কোনো জমা নেই'}
                        </p>
                      </div>

                      {/* Payment Status Badge */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between">
                        <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                          পরিশোধের অবস্থা
                        </span>
                        <div>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              summary.status === 'advance'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : summary.status === 'paid'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : summary.status === 'due'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {summary.statusLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Payment Button / Toggle Form */}
                  <div className="flex items-center justify-between pt-2">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>চাঁদা জমার বিস্তারিত ইতিহাস ({toBengaliNumber(payments.length)}টি রেকর্ড)</span>
                    </h4>

                    <button
                      type="button"
                      onClick={() => setShowAddPayment(!showAddPayment)}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{showAddPayment ? 'ফর্ম বন্ধ করুন' : '+ নতুন চাঁদা জমা যুক্ত করুন'}</span>
                    </button>
                  </div>

                  {/* ADD PAYMENT FORM INLINE */}
                  {showAddPayment && (
                    <form
                      onSubmit={handleAddPaymentSubmit}
                      className="bg-emerald-50/60 border-2 border-emerald-200 rounded-2xl p-5 space-y-4 shadow-xs animate-in slide-in-from-top-2 duration-150"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                        <h5 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-emerald-700" />
                          <span>সদস্যের চাঁদা জমার নতুন এন্ট্রি</span>
                        </h5>
                        <span className="text-[11px] text-emerald-800">
                          সদস্য: <strong>{member.name}</strong> ({member.memberId})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            টাকার পরিমাণ (৳) *
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            step="any"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="যেমন: 500"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            জমার তারিখ *
                          </label>
                          <input
                            type="date"
                            required
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            পেমেন্টের মাধ্যম *
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          >
                            <option value="নগদ">ক্যাশ / সরাসরি নগদ</option>
                            <option value="বিকাশ">বিকাশ (bKash)</option>
                            <option value="নগদ (অ্যাপ)">নগদ (Nagad)</option>
                            <option value="ব্যাংক ট্রান্সফার">ব্যাংক ট্রান্সফার</option>
                            <option value="অন্যান্য">অন্যান্য মাধ্যম</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            রসিদ নম্বর / ভাউচার নং (ঐচ্ছিক)
                          </label>
                          <input
                            type="text"
                            value={receiptNo}
                            onChange={(e) => setReceiptNo(e.target.value)}
                            placeholder="যেমন: REC-2026-001"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            মন্তব্য / নোট (ঐচ্ছিক)
                          </label>
                          <input
                            type="text"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="যেমন: জুন মাসের মাসিক চাঁদা"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* General accounts link option */}
                      <div className="p-3 bg-white rounded-xl border border-emerald-200/80 flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={syncToGeneralIncome}
                            onChange={(e) => setSyncToGeneralIncome(e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 cursor-pointer accent-emerald-600"
                          />
                          <span>
                            এই চাঁদাটি ফাউন্ডেশনের <strong>সাধারণ আয়-ব্যয় লেজারে (Transactions)</strong> স্বয়ংক্রিয়ভাবে আয় হিসেবে যুক্ত করুন
                          </span>
                        </label>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          ডাবল কাউন্ট রোধকৃত
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddPayment(false)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white rounded-xl border border-slate-300 cursor-pointer"
                        >
                          বাতিল
                        </button>

                        <button
                          type="submit"
                          disabled={submittingPayment}
                          className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                        >
                          {submittingPayment ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>সংরক্ষণ হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>চাঁদা জমা সংরক্ষণ করুন</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* PAYMENT HISTORY TABLE */}
                  {loadingPayments ? (
                    <LoadingSpinner text="জমার ইতিহাস লোড হচ্ছে..." />
                  ) : payments.length === 0 ? (
                    <div className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-slate-500">
                      <Receipt className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="font-semibold text-slate-700 text-xs">
                        এখনও কোনো চাঁদা জমার রেকর্ড নেই।
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        উপরের “+ নতুন চাঁদা জমা যুক্ত করুন” বাটনে ক্লিক করে প্রথম জমার রেকর্ডটি যোগ করতে পারেন।
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">জমার তারিখ</th>
                            <th className="py-2.5 px-3">পরিমাণ</th>
                            <th className="py-2.5 px-3">মাধ্যম</th>
                            <th className="py-2.5 px-3">রসিদ / ট্রানজেকশন</th>
                            <th className="py-2.5 px-3">এন্ট্রি গ্রহণকারী</th>
                            <th className="py-2.5 px-3">মন্তব্য</th>
                            <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {payments.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                                {formatBengaliDate(p.date)}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                                {formatTaka(p.amount)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                                  {p.paymentMethod}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                {p.receiptNo || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[120px]">
                                {p.recordedBy || 'অ্যাডমিন'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[150px] truncate">
                                {p.remarks || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(p.id, p.amount)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="রেকর্ড মুছে ফেলুন"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            কোদালপুর মানবিক ফাউন্ডেশন • সদস্য বিস্তারিত প্রোফাইল
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
